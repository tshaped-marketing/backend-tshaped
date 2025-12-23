import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  bulkEnrollUsers,
  createCourse,
  deleteCourse,
  getAllCourses,
  getCourseById,
  getCoursePreview,
  getEnrolledCourses,
  getEnrolledUsers,
  searchCourses,
  unenrollUser,
  updateCourse,
} from '../controllers/course.controller.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import {
  bulkEnrollUsersSchema,
  createCourseSchema,
  deleteCourseSchema,
  getAllCoursesSchema,
  getCourseByIdSchema,
  getCoursePreviewSchema,
  getEnrolledCoursesSchema,
  getEnrolledUsersSchema,
  searchCoursesSchema,
  unenrollUserSchema,
  updateCourseSchema,
} from '../zodSchemas/course.schema.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';

const courseRouter = express.Router();

courseRouter.use(catchAsync(authenticate) as MiddlewareType);

/**
 * @swagger
 * components:
 *   schemas:
 *     MetaRobots:
 *       type: string
 *       enum: [INDEX_FOLLOW, INDEX_NOFOLLOW, NOINDEX_FOLLOW, NOINDEX_NOFOLLOW]
 *       description: SEO robots meta tag values
 *     UserRole:
 *       type: string
 *       enum: [ADMIN, INSTRUCTOR, STUDENT]
 *       description: User role in the system
 *     UserStatus:
 *       type: string
 *       enum: [ACTIVE, INACTIVE, SUSPENDED, PENDING_VERIFICATION]
 *       description: Current status of the user
 *     Progress:
 *       type: object
 *       properties:
 *         completedLessons:
 *           type: integer
 *           description: Number of completed lessons
 *         totalLessons:
 *           type: integer
 *           description: Total number of lessons
 *         completionRate:
 *           type: number
 *           description: Percentage of course completion
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last progress update timestamp
 *     EnrolledUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User's unique identifier
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           description: User's email address
 *         avatar:
 *           type: string
 *           description: URL to user's avatar image
 *         role:
 *           $ref: '#/components/schemas/UserRole'
 *         status:
 *           $ref: '#/components/schemas/UserStatus'
 *         progress:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Progress'
 *     PaginationInfo:
 *       type: object
 *       properties:
 *         currentPage:
 *           type: integer
 *           description: Current page number
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 *         totalItems:
 *           type: integer
 *           description: Total number of items
 *         hasNextPage:
 *           type: boolean
 *           description: Whether there is a next page
 *         hasPrevPage:
 *           type: boolean
 *           description: Whether there is a previous page
 *         itemsPerPage:
 *           type: integer
 *           description: Number of items per page
 *     Course:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         title:
 *           type: string
 *           description: Course title
 *         slug:
 *           type: string
 *           description: Auto-generated URL-friendly slug
 *         description:
 *           type: string
 *           description: Course description
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED, UNDER_REVIEW]
 *           description: Current status of the course (optional)
 *         price:
 *           type: number
 *           description: Course price
 *         specialPrice:
 *           type: number
 *           description: Special discounted price (optional)
 *         specialPriceDescription:
 *           type: string
 *           description: Description or reason for the special price (optional)
 *         thumbnail:
 *           type: string
 *           format: uri
 *           description: URL of course thumbnail image (optional)
 *         duration:
 *           type: integer
 *           description: Course duration in minutes (optional)
 *         isPublic:
 *           type: boolean
 *           description: Whether the course is public (optional)
 *         objectives:
 *           type: array
 *           items:
 *             type: string
 *           description: Learning objectives (optional)
 *         metaTitle:
 *           type: string
 *           description: SEO meta title
 *         metaDescription:
 *           type: string
 *           description: SEO meta description
 *         metaRobots:
 *           $ref: '#/components/schemas/MetaRobots'
 *         metaCanonical:
 *           type: string
 *           format: uri
 *           description: Canonical URL for SEO
 *         topics:
 *           type: array
 *           items:
 *             type: object
 *           description: Collection of topics in the course
 *         instructorId:
 *           type: string
 *           description: ID of the course instructor
 *         enrollmentCount:
 *           type: integer
 *           description: Number of enrolled students
 *         rating:
 *           type: number
 *           description: Average course rating (optional)
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: When the course was published (optional)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Course creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *
 * paths:
 *   /api/course:
 *     get:
 *       summary: Get all courses (Admin only)
 *       tags: [Courses]
 *       security:
 *         - bearerAuth: []
 *       responses:
 *         200:
 *           description: List of all courses retrieved successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                   message:
 *                     type: string
 *                   data:
 *                     type: array
 *                     items:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Course'
 *                         - type: object
 *                           properties:
 *                             instructor:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                                 avatar:
 *                                   type: string
 *                             _count:
 *                               type: object
 *                               properties:
 *                                 students:
 *                                   type: integer
 *                                 lessons:
 *                                   type: integer
 *     post:
 *       summary: Create a new course
 *       tags: [Courses]
 *       security:
 *         - bearerAuth: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - title
 *                 - description
 *                 - price
 *               properties:
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 price:
 *                   type: number
 *                 specialPrice:
 *                   type: number
 *                   description: Special discounted price
 *                 specialPriceDescription:
 *                   type: string
 *                   description: Description of special price offer
 *                 thumbnail:
 *                   type: string
 *                   format: uri
 *                 duration:
 *                   type: integer
 *                 isPublic:
 *                   type: boolean
 *                 objectives:
 *                   type: array
 *                   items:
 *                     type: string
 *                 status:
 *                   type: string
 *                   enum: [DRAFT, PUBLISHED, ARCHIVED, UNDER_REVIEW]
 *                 metaTitle:
 *                   type: string
 *                   description: SEO meta title
 *                 metaDescription:
 *                   type: string
 *                   description: SEO meta description
 *                 metaRobots:
 *                   $ref: '#/components/schemas/MetaRobots'
 *                 metaCanonical:
 *                   type: string
 *                   format: uri
 *                   description: Canonical URL for SEO
 *       responses:
 *         201:
 *           description: Course created successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                   message:
 *                     type: string
 *                   courseId:
 *                     type: string
 *                   slug:
 *                     type: string
 *         400:
 *           description: Invalid input data
 *         403:
 *           description: User not authorized to create courses
 *
 *   /api/course/{id}:
 *     get:
 *       summary: Get course by ID
 *       description: Get detailed information about a specific course
 *       tags: [Courses]
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema:
 *             type: string
 *           description: Course ID
 *       responses:
 *         200:
 *           description: Course retrieved successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                   message:
 *                     type: string
 *                   data:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Course'
 *                       - type: object
 *                         properties:
 *                           instructor:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                               bio:
 *                                 type: string
 *                           lessons:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 title:
 *                                   type: string
 *                                 order:
 *                                   type: integer
 *                           _count:
 *                             type: object
 *                             properties:
 *                               students:
 *                                 type: integer
 *                               lessons:
 *                                 type: integer
 *                               assignments:
 *                                 type: integer
 *         404:
 *           description: Course not found
 *         403:
 *           description: User not authorized to access this course
 *     patch:
 *       summary: Partially update a course
 *       description: Update one or more fields of an existing course
 *       tags: [Courses]
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema:
 *             type: string
 *           description: Course ID
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 price:
 *                   type: number
 *                 specialPrice:
 *                   type: number
 *                   description: Special discounted price
 *                 specialPriceDescription:
 *                   type: string
 *                   description: Description of special price offer
 *                 thumbnail:
 *                   type: string
 *                   format: uri
 *                 duration:
 *                   type: integer
 *                 isPublic:
 *                   type: boolean
 *                 objectives:
 *                   type: array
 *                   items:
 *                     type: string
 *                 status:
 *                   type: string
 *                   enum: [DRAFT, PUBLISHED, ARCHIVED, UNDER_REVIEW]
 *                 metaTitle:
 *                   type: string
 *                   description: SEO meta title
 *                 metaDescription:
 *                   type: string
 *                   description: SEO meta description
 *                 metaRobots:
 *                   $ref: '#/components/schemas/MetaRobots'
 *                 metaCanonical:
 *                   type: string
 *                   format: uri
 *                   description: Canonical URL for SEO
 *       responses:
 *         200:
 *           description: Course updated successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                   message:
 *                     type: string
 *                   data:
 *                     $ref: '#/components/schemas/Course'
 *         400:
 *           description: Invalid input data
 *         404:
 *           description: Course not found
 *         403:
 *           description: User not authorized to update this course
 *     delete:
 *       summary: Delete a course
 *       description: Delete a course and all its related data
 *       tags: [Courses]
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema:
 *             type: string
 *           description: Course ID
 *       responses:
 *         200:
 *           description: Course successfully deleted
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                   message:
 *                     type: string
 *         404:
 *           description: Course not found
 *         403:
 *           description: User not authorized to delete this course
 *
 *   /api/course/{id}/enroll-users:
 *     post:
 *       summary: Bulk enroll multiple users in a course
 *       tags: [Courses]
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema:
 *             type: string
 *           description: Course ID
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - userIds
 *               properties:
 *                 userIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Array of user IDs to enroll in the course
 *                   minItems: 1
 *       responses:
 *         200:
 *           description: Users successfully enrolled in the course
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                   message:
 *                     type: string
 *                   enrolledUserIds:
 *                     type: array
 *                     items:
 *                       type: string
 *         400:
 *           description: Invalid input data or users already enrolled
 *         404:
 *           description: Course not found or one or more users not found
 *         403:
 *           description: User not authorized to enroll users
 */
