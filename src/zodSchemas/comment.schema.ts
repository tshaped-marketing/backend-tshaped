import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z
    .object({
      text: z.string().min(1, { message: 'Comment text is required' }),
      target: z.enum(['COURSE', 'LESSON', 'TOPIC']).default('COURSE'),
      targetSlug: z.string().min(1, { message: 'Target slug is required' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const updateCommentSchema = z.object({
  body: z
    .object({
      text: z.string().min(1, { message: 'Comment text is required' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1, { message: 'Comment ID is required' }),
    })
    .strict(),
});

export const deleteCommentSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1, { message: 'Comment ID is required' }),
    })
    .strict(),
});

export const getCommentSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1, { message: 'Comment ID is required' }),
    })
    .strict(),
});

export const listCommentsSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      target: z.enum(['COURSE', 'LESSON', 'TOPIC']).optional(),
      targetSlug: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .strict(),
  params: z.object({}).strict(),
});
