import { z } from 'zod';

const errorMessageSchema = z.record(z.string()); // For multilingual messages

export const createErrorHandlerSchema = z.object({
  body: z
    .object({
      error_code: z.string().min(1, { message: 'Error code is required' }),
      error_message: errorMessageSchema,
      category: z.string().optional(),
      http_code: z.number().int().min(100).max(599).default(500),
      isActive: z.boolean().default(true),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const updateErrorHandlerSchema = z.object({
  body: z
    .object({
      error_message: errorMessageSchema.optional(),
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

export const getErrorHandlerByIdSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const deleteErrorHandlerSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

export const listErrorHandlersSchema = z.object({
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
