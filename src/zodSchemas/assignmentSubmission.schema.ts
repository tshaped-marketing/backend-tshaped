import { AssignmentStatus } from '@prisma/client';
import { z } from 'zod';

const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string().optional(),
});

// Enhanced schema with pagination, sorting and filtering
export const getAllSubmissionsSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      page: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val) : 1)),
      limit: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val) : 10)),
      sortBy: z.enum(['submittedAt', 'status', 'grade']).optional().default('submittedAt'),
      sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
      status: z
        .enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION'])
        .optional(),
      startDate: z
        .string()
        .optional()
        .transform(val => (val ? new Date(val) : undefined)),
      endDate: z
        .string()
        .optional()
        .transform(val => (val ? new Date(val) : undefined)),
      search: z.string().optional(),
    })
    .strict(),
  params: z.object({}).strict(),
});

// Enhanced schema for getting submissions by assignment
export const getSubmissionsByAssignmentSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      page: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val) : 1)),
      limit: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val) : 10)),
      sortBy: z.enum(['submittedAt', 'status', 'grade']).optional().default('submittedAt'),
      sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
      status: z
        .enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION'])
        .optional(),
    })
    .strict(),
  params: z
    .object({
      assignmentId: z.string(),
    })
    .strict(),
});

// Other schemas remain the samee
export const submitAssignmentSchema = z.object({
  body: z
    .object({
      textContent: z.string(),
      attachments: z.array(attachmentSchema).optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      assignmentId: z.string(),
    })
    .strict(),
});

export const getSubmissionSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      assignmentId: z.string(),
    })
    .strict(),
});

export const updateSubmissionSchema = z.object({
  body: z
    .object({
      textContent: z.string(),
      attachments: z.array(attachmentSchema).optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      assignmentId: z.string(),
    })
    .strict(),
});

export const getCourseSubmissionHistorySchema = {
  params: z.object({
    courseId: z.string().cuid(),
  }),
  query: z
    .object({
      page: z.preprocess(val => Number(val) || 1, z.number().positive().optional()),
      limit: z.preprocess(val => Number(val) || 10, z.number().positive().optional()),
      sortBy: z.enum(['submittedAt', 'status', 'grade']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      status: z.nativeEnum(AssignmentStatus).optional(),
    })
    .optional(),
};
