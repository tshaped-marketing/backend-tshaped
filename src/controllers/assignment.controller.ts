import { Request, Response, NextFunction } from 'express';
import prismaClient from '../prisma/prisma.client.js';
import { CustomRequest } from '../types/auth.types.js';
import { AssignmentStatus } from '@prisma/client';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import determineMediaType from '../utils/determineMIME.js';
import { notificationService } from '../server.js';
import { sendSuccess } from '../middlewares/successHandler.middleware.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import redisService from '../config/redis.config.js';
import { generateCertificateForCompletedCourse } from '../utils/generateCertificateForCompletedCourse.js';

const createAssignment = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { title, description, courseId, instructions, attachments } = req.body;

  const userId = req.user?.userId;

  if (!userId) {
    return await throwError('AUTH021');
  }

  // Verify instructor owns the course
  const course = await prismaClient.course.findFirst({
    where: {
      id: courseId
    },
  });

  if (!course) {
    return await throwError('ASSIGN001');
  }

  //Determine attachment type
  let updatedAttachments;
  if (attachments) {
    updatedAttachments = await Promise.all(
      attachments.map(async (attachment: any) => ({
        ...attachment,
        type: attachment.type ? attachment.type : await determineMediaType(attachment.url),
      })),
    );
  }

  const assignment = await prismaClient.assignment.create({
    data: {
      title,
      description,
      courseId,
      instructions,
      userId,
      status: AssignmentStatus.PUBLISHED,
      attachments: attachments ? JSON.stringify(updatedAttachments) : (null as any),
    },
  });

  res.status(201).json({
    success: true,
    data: assignment,
  });

  // Delete the cached response for the updated page
  executeBackgroundTasks(
    [
      async () => {
        await redisService.deleteCachedResponse(`course_assignments:${assignment.courseId}`);
      },
    ],
    'createAssignment',
  );
};

const getAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const assignment = await prismaClient.assignment.findUnique({
    where: { id },
    include: {
      submissions: true,
      course: true,
    },
  });

  if (!assignment) {
    return await throwError('ASSIGN002');
  }

  // Parse attachments if they exist
  const responseData = {
    ...assignment,
    attachments: assignment.attachments ? JSON.parse(assignment.attachments as string) : null,
  };

  res.status(200).json({
    success: true,
    data: responseData,
  });
};

const updateAssignment = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const updateData = req.body;

  if (!userId) {
    return await throwError('AUTH001');
  }

  // Verify instructor owns the assignment
  const assignment = await prismaClient.assignment.findFirst({
    where: {
      id,
      course: {
        instructorId: userId,
      },
    },
  });

  if (!assignment) {
    return await throwError('ASSIGN003');
  }

  // Process attachments if they exist
  let processedData = { ...updateData };

  if (updateData.attachments) {
    // Update attachment types if needed
    const updatedAttachments = await Promise.all(
      updateData.attachments.map(async (attachment: any) => ({
        ...attachment,
        type: attachment.type ? attachment.type : await determineMediaType(attachment.url),
      })),
    );

    processedData.attachments = JSON.stringify(updatedAttachments);
  }

  const updatedAssignment = await prismaClient.assignment.update({
    where: { id },
    data: processedData,
  });

  // Parse attachments back to JSON before sending response
  const responseData = {
    ...updatedAssignment,
    attachments: updatedAssignment.attachments
      ? JSON.parse(updatedAssignment.attachments as string)
      : null,
  };

  res.status(200).json({
    success: true,
    data: responseData,
  });

  // Delete the cached response for the updated page
  executeBackgroundTasks(
    [
      async () => {
        await redisService.deleteCachedResponse(`course_assignments:${updatedAssignment.courseId}`);
      },
    ],
    'updateAssignment',
  );
};

const deleteAssignment = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    return await throwError('AUTH001');
  }

  // Verify instructor owns the assignment
  const assignment = await prismaClient.assignment.findFirst({
    where: {
      id,
      course: {
        instructorId: userId,
      },
    },
  });

  if (!assignment) {
    return await throwError('ASSIGN004');
  }

  await prismaClient.assignment.delete({
    where: { id },
  });

  await sendSuccess(res, 'ASSIGNMENT_DELETE');

  // Delete the cached response for the updated page
  executeBackgroundTasks(
    [
      async () => {
        await redisService.deleteCachedResponse(`course_assignments:${assignment.courseId}`);
      },
    ],
    'deleteAssignment',
  );
};

