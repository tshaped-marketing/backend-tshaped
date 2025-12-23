import { Request, Response, NextFunction } from 'express';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { CustomRequest } from '../types/auth.types.js';
import { isUserAuthorizedInCourse } from '../utils/isUserAuthorizedInCourse.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import redisService from '../config/redis.config.js';
import { generateCertificateForCompletedCourse } from '../utils/generateCertificateForCompletedCourse.js';

const updateTopicProgress = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.userId;
  var { 
    courseId, 
    newCompletedTopicIds, 
    isLessonCompleted = false, 
    standaloneLessonId 
  } = req.body;

  // Verify if user is enrolled in the course
  const isEnrolled = await isUserAuthorizedInCourse(req.user?.userId!, courseId);
  if (!isEnrolled) {
    return await throwError('COURSE006');
  }

  // Send immediate response
  res.status(200).json({
    success: true,
    message: 'Progress update initiated successfully',
  });

  // Process the rest in background
  executeBackgroundTasks(
    [
      async () => {
        // Verify course exists and get topics and lessons structure
        const course = await prismaClient.course.findUnique({
          where: { id: courseId },
          select: {
            lessons: {
              select: {
                id: true,
                topics: {
                  select: { id: true, lessonId: true },
                },
              },
            },
          },
        });

        if (!course) {
          throw new Error('Course not found');
        }

        // Handle lesson completion when standaloneLessonId is provided
        if (standaloneLessonId && isLessonCompleted) {
          const foundLesson = course.lessons.find(lesson => lesson.id === standaloneLessonId);
          
          if (!foundLesson) {
            throw new Error('Lesson not found in course');
          }

          // Get existing progress
          const existingProgress = await prismaClient.progress.findUnique({
            where: {
              studentId_courseId: {
                studentId: userId as string,
                courseId: courseId,
              },
            },
          });

          let existingCompletedLessonIds = existingProgress?.completedLessonIds || [];
          const existingCompletedTopicIds = existingProgress?.completedTopicIds || [];

          // Check if lesson has topics
          if (foundLesson.topics.length > 0) {
            // For lessons with topics, verify all topics are completed
            const lessonTopicIds = foundLesson.topics.map(topic => topic.id);
            const allTopicsCompleted = lessonTopicIds.every(topicId => 
              existingCompletedTopicIds.includes(topicId)
            );

            if (!allTopicsCompleted) {
              throw new Error('Cannot mark lesson as complete when not all topics are completed');
            }
          }

          // Add lesson to completed lessons if not already completed
          if (!existingCompletedLessonIds.includes(standaloneLessonId)) {
            existingCompletedLessonIds = [...existingCompletedLessonIds, standaloneLessonId];
          }

          // Calculate completion rate (90% max as per business rules)
          const completionRate = Math.min(
            (existingCompletedLessonIds.length / course.lessons.length) * 90,
            90,
          );

          // Count total topics in the course for consistency
          const totalTopics = course.lessons.reduce((acc, lesson) => acc + lesson.topics.length, 0);

          // Update progress record for lesson completion
          const progress = await prismaClient.progress.upsert({
            where: {
              studentId_courseId: {
                studentId: userId as string,
                courseId: courseId,
              },
            },
            update: {
              completedLessons: existingCompletedLessonIds.length,
              totalLessons: course.lessons.length,
              completedLessonIds: existingCompletedLessonIds,
              completedTopicIds: existingCompletedTopicIds, // Keep existing topics
              totalTopics,
              completionRate,
            },
            create: {
              studentId: userId as string,
              courseId: courseId,
              completedLessons: existingCompletedLessonIds.length,
              totalLessons: course.lessons.length,
              completedLessonIds: existingCompletedLessonIds,
              completedTopicIds: existingCompletedTopicIds,
              totalTopics,
              completionRate,
            },
          });

          // Clear cache and generate certificate
          await redisService.deleteCachedResponse(`course_progress:${userId}:${courseId}`);
          await redisService.invalidateRegistry(`getEnrolledCourses:${userId}`);
          
          generateCertificateForCompletedCourse(
            req.user!.userId,
            courseId,
            progress?.completionRate || 0,
            req.user?.name || 'Student',
          );

          return; // Exit after handling lesson completion
        }

        // Original topic-based completion logic (when no standaloneLessonId)
        // Create maps for validation
        const lessonTopicsMap = new Map();
        const topicToLessonMap = new Map();
        const validTopicIds = new Set();

        course.lessons.forEach(lesson => {
          const topicIds = lesson.topics.map(topic => topic.id);
          lessonTopicsMap.set(lesson.id, topicIds);
          lesson.topics.forEach(topic => {
            topicToLessonMap.set(topic.id, lesson.id);
            validTopicIds.add(topic.id);
          });
        });

        // Filter out null values from newCompletedTopicIds for topic validation
        const validNewTopicIds = newCompletedTopicIds.filter((id: string) => id !== null);

        // Validate topics exist in course (only for non-null topic IDs)
        if (validNewTopicIds.length > 0) {
          const invalidTopics = validNewTopicIds.filter((id: string) => !validTopicIds.has(id));
          if (invalidTopics.length > 0) {
            throw new Error('One or more topics not found in course');
          }
        }

        // Get existing progress
        const existingProgress = await prismaClient.progress.findUnique({
          where: {
            studentId_courseId: {
              studentId: userId as string,
              courseId: courseId,
            },
          },
        });

        const existingCompletedTopicIds = existingProgress?.completedTopicIds || [];
        let existingCompletedLessonIds = existingProgress?.completedLessonIds || [];

        // Filter out already completed topics and null values
        const newUniqueTopicIds = validNewTopicIds.filter(
          (id: string) => !existingCompletedTopicIds.includes(id),
        );

        // Combine all completed topic IDs
        const allCompletedTopicIds = [...existingCompletedTopicIds, ...newUniqueTopicIds];

        // Handle lesson completion for topic-based lessons
        if (isLessonCompleted && validNewTopicIds.length > 0) {
          // Get lessons affected by new topics
          const affectedLessonIds = new Set(
            validNewTopicIds.map((topicId: any) => topicToLessonMap.get(topicId)),
          );

          for (const lessonId of affectedLessonIds) {
            if (!lessonId || existingCompletedLessonIds.includes(lessonId as any)) continue;

            const lessonTopics = lessonTopicsMap.get(lessonId);
            const allTopicsCompleted = lessonTopics.every((topicId: string) =>
              allCompletedTopicIds.includes(topicId),
            );

            // Enforce completion rules
            if (!allTopicsCompleted && isLessonCompleted) {
              throw new Error('Cannot mark lesson as complete when not all topics are completed');
            }

            // Only mark lesson as completed if all topics are done
            if (allTopicsCompleted) {
              existingCompletedLessonIds = [...(existingCompletedLessonIds as any), lessonId];
            }
          }
        }

        // Calculate completion rate (90% max as per business rules)
        const completionRate = Math.min(
          (existingCompletedLessonIds.length / course.lessons.length) * 90,
          90,
        );

        // Update progress record
        const progress = await prismaClient.progress.upsert({
          where: {
            studentId_courseId: {
              studentId: userId as string,
              courseId: courseId,
            },
          },
          update: {
            completedLessons: existingCompletedLessonIds.length,
            totalLessons: course.lessons.length,
            completedLessonIds: existingCompletedLessonIds,
            completedTopicIds: allCompletedTopicIds,
            totalTopics: validTopicIds.size,
            completionRate,
          },
          create: {
            studentId: userId as string,
            courseId: courseId,
            completedLessons: existingCompletedLessonIds.length,
            totalLessons: course.lessons.length,
            completedLessonIds: existingCompletedLessonIds,
            completedTopicIds: allCompletedTopicIds,
            totalTopics: validTopicIds.size,
            completionRate,
          },
        });

        await redisService.deleteCachedResponse(`course_progress:${userId}:${courseId}`);
        await redisService.invalidateRegistry(`getEnrolledCourses:${userId}`);
        
        generateCertificateForCompletedCourse(
          req.user!.userId,
          courseId,
          progress?.completionRate || 0,
          req.user?.name || 'Student',
        );
      },
    ],
    `updateTopicProgress for userId: ${userId}, courseId: ${courseId}`,
  );
};

