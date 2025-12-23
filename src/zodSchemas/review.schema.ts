import { z } from 'zod';

export const createCourseReviewSchema = z.object({
  body: z
    .object({
      rating: z.number().min(0).max(5, { message: 'Rating must be between 0 and 5' }),
      title: z.string().optional(),
      content: z.string().min(1, { message: 'Review content is required' }),
      isPublic: z.boolean().optional().default(true),
      isAnonymous: z.boolean().optional().default(false),
      courseSlug: z.string().min(1, { message: 'Course slug is required' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const getCourseReviewByIdSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1, { message: 'Course review ID is required' }),
    })
    .strict(),
});

export const getCourseReviewsByCourseSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      isApproved: z.boolean().optional(),
      limit: z.string().transform(Number).optional(),
      offset: z.string().transform(Number).optional(),
    })
    .strict(),
  params: z
    .object({
      courseSlug: z.string().min(1, { message: 'Course slug is required' }),
    })
    .strict(),
});

export const getCourseReviewsByUserSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      limit: z.string().transform(Number).optional(),
      offset: z.string().transform(Number).optional(),
    })
    .strict(),
  params: z
    .object({
      userId: z.string().min(1, { message: 'User ID is required' }),
    })
    .strict(),
});

export const updateCourseReviewSchema = z.object({
  body: z
    .object({
      rating: z.number().min(0).max(5, { message: 'Rating must be between 0 and 5' }).optional(),
      title: z.string().optional().nullable(),
      content: z.string().optional(),
      isPublic: z.boolean().optional(),
      isAnonymous: z.boolean().optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1, { message: 'Course review ID is required' }),
    })
    .strict(),
});

export const deleteCourseReviewSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1, { message: 'Course review ID is required' }),
    })
    .strict(),
});

export const approveCourseReviewSchema = z.object({
  body: z
    .object({
      isApproved: z.boolean().default(true),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1, { message: 'Course review ID is required' }),
    })
    .strict(),
});
