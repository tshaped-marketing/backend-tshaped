import { z } from 'zod';
import { LessonStatus, MediaType } from '@prisma/client';

// Lesson Order Enum
export const LessonOrderEnum = z.number().int().positive();

// Create Lesson Schema
export const createLessonSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, { message: 'Title is required' }),
      description: z.string().optional(),
      courseId: z.string().min(1, { message: 'Course ID is required' }),
      duration: z.number().int().positive().optional(),
      isPublic: z.boolean().optional(),
      order: z.number().int().positive().optional(),
      // New fields
      slug: z.string().optional(),
      status: z.nativeEnum(LessonStatus).optional().default('DRAFT'),
      mediaType: z.nativeEnum(MediaType).optional(),
      mediaUrl: z.string().optional(),
      attachments: z
        .array(
          z.object({
            name: z.string(),
            url: z.string(),
          }),
        )
        .optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const updateLessonSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      duration: z.number().int().positive().optional(),
        order: z.number().int().positive().optional(),
      // New fields
      slug: z.string().optional(),
      status: z.nativeEnum(LessonStatus).optional(),
      mediaType: z.nativeEnum(MediaType).optional(),
      mediaUrl: z.string().optional(),
      attachments: z
        .array(
          z.object({
            name: z.string(),
            url: z.string(),
          }),
        )
        .optional(),
      isPublic: z.boolean().optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

// Keep existing schemas
export const getLessonByIdSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const getLessonsByCourseIdSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      courseId: z.string(),
    })
    .strict(),
});

export const deleteLessonSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

// Add this to your existing lesson.schema.ts
export const searchLessonsSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      search: z.string().optional(),
      sortBy: z.enum(['title', 'createdAt', 'status', 'order']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      status: z.nativeEnum(LessonStatus).optional(),
      limit: z.string().transform(Number).optional(),
      page: z.string().transform(Number).optional(),
    })
    .strict(),
  params: z.object({}).strict(),
});

export type SearchLessonsQuery = z.infer<typeof searchLessonsSchema>['query'];
// Types for the request inputs
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type GetLessonByIdInput = z.infer<typeof getLessonByIdSchema>;
export type GetLessonsByCourseIdInput = z.infer<typeof getLessonsByCourseIdSchema>;
export type DeleteLessonInput = z.infer<typeof deleteLessonSchema>;

// Types for just the body content
export type CreateLessonBody = z.infer<typeof createLessonSchema>['body'];
export type UpdateLessonBody = z.infer<typeof updateLessonSchema>['body'];

// Types for just the params content
export type GetLessonByIdParams = z.infer<typeof getLessonByIdSchema>['params'];
export type GetLessonsByCourseIdParams = z.infer<typeof getLessonsByCourseIdSchema>['params'];
export type DeleteLessonParams = z.infer<typeof deleteLessonSchema>['params'];
