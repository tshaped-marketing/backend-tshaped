import { Request, Response, NextFunction } from 'express';
import prismaClient from '../prisma/prisma.client.js';
import { CustomRequest } from '../types/auth.types.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { handleCachedResponse } from '../utils/handleCacheResponse.js';
import redisService from '../config/redis.config.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import { AssignmentSubmission } from '@prisma/client';
import {
  getStudentReport_getUserRegistrationDate_TTL,
  getStudentReport_recentAssignmentSubmissions_TTL,
  getStudentReport_submissionsRelated_TTL,
} from '../constants/redis.cacheTTL.js';

const getStudentReport = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.userId;
  const limit = parseInt(req.query.limit as string) || 5;
  // Count enrolled courses
  const enrolledCourses = await prismaClient.course.count({
    where: { students: { some: { id: userId } } },
  });

  // Count completed courses
  const completedCourses = await prismaClient.progress.count({
    where: { studentId: userId, completionRate: 100 },
  });

  // Assignment submissions counts - with caching
  // Define cache keys for each assignment count
  const assignmentSubmissionsCacheKey = `assignment_submissions_count_${userId}`;
  const assignmentsApprovedCacheKey = `assignments_approved_count_${userId}`;
  const assignmentsRejectedCacheKey = `assignments_rejected_count_${userId}`;

  // Try to get cached values
  const [cachedSubmissions, cachedApproved, cachedRejected] = await Promise.all([
    redisService.getCachedResponse(assignmentSubmissionsCacheKey),
    redisService.getCachedResponse(assignmentsApprovedCacheKey),
    redisService.getCachedResponse(assignmentsRejectedCacheKey),
  ]);

  // Initialize variables for assignment counts
  let assignmentSubmissions: number;
  let assignmentsApproved: number;
  let assignmentsRejected: number;

  // Use cached values if available, otherwise query database
  if (cachedSubmissions && cachedApproved && cachedRejected) {
    assignmentSubmissions = Number(cachedSubmissions);
    assignmentsApproved = Number(cachedApproved);
    assignmentsRejected = Number(cachedRejected);
  } else {
    // If any value is missing from cache, query all from database
    [assignmentSubmissions, assignmentsApproved, assignmentsRejected] = await Promise.all([
      prismaClient.assignmentSubmission.count({ where: { studentId: userId } }),
      prismaClient.assignmentSubmission.count({ where: { studentId: userId, status: 'APPROVED' } }),
      prismaClient.assignmentSubmission.count({ where: { studentId: userId, status: 'REJECTED' } }),
    ]);

    // Cache the results (86400 seconds = 24 hours)
    await Promise.all([
      redisService.cacheResponse(
        assignmentSubmissionsCacheKey,
        assignmentSubmissions,
        getStudentReport_submissionsRelated_TTL,
      ),
      redisService.cacheResponse(
        assignmentsApprovedCacheKey,
        assignmentsApproved,
        getStudentReport_submissionsRelated_TTL,
      ),
      redisService.cacheResponse(
        assignmentsRejectedCacheKey,
        assignmentsRejected,
        getStudentReport_submissionsRelated_TTL,
      ),
    ]);
  }

  // Comments count
  const comments = await prismaClient.comment.count({
    where: { authorId: userId },
  });

  // Total courses available
  let totalCourses: number;
  const totalCoursesCacheKey = `total_courses_count`;
  let totalCoursesCount = await redisService.getCachedResponse(totalCoursesCacheKey);
  if (totalCoursesCount) {
    totalCourses = Number(totalCoursesCount);
  } else {
    totalCourses = await prismaClient.course.count({
      where: { status: 'PUBLISHED' },
    });
    redisService.cacheResponse(totalCoursesCacheKey, totalCourses, 86400);
  }

  // Recent assignment submissions (filtered fields)
  let recentAssignmentSubmissions: AssignmentSubmission[];
  const recentAssignmentSubmissionsCacheKey = `recent_assignment_submissions_${userId}:${limit}`;
  const recentAssignmentSubmissionsCache = await redisService.getCachedResponse(
    recentAssignmentSubmissionsCacheKey,
  );
  if (recentAssignmentSubmissionsCache) {
    recentAssignmentSubmissions = recentAssignmentSubmissionsCache as AssignmentSubmission[];
  } else {
    recentAssignmentSubmissions = await prismaClient.assignmentSubmission.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        assignmentId: true,
        studentId: true,
        textContent: true,
        attachments: true,
        status: true,
        grade: true,
        feedback: true,
        reviewedBy: true,
        reviewedAt: true,
        attempts: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            attachments: true,
            courseId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    redisService.cacheWithRegistry(
      recentAssignmentSubmissionsCacheKey,
      recentAssignmentSubmissions,
      getStudentReport_recentAssignmentSubmissions_TTL,
      `recent_assignment_submissions_${userId}`,
    );
  }

  // Recent comments
  const recentComments = await prismaClient.comment.findMany({
    where: { authorId: userId },
    select: { id: true, text: true, courseId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // Calculate registration days
  const registrationDaysCacheKey = `registration_days_${userId}`;
  let registeredDate;
  const registrationDaysCache = await redisService.getCachedResponse(registrationDaysCacheKey);
  if (registrationDaysCache) {
    registeredDate = Number(registrationDaysCache);
  } else {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    registeredDate = user
      ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    redisService.cacheResponse(
      registrationDaysCacheKey,
      registeredDate,
      getStudentReport_getUserRegistrationDate_TTL,
    );
  }

  const combinedResponse = {
    counts: {
      enrolledCourses,
      completedCourses,
      assignmentSubmissions,
      comments,
      registeredDate,
      assignmentsApproved,
      assignmentsRejected,
      totalCourses,
    },
    courses: [], // Populate this based on your requirement
    recents: {
      assignmentSubmissions: recentAssignmentSubmissions,
      recentComments,
    },
  };

  res.status(200).json(combinedResponse);
};

export { getStudentReport };
