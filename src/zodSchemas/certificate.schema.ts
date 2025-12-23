import { z } from 'zod';

export const createCertificateSchema = z.object({
  body: z
    .object({
      studentId: z.string().min(1, { message: 'Student ID is required' }),
      courseId: z.string().min(1, { message: 'Course ID is required' }),
      certificateUrl: z.string().optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const updateCertificateSchema = z.object({
  body: z
    .object({
      certificateUrl: z.string().optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1, { message: 'Certificate ID is required' }),
    })
    .strict(),
});

export const getCertificateSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1, { message: 'Certificate ID is required' }),
    })
    .strict(),
});

export const deleteCertificateSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1, { message: 'Certificate ID is required' }),
    })
    .strict(),
});
