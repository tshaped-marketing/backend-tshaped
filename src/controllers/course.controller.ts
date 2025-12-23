import { Request, Response, NextFunction } from 'express';
import prismaClient from '../prisma/prisma.client.js';
import { CustomRequest } from '../types/auth.types.js';
import type {
  CreateCourseInput,
  UpdateCourseInput,
  GetCourseByIdInput,
  DeleteCourseInput,
  GetAllCoursesInput,
  BulkEnrollUsersInput,
  SearchCoursesInput,
  UnenrollUserInput,
  GetEnrolledUsersInput,
} from '../zodSchemas/course.schema.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { formatDateTime } from '../utils/formatDateTime.js';
import { notificationService } from '../server.js';
import { ADMIN_IDS } from '../constants/env.constant.js';
import { isUserAuthorizedInCourse } from '../utils/isUserAuthorizedInCourse.js';
import redisService from '../config/redis.config.js';
import { handleCachedResponse } from '../utils/handleCacheResponse.js';
import { sendSuccess } from '../middlewares/successHandler.middleware.js';
import slugify from 'slugify';
import { titleToSlug } from '../utils/titleToSlug.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import successProvider from '../utils/successJSONProvider.js';
import { CourseHierarchy } from '../types/course.types.js';
import {
  getCourseById_TTL,
  getCourseHierarchy_getAssignmentsForCourse_TTL,
  getCourseHierarchy_getCourseBySlug_TTL,
  getCourseHierarchy_getProgress_TTL,
  getCoursePreview_TTL,
  getEnrolledCourses_registry_TTL,
  getPublishedCoursesList_registry_TTL,
} from '../constants/redis.cacheTTL.js';
import { Progress } from '@prisma/client';

const createCourse = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const reqBody = req.body;
  const slug = titleToSlug(reqBody.title);

  const course = await prismaClient.course.create({
    data: {
      title: reqBody.title,
      slug,
      description: reqBody.description,
      price: reqBody.price,
      // New fields
      specialPrice: reqBody.specialPrice,
      specialPriceDescription: reqBody.specialPriceDescription,
      // Meta fields
      metaTitle: reqBody.metaTitle,
      metaDescription: reqBody.metaDescription,
      metaRobots: reqBody.metaRobots || 'INDEX_FOLLOW',
      metaCanonical: reqBody.metaCanonical,
      // Existing fields
      thumbnail: reqBody.thumbnail,
      duration: reqBody.duration,
      objectives: reqBody.objectives || [],
      isPublic: reqBody.isPublic ?? false,
      status: reqBody.status || 'DRAFT',
      instructorId: req.user!.userId,
      enrollmentCount: 0,
    },
  });

  // Using the dynamic success handler instead of hardcoded response
  await sendSuccess(res, 'COURSE_CREATED', {
    courseId: course.id,
    slug: course.slug,
  });

  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {
        await redisService.invalidateRegistry('course_lists');
        await redisService.deleteCachedResponse('total_courses_count');
        return;
      },
    ],
    'createCourse',
  );
};

const getAllCourses = async (
  req: Request<
    GetAllCoursesInput['params'],
    any,
    GetAllCoursesInput['body'],
    GetAllCoursesInput['query']
  >,
  res: Response,
  next: NextFunction,
) => {
  const courses = await prismaClient.course.findMany({
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      _count: {
        select: {
          students: true,
          lessons: true,
        },
      },
    },
  });
  return await sendSuccess(res, 'COURSE_RETRIEVED', {
    data: courses,
  });
};

