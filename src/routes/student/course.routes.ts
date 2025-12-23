import { Router } from 'express';
import { catchAsync } from '../../middlewares/errorHandler.middleware.js';
import { zodValidator } from '../../middlewares/zodReqValidate.middleware.js';
import {
  getCoursePreviewSchema,
  getEnrolledCoursesSchema,
} from '../../zodSchemas/course.schema.js';
import {
  getCourseHierarchy,
  getCoursePreview,
  getEnrolledCourses,
  isUserEnrolledInCourse,
  listPublishedCourses,
  publicSearchCourses,
} from '../../controllers/course.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { MiddlewareType, RouteType } from '../../types/router.types.js';
import {
  deleteCourseReview,
  createCourseReview,
  getCourseReviewById,
  getCourseReviewsByCourse,
  getCourseReviewsByUser,
  updateCourseReview,
} from '../../controllers/courseReview.controller.js';
import {
  deleteCourseReviewSchema,
  createCourseReviewSchema,
  getCourseReviewByIdSchema,
  getCourseReviewsByCourseSchema,
  getCourseReviewsByUserSchema,
  updateCourseReviewSchema,
} from '../../zodSchemas/review.schema.js';
import { isUserAuthorizedInCourse } from '../../utils/isUserAuthorizedInCourse.js';

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
 */

/**
 * @swagger
 * /api/student/course/{slug}/preview:
 *     get:
 *       summary: Get public preview of a course
 *       description: Retrieves preview information for a published and public course, including sample content
 *       tags: [Student]
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - in: path
 *           name: slug
 *           required: true
 *           schema:
 *             type: string
 *           description: Course ID
 *       responses:
 *         200:
 *           description: Course preview retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       thumbnail:
 *                         type: string
 *                       duration:
 *                         type: integer
 *                       price:
 *                         type: number
 *                       specialPrice:
 *                         type: number
 *                       specialPriceDescription:
 *                         type: string
 *                         description: Description of special price offer
 *                       objectives:
 *                         type: array
 *                         items:
 *                           type: string
 *                       enrollmentCount:
 *                         type: integer
 *                       rating:
 *                         type: number
 *                       metaTitle:
 *                         type: string
 *                         description: SEO meta title
 *                       metaDescription:
 *                         type: string
 *                         description: SEO meta description
 *                       metaRobots:
 *                         $ref: '#/components/schemas/MetaRobots'
 *                       metaCanonical:
 *                         type: string
 *                         description: Canonical URL for SEO
 *                       topics:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             title:
 *                               type: string
 *                             description:
 *                               type: string
 *                             type:
 *                               type: string
 *                             duration:
 *                               type: integer
 *                             mediaType:
 *                               type: string
 *                             order:
 *                               type: integer
 *                             isPublic:
 *                               type: boolean
 *                             mediaUrl:
 *                               type: string
 *                       instructor:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                           bio:
 *                             type: string
 *                       _count:
 *                         type: object
 *                         properties:
 *                           students:
 *                             type: integer
 *                           lessons:
 *                             type: integer
 *                           assignments:
 *                             type: integer
 *         404:
 *           description: Course not found or not public
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CourseReview:
 *       type: object
 *       required:
 *         - rating
 *         - content
 *         - courseSlug
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated ID of the review
 *         rating:
 *           type: number
 *           format: float
 *           description: Rating out of 5
 *           minimum: 0
 *           maximum: 5
 *         title:
 *           type: string
 *           description: Optional review title
 *         content:
 *           type: string
 *           description: Review content text
 *         isPublic:
 *           type: boolean
 *           description: Whether the review is public
 *           default: true
 *         isApproved:
 *           type: boolean
 *           description: Whether the review is approved by admin
 *           default: false
 *         isAnonymous:
 *           type: boolean
 *           description: Whether to hide the reviewer's identity
 *           default: false
 *         studentId:
 *           type: string
 *           description: ID of the student who wrote the review
 *         courseSlug:
 *           type: string
 *           description: Slug of the course being reviewed
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the review was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the review was last updated
 */

