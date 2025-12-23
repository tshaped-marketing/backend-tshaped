import { Request, Response, NextFunction } from 'express';
import * as lessonSchema from '../zodSchemas/lesson.schema.js';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { CustomRequest } from '../types/auth.types.js';
import determineMediaType from '../utils/determineMIME.js';
import { isUserAuthorizedInCourse } from '../utils/isUserAuthorizedInCourse.js';
import { handleCachedResponse } from '../utils/handleCacheResponse.js';
import redisService from '../config/redis.config.js';
import { sendSuccess } from '../middlewares/successHandler.middleware.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import { titleToSlug } from '../utils/titleToSlug.js';
import { getLessonByID_TTL, getLessonsByCourse_TTL } from '../constants/redis.cacheTTL.js';

const createLesson = async (
  req: Request<{}, {}, lessonSchema.CreateLessonBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const courseExists = await prismaClient.course.findUnique({
    where: { id: req.body.courseId },
  });

  if (!courseExists) {
    return await throwError('COURSE001');
  }

  const maxOrder = await prismaClient.lesson.findFirst({
    where: { courseId: req.body.courseId },
    orderBy: { order: 'desc' },
  });

  const newOrder = (maxOrder?.order ?? 0) + 1;
  const slug = req.body.slug || titleToSlug(req.body.title);

  // Auto-determine mediaType if mediaUrl is provided but mediaType isn't
  let lessonData = { ...req.body, slug, order: newOrder };
  if (req.body.mediaUrl) {
    console.log('upto here', req.body.mediaUrl);
    lessonData.mediaType = await determineMediaType(req.body.mediaUrl);
  }

  // Process attachments if provided
  if (req.body.attachments) {
    const processedAttachments = await Promise.all(
      req.body.attachments.map(async attachment => ({
        ...attachment,
        type: await determineMediaType(attachment.url),
      })),
    );
    lessonData.attachments = processedAttachments;
  }

  const lesson = await prismaClient.lesson.create({
    data: lessonData,
  });

  await sendSuccess(res, 'LESSON_CREATED', {
    data: lesson,
  });

  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.invalidateMultipleKeys([
          `lessons_by_course:${lesson.courseId}`,
          `courseHierarchy:${courseExists?.slug}`,
          `course_preview:${courseExists?.slug}`,
        ]);
      },
    ],
    'createLesson',
  );
};

const updateLesson = async (
  req: Request<lessonSchema.GetLessonByIdParams, {}, lessonSchema.UpdateLessonBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const lesson = await prismaClient.lesson.findUnique({
    where: { id: req.params.id },
  });

  if (!lesson) {
    return await throwError('LESSON001');
  }

  let updateData = { ...req.body };

  // Generate new slug if title is updated and slug is not provided
  if (req.body.title && !req.body.slug) {
    updateData.slug = titleToSlug(req.body.title);
  }

  // Auto-determine mediaType if mediaUrl is updated
  if (req.body.mediaUrl) {
    updateData.mediaType = await determineMediaType(req.body.mediaUrl);
  }

  // Process attachments if provided
  if (req.body.attachments) {
    const processedAttachments = await Promise.all(
      req.body.attachments.map(async attachment => ({
        ...attachment,
        type: await determineMediaType(attachment.url),
      })),
    );
    updateData.attachments = processedAttachments;
  }

  const updatedLesson = await prismaClient.lesson.update({
    where: { id: req.params.id },
    data: updateData,
  });

  await sendSuccess(res, 'LESSON_UPDATED', {
    data: updatedLesson,
  });

  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {
        //Find course slug
        const course = await prismaClient.course.findUnique({
          where: { id: lesson.courseId },
        });
        return await redisService.invalidateMultipleKeys([
          `lessons_by_course:${lesson.courseId}`,
          `lesson_by_id:${req.params.id}`,
          `courseHierarchy:${course?.slug}`,
          `course_preview:${course?.slug}`,
        ]);
      },
    ],
    'updateLesson',
  );
};

