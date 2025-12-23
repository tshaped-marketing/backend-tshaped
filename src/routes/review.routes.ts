import { Router } from 'express';
import {
  createCourseReview,
  getCourseReviewById,
  getCourseReviewsByCourse,
  getCourseReviewsByUser,
  updateCourseReview,
  deleteCourseReview,
  approveCourseReview,
} from '../controllers/courseReview.controller.js';
import {
  createCourseReviewSchema,
  getCourseReviewByIdSchema,
  getCourseReviewsByCourseSchema,
  getCourseReviewsByUserSchema,
  updateCourseReviewSchema,
  deleteCourseReviewSchema,
  approveCourseReviewSchema,
} from '../zodSchemas/review.schema.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';

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
 * tags:
 *   name: CourseReviews
 *   description: API for managing course reviews
 */

/**
 * @swagger
 * /api/course-reviews/{id}:
 *   get:
 *     summary: Get a course review by ID
 *     tags: [CourseReviews]
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
 *     tags: [CourseReviews]
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
 *     tags: [CourseReviews]
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
 * /api/course-reviews/course/{courseSlug}:
 *   get:
 *     summary: Get all reviews for a specific course
 *     tags: [CourseReviews]
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
 * /api/course-reviews/user/{userId}:
 *   get:
 *     summary: Get all reviews by a specific user
 *     tags: [CourseReviews]
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
 * /api/course-reviews/{id}/approve:
 *   patch:
 *     summary: Approve or reject a course review (admin only)
 *     tags: [CourseReviews]
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
 *               isApproved:
 *                 type: boolean
 *                 default: true
 *                 description: Approval status
 *     responses:
 *       200:
 *         description: Review approval status updated
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
 *         description: Not authorized - admin only
 *       404:
 *         description: Review not found
 */

const courseReviewRouter = Router()
  // Create review - requires authentication, no special permission

  // Get review by ID - public
  .get(
    '/:id',
    zodValidator(getCourseReviewByIdSchema),
    catchAsync(getCourseReviewById as RouteType),
  )
  // Get reviews by course - public
  .get(
    '/course/:courseSlug',
    zodValidator(getCourseReviewsByCourseSchema),
    catchAsync(getCourseReviewsByCourse as RouteType),
  )
  // Get reviews by user - requires authentication
  .get(
    '/user/:userId',
    authenticate as MiddlewareType,
    zodValidator(getCourseReviewsByUserSchema),
    catchAsync(getCourseReviewsByUser as RouteType),
  )
  // Update review - requires authentication, ownership or admin
  .put(
    '/:id',
    authenticate as MiddlewareType,
    zodValidator(updateCourseReviewSchema),
    catchAsync(updateCourseReview as RouteType),
  )
  // Delete review - requires authentication, ownership or admin
  .delete(
    '/:id',
    authenticate as MiddlewareType,
    zodValidator(deleteCourseReviewSchema),
    catchAsync(deleteCourseReview as RouteType),
  )
  // Approve review - admin only
  .patch(
    '/:id/approve',
    authenticate as MiddlewareType,
    authorize(['admin_only']) as any,
    zodValidator(approveCourseReviewSchema),
    catchAsync(approveCourseReview as RouteType),
  );

export default courseReviewRouter;
