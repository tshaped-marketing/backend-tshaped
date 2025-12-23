import { z } from 'zod';

const successMessageSchema = z.record(z.string()); // For multilingual messages

export const createSuccessHandlerSchema = z.object({
  body: z
    .object({
      success_code: z.string().min(1, { message: 'Success code is required' }),
      success_message: successMessageSchema,
      category: z.string().optional(),
      http_code: z.number().int().min(100).max(599).default(200),
      isActive: z.boolean().default(true),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const updateSuccessHandlerSchema = z.object({
  body: z
    .object({
      success_message: successMessageSchema.optional(),
      category: z.string().optional(),
      http_code: z.number().int().min(100).max(599).optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const getSuccessHandlerByIdSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const deleteSuccessHandlerSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const listSuccessHandlersSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      page: z.string().optional().transform(Number),
      limit: z.string().optional().transform(Number),
      category: z.string().optional(),
      isActive: z
        .string()
        .optional()
        .transform(val => val === 'true'),
    })
    .strict(),
  params: z.object({}).strict(),
});
