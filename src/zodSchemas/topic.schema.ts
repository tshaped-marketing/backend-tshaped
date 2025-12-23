import { z } from 'zod';
import { LessonType } from '@prisma/client';

const topicBaseSchema = {
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.nativeEnum(LessonType).default('VIDEO'),
  order: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  mediaType: z.string().optional(),
  mediaUrl: z.string(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        type: z.string().optional(),
      }),
    )
    .optional(),
  keywords: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
};

export const createTopicSchema = z.object({
  body: z.object({
    ...topicBaseSchema,
    lessonId: z.string(),
    courseId: z.string(),
  }),
});

export const updateTopicSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z
    .object({
      ...topicBaseSchema,
      lessonId: z.string().optional(),
      courseId: z.string().optional(),
    })
    .partial(),
});

export const getTopicSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const deleteTopicSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const getAllTopicsSchema = z.object({
  query: z.object({
    lessonId: z.string().optional(),
    courseId: z.string().optional(),
    type: z.nativeEnum(LessonType).optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

export const searchTopicsSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      search: z.string().optional(),
      sortBy: z.enum(['title', 'createdAt', 'type', 'order']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      type: z.enum(['VIDEO', 'PDF', 'QUIZ', 'OTHER']).optional(),
      courseId: z.string().optional(),
      lessonId: z.string().optional(),
      limit: z.string().transform(Number).optional(),
      page: z.string().transform(Number).optional(),
    })
    .strict(),
  params: z.object({}).strict(),
});

export type SearchTopicsQuery = z.infer<typeof searchTopicsSchema>['query'];
