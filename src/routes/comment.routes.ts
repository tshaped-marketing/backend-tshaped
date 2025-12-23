import { Router } from 'express';
import {
  createComment,
  updateComment,
  deleteComment,
  getComment,
  listComments,
} from '../controllers/comment.controller.js';
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  getCommentSchema,
  listCommentsSchema,
} from '../zodSchemas/comment.schema.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Create a new comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - targetSlug
 *             properties:
 *               text:
 *                 type: string
 *                 description: The comment text
 *               target:
 *                 type: string
 *                 enum: [COURSE, LESSON, TOPIC]
 *                 default: COURSE
 *                 description: The type of content being commented on
 *               targetSlug:
 *                 type: string
 *                 description: The slug of the course, lesson, or topic
 *     responses:
 *       201:
 *         description: Comment created successfully
 */

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Comments]
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
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: The updated comment text
 *     responses:
 *       200:
 *         description: Comment updated successfully
 */

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
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
 *         description: Comment deleted successfully
 */

/**
 * @swagger
 * /api/comments/{id}:
 *   get:
 *     summary: Get a specific comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment retrieved successfully
 */

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: List all comments
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: target
 *         schema:
 *           type: string
 *           enum: [COURSE, LESSON, TOPIC]
 *         description: Filter comments by target type
 *       - in: query
 *         name: targetSlug
 *         schema:
 *           type: string
 *         description: Filter comments by target slug
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of comments retrieved successfully
 */

const commentRouter = Router()
  .use(authenticate as MiddlewareType)
  .post('/', zodValidator(createCommentSchema), catchAsync(createComment as RouteType))
  .put('/:id', zodValidator(updateCommentSchema), catchAsync(updateComment as RouteType))
  .delete('/:id', zodValidator(deleteCommentSchema), catchAsync(deleteComment as RouteType))
  .get('/:id', zodValidator(getCommentSchema), catchAsync(getComment as RouteType))
  .get('/', zodValidator(listCommentsSchema), catchAsync(listComments as RouteType));

export default commentRouter;
