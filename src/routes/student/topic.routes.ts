/**
 * @swagger
 * components:
 *   schemas:
 *     Topic:
 *       type: object
 *       required:
 *         - title
 *         - mediaUrl
 *         - lessonId
 *         - courseId
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         title:
 *           type: string
 *           description: Title of the topic
 *         slug:
 *           type: string
 *           description: URL-friendly version of the title (auto-generated if not provided)
 *         description:
 *           type: string
 *           description: Detailed description of the topic
 *         type:
 *           type: string
 *           enum: [VIDEO, PDF, QUIZ, OTHER]
 *           default: VIDEO
 *           description: Type of lesson content
 *         order:
 *           type: integer
 *           description: Order of the topic within the lesson (auto-assigned if not provided)
 *         duration:
 *           type: integer
 *           description: Duration of the topic in minutes
 *         mediaType:
 *           type: string
 *           enum: [VIDEO, PDF, PRESENTATION, DOCUMENT, OTHER]
 *           description: Type of media content (auto-detected from mediaUrl)
 *         mediaUrl:
 *           type: string
 *           description: URL of the main content
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *                 description: Media type (auto-detected from URL)
 *           description: Additional materials for the topic
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *           description: Searchable keywords for the topic
 *         lessonId:
 *           type: string
 *           description: ID of the parent lesson
 *         courseId:
 *           type: string
 *           description: ID of the parent course
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the topic was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the topic was last updated
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { catchAsync } from '../../middlewares/errorHandler.middleware.js';
import { zodValidator } from '../../middlewares/zodReqValidate.middleware.js';
import { getTopicSchema } from '../../zodSchemas/topic.schema.js';
import { getTopic } from '../../controllers/topic.controller.js';

/**
 * @swagger
 * /api/student/topics/{id}:
 *   get:
 *     summary: Get a specific topic by ID
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Topic retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Topic'
 *       401:
 *         description: Unauthorized - User not authenticated or lacks course access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

const topicStudentRouter = Router();
topicStudentRouter.use(catchAsync(authenticate));
topicStudentRouter.get(
  '/:id',
  zodValidator(getTopicSchema),
  catchAsync(authorize(['read_record'])),
  catchAsync(getTopic),
);

export default topicStudentRouter;
