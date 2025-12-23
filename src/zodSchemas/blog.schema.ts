import { z } from 'zod';

export const createBlogSchema = z.object({
  body: z
    .object({
      title: z
        .string()
        .min(1, { message: 'Title is required' })
        .max(255, { message: 'Title cannot exceed 255 characters' }),
      summary: z.string().min(1, { message: 'Summary is required' }),
      content: z.string().min(1, { message: 'Content is required' }),
      metaTitle: z
        .string()
        .min(1, { message: 'Meta title is required' })
        .max(255, { message: 'Meta title cannot exceed 255 characters' }),
      metaDescription: z.string().min(1, { message: 'Meta description is required' }),
      author: z.string().optional(),
      authorLink: z.string().optional(),
      image: z.string().optional(),
      showUpdateDate:z.boolean().optional(),
      publishedDate: z.string().datetime().optional(),
      published: z.boolean().optional().default(false),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const updateBlogSchema = z.object({
  body: z
    .object({
      title: z.string().max(255, { message: 'Title cannot exceed 255 characters' }).optional(),
      summary: z.string().optional(),
      content: z.string().optional(),
      metaTitle: z
        .string()
        .max(255, { message: 'Meta title cannot exceed 255 characters' })
        .optional(),
      metaDescription: z.string().optional(),
      author: z.string().optional(),
      authorLink: z.string().optional(),
      image: z.string().optional(),
      showUpdateDate:z.boolean().optional(),
      publishedDate: z.string().datetime().optional(),
      published: z.boolean().optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const getBlogByIdSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const deleteBlogSchema = getBlogByIdSchema;

export const getAllBlogsSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      published: z.string().optional(),
    })
    .strict(),
  params: z.object({}).strict(),
});