/**
 * @swagger
 * /api/student/course/reviews:
 *   post:
 *     summary: Create a new course review
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - content
 *               - courseSlug
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *                 description: Rating out of 5
 *               title:
 *                 type: string
 *                 description: Optional review title
 *               content:
 *                 type: string
 *                 description: Review content text
 *               isPublic:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the review is public
 *               isAnonymous:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to hide the reviewer's identity
 *               courseSlug:
 *                 type: string
 *                 description: Slug of the course being reviewed
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CourseReview'
 *       400:
 *         description: Invalid data or user has already reviewed this course
 *       404:
 *         description: Course not found
 */

/**
 * @swagger
 * /api/student/course/reviews/{id}:
 *   get:
 *     summary: Get a course review by ID
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the review
 *     responses:
 *       200:
 *         description: Course review data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CourseReview'
 *       404:
 *         description: Review not found
 *
 *   put:
 *     summary: Update a course review
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the review
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               isAnonymous:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Review updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CourseReview'
 *       403:
 *         description: Not authorized to update this review
 *       404:
 *         description: Review not found
 *
 *   delete:
 *     summary: Delete a course review
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the review
 *     responses:
 *       200:
 *         description: Review deleted successfully
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
 *                   example: Course review deleted successfully
 *       403:
 *         description: Not authorized to delete this review
 *       404:
 *         description: Review not found
 */

/**
 * @swagger
 * /api/student/course/reviews/course/{courseSlug}:
 *   get:
 *     summary: Get all reviews for a specific course
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: courseSlug
 *         schema:
 *           type: string
 *         required: true
 *         description: Slug of the course
 *       - in: query
 *         name: isApproved
 *         schema:
 *           type: boolean
 *         description: Filter by approval status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reviews to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of reviews to skip
 *     responses:
 *       200:
 *         description: List of course reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CourseReview'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                     stats:
 *                       type: object
 *                       properties:
 *                         avgRating:
 *                           type: number
 *                         totalReviews:
 *                           type: integer
 *       404:
 *         description: Course not found
 */

/**
 * @swagger
 * /api/student/course/reviews/user/{userId}:
 *   get:
 *     summary: Get all reviews by a specific user
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reviews to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of reviews to skip
 *     responses:
 *       200:
 *         description: List of user's reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CourseReview'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 */

/**
 * @swagger
 * /api/student/course/enrolled:
 *   get:
 *     summary: Get all courses enrolled by the authenticated student
 *     description: Retrieves a paginated list of courses that the currently authenticated student is enrolled in
 *     tags: [Student]
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

/**
 * @swagger
 * /api/student/course/{courseSlug}/hierarchy:
 *   get:
 *     summary: Get detailed hierarchy of a course for a student
 *     description: Retrieves the complete structure of a course including lessons, topics, progress and assignments for the enrolled student
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Course Slug
 *     responses:
 *       200:
 *         description: Course hierarchy retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                     thumbnail:
 *                       type: string
 *                     duration:
 *                       type: integer
 *                     objectives:
 *                       type: array
 *                       items:
 *                         type: string
 *                     instructor:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                         bio:
 *                           type: string
 *                     lessons:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           description:
 *                             type: string
 *                           status:
 *                             type: string
 *                           order:
 *                             type: integer
 *                           duration:
 *                             type: integer
 *                           mediaType:
 *                             type: string
 *                           mediaUrl:
 *                             type: string
 *                           attachments:
 *                             type: array
 *                           topics:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 title:
 *                                   type: string
 *                                 slug:
 *                                   type: string
 *                                 description:
 *                                   type: string
 *                                 status:
 *                                   type: string
 *                                 type:
 *                                   type: string
 *                                 order:
 *                                   type: integer
 *                                 duration:
 *                                   type: integer
 *                                 mediaType:
 *                                   type: string
 *                                 mediaUrl:
 *                                   type: string
 *                                 attachments:
 *                                   type: array
 *                                 keywords:
 *                                   type: array
 *                     progress:
 *                       type: object
 *                       properties:
 *                         completedLessons:
 *                           type: integer
 *                         totalLessons:
 *                           type: integer
 *                         completedLessonIds:
 *                           type: array
 *                           items:
 *                             type: string
 *                         completedTopicIds:
 *                           type: array
 *                           items:
 *                             type: string
 *                         completionRate:
 *                           type: number
 *                     assignments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           instructions:
 *                             type: string
 *                           maxScore:
 *                             type: number
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                           dueDate:
 *                             type: string
 *                             format: date-time
 *                           submissions:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 status:
 *                                   type: string
 *                                 grade:
 *                                   type: number
 *                                 submittedAt:
 *                                   type: string
 *                                   format: date-time
 *       401:
 *         description: Unauthorized - User not authenticated
 *       403:
 *         description: Forbidden - User not enrolled in this course
 *       404:
 *         description: Course not found
 */