/**
 * @swagger
 * /api/course/search:
 *   get:
 *     summary: Search and sort courses
 *     tags: [Courses]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for course title and description
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED, UNDER_REVIEW]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, price, createdAt, enrollmentCount, rating]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 */

/**
 * @swagger
 * /api/course/{courseId}/unenroll/{userId}:
 *   delete:
 *     summary: Unenroll a user from a course
 *     description: Removes a user from a course and cleans up related data
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to unenroll
 *     responses:
 *       200:
 *         description: User successfully unenrolled from the course
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User successfully unenrolled from the course
 *       403:
 *         description: User not authorized to unenroll users
 *       404:
 *         description: Course not found or user not enrolled in course
 */

/**
 * @swagger
 * /api/course/{id}/enrolled-users:
 *   get:
 *     summary: Get all users enrolled in a course with advanced filtering
 *     description: Retrieves a paginated list of users enrolled in a specific course with their progress, filtered by role and status
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter users by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           $ref: '#/components/schemas/UserRole'
 *         description: Filter users by role
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/UserStatus'
 *         description: Filter users by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, role, status, completionRate]
 *           default: name
 *         description: Field to sort results by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: List of enrolled users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/EnrolledUser'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           description: Current page number
 *                         totalPages:
 *                           type: integer
 *                           description: Total number of pages
 *                         totalItems:
 *                           type: integer
 *                           description: Total number of items
 *                         hasNextPage:
 *                           type: boolean
 *                           description: Whether there is a next page
 *                         hasPrevPage:
 *                           type: boolean
 *                           description: Whether there is a previous page
 *                         itemsPerPage:
 *                           type: integer
 *                           description: Number of items per page
 *       400:
 *         description: Invalid filter parameters provided
 *       403:
 *         description: User not authorized to view enrolled users
 *       404:
 *         description: Course not found
 */

