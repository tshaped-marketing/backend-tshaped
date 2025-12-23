import { Request, Response } from 'express';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { CustomRequest } from '../types/auth.types.js';
import slugify from 'slugify';
import determineMediaType from '../utils/determineMIME.js';
import { SearchTopicsQuery } from '../zodSchemas/topic.schema.js';
import { isUserAuthorizedInCourse } from '../utils/isUserAuthorizedInCourse.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import redisService from '../config/redis.config.js';

const createTopic = async (req: Request, res: Response): Promise<void> => {
  const { lessonId, courseId, ...topicData } = req.body;

  // Find the highest order number in the same lesson
  const maxOrderTopic = await prismaClient.topic.findFirst({
    where: { lessonId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  // Calculate the new order number (if no topics exist, start with 1)
  const newOrder = maxOrderTopic ? maxOrderTopic.order + 1 : 1;

  // Generate slug from title if not provided
  const slug = topicData.slug || slugify(topicData.title, { lower: true, strict: true });

  // Auto-determine mediaType if mediaUrl is provided but mediaType isn't
  let processedTopicData = { ...topicData, slug };
  if (topicData.mediaUrl) {
    processedTopicData.mediaType = await determineMediaType(topicData.mediaUrl);
  }

  // Process attachments if provided
  if (topicData.attachments) {
    processedTopicData.attachments = await Promise.all(
      topicData.attachments.map(async (attachment: any) => ({
        ...attachment,
        type: await determineMediaType(attachment.url),
      })),
    );
  }
  const topic = await prismaClient.topic.create({
    data: {
      ...processedTopicData,
      order: newOrder,
      lessonId,
      courseId,
    },
  });

  res.status(201).json({
    success: true,
    data: topic,
  });

  executeBackgroundTasks(
    [
      async () => {
        const course= await prismaClient.course.findUnique({
          where: { id: topic.courseId },
          select: { slug: true },
        });
        return await redisService.invalidateMultipleKeys([`lesson_by_id:${topic.lessonId}`,`lessons_by_course:${topic.courseId}`,`courseHierarchy:${course?.slug}`,`course_preview:${course?.slug}`])
      },
    ],
    'createTopic',
  );
};

const updateTopic = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  let updateData = { ...req.body };

  // Generate new slug if title is updated and slug is not provided
  if (updateData.title && !updateData.slug) {
    updateData.slug = slugify(updateData.title, { lower: true, strict: true });
  }

  // Auto-determine mediaType if mediaUrl is updated
  if (updateData.mediaUrl) {
    updateData.mediaType = await determineMediaType(updateData.mediaUrl);
  }

  // Process attachments if provided
  if (updateData.attachments) {
    updateData.attachments = await Promise.all(
      updateData.attachments.map(async (attachment: any) => ({
        ...attachment,
        type: await determineMediaType(attachment.url),
      })),
    );
  }

  // Check for order conflicts
  if (updateData.order) {
    const existingTopic = await prismaClient.topic.findFirst({
      where: {
        lessonId: updateData.lessonId || undefined,
        order: updateData.order,
        id: { not: id },
      },
    });

    if (existingTopic) {
      return await throwError('TOPIC001');
    }
  }

  const topic = await prismaClient.topic.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({
    success: true,
    data: topic,
  });



  executeBackgroundTasks(
    [
      async () => {
        const course= await prismaClient.course.findUnique({
          where: { id: topic.courseId },
          select: { slug: true },
        });
        return await redisService.invalidateMultipleKeys([`lesson_by_id:${topic.lessonId}`,`lessons_by_course:${topic.courseId}`,`courseHierarchy:${course?.slug}`,`course_preview:${course?.slug}`])
      },
    ],
    'updateTopic',
  );
};
const getTopic = async (req: CustomRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userRole = req.user!.role;
  //first topic first
  const topicObject = await prismaClient.topic.findUnique({
    where: { id },
  });
  if (!topicObject) {
    return await throwError('TOPIC002');
  }
  const hasAccess = await isUserAuthorizedInCourse(req.user?.userId!, topicObject.courseId);
  if (!hasAccess && userRole.toLocaleLowerCase() !== 'admin') {
    return await throwError('AUTH016');
  }

  const topic = await prismaClient.topic.findUnique({
    where: { id },
  });

  if (!topic) {
    return await throwError('TOPIC002');
  }

  //Update last viewed at date
  await prismaClient.topic.update({
    where: { id },
    data: { lastViewedAt: new Date() },
  });
  res.status(200).json({
    success: true,
    data: topic,
  });
};

const deleteTopic = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const topicData = await prismaClient.topic.findUnique({
    where: { id }
  });
  if (!topicData) {
    return await throwError('TOPIC002');
  }
  await prismaClient.topic.delete({
    where: { id },
  });
  res.status(200).json({
    success: true,
    message: 'Topic deleted successfully',
  });


  executeBackgroundTasks(
    [
      async () => {
        const course= await prismaClient.course.findUnique({
          where: { id: topicData.courseId },
          select: { slug: true },
        });
        return await redisService.invalidateMultipleKeys([`lesson_by_id:${topicData.lessonId}`,`lessons_by_course:${topicData.courseId}`,`courseHierarchy:${course?.slug}`,`course_preview:${course?.slug}`])
      },
    ],
    'deleteTopic',
  );
};

const getAllTopics = async (req: Request, res: Response): Promise<void> => {
  const { lessonId, courseId, type, page = 1, limit = 10 } = req.query;

  if (courseId && lessonId) {
  }
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    ...(lessonId && { lessonId: String(lessonId) }),
    ...(courseId && { courseId: String(courseId) }),
    ...(type && { type }),
  } as any;

  const [topics, total] = await Promise.all([
    prismaClient.topic.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { order: 'asc' },
    }),
    prismaClient.topic.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: topics,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
};

const searchTopics = async (
  req: Request<{}, {}, {}, SearchTopicsQuery>,
  res: Response,
): Promise<void> => {
  const {
    search = '',
    sortBy = 'order',
    sortOrder = 'asc',
    type,
    courseId,
    lessonId,
    limit = '10',
    page = '1',
  } = req.query;

  // Convert pagination params to numbers
  const limitNum = parseInt(limit.toString(), 10);
  const pageNum = parseInt(page.toString(), 10);
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
      // Add filters if provided
      ...(type ? [{ type }] : []),
      ...(courseId ? [{ courseId }] : []),
      ...(lessonId ? [{ lessonId }] : []),
    ],
  } as any;

  // Get total count for pagination
  const total = await prismaClient.topic.count({ where });

  // Get topics
  const topics = await prismaClient.topic.findMany({
    where,
    orderBy: { [sortBy]: sortOrder },
    take: limitNum,
    skip,
    include: {
      lesson: {
        select: {
          title: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: topics,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
};

export { createTopic, updateTopic, getTopic, deleteTopic, getAllTopics, searchTopics };