// Keep other controller methods unchanged
const getLessonsByCourse = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userRole = req.user!.role;
  const hasAccess = await isUserAuthorizedInCourse(req.user?.userId!, req.params.courseId);

  if (!hasAccess && userRole.toLocaleLowerCase() !== 'admin') {
    return await throwError('AUTH016');
  }
  const cacheKey = `lessons_by_course:${req.params.courseId}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const lessons = await prismaClient.lesson.findMany({
    where: {
      courseId: req.params.courseId,
    },
    orderBy: { order: 'asc' },
    include: { topics: true },
  });

  res.status(200).json({
    success: true,
    data: lessons,
  });

  // Cache Data
  executeBackgroundTasks(
    [
      async () => {
        // Cache the response for 10 min
        redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            data: lessons,
          },
          getLessonsByCourse_TTL, // 1 hrs)
        );
      },
    ],
    'getLessonsByCourse',
  );
};

const getLessonById = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const lessonId = req.params.id;
  const userId = req.user?.userId as string;
  const userRole = req.user!.role;

  const cacheKey = `lesson_by_id:${lessonId}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const lessonObject = await prismaClient.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lessonObject) {
    return await throwError('LESSON001');
  }

  const hasAccess = await isUserAuthorizedInCourse(req.user?.userId!, lessonObject.courseId);

  if (!hasAccess && userRole.toLocaleLowerCase() !== 'admin') {
    return await throwError('AUTH016');
  }

  const lesson = await prismaClient.lesson.findUnique({
    where: { id: lessonId },
    include: {
      topics: {
        orderBy: { order: 'asc' },
      },
      course: {
        select: {
          id: true,
          instructorId: true,
          students: {
            where: { id: userId },
            select: { id: true },
          },
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: lesson,
  });

  // Cache Data
  executeBackgroundTasks(
    [
      async () => {
        // Cache the response for 10 min
        //Cache for 10 min
        redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            data: lesson,
          },
          getLessonByID_TTL, // 10 min in seconds)
        );
      },
    ],
    'getLessonsById',
  );
};

const deleteLesson = async (
  req: Request<lessonSchema.DeleteLessonParams>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const lesson = await prismaClient.lesson.findUnique({
    where: { id: req.params.id },
    include: { course: true },
  });

  if (!lesson) {
    return await throwError('LESSON001');
  }

  await prismaClient.$transaction(async prisma => {
    await prisma.lesson.delete({
      where: { id: req.params.id },
    });

    await prisma.lesson.updateMany({
      where: {
        courseId: lesson.courseId,
        order: { gt: lesson.order },
      },
      data: {
        order: { decrement: 1 },
      },
    });
  });

  await sendSuccess(res, 'LESSON_DELETED');

  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {
        //Find course slug
        const course = await prismaClient.course.findUnique({
          where: { id: lesson.courseId },
        });
        return await redisService.invalidateMultipleKeys([
          `lessons_by_course:${lesson.courseId}`,
          `lesson_by_id:${req.params.id}`,
          `courseHierarchy:${course?.slug}`,
          `course_preview:${course?.slug}`,
        ]);
      },
    ],
    'deleteLesson',
  );
};

const searchLessons = async (
  req: Request<{}, {}, {}, lessonSchema.SearchLessonsQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const {
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
    limit = '10',
    page = '1',
  } = req.query;

  // Convert string values to numbers
  const limitNum = parseInt(limit.toString(), 10);
  const pageNum = parseInt(page.toString(), 10);

  // Calculate pagination
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where = {
    AND: [
      // Search in title and description
      {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
      // Add status filter if provided
      ...(status ? [{ status }] : []),
    ],
  } as any;

  // Get total count for pagination
  const total = await prismaClient.lesson.count({ where });

  // Get lessons
  const lessons = await prismaClient.lesson.findMany({
    where,
    orderBy: { [sortBy]: sortOrder },
    take: limitNum, // Use the converted number
    skip,
    include: {
      course: {
        select: {
          title: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: lessons,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
};

export {
  createLesson,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  deleteLesson,
  searchLessons,
};