const gradeSubmission = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { submissionId } = req.params;
  const { feedback, status } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return await throwError('AUTH001');
  }

  // Verify instructor owns the course
  const submission = await prismaClient.assignmentSubmission.findFirst({
    where: {
      id: submissionId,
      assignment: {
        course: {
          instructorId: userId,
        },
      },
    },
    include: {
      assignment: {
        select: {
          courseId: true,
        },
      },
    },
  });

  if (!submission) {
    return await throwError('SUBMIT001');
  }

  const updatedSubmission = await prismaClient.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      feedback,
      status,
      reviewedBy: userId,
      reviewedAt: new Date(),
    },
  });

  res.status(200).json({
    success: true,
    data: updatedSubmission,
  });

  executeBackgroundTasks(
    [
      async () => {
        if (updatedSubmission.status == AssignmentStatus.APPROVED) {
          //Give 10 percent progress increment
          const progress = await prismaClient.progress.findFirst({
            where: {
              studentId: updatedSubmission.studentId,
              courseId: submission.assignment.courseId,
            },
          });


          if (progress && !progress.assignmentProgressCounted) {
            await prismaClient.$transaction(async prisma => {
              await prisma.progress.update({
                where: {
                  id: progress.id,
                },
                data: {
                  completionRate: Math.min(100, progress.completionRate + 10),
                },
              });
              progress.assignmentProgressCounted = true;
            });
          }
console.log("progress per for assignment",progress?.completionRate);
            //Generate certificate if course is completed
        generateCertificateForCompletedCourse(
          updatedSubmission.studentId,
          submission.assignment.courseId,
          progress?.completionRate || 0,
          req.user?.name || 'Student',
        )
        }

        //Extract course name
        const course = await prismaClient.course.findFirst({
          where: {
            id: submission.assignment.courseId,
          },
        });

        //Send notification to student
        notificationService.createNotification({
          userId: submission.studentId,
          type: 'STUDENT',
          message: `Your assignment for course ${course?.title} has been ${updatedSubmission.status}`,
          metadata: {
            event: 'STUDENT_ASSIGNMENT_GRADED',
          },
        });
        await redisService.invalidateRegistry(
          `recent_assignment_submissions_${submission.studentId}`,
        );
          await redisService.invalidateRegistry(
          `getEnrolledCourses:${submission.studentId}`,
        );
        await redisService.invalidateMultipleKeys([
          `assignments_approved_count_${submission.studentId}`,
          `assignments_rejected_count_${submission.studentId}`,
          `course_progress:${submission.studentId}:${submission.assignment.courseId}`
        ]);

      },
    ],
    'submitSubmission',
  );
};

const getStudentSubmissions = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.userId;
  const { courseId } = req.params;

  if (!userId) {
    return await throwError('AUTH001');
  }

  const submissions = await prismaClient.assignmentSubmission.findMany({
    where: {
      studentId: userId,
      assignment: {
        courseId,
      },
    },
    include: {
      assignment: true,
      student: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: submissions,
  });
};

const getCourseAssignments = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { courseId } = req.params;
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  if (!userId) {
    return await throwError('AUTH001');
  }

  // If the user is ADMIN, bypass course access check
  if (userRole?.toUpperCase() === 'ADMIN') {
    const assignments = await prismaClient.assignment.findMany({
      where: {
        courseId,
      },
    });

    return res.status(200).json({ assignments });
  }

  // First verify the user has access to this course
  const course = await prismaClient.course.findFirst({
    where: {
      id: courseId,
      OR: [{ instructorId: userId }, { students: { some: { id: userId } } }],
    },
  });

  if (!course) {
    return await throwError('ASSIGN005');
  }

  // Get all assignments for the course
  const assignments = await prismaClient.assignment.findMany({
    where: {
      courseId,
    },
    include: {
      submissions: {
        where: {
          studentId: userId,
        },
      },
      course: {
        select: {
          title: true,
          instructorId: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.status(200).json({
    success: true,
    data: assignments,
  });
};

export {
  createAssignment,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  gradeSubmission,
  getStudentSubmissions,
  getCourseAssignments,
};
