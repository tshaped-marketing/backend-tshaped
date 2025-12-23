import { z } from 'zod';
import { AssignmentStatus } from '@prisma/client';

// Common schemas that are reused
const assignmentIdParam = z
  .object({
    id: z.string().cuid(),
  })
  .strict();

const courseIdParam = z
  .object({
    courseId: z.string().cuid(),
  })
  .strict();

const submissionIdParam = z
  .object({
    submissionId: z.string().cuid(),
  })
  .strict();

const attachmentSchema = z
  .object({
    name: z.string(),
    url: z.string(),
    type: z.string().optional(),
  })
  .strict();

// Create Assignment Schema
export const createAssignmentSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).max(255),
      description: z.string().min(1),
      courseId: z.string().cuid(),
      instructions: z.string().optional(),
      attachments: z.array(attachmentSchema).optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

// Get Assignments Schema
export const getAssignmentsSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: courseIdParam,
});

// Get Single Assignment Schema
export const getAssignmentSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: assignmentIdParam,
});

// Update Assignment Schema
export const updateAssignmentSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).max(255).optional(),
      description: z.string().min(1).optional(),
      instructions: z.string().optional(),
      attachments: z.array(attachmentSchema).optional(),
      status: z
        .enum([
          AssignmentStatus.DRAFT,
          AssignmentStatus.SUBMITTED,
          AssignmentStatus.IN_REVIEW,
          AssignmentStatus.APPROVED,
          AssignmentStatus.REJECTED,
          AssignmentStatus.NEEDS_REVISION,
        ])
        .optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: assignmentIdParam,
});

// Delete Assignment Schema
export const deleteAssignmentSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: assignmentIdParam,
});

// Grade Submission Schema
export const gradeSubmissionSchema = z.object({
  body: z
    .object({
      feedback: z.string().optional(),
      status: z.enum([
        AssignmentStatus.DRAFT,
        AssignmentStatus.SUBMITTED,
        AssignmentStatus.IN_REVIEW,
        AssignmentStatus.APPROVED,
        AssignmentStatus.REJECTED,
        AssignmentStatus.NEEDS_REVISION,
      ]),
    })
    .strict(),
  query: z.object({}).strict(),
  params: submissionIdParam,
});

// Get Student Submissions Schema
export const getStudentSubmissionsSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: courseIdParam,
});

export const getCourseAssignmentsSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      status: z
        .enum([
          AssignmentStatus.DRAFT,
          AssignmentStatus.SUBMITTED,
          AssignmentStatus.IN_REVIEW,
          AssignmentStatus.APPROVED,
          AssignmentStatus.REJECTED,
          AssignmentStatus.NEEDS_REVISION,
        ])
        .optional(),
    })
    .strict(),
  params: courseIdParam,
});
