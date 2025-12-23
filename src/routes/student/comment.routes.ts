import { Router } from 'express';
import { zodValidator } from '../../middlewares/zodReqValidate.middleware.js';

import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  getCommentSchema,
  listCommentsSchema,
} from '../../zodSchemas/comment.schema.js';
import {
  createComment,
  updateComment,
  deleteComment,
  getComment,
  listComments,
} from '../../controllers/comment.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { catchAsync } from '../../middlewares/errorHandler.middleware.js';

/**
 * @swagger
 * /api/student/comments:
 *   post:
 *     summary: Create a new comment
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
 * /api/student/comments/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Student]
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
 * /api/student/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Student]
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
 * /api/student/comments/{id}:
 *   get:
 *     summary: Get a specific comment
 *     tags: [Student]
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
 * /api/student/comments:
 *   get:
 *     summary: List all comments
 *     tags: [Student]
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

const commentStudentRouter = Router()
  .use(authenticate)
  .post('/', zodValidator(createCommentSchema), catchAsync(createComment))
  .put('/:id', zodValidator(updateCommentSchema), catchAsync(updateComment))
  .delete('/:id', zodValidator(deleteCommentSchema), catchAsync(deleteComment))
  .get('/:id', zodValidator(getCommentSchema), catchAsync(getComment))
  .get('/', zodValidator(listCommentsSchema), catchAsync(listComments));

export default commentStudentRouter;
