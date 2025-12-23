// zodSchemas/userSchema.ts
import { z } from 'zod';

export const getStudentProfileSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const updateStudentProfileSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, { message: 'Name is required' }).optional(),
      email: z.string().email({ message: 'Invalid email address' }).optional(),
      bio: z.string().optional(),
      phoneNumber: z.string().optional(),
      website: z.string().url({ message: 'Invalid URL format' }).optional(),
      socialLinks: z.record(z.string()).optional(),
      timezone: z.string().optional(),
      preferences: z.record(z.unknown()).optional(),
      avatar: z.string().optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});
