import { Request, Response } from 'express';
import { AssignmentStatus, Role } from '@prisma/client';
import { CustomRequest } from '../types/auth.types.js';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import determineMediaType from '../utils/determineMIME.js';
import { notificationService } from '../server.js';
import { ADMIN_IDS } from '../constants/env.constant.js';
import { sendSuccess } from '../middlewares/successHandler.middleware.js';
import { isUserAuthorizedInCourse } from '../utils/isUserAuthorizedInCourse.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import redisService from '../config/redis.config.js';
import { formatDateTime } from '../utils/formatDateTime.js';

const submitAssignment = async (req: CustomRequest, res: Response): Promise<void> => {
  const { assignmentId } = req.params;
  const studentId = req.user?.userId;
  const userRole = req.user?.role;
  if (!studentId) {
    return await throwError('AUTH001');
  }

  // Prevent admin users from submitting assignments
  if (userRole === Role.ADMIN) {
    return await throwError('SUBMIT010');
  }

  const { textContent, attachments } = req.body;

  // Validate that at least one of textContent or attachments is provided
  if (!textContent && (!attachments || attachments.length === 0)) {
    return await throwError('SUBMIT008');
  }

  const assignment = await prismaClient.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      submissions: {
        where: {
          studentId,
        },
      },
    },
  });

  const courseId = assignment!.courseId;

  //Check if user is enrolled in the course
  const isEnrolled =await isUserAuthorizedInCourse(req.user!.userId, courseId);
  if (!isEnrolled) {
    return await throwError('COURSE006');
  }

  if (!assignment) {
    return await throwError('ASSIGN002');
  }

  // Check if submission already exists
  if (assignment.submissions.length > 0) {
    return await throwError('SUBMIT009'); // You'll need to add this error code
  }

  if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
    return await throwError('SUBMIT002');
  }
  //Determine attachment type
  let updatedAttachments;
  if (attachments && attachments.length > 0) {
    updatedAttachments = await Promise.all(
      attachments.map(async (attachment: any) => ({
        ...attachment,
        type: attachment.type || (await determineMediaType(attachment.url)),
      })),
    );
  }
  const submission = await prismaClient.assignmentSubmission.create({
    data: {
      assignmentId,
      studentId,
      textContent,
      attachments: updatedAttachments,
      status: AssignmentStatus.SUBMITTED,
      submittedAt: new Date(),
      attempts: 1,
    },
  });

  await sendSuccess(res, 'ASSIGNMENT_SUBMIT', {
    data: submission,
  });

  executeBackgroundTasks(
    [
      async () => {
        await redisService.invalidateRegistry(`recent_assignment_submissions_${studentId}`);
        redisService.deleteCachedResponse(`assignment_submissions_count_${studentId}`);
        notificationService.createNotification({
          userId: ADMIN_IDS[0],
          type: 'ADMIN',
          message: `New assignment submission for ${assignment.title} by ${req.user?.name}`,
          metadata: {
            event: 'STUDENT_ASSIGNMENT_SUBMISSION',
            assignmentId: assignment.id,
            studentId: req.user?.userId,
          },
        });
      },
    ],
    'submitSubmission',
  );
};

const getSubmission = async (req: CustomRequest, res: Response): Promise<void> => {
  const { assignmentId } = req.params;
  const studentId = req.user?.userId;

  if (!studentId) {
    return await throwError('AUTH001');
  }

  const submission = await prismaClient.assignmentSubmission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId,
        studentId,
      },
    },
    include: {
      assignment: {
        select: {
          title: true,
          description: true,
          maxScore: true,
          dueDate: true,
          instructions: true,
        },
      },
    },
  });

  if (!submission) {
    return await throwError('SUBMIT003');
  }

  // Format the submission data with formatted date
  const formattedSubmission = {
    ...submission,
    submittedAt: submission.submittedAt ? formatDateTime(submission.submittedAt) : null,
  };
  res.status(200).json({
    success: true,
    data: formattedSubmission,
  });
};

