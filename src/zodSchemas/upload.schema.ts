import { z } from 'zod';

export const getUploadByIdOrSlugSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      identifier: z
        .string()
        .min(1)
        .refine(
          val => {
            // Check if it's a CM ID or a slug
            return val.startsWith('cm') || val.length >= 1;
          },
          {
            message: 'Identifier must be either a CM ID or a valid slug',
          },
        ),
    })
    .strict(),
});

// Previous schemas remain the same
export const getUploadPresignedUrlSchema = z.object({
  body: z
    .object({
      fileNameWithExtension: z.string().min(1),
      isPublic: z.boolean().optional().default(false),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const confirmUploadSchema = z.object({
  body: z
    .object({
      uploadId: z.string().min(1).optional(),
      uploadKey: z.string().min(1).optional(),
      size: z.number().positive().optional(),
    })
    .refine(data => data.uploadId || data.uploadKey, {
      message: 'Either uploadId or uploadKey must be provided',
    }),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});
export const deleteUploadSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().min(1),
    })
    .strict(),
});

export const getUploadBySlugSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      slug: z.string().min(1),
    })
    .strict(),
});

export const getUserUploadsSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      sortBy: z.enum(['date', 'fileType']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
      fileType: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'PDF', 'OTHER']).optional(),
      search: z.string().optional(),
    })
    .strict(),
  params: z.object({}).strict(),
});

export const getMultiUploadPresignedUrlSchema = z.object({
  body: z
    .object({
      files: z
        .array(
          z.object({
            fileNameWithExtension: z.string().min(1),
          }),
        )
        .min(1)
        .max(10), // Limit to 10 files at a time
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const confirmMultiUploadSchema = z.object({
  body: z
    .object({
      uploads: z
        .array(
          z.object({
            uploadId: z.string().min(1),
            size: z.number().positive().optional(),
          }),
        )
        .min(1)
        .max(10),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

// Add this to your upload.schema.js
export const getSignedUrlSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      identifier: z
        .string()
        .min(1)
        .refine(
          val => {
            // Check if it's a CM ID or a slug
            return val.startsWith('cm') || val.length >= 1;
          },
          {
            message: 'Identifier must be either a CM ID or a valid slug',
          },
        ),
    })
    .strict(),
});

export const getMultipleDownloadUrlsSchema = z.object({
  body: z
    .object({
      keys: z.array(z.string().min(1)).min(1).max(10), // Limiting to 10 files at a time, similar to upload
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});