/**
 * @swagger
 * /api/course/enrolled:
 *   get:
 *     summary: Get all courses enrolled by the authenticated student
 *     description: Retrieves a paginated list of courses that the currently authenticated student is enrolled in
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering courses by title or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, createdAt, updatedAt]
 *           default: updatedAt
 *         description: Field to sort results by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED, UNDER_REVIEW]
 *         description: Filter courses by status
 *     responses:
 *       200:
 *         description: Successfully retrieved enrolled courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Enrolled courses retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     courses:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Course'
 *                           - type: object
 *                             properties:
 *                               instructor:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   name:
 *                                     type: string
 *                                   avatar:
 *                                     type: string
 *                               progress:
 *                                 type: object
 *                                 properties:
 *                                   completedLessons:
 *                                     type: integer
 *                                   totalLessons:
 *                                     type: integer
 *                                   completionRate:
 *                                     type: number
 *                                   completedTopicIds:
 *                                     type: array
 *                                     items:
 *                                       type: string
 *                                   totalTopics:
 *                                     type: integer
 *                                   updatedAt:
 *                                     type: string
 *                                     format: date-time
 *                               _count:
 *                                 type: object
 *                                 properties:
 *                                   lessons:
 *                                     type: integer
 *                                   assignments:
 *                                     type: integer
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *       403:
 *         description: User not authorized or not a student
 */
courseRouter
  // Static routes first
  .get('/search', zodValidator(searchCoursesSchema), catchAsync(searchCourses as any))
  .get(
    '/enrolled',
    zodValidator(getEnrolledCoursesSchema),
    catchAsync(authorize(['read_record'])),
    catchAsync(getEnrolledCourses as RouteType),
  )
  .get(
    '/',
    zodValidator(getAllCoursesSchema),
    catchAsync(authorize(['admin_only'])),
    catchAsync(getAllCourses as any),
  )
  .post(
    '/',
    zodValidator(createCourseSchema),
    catchAsync(authorize(['create_record'])),
    catchAsync(createCourse as any),
  )
  // Then parameterized routes
  .get(
    '/:id',
    catchAsync(authorize(['read_record'])),
    zodValidator(getCourseByIdSchema),
    catchAsync(getCourseById as RouteType),
  )
  .patch(
    '/:id',
    zodValidator(updateCourseSchema),
    catchAsync(authorize(['update_record'])),
    catchAsync(updateCourse as RouteType),
  )
  .delete(
    '/:id',
    zodValidator(deleteCourseSchema),
    catchAsync(authorize(['delete_record'])),
    catchAsync(deleteCourse as RouteType),
  )

  .post(
    '/:id/enroll-users',
    zodValidator(bulkEnrollUsersSchema),
    catchAsync(authorize(['update_record'])),
    catchAsync(bulkEnrollUsers as RouteType),
  )
  .get(
    '/:id/enrolled-users',
    zodValidator(getEnrolledUsersSchema),
    catchAsync(authorize(['read_record'])),
    catchAsync(getEnrolledUsers as any),
  )
  .delete(
    '/:courseId/unenroll/:userId',
    zodValidator(unenrollUserSchema),
    catchAsync(authorize(['update_record'])),
    catchAsync(unenrollUser as RouteType),
  );

export default courseRouter;
