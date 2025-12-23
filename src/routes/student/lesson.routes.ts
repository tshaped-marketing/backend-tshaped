import { Router } from 'express';
import { getLessonById, getLessonsByCourse } from '../../controllers/lesson.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { catchAsync } from '../../middlewares/errorHandler.middleware.js';
import { zodValidator } from '../../middlewares/zodReqValidate.middleware.js';
import { getLessonByIdSchema, getLessonsByCourseIdSchema } from '../../zodSchemas/lesson.schema.js';

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
 * /api/student/lessons/course/{courseId}:
 *   get:
 *     summary: Get all lessons for a course
 *     tags: [Student]
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
 * /api/student/lessons/{id}:
 *   get:
 *     summary: Get a lesson by ID
 *     tags: [Student]
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
 */

const lessonStudentRouter = Router()
  .use(catchAsync(authenticate))

  .get(
    '/course/:courseId',
    authorize(['read_record']) as any,
    zodValidator(getLessonsByCourseIdSchema),
    catchAsync(getLessonsByCourse),
  )
  .get(
    '/:id',
    authorize(['read_record']) as any,
    zodValidator(getLessonByIdSchema),
    catchAsync(getLessonById),
  );

export default lessonStudentRouter;
