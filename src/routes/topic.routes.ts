import { Router } from 'express';
import {
  createTopic,
  updateTopic,
  getTopic,
  deleteTopic,
  getAllTopics,
  searchTopics,
} from '../controllers/topic.controller.js';
import {
  createTopicSchema,
  updateTopicSchema,
  getTopicSchema,
  deleteTopicSchema,
  getAllTopicsSchema,
  searchTopicsSchema,
} from '../zodSchemas/topic.schema.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';

const topicRouter = Router();
topicRouter.use(catchAsync(authenticate) as MiddlewareType);

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

/**
 * @swagger
 * tags:
 *   name: Topics
 *   description: Topic management endpoints
 */

/**
 * @swagger
 * /api/topics:
 *   post:
 *     summary: Create a new topic
 *     tags: [Topics]
 *     security:
 *         - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - mediaUrl
 *               - lessonId
 *               - courseId
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the topic (slug will be auto-generated if not provided)
 *               slug:
 *                 type: string
 *                 description: Optional custom slug for the topic
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [VIDEO, PDF, QUIZ, OTHER]
 *               duration:
 *                 type: integer
 *               mediaUrl:
 *                 type: string
 *                 description: URL of the media content
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     url:
 *                       type: string
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               lessonId:
 *                 type: string
 *               courseId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Topic created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicResponse'
 *       400:
 *         description: Invalid input data
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

/**
 * @swagger
 * /api/topics/{id}:
 *   patch:
 *     summary: Update a topic
 *     tags: [Topics]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the topic (updates slug if changed and no slug provided)
 *               slug:
 *                 type: string
 *                 description: Optional custom slug for the topic
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [VIDEO, PDF, QUIZ, OTHER]
 *               order:
 *                 type: integer
 *               duration:
 *                 type: integer
 *               mediaUrl:
 *                 type: string
 *                 description: URL of the media content
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     url:
 *                       type: string
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               lessonId:
 *                 type: string
 *               courseId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Topic updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicResponse'
 *       400:
 *         description: Invalid input data
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

/**
 * @swagger
 * /api/topics/{id}:
 *   get:
 *     summary: Get a specific topic by ID
 *     tags: [Topics]
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
 *
 *   delete:
 *     summary: Delete a specific topic
 *     tags: [Topics]
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
 *         description: Topic deleted successfully
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
 *                   example: Topic deleted successfully
 *       401:
 *         description: Unauthorized - User not authenticated or lacks permission
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

/**
 * @swagger
 * /api/topics:
 *   get:
 *     summary: Get all topics with pagination and filtering
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lessonId
 *         schema:
 *           type: string
 *         description: Filter topics by lesson ID
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filter topics by course ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [VIDEO, PDF, QUIZ, OTHER]
 *         description: Filter topics by type
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
 *     responses:
 *       200:
 *         description: List of topics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Topic'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of topics
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                     limit:
 *                       type: integer
 *                       description: Items per page
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 *       401:
 *         description: Unauthorized - User not authenticated or lacks permission
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

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               description: Error code (e.g., AUTH016, TOPIC001, TOPIC002)
 *             message:
 *               type: string
 *               description: Error message
 *     TopicResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Topic'
 */
/**
 * @swagger
 * /api/topics/search:
 *   get:
 *     summary: Search and sort topics
 *     tags: [Topics]
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
 *           enum: [title, createdAt, type, order]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [VIDEO, PDF, QUIZ, OTHER]
 *         description: Filter by topic type
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filter by course ID
 *       - in: query
 *         name: lessonId
 *         schema:
 *           type: string
 *         description: Filter by lesson ID
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
 *                     $ref: '#/components/schemas/Topic'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
topicRouter
  .post(
    '/',
    zodValidator(createTopicSchema),
    catchAsync(authorize(['create_record'])),
    catchAsync(createTopic as RouteType),
  )
  // Add the search route here
  .get(
    '/search',
    zodValidator(searchTopicsSchema),
    catchAsync(authorize(['read_record'])),
    catchAsync(searchTopics as RouteType),
  )
  .patch(
    '/:id',
    zodValidator(updateTopicSchema),
    catchAsync(authorize(['update_record'])),
    catchAsync(updateTopic as RouteType),
  )
  .get(
    '/:id',
    zodValidator(getTopicSchema),
    catchAsync(authorize(['read_record'])),
    catchAsync(getTopic as RouteType),
  )
  .delete(
    '/:id',
    zodValidator(deleteTopicSchema),
    catchAsync(authorize(['delete_record'])),
    catchAsync(deleteTopic as RouteType),
  )
  .get(
    '/',
    zodValidator(getAllTopicsSchema),
    catchAsync(authorize(['read_record'])),
    catchAsync(getAllTopics as RouteType),
  );
export default topicRouter;