const getCourseById = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  const hasAccess = await isUserAuthorizedInCourse(req.user?.userId!, id);
  if (!hasAccess && userRole.toUpperCase() !== 'ADMIN') {
    await throwError('AUTH016');
    return;
  }

  const cacheKey = `course_by_id:${id}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  console.log('User has access to course', hasAccess, new Date());

  const course = await prismaClient.course.findUnique({
    where: { id },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          avatar: true,
          bio: true,
        },
      },
      students: {
        where: {
          id: userId,
        },
        select: {
          id: true,
        },
      },
      lessons: {
        orderBy: {
          order: 'asc',
        },
      },
      _count: {
        select: {
          students: true,
          lessons: true,
          assignments: true,
        },
      },
    },
  });

  if (!course) {
    return await throwError('COURSE001');
  }

  const isInstructor = course.instructor.id === userId || userRole.toUpperCase() === 'ADMIN';
  const isEnrolled = course.students.length > 0;

  if (!isInstructor && !isEnrolled) {
    return await throwError('AUTH016');
  }

  const formattedCourse = {
    ...course,
    createdAt: formatDateTime(course.createdAt),
    updatedAt: formatDateTime(course.updatedAt),
    publishedAt: course.publishedAt ? formatDateTime(course.publishedAt) : null,
    lessons: course.lessons.map(lesson => ({
      ...lesson,
      createdAt: formatDateTime(lesson.createdAt),
      updatedAt: formatDateTime(lesson.updatedAt),
    })),
  };

  const { students, ...courseData } = formattedCourse;

  await sendSuccess(res, 'COURSE_RETRIEVED', {
    data: courseData,
  });

  // Get the success message first (similar to what sendSuccess does)
  const successConfig = await successProvider('COURSE_RETRIEVED', 'en');
  // cache Data
  executeBackgroundTasks(
    [
      async () => {
        //Cache for 24 hrs
        return await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            message: successConfig.success_message['en'] || 'Operation completed successfully',
            data: courseData,
          },
          getCourseById_TTL,
        );
      },
    ],
    'getCourseById',
  );
};

const updateCourse = async (
  req: Request<
    UpdateCourseInput['params'],
    any,
    UpdateCourseInput['body'],
    UpdateCourseInput['query']
  >,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;
  const updateData = req.body;

  // Only include fields that are actually provided in the request
  const filteredUpdateData = Object.fromEntries(
    Object.entries(updateData).filter(([_, value]) => value !== undefined),
  );

  // Add validation for special price if provided
  if (
    filteredUpdateData.specialPrice !== undefined &&
    filteredUpdateData.price !== undefined &&
    filteredUpdateData.specialPrice >= filteredUpdateData.price
  ) {
    return await throwError('COURSE005');
  }

  const updatedCourse = await prismaClient.course.update({
    where: { id },
    data: {
      ...filteredUpdateData,
      updatedAt: new Date(),
    },
  });

  await sendSuccess(res, 'COURSE_UPDATED', {
    data: updatedCourse,
  });

  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {
        await redisService.invalidateMultipleKeys([
          `course_by_id:${id}`,
          `course_preview:${updatedCourse.slug}`,
          `courseHierarchy:${updatedCourse.slug}`,
        ]);
        await redisService.invalidateRegistry('course_lists');
        await redisService.deleteCachedResponse('total_courses_count');
        return;
      },
    ],
    'updateCourse',
  );
};

const getCoursePreview = async (
  req: Request<{ slug: string }>,
  res: Response,
  next: NextFunction,
) => {
  const { slug } = req.params;

  const cacheKey = `course_preview:${slug}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const course = await prismaClient.course.findUnique({
    where: {
      slug,
      AND: {
        status: 'PUBLISHED',
        isPublic: true,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnail: true,
      duration: true,
      price: true,
      specialPrice: true,
      specialPriceDescription: true,
      objectives: true,
      enrollmentCount: true,
      rating: true,
      metaTitle: true,
      metaDescription: true,
      metaRobots: true,
      metaCanonical: true,
      instructor: {
        select: {
          id: true,
          name: true,
          avatar: true,
          bio: true,
        },
      },
      lessons: {
        orderBy: {
          order: 'asc',
        },
        select: {
          id: true,
          title: true,
          description: true,
          duration: true,
          order: true,
          isPublic: true,
          topics: {
            orderBy: {
              order: 'asc',
            },
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              duration: true,
              mediaType: true,
              order: true,
              isPublic: true,
              mediaUrl: true,
            },
          },
        },
      },
      _count: {
        select: {
          students: true,
          lessons: true,
          assignments: true,
        },
      },
    },
  });

  if (!course) {
    return await throwError('COURSE001');
  }

  // Process lessons and topics to remove mediaUrl for private content
  const processedCourse = {
    ...course,
    lessons: course.lessons.map(lesson => ({
      ...lesson,
      topics: lesson.topics.map(topic => {
        if (!topic.isPublic) {
          const { mediaUrl, ...topicWithoutMedia } = topic;
          return topicWithoutMedia;
        }
        return topic;
      }),
    })),
  };

  await sendSuccess(res, 'COURSE_PREVIEW', {
    data: processedCourse,
  });

  // Get the success message first (similar to what sendSuccess does)
  const successConfig = await successProvider('COURSE_PREVIEW', 'en');
  // cache Data
  executeBackgroundTasks(
    [
      async () => {
        //Cache for 24 hrs
        return await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            message: successConfig.success_message['en'] || 'Operation completed successfully',
            data: processedCourse,
          },
          getCoursePreview_TTL,
        );
      },
    ],
    'getCoursePreview',
  );
};
const bulkEnrollUsers = async (
  req: Request<
    BulkEnrollUsersInput['params'],
    any,
    BulkEnrollUsersInput['body'],
    BulkEnrollUsersInput['query']
  >,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;
  const { userIds } = req.body;

  // Check if course exists and get counts with topics
  const course = await prismaClient.course.findUnique({
    where: { id },
    include: {
      students: {
        select: { id: true },
      },
      lessons: {
        include: {
          topics: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) {
    return await throwError('COURSE001');
  }

  // Calculate total topics
  const totalTopics = course.lessons.reduce((sum, lesson) => sum + lesson.topics.length, 0);

  // Get existing student IDs to avoid duplicates
  const existingStudentIds = course.students.map(student => student.id);

  // Filter out users who are already enrolled
  const newUserIds = userIds.filter(id => !existingStudentIds.includes(id));

  if (newUserIds.length === 0) {
    return await throwError('COURSE002');
  }

  // Verify all users exist and are active
  const users = await prismaClient.user.findMany({
    where: {
      id: {
        in: newUserIds,
      },
    },
    select: {
      id: true,
      status: true,
      authorizedCourses: true,
    },
  });

  if (users.length !== newUserIds.length) {
    return await throwError('COURSE003');
  }

  // Check if all users are active
  const inactiveUsers = users.filter(user => user.status !== 'ACTIVE');
  if (inactiveUsers.length > 0) {
    return await throwError('COURSE008');
  }


   await sendSuccess(res, 'COURSE_USERS_ENROLL', {
    enrolledUserIds: newUserIds,
  });

  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {

  // Create progress records and update enrollment count in a transaction
  await prismaClient.$transaction(async tx => {
    // Connect users to course
    await tx.course.update({
      where: { id },
      data: {
        students: {
          connect: newUserIds.map(userId => ({ id: userId })),
        },
        enrollmentCount: {
          increment: newUserIds.length,
        },
      },
    });

    // Create progress records with topic tracking
    await tx.progress.createMany({
      data: newUserIds.map(userId => ({
        studentId: userId,
        courseId: id,
        completedLessons: 0,
        totalLessons: course.lessons.length,
        completedLessonIds: [],
        completedTopicIds: [],
        totalTopics,
        completionRate: 0,
      })),
    });
    
  });

  // Send notification to admin
  notificationService.createNotification({
    userId: ADMIN_IDS[0],
    type: 'ADMIN',
    message: `New Users ${userIds} enrolled in the course ${course.title}`,
    metadata: {
      event: 'STUDENT_COURSE_ENROLLMENT',
      courseId: id,
      userIds,
    },
  });
        for (const userId of newUserIds) {
          await redisService.invalidateRegistry(`getEnrolledCourses:${userId}`);
        }
      },
    ],
    'updateCourseLists',
  );
};

const deleteCourse = async (
  req: Request<
    DeleteCourseInput['params'],
    any,
    DeleteCourseInput['body'],
    DeleteCourseInput['query']
  >,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;

  const course = await prismaClient.course.findUnique({
    where: { id },
    include: {
      students: true,
      lessons: true,
      assignments: true,
    },
  });

  if (!course) {
    return await throwError('COURSE001');
  }

  await prismaClient.$transaction([
    prismaClient.lesson.deleteMany({ where: { courseId: id } }),
    prismaClient.assignment.deleteMany({ where: { courseId: id } }),
    prismaClient.progress.deleteMany({ where: { courseId: id } }),
    prismaClient.certification.deleteMany({ where: { courseId: id } }),
    prismaClient.payment.deleteMany({ where: { courseId: id } }),
    prismaClient.comment.deleteMany({ where: { courseId: id } }),
    prismaClient.course.delete({ where: { id } }),
  ]);
  await sendSuccess(res, 'COURSE_DELETE');

  executeBackgroundTasks(
    [
      async () => {
        await redisService.invalidateMultipleKeys([
          `course_by_id:${id}`,
          `course_preview:${course.slug}`,
          `courseHierarchy:${course.slug}`,
        ]);
        await redisService.invalidateRegistry('course_lists');
        await redisService.deleteCachedResponse('total_courses_count');
        return;
      },
    ],
    'deleteCourse',
  );
};

const searchCourses = async (
  req: Request<
    SearchCoursesInput['params'],
    any,
    SearchCoursesInput['body'],
    SearchCoursesInput['query']
  >,
  res: Response,
  next: NextFunction,
) => {
  const {
    search,
    minPrice,
    maxPrice,
    status,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build where clause
  const where: any = {};

  // Add search conditions
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Add price range - ensure numeric conversion
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = Number(minPrice);
    if (maxPrice !== undefined) where.price.lte = Number(maxPrice);
  }

  // Add status if provided, otherwise show only published courses
  if (status) {
    where.status = status;
  } else {
    where.status = 'PUBLISHED';
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    // Get courses with count
    const [courses, total] = await Promise.all([
      prismaClient.course.findMany({
        where,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              students: true,
              lessons: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take,
      }),
      prismaClient.course.count({ where }),
    ]);

    // Format dates in courses
    const formattedCourses = courses.map(course => ({
      ...course,
      createdAt: formatDateTime(course.createdAt),
      updatedAt: formatDateTime(course.updatedAt),
      publishedAt: course.publishedAt ? formatDateTime(course.publishedAt) : null,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / take);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return await sendSuccess(res, 'COURSE_RETRIEVED', {
      data: {
        courses: formattedCourses,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          hasNextPage,
          hasPrevPage,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const unenrollUser = async (
  req: Request<
    UnenrollUserInput['params'],
    any,
    UnenrollUserInput['body'],
    UnenrollUserInput['query']
  >,
  res: Response,
  next: NextFunction,
) => {
  const { courseId, userId } = req.params;

  // Check if course exists and user is enrolled
  const course = await prismaClient.course.findUnique({
    where: { id: courseId },
    include: {
      students: {
        where: { id: userId },
        select: { id: true },
      },
    },
  });

  if (!course) {
    return await throwError('COURSE001');
  }

  if (course.students.length === 0) {
    return await throwError('COURSE006');
  }

  await sendSuccess(res, 'COURSE_UNENROLL');
  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {

  await prismaClient.$transaction(async tx => {
    // Disconnect student and update course stats
    await tx.course.update({
      where: { id: courseId },
      data: {
        students: {
          disconnect: { id: userId },
        },
        enrollmentCount: {
          decrement: 1,
        },
      },
    });

    // Delete progress for this course
    await tx.progress.deleteMany({
      where: {
        courseId,
        studentId: userId,
      },
    });
  });

        await redisService.invalidateRegistry(`getEnrolledCourses:${userId}`);
        return;
      },
    ],
    'updateCourseLists',
  );
};

const getEnrolledUsers = async (
  req: Request<
    GetEnrolledUsersInput['params'],
    any,
    GetEnrolledUsersInput['body'],
    GetEnrolledUsersInput['query']
  >,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const {
    page = 1,
    limit = 10,
    search,
    role,
    status,
    sortBy = 'name',
    sortOrder = 'asc',
  } = req.query;

  // Check if course exists
  const course = await prismaClient.course.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!course) {
    await throwError('COURSE001');
    return;
  }

  // Build where clause for users with additional filters
  const where = {
    courses: {
      some: {
        id,
      },
    },
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  } as any;

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Prepare orderBy based on sortBy and sortOrder
  const orderBy: any = {};

  // Handle special case for completionRate which needs to be sorted through progress relation
  if (sortBy === 'completionRate') {
    orderBy.progress = {
      orderBy: {
        completionRate: sortOrder,
      },
      where: {
        courseId: id,
      },
    };
  } else {
    orderBy[sortBy] = sortOrder;
  }

  // Get enrolled users with pagination
  const [users, total] = await Promise.all([
    prismaClient.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        status: true,
        progress: {
          where: {
            courseId: id,
          },
          select: {
            completedLessons: true,
            totalLessons: true,
            completionRate: true,
            updatedAt: true,
          },
        },
      },
      orderBy,
      skip,
      take,
    }),
    prismaClient.user.count({ where }),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / take);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return await sendSuccess(res, 'COURSE_ENROLL_USER_GET', {
    data: {
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage,
        hasPrevPage,
        itemsPerPage: limit,
      },
    },
  });
};

const getEnrolledCourses = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user!.userId;
  const {
    page = 1,
    limit = 10,
    search,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
    status,
  } = req.query;

  const cacheKey = `getEnrolledCourses:${userId}:${page}:${limit}:${search}:${sortBy}:${sortOrder}:${status}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  // Build where clause
  const where: any = {
    students: {
      some: {
        id: userId,
      },
    },
  };

  // Add search condition if provided
  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  // Add status filter if provided
  if (status) {
    where.status = status;
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Get courses with count
  const [courses, total] = await Promise.all([
    prismaClient.course.findMany({
      where,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        progress: {
          where: {
            studentId: userId,
          },
          select: {
            completedLessons: true,
            totalLessons: true,
            completionRate: true,
            completedTopicIds: true,
            totalTopics: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            assignments: true,
          },
        },
      },
      orderBy: {
        [sortBy as string]: sortOrder,
      },
      skip,
      take,
    }),
    prismaClient.course.count({ where }),
  ]);

  // Format the response data
  const formattedCourses = courses.map(course => ({
    ...course,
    createdAt: formatDateTime(course.createdAt),
    updatedAt: formatDateTime(course.updatedAt),
    publishedAt: course.publishedAt ? formatDateTime(course.publishedAt) : null,
    progress: course.progress[0]
      ? {
          ...course.progress[0],
          updatedAt: formatDateTime(course.progress[0].updatedAt),
        }
      : null,
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / take);
  const hasNextPage = Number(page) < totalPages;
  const hasPrevPage = Number(page) > 1;

  await sendSuccess(res, 'COURSE_RETRIEVED', {
    data: {
      courses: formattedCourses,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems: total,
        hasNextPage,
        hasPrevPage,
        itemsPerPage: Number(limit),
      },
    },
  });

  //cache Data
  executeBackgroundTasks(
    [
      async () => {
        //Cache for 24 hrs
        return await redisService.cacheWithRegistry(
          cacheKey,
          {
            success: true,
            message: 'Courses retrieved successfully.',
            data: {
              courses: formattedCourses,
              pagination: {
                currentPage: Number(page),
                totalPages,
                totalItems: total,
                hasNextPage,
                hasPrevPage,
                itemsPerPage: Number(limit),
              },
            },
          },
          getEnrolledCourses_registry_TTL,
          `getEnrolledCourses:${userId}`,
        );
      },
    ],
    'getEnrolledCourses',
  );
};

export const getCourseHierarchy = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role!;
  const { courseSlug } = req.params;

  if (!userId) {
    return await throwError('AUTH016');
  }

  const hasAccess = await isUserAuthorizedInCourse(req.user?.userId!, courseSlug);
  if (!hasAccess && userRole.toLocaleLowerCase() !== 'admin') {
    return await throwError('AUTH016');
  }

  // Define cache key
  const cacheKey = `courseHierarchy:${courseSlug}`;

  // Try to get data from cache first
  const cachedData = (await redisService.getCachedResponse(cacheKey)) as CourseHierarchy;

  // Define our course hierarchy variable
  let courseHierarchy: CourseHierarchy;

  if (cachedData) {
    // Use cached data if available
    courseHierarchy = cachedData;
  } else {
    // Get the course with all its lessons and topics from database
    courseHierarchy = (await prismaClient.course.findUnique({
      where: { slug: courseSlug },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        thumbnail: true,
        duration: true,
        objectives: true,
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
          },
        },
        lessons: {
          where: {
            OR: [{ isPublic: true }, { status: 'PUBLISHED' }],
          },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            status: true,
            order: true,
            duration: true,
            mediaType: true,
            mediaUrl: true,
            attachments: true,
            topics: {
              where: {
                OR: [{ isPublic: true }, { status: 'PUBLISHED' }],
              },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                status: true,
                type: true,
                order: true,
                duration: true,
                mediaType: true,
                mediaUrl: true,
                attachments: true,
                keywords: true,
              },
            },
          },
        },
      },
    })) as any;

    if (!courseHierarchy) {
      return await throwError('COURSE001');
    }

    // Cache the database result for 24 hours
    await redisService.cacheResponse(
      cacheKey,
      courseHierarchy,
      getCourseHierarchy_getCourseBySlug_TTL,
    );
  }

  // Get the student's progress for this course
  let progress: any
  const cacheKeyForProgress = `course_progress:${userId}:${courseHierarchy.id}`;
  const cachedProgress = await redisService.getCachedResponse(cacheKeyForProgress);
  if (cachedProgress) {
    progress = cachedProgress;
  }
  else {
   progress = await prismaClient.progress.findUnique({
    where: {
      studentId_courseId: {
        studentId: userId,
        courseId: courseHierarchy.id,
      },
    },
    select: {
      completedLessons: true,
      totalLessons: true,
      completedLessonIds: true,
      completedTopicIds: true,
      completionRate: true,
    },
  });
    // Cache the progress for 24 hours
     redisService.cacheResponse(
      cacheKeyForProgress,
      progress,
      getCourseHierarchy_getProgress_TTL,
    );
  }
  const cacheKeyForAssignments = `course_assignments:${courseHierarchy.id}`;
  const cachedAssignments = await redisService.getCachedResponse(cacheKeyForAssignments);
  let assignments: any;
  if (cachedAssignments) {
    assignments = cachedAssignments;
  } else {
    // Get assignments for this course
    assignments = await prismaClient.assignment.findMany({
      where: {
        courseId: courseHierarchy.id,
        status: {
          in: ['PUBLISHED'],
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        attachments: true,
        instructions: true,
        maxScore: true,
        startDate: true,
        dueDate: true,
        submissions: {
          where: {
            studentId: userId,
          },
          select: {
            id: true,
            status: true,
            grade: true,
            submittedAt: true,
          },
        },
      },
    });
      // Format submission dates for all assignments
    assignments = assignments.map((assignment: any) => ({
      ...assignment,
      submissions: assignment.submissions.map((submission: any) => ({
        ...submission,
        submittedAt: submission.submittedAt ? formatDateTime(submission.submittedAt) : null,
      }))
    }));
    

    // Cache the assignments for 24 hours
    await redisService.cacheResponse(
      cacheKeyForAssignments,
      assignments,
      getCourseHierarchy_getAssignmentsForCourse_TTL,
    );
  }
  // Prepare progress information
  const progressInfo = progress || {
    completedLessons: 0,
    totalLessons: courseHierarchy.lessons.length,
    completedLessonIds: [],
    completedTopicIds: [],
    completionRate: 0,
  };

  // Has student completed the course
  const isCompleted = progressInfo.completionRate === 100;

  // Add isCompleted flag to lessons and topics
  const lessonsWithCompletion = courseHierarchy.lessons.map((lesson: any) => {
    // Mark lesson as completed if its ID is in completedLessonIds
    const isLessonCompleted = progressInfo.completedLessonIds.includes(lesson.id);

    // Add isCompleted flag to topics
    const topicsWithCompletion = lesson.topics.map((topic: any) => {
      const isTopicCompleted = progressInfo.completedTopicIds.includes(topic.id);
      return { ...topic, isCompleted: isTopicCompleted };
    });

    // Return lesson with completion status and updated topics
    return {
      ...lesson,
      isCompleted: isLessonCompleted,
      topics: topicsWithCompletion,
    };
  });

  // Cache the response
  const combinedResponse = {
    ...courseHierarchy,
    lessons: lessonsWithCompletion,
    progress: progressInfo,
    assignments,
    isCompleted,
  };

  // Return the combined course hierarchy with progress information
  return res.status(200).json({
    success: true,
    data: combinedResponse,
  });
};
export const listPublishedCourses = async (req: Request, res: Response, next: NextFunction) => {
  // Parse query parameters with defaults
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const cacheKey = `course_list:${page}|${limit}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  // Fetch published courses with filtered information
  const courses = await prismaClient.course.findMany({
    where: {
      status: 'PUBLISHED',
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      thumbnail: true,
      price: true,
      specialPrice: true,
      specialPriceDescription: true,
      duration: true,
      objectives: true,
      enrollmentCount: true,
      rating: true,
      instructor: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    take: limit,
    skip: offset,
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Count total published courses
  const totalCourses = await prismaClient.course.count({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
    },
  });

  // Prepare response
  const response = {
    courses,
    pagination: {
      page,
      limit,
      total: totalCourses,
      totalPages: Math.ceil(totalCourses / limit),
    },
  };

  res.status(200).json({
    success: true,
    data: response,
  });

  // cache
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheWithRegistry(
          cacheKey,
          courses,
          getPublishedCoursesList_registry_TTL,
          'course_lists',
        );
      },
    ],
    'listPublishedCourses',
  );
};

export const publicSearchCourses = async (req: Request, res: Response, next: NextFunction) => {
  // Parse query parameters with defaults
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  // Search parameters
  const searchTerm = req.query.search as string;
  const minPrice = parseFloat(req.query.minPrice as string);
  const maxPrice = parseFloat(req.query.maxPrice as string);
  const sortBy = (req.query.sortBy as string) || 'createdAt';
  const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

  // Construct dynamic search conditions
  const searchConditions: any = {
    status: 'PUBLISHED',
    isPublic: true,
  };

  // Add search term condition if provided
  if (searchTerm) {
    searchConditions.OR = [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { objectives: { has: searchTerm } },
      {
        instructor: {
          name: { contains: searchTerm, mode: 'insensitive' },
        },
      },
    ];
  }

  // Add price range conditions
  if (!isNaN(minPrice)) {
    searchConditions.price = { gte: minPrice };
  }
  if (!isNaN(maxPrice)) {
    searchConditions.price = {
      ...searchConditions.price,
      lte: maxPrice,
    };
  }

  // Validate sortBy to prevent potential injection
  const validSortFields = ['createdAt', 'price', 'rating', 'enrollmentCount', 'title'];
  const sanitizedSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  // Fetch courses with dynamic search and sorting
  const courses = await prismaClient.course.findMany({
    where: searchConditions,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      thumbnail: true,
      price: true,
      specialPrice: true,
      specialPriceDescription: true,
      duration: true,
      objectives: true,
      enrollmentCount: true,
      rating: true,
      instructor: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    take: limit,
    skip: offset,
    orderBy: {
      [sanitizedSortBy]: sortOrder,
    },
  });

  // Count total courses matching search conditions
  const totalCourses = await prismaClient.course.count({
    where: searchConditions,
  });

  // Prepare response
  const response = {
    courses,
    pagination: {
      page,
      limit,
      total: totalCourses,
      totalPages: Math.ceil(totalCourses / limit),
    },
    searchParams: {
      searchTerm,
      minPrice,
      maxPrice,
      sortBy: sanitizedSortBy,
      sortOrder,
    },
  };

  return res.status(200).json({
    success: true,
    data: response,
  });
};

const isUserEnrolledInCourse = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  const courseSlug = req.params.slug;

  if (!userId) {
    return await throwError('AUTH016');
  }
  const isAuthorized =await isUserAuthorizedInCourse(req.user?.userId!, courseSlug);
  if (!isAuthorized) {
    return await throwError('COURSE006');
  } else {
    return res.status(200).json({
      success: true,
      message: 'User is authorized to access the course',
    });
  }
};

export {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  bulkEnrollUsers,
  getCoursePreview,
  searchCourses,
  unenrollUser,
  getEnrolledCourses,
  isUserEnrolledInCourse,
  getEnrolledUsers,
};
