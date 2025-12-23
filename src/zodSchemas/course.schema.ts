import { Role, UserStatus } from '@prisma/client';
import { z } from 'zod';

// Enum for Course Status
export const CourseStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'UNDER_REVIEW']);

export const MetaRobotsEnum = z.enum([
  'INDEX_FOLLOW',
  'INDEX_NOFOLLOW',
  'NOINDEX_FOLLOW',
  'NOINDEX_NOFOLLOW',
]);

// Create Course Schema
export const createCourseSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, { message: 'Title is required' }),
      description: z.string().min(1, { message: 'Description is required' }),
      price: z.number().min(0, { message: 'Price must be a positive number' }),
      // Optional fields
      specialPrice: z
        .number()
        .min(0, { message: 'Special price must be a positive number' })
        .optional(),
      specialPriceDescription: z.string().optional(),
      thumbnail: z.string().optional(),
      duration: z.number().int().positive().optional(),
      isPublic: z.boolean().optional(),
      objectives: z.array(z.string()).optional(),
      status: CourseStatusEnum.optional(),
      // Meta fields
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      metaRobots: MetaRobotsEnum.optional(),
      metaCanonical: z.string().optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

// Update Course Schema
export const updateCourseSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      price: z.number().min(0).optional(),
      specialPrice: z.number().min(0).optional(),
      specialPriceDescription: z.string().optional(),
      thumbnail: z.string().optional(),
      duration: z.number().int().positive().optional(),
      isPublic: z.boolean().optional(),
      objectives: z.array(z.string()).optional(),
      status: CourseStatusEnum.optional(),
      // Meta fields
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      metaRobots: MetaRobotsEnum.optional(),
      metaCanonical: z.string().url({ message: 'Must be a valid URL' }).optional(),
    })
    .strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});
// Get Course By ID Schema
export const getCourseByIdSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

// Delete Course Schema
export const deleteCourseSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
});

// Get All Courses Schema
export const getAllCoursesSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

// Bulk Enroll Users Schema
export const bulkEnrollUsersSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  }),
  query: z.object({}).optional(),
});

// Course Preview Schema
export const getCoursePreviewSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      slug: z.string(),
    })
    .strict(),
});

export const CourseSortFieldEnum = z.enum([
  'title',
  'price',
  'createdAt',
  'enrollmentCount',
  'rating',
]);

// Enum for sort order
export const SortOrderEnum = z.enum(['asc', 'desc']);

// Search and Sort Schema
export const searchCoursesSchema = z.object({
  body: z.object({}).strict(),
  params: z.object({}).strict(),
  query: z
    .object({
      // Search params
      search: z.string().optional(),
      minPrice: z.coerce.number().optional(),
      maxPrice: z.coerce.number().optional(),
      status: CourseStatusEnum.optional(),

      // Pagination
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().default(10),

      // Sorting
      sortBy: CourseSortFieldEnum.default('createdAt'),
      sortOrder: SortOrderEnum.default('desc'),
    })
    .strict(),
});

// Unenroll User Schema
export const unenrollUserSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}).strict(),
  params: z
    .object({
      courseId: z.string(),
      userId: z.string(),
    })
    .strict(),
});

export const getEnrolledUsersSchema = z.object({
  params: z
    .object({
      id: z.string(),
    })
    .strict(),
  query: z
    .object({
      page: z
        .string()
        .optional()
        .transform(val => Number(val) || 1),
      limit: z
        .string()
        .optional()
        .transform(val => Number(val) || 10),
      search: z.string().optional(),
      role: z.nativeEnum(Role).optional(),
      status: z.nativeEnum(UserStatus).optional(),
      sortBy: z
        .enum(['name', 'email', 'role', 'status', 'completionRate'])
        .optional()
        .default('name'),
      sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
    })
    .strict(),
  body: z.object({}).strict(),
});

// Update the getEnrolledCoursesSchema definition
export const getEnrolledCoursesSchema = z.object({
  body: z.object({}).strict(),
  params: z.object({}).strict(),
  query: z
    .object({
      page: z
        .string()
        .optional()
        .transform(val => Number(val) || 1),
      limit: z
        .string()
        .optional()
        .transform(val => Number(val) || 10),
      search: z.string().optional(),
      sortBy: z.enum(['title', 'createdAt', 'updatedAt']).optional().default('updatedAt'),
      sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
      status: CourseStatusEnum.optional(),
    })
    .passthrough(), // allow extra keys if needed
});

// Add to existing exports
export type UnenrollUserInput = z.infer<typeof unenrollUserSchema>;
export type UnenrollUserParams = z.infer<typeof unenrollUserSchema>['params'];
// Type for the request
export type SearchCoursesInput = z.infer<typeof searchCoursesSchema>;

// Types for the request bodies
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type GetCourseByIdInput = z.infer<typeof getCourseByIdSchema>;
export type DeleteCourseInput = z.infer<typeof deleteCourseSchema>;
export type GetAllCoursesInput = z.infer<typeof getAllCoursesSchema>;
export type BulkEnrollUsersInput = z.infer<typeof bulkEnrollUsersSchema>;
export type GetCoursePreviewInput = z.infer<typeof getCoursePreviewSchema>;
// Types for just the body content
export type CreateCourseBody = z.infer<typeof createCourseSchema>['body'];
export type UpdateCourseBody = z.infer<typeof updateCourseSchema>['body'];

// Types for just the params content
export type GetCourseByIdParams = z.infer<typeof getCourseByIdSchema>['params'];
export type DeleteCourseParams = z.infer<typeof deleteCourseSchema>['params'];
export type GetCoursePreviewParams = z.infer<typeof getCoursePreviewSchema>['params'];
export type GetEnrolledUsersInput = z.infer<typeof getEnrolledUsersSchema>;