const getCourseProgress = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.userId;
  const { courseId } = req.params;

  //Verify is user is enrolled in the course
  const isEnrolled = await isUserAuthorizedInCourse(req.user?.userId!, courseId);

  if (!isEnrolled) {
    return await throwError('COURSE006');
  }

  const progress = await prismaClient.progress.findUnique({
    where: {
      studentId_courseId: {
        studentId: userId as string,
        courseId: courseId,
      },
    },
  });

  if (!progress) {
    res.status(200).json({
      success: true,
      data: {
        completedLessons: 0,
        totalLessons: 0,
        completedTopicIds: [],
        totalTopics: 0,
        completionRate: 0,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: progress,
  });
};

const markAsIncomplete = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.userId;
  const { courseId, topicIds, lessonIds } = req.body;

  // Verify user is enrolled in the course
  const isEnrolled =await isUserAuthorizedInCourse(req.user?.userId!, courseId);
  if (!isEnrolled) {
    return await throwError('COURSE006');
  }

  // Send immediate response
  res.status(200).json({
    success: true,
    message: 'Progress invalidation initiated successfully',
  });

  // Process the rest in background
  executeBackgroundTasks(
    [
      async () => {
        // Verify course exists and get structure
        const course = await prismaClient.course.findUnique({
          where: { id: courseId },
          select: {
            lessons: {
              select: {
                id: true,
                topics: {
                  select: { id: true },
                },
              },
            },
          },
        });

        if (!course) {
          throw new Error('Course not found');
        }

        // Get current progress
        const progress = await prismaClient.progress.findUnique({
          where: {
            studentId_courseId: {
              studentId: userId as string,
              courseId,
            },
          },
        });

        if (!progress) {
          throw new Error('No progress record found');
        }

        // Check if course is completed (90% threshold as per business rules)
        if (progress.completionRate >= 90) {
          throw new Error('Cannot modify progress for a completed course');
        }

        let updatedCompletedTopicIds = [...progress.completedTopicIds];
        let updatedCompletedLessonIds = [...progress.completedLessonIds];

        // Create maps for validation
        const lessonTopicsMap = new Map();
        course.lessons.forEach(lesson => {
          lessonTopicsMap.set(
            lesson.id,
            lesson.topics.map(topic => topic.id),
          );
        });

        // Handle lesson incompletion
        if (lessonIds?.length) {
          // Validate all lessonIds exist in course
          const validLessonIds = new Set(course.lessons.map(lesson => lesson.id));
          if (!lessonIds.every((id: any) => validLessonIds.has(id))) {
            throw new Error('One or more lessons not found in course');
          }

          // Update completed lessons
          updatedCompletedLessonIds = updatedCompletedLessonIds.filter(
            id => !lessonIds.includes(id),
          );

          // Also remove all topics belonging to these lessons
          lessonIds.forEach((lessonId: any) => {
            const lessonTopics = lessonTopicsMap.get(lessonId) || [];
            updatedCompletedTopicIds = updatedCompletedTopicIds.filter(
              topicId => !lessonTopics.includes(topicId),
            );
          });
        }

        // Handle topic incompletion
        if (topicIds?.length) {
          // Validate topics exist in course
          const validTopicIds = new Set(
            course.lessons.flatMap(lesson => lesson.topics.map(topic => topic.id)),
          );
          if (!topicIds.every((id: any) => validTopicIds.has(id))) {
            throw new Error('One or more topics not found in course');
          }

          // Check if any topics belong to completed lessons
          const topicLessonMap = new Map();
          course.lessons.forEach(lesson => {
            lesson.topics.forEach(topic => {
              topicLessonMap.set(topic.id, lesson.id);
            });
          });

          const invalidTopics = topicIds.filter((topicId: any) =>
            updatedCompletedLessonIds.includes(topicLessonMap.get(topicId)),
          );

          if (invalidTopics.length > 0) {
            throw new Error('Cannot mark topics as incomplete if their lessons are completed');
          }

          // Update completed topics
          updatedCompletedTopicIds = updatedCompletedTopicIds.filter(id => !topicIds.includes(id));
        }

        // Calculate new completion rate
        const completionRate = Math.min(
          (updatedCompletedLessonIds.length / course.lessons.length) * 90,
          90,
        );

        // Update progress
        await prismaClient.progress.update({
          where: {
            studentId_courseId: {
              studentId: userId as string,
              courseId,
            },
          },
          data: {
            completedLessons: updatedCompletedLessonIds.length,
            completedLessonIds: updatedCompletedLessonIds,
            completedTopicIds: updatedCompletedTopicIds,
            completionRate,
          },
        });
        await redisService.deleteCachedResponse(
          `course_progress:${userId}:${courseId}`)
              await redisService.invalidateRegistry(
          `getEnrolledCourses:${userId}`,
        );
      },

    ],
    `markAsIncomplete for userId: ${userId}, courseId: ${courseId}`,
  );
};
export { updateTopicProgress, getCourseProgress, markAsIncomplete };