/**
 * @swagger
 * /api/student/course/list:
 *   get:
 *     summary: List published and public courses
 *     description: Retrieves a paginated list of published and public courses with filtered information
 *     tags: [Student]
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
 *         description: Number of courses per page
 *     responses:
 *       200:
 *         description: Successfully retrieved published courses
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
 *                   example: Courses retrieved successfully
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
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/student/course/public-search:
 *   get:
 *     summary: Public course search with advanced filtering
 *     description: Search and filter published and public courses with multiple parameters
 *     tags: [Student]
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
 *         description: Number of courses per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to find courses by title, description, objectives, or instructor name
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum course price for filtering
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum course price for filtering
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, price, rating, enrollmentCount, title]
 *           default: createdAt
 *         description: Field to sort results by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: Successfully retrieved public courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                     searchParams:
 *                       type: object
 *                       properties:
 *                         searchTerm:
 *                           type: string
 *                         minPrice:
 *                           type: number
 *                         maxPrice:
 *                           type: number
 *                         sortBy:
 *                           type: string
 *                         sortOrder:
 *                           type: string
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/student/course/{slug}/enrolled:
 *   get:
 *     summary: Check if user is enrolled in a specific course
 *     description: Verifies if the authenticated user is enrolled in the specified course
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Course slug to check enrollment status
 *     responses:
 *       200:
 *         description: User is authorized to access the course
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
 *                   example: User is authorized to access the course
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: User not enrolled in the course
 */
const courseStudentRouter = Router();

courseStudentRouter
  .get('/list', catchAsync(listPublishedCourses as any))
  .get('/public-search', catchAsync(publicSearchCourses as any));

courseStudentRouter.get(
  '/:slug/preview',
  zodValidator(getCoursePreviewSchema),
  catchAsync(getCoursePreview as any),
);

courseStudentRouter
  .post(
    '/reviews',
    authenticate as MiddlewareType,
    zodValidator(createCourseReviewSchema),
    catchAsync(createCourseReview as RouteType),
  )
  // Get review by ID - public
  .get(
    '/reviews/:id',
    zodValidator(getCourseReviewByIdSchema),
    catchAsync(getCourseReviewById as RouteType),
  )
  // Get reviewss by course - public
  .get(
    '/reviews/course/:courseSlug',
    zodValidator(getCourseReviewsByCourseSchema),
    catchAsync(getCourseReviewsByCourse as RouteType),
  )
  // Get reviews by user - requires authentication
  .get(
    '/reviews/user/:userId',
    authenticate as MiddlewareType,
    zodValidator(getCourseReviewsByUserSchema),
    catchAsync(getCourseReviewsByUser as RouteType),
  )
  // Update review - requires authentication, ownership or admin
  .put(
    '/reviews/:id',
    authenticate as MiddlewareType,
    zodValidator(updateCourseReviewSchema),
    catchAsync(updateCourseReview as RouteType),
  )
  // Delete review - requires authentication, ownership or admin
  .delete(
    '/reviews/:id',
    authenticate as MiddlewareType,
    zodValidator(deleteCourseReviewSchema),
    catchAsync(deleteCourseReview as RouteType),
  )
  .get(
    '/enrolled',
    zodValidator(getEnrolledCoursesSchema),
    catchAsync(authorize(['read_record'])),
    catchAsync(getEnrolledCourses as RouteType),
  );

courseStudentRouter
  .get(
    '/:courseSlug/hierarchy',
    authenticate as MiddlewareType,
    catchAsync(authorize(['read_record'])),
    catchAsync(getCourseHierarchy as any),
  )
  .get(
    '/:slug/enrolled',
    authenticate as MiddlewareType,
    catchAsync(authorize(['read_record'])),
    catchAsync(isUserEnrolledInCourse as any),
  );

export default courseStudentRouter;