const getAllSubmissions = async (req: CustomRequest, res: Response): Promise<void> => {
  const studentId = req.user?.userId;
  if (!studentId) {
    return await throwError('AUTH001');
  }

  const {
    page = 1,
    limit = 10,
    sortBy = 'submittedAt',
    sortOrder = 'desc',
    status,
    startDate,
    endDate,
    search,
  } = req.query;

  // Build where clause
  const where: any = {
    studentId,
  };

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.submittedAt = {};
    if (startDate) where.submittedAt.gte = startDate;
    if (endDate) where.submittedAt.lte = endDate;
  }

  if (search) {
    where.OR = [
      {
        assignment: {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },
      {
        textContent: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ];
  }

  // Get total count for pagination
  const total = await prismaClient.assignmentSubmission.count({ where });

  // Get paginated results
  const submissions = await prismaClient.assignmentSubmission.findMany({
    where,
    include: {
      assignment: {
        select: {
          title: true,
          description: true,
          maxScore: true,
          dueDate: true,
          course: {
            select: {
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      [sortBy as string]: sortOrder,
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  res.status(200).json({
    success: true,
    data: submissions,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
};

const getSubmissionsByAssignment = async (req: CustomRequest, res: Response): Promise<void> => {
  const { assignmentId } = req.params;
  const { page = 1, limit = 10, sortBy = 'submittedAt', sortOrder = 'desc', status } = req.query;

  // Build where clause
  const where: any = {
    assignmentId,
  };

  if (status) {
    where.status = status;
  }

  // Get total count for pagination
  const total = await prismaClient.assignmentSubmission.count({ where });

  // Get paginated results
  const submissions = await prismaClient.assignmentSubmission.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignment: {
        select: {
          title: true,
          description: true,
          maxScore: true,
          dueDate: true,
        },
      },
    },
    orderBy: {
      [sortBy as string]: sortOrder,
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  res.status(200).json({
    success: true,
    data: submissions,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
};
const updateSubmission = async (req: CustomRequest, res: Response): Promise<void> => {
  const { assignmentId } = req.params;
  const studentId = req.user?.userId;

  if (!studentId) {
    return await throwError('AUTH001');
  }

  const { textContent, attachments } = req.body;

  const submission = await prismaClient.assignmentSubmission.findUnique({
    where: {
      assignmentId_studentId: { assignmentId, studentId },
    },
    include: {
      assignment: true,
      submissionHistory: true, // Keeping camelCase as per Prisma Client's types
    },
  });

  if (!submission) {
    return await throwError('SUBMIT003');
  }

  // Check assignment deadline
  if (submission.assignment.dueDate && new Date() > new Date(submission.assignment.dueDate)) {
    return await throwError('SUBMIT002');
  }

  // Update the submission
  const updatedSubmission = await prismaClient.assignmentSubmission.update({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    data: {
      textContent,
      attachments,
      status: AssignmentStatus.SUBMITTED,
      attempts: { increment: 1 },
      submittedAt: new Date(),
      updatedAt: new Date(),
    },
  });
  await sendSuccess(res, 'ASSIGNMENT_SUBMISSION_UPDATE', {
    data: updatedSubmission,
  });

  executeBackgroundTasks(
    [
      async () => {

  // Save current submission to history
  const historyVersion = submission.submissionHistory.length + 1; // Using camelCase

  await prismaClient.submissionHistory.create({
    data: {
      submissionId: submission.id,
      textContent: submission.textContent,
      attachments: submission.attachments!,
      status: submission.status,
      grade: submission.grade,
      feedback: submission.feedback,
      version: historyVersion,
      changedBy: studentId,
      changeReason: 'Updated submission by student',
      createdAt: new Date(),
    },
  });

        await redisService.invalidateRegistry(`recent_assignment_submissions_${studentId}`);
        redisService.deleteCachedResponse(`assignment_submissions_count_${studentId}`);
      },
    ],
    'updateSubmission',
  );
};

const getSubmissionHistory = async (req: CustomRequest, res: Response): Promise<void> => {
  const { assignmentId } = req.params;
  const studentId = req.user?.userId;

  if (!studentId) {
    return await throwError('AUTH001');
  }

  const submission = await prismaClient.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    include: { submissionHistory: true },
  });

  if (!submission || submission.submissionHistory.length === 0) {
    return await throwError('SUBMIT011');
  }
  return await sendSuccess(res, 'ASSIGNMENT_HISTORY_GET', {
    data: submission.submissionHistory,
  });
};

const getCourseSubmissionHistory = async (req: CustomRequest, res: Response): Promise<void> => {
  const { courseId } = req.params;
  const studentId = req.user?.userId;

  if (!studentId) {
    return await throwError('AUTH001');
  }

  const { page = 1, limit = 10, sortBy = 'submittedAt', sortOrder = 'desc', status } = req.query;

  // Build where clause
  const where: any = {
    studentId,
    assignment: {
      courseId,
    },
  };

  if (status) {
    where.status = status;
  }

  // Get total count for pagination
  const total = await prismaClient.assignmentSubmission.count({ where });

  // Get paginated submission history with related assignment and course data
  const submissionHistory = await prismaClient.assignmentSubmission.findMany({
    where,
    include: {
      assignment: {
        select: {
          id: true,
          title: true,
          description: true,
          maxScore: true,
          dueDate: true,
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      [sortBy as string]: sortOrder,
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  res.status(200).json({
    success: true,
    data: submissionHistory,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
};
export {
  submitAssignment,
  getSubmission,
  getAllSubmissions,
  updateSubmission,
  getSubmissionsByAssignment,
  getCourseSubmissionHistory,
  getSubmissionHistory,
};
