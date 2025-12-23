import { Router } from 'express';
import {
  createLesson,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  deleteLesson,
  searchLessons,
} from '../controllers/lesson.controller.js';
import {
  createLessonSchema,
  updateLessonSchema,
  getLessonByIdSchema,
  getLessonsByCourseIdSchema,
  deleteLessonSchema,
  searchLessonsSchema,
} from '../zodSchemas/lesson.schema.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Attachment:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the attachment
 *         url:
 *           type: string
 *           format: uri
 *           description: URL to access the attachment (type will be auto-detected)
 *         type:
 *           type: string
 *           description: Type of attachment (auto-detected from URL)
 *           readOnly: true
 *       required:
 *         - name
 *         - url
 *
 *     MediaType:
 *       type: string
 *       enum: [VIDEO, PDF, PRESENTATION, DOCUMENT, OTHER]
 *       description: |
 *         Media type of the content. Automatically detected from mediaUrl:
 *         - VIDEO: video files (mp4, webm, etc.)
 *         - PDF: PDF documents
 *         - PRESENTATION: PowerPoint, Keynote, etc.
 *         - DOCUMENT: Text files, documents
 *         - OTHER: Any other file type
 *
 *     Lesson:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the lesson
 *         title:
 *           type: string
 *           description: The title of the lesson
 *         slug:
 *           type: string
 *           description: URL-friendly version of the title (auto-generated if not provided)
 *         description:
 *           type: string
 *           nullable: true
 *           description: The description of the lesson
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED, UNDER_REVIEW]
 *           description: Current status of the lesson
 *         order:
 *           type: integer
 *           description: The order of the lesson within the course (auto-managed)
 *         duration:
 *           type: integer
 *           nullable: true
 *           description: Duration of the lesson in minutes
 *         isPublic:
 *           type: boolean
 *           description: Whether the lesson is publicly accessible
 *         mediaType:
 *           $ref: '#/components/schemas/MediaType'
 *         mediaUrl:
 *           type: string
 *           nullable: true
 *           description: URL to the main content (mediaType will be auto-detected)
 *         attachments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Attachment'
 *           nullable: true
 *           description: Additional resources/attachments (types auto-detected)
 *         courseId:
 *           type: string
 *           description: The id of the course this lesson belongs to
 *         topics:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Topic'
 *           description: Topics within this lesson
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - title
 *         - slug
 *         - status
 *         - order
 *         - courseId
 *
 * /api/lessons:
 *   post:
 *     summary: Create a new lesson
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - courseId
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the lesson
 *               description:
 *                 type: string
 *                 description: Detailed description of the lesson
 *               courseId:
 *                 type: string
 *                 description: ID of the course this lesson belongs to
 *               duration:
 *                 type: integer
 *                 description: Duration in minutes
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, ARCHIVED, UNDER_REVIEW]
 *                 default: DRAFT
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *               mediaUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to the main content (mediaType will be auto-detected)
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - url
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Name of the attachment
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: URL to access the attachment (type will be auto-detected)
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Lesson'
 *
 * /api/lessons/course/{courseId}:
 *   get:
 *     summary: Get all lessons for a course
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course to get lessons for
 *     responses:
 *       200:
 *         description: List of lessons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lesson'
 *
 * /api/lessons/{id}:
 *   get:
 *     summary: Get a lesson by ID
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the lesson to retrieve
 *     responses:
 *       200:
 *         description: Lesson retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Lesson'
 *       404:
 *         description: Lesson not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Lesson not found
 *
 *   patch:
 *     summary: Partially update a lesson
 *     description: Update specific fields of a lesson. Only the provided fields will be modified.
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               duration:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, ARCHIVED, UNDER_REVIEW]
 *               isPublic:
 *                 type: boolean
 *               mediaUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to the main content (mediaType will be auto-detected)
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     url:
 *                       type: string
 *                       format: uri
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Lesson'
 *
 *   delete:
 *     summary: Delete a lesson
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/lessons/search:
 *   get:
 *     summary: Search and sort lessons
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title and description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, createdAt, status, order]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED, UNDER_REVIEW]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       200:
 *         description: Search results
 */
const lessonRouter = Router()
  .use(catchAsync(authenticate) as MiddlewareType)
  .post(
    '/',
    authorize(['create_record']) as any,
    zodValidator(createLessonSchema),
    catchAsync(createLesson),
  )
  // Add the new search route BEFORE the :id route to prevent conflicts
  .get(
    '/search',
    authorize(['admin_only']) as any,
    zodValidator(searchLessonsSchema),
    catchAsync(searchLessons as RouteType),
  )
  .get(
    '/course/:courseId',
    authorize(['admin_only']) as any,
    zodValidator(getLessonsByCourseIdSchema),
    catchAsync(getLessonsByCourse as RouteType),
  )
  .get(
    '/:id',
    authorize(['admin_only']) as any,
    zodValidator(getLessonByIdSchema),
    catchAsync(getLessonById as RouteType),
  )
  .patch(
    '/:id',
    authorize(['update_record']) as any,
    zodValidator(updateLessonSchema),
    catchAsync(updateLesson as RouteType),
  )
  .delete(
    '/:id',
    authorize(['delete_record']) as any,
    zodValidator(deleteLessonSchema),
    catchAsync(deleteLesson as RouteType),
  );

export default lessonRouter;
