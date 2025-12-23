import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Enum for Role
export const RoleEnum = z.enum(['ADMIN', 'INSTRUCTOR', 'STUDENT']);

// Define a type that matches Prisma's JSON value type
const jsonSchema: any = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.lazy(() => jsonSchema)),
  z.record(z.lazy(() => jsonSchema)),
]);

export const registerSchema = z.object({
  body: z
    .object({
      name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
      email: z.string().email({ message: 'Invalid email address' }),
      password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
      role: RoleEnum,
      // Optional fields
      avatar: z.string().optional(),
      bio: z.string().optional(),
      phoneNumber: z.string().optional(),
      website: z.string().optional(),
      socialLinks: jsonSchema.optional(),
      timezone: z.string().optional(),
      preferences: jsonSchema.optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email({ message: 'Invalid email address' }),
      password: z.string().min(1, { message: 'Password is required' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});
export const getUserByIdSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string().cuid({ message: 'Invalid user ID format' }),
    })
    .strict(),
});
const SortOrderEnum = z.enum(['asc', 'desc']);
const UserSortByEnum = z.enum(['name', 'email', 'role', 'status', 'lastLoginAt', 'createdAt']);

export const searchUsersSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      search: z.string().optional(),
      sortBy: UserSortByEnum.optional(),
      sortOrder: SortOrderEnum.optional(),
      page: z.string().regex(/^\d+$/).transform(Number).optional(),
      limit: z.string().regex(/^\d+$/).transform(Number).optional(),
      role: z.enum(['ADMIN', 'INSTRUCTOR', 'STUDENT']).optional(), // Add role filter
    })
    .strict(),
  params: z.object({}).strict(),
});

export const authenticatedPasswordResetSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z
    .object({
      email: z.string().email({ message: 'Invalid email address' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      email: z.string().email({ message: 'Invalid email address' }),
      otp: z.string().min(6, { message: 'OTP must be at least 6 characters' }),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const googleOAuthSchema = z.object({
  body: z
    .object({
      id_token: z.string({ message: 'id_token is required' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const microsoftOAuthSchema = z.object({
  body: z
    .object({
      code: z.string({ message: 'Code is required' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const facebookOAuthSchema = z.object({
  body: z
    .object({
      accessToken: z.string({ message: 'Access token is required' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const verifyEmailSchema = z.object({
  body: z
    .object({
      email: z.string().email({ message: 'Invalid email address' }),
      otp: z.string().length(6, { message: 'OTP must be exactly 6 characters' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const resendVerificationEmailSchema = z.object({
  body: z
    .object({
      email: z.string().email({ message: 'Invalid email address' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const verify2FASchema = z.object({
  body: z
    .object({
      userId: z.string().cuid({ message: 'Invalid user ID format' }),
      otp: z.string().length(6, { message: 'OTP must be exactly 6 characters' }),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
