import { z } from 'zod';

// Schema for request validation
export const createCheckoutSessionSchema = z.object({
  body: z.object({
    courseId: z.string().min(1, 'Course ID is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// Type inference from the schema
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>['body'];
