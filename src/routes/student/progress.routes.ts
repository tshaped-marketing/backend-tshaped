import { Router } from 'express';
import {
  updateTopicProgress,
  getCourseProgress,
  markAsIncomplete,
} from '../../controllers/progress.controller.js';
import {
  updateTopicProgressSchema,
  markAsIncompleteSchema,
} from '../../zodSchemas/progress.schema.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { zodValidator } from '../../middlewares/zodReqValidate.middleware.js';
import { catchAsync } from '../../middlewares/errorHandler.middleware.js';

/**
 * @swagger
 * /api/student/progress/topics:
 *   post:
 *     summary: Update topic completion progress
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
 *               - courseId
 *               - newCompletedTopicIds
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: ID of the course
 *               standaloneLessonId:
 *                 type: string
 *                 description: Optioanl parameter if lesson has no topics and should be marked as completed
 *               newCompletedTopicIds:
 *                 type: array
 *                 description: Array of newly completed topic IDs to add to progress
 *                 items:
 *                   type: string
 *               isLessonCompleted:
 *                 type: boolean
 *                 description: Check if associated lesson should be marked as completed
 *                 default: false
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 * /api/student/progress/course/{courseId}:
 *   get:
 *     summary: Get course progress for current student
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the course to get progress for
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 * /api/student/progress/incomplete:
 *   post:
 *     summary: Mark topics or lessons as incomplete
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
 *               - courseId
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: ID of the course
 *               topicIds:
 *                 type: array
 *                 description: Array of topic IDs to mark as incomplete
 *                 items:
 *                   type: string
 *               lessonIds:
 *                 type: array
 *                 description: Array of lesson IDs to mark as incomplete
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Course or progress not found
 *       400:
 *         description: Invalid request or business rule violation
 */
const progressStudentRouter = Router()
  .use(catchAsync(authenticate))
  .post('/topics', zodValidator(updateTopicProgressSchema), catchAsync(updateTopicProgress))
  .get('/course/:courseId', authorize(['read_record']), catchAsync(getCourseProgress))
  .post('/incomplete', zodValidator(markAsIncompleteSchema), catchAsync(markAsIncomplete));

export default progressStudentRouter;
