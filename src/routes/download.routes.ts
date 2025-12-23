import { Router } from 'express';
import {
  downloadAllAssignmentSubmissions,
  downloadSubmissionAttachments,
} from '../controllers/assignment-download.controller.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import {
  downloadAssignmentSchema,
  downloadSubmissionSchema,
} from '../zodSchemas/download.schema.js';

const downloadRouter = Router();
downloadRouter.use(catchAsync(authenticate) as MiddlewareType);

/**
 * @swagger
 * components:
 *   schemas:
 *     DownloadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           description: Success message
 */

/**
 * @swagger
 * tags:
 *   name: Downloads
 *   description: File download endpoints for assignments and submissions
 */

/**
 * @swagger
 * /api/downloads/assignments/{assignmentId}/submissions:
 *   get:
 *     summary: Download all submissions for an assignment as ZIP
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: ZIP file containing all submission attachments
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized - User not authenticated or lacks permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not the course instructor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Assignment not found or no attachments available
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
 * /api/downloads/submissions/{submissionId}:
 *   get:
 *     summary: Download attachments for a specific submission as ZIP
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: ZIP file containing submission attachments
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is neither the submission owner nor the course instructor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Submission not found or no attachments available
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

downloadRouter
  .get(
    '/assignments/:assignmentId/submissions',
    zodValidator(downloadAssignmentSchema),
    catchAsync(authorize(['read_record'])),
    catchAsync(downloadAllAssignmentSubmissions as RouteType),
  )
  .get(
    '/submissions/:submissionId',
    zodValidator(downloadSubmissionSchema),
    catchAsync(authorize(['read_record'])),
    catchAsync(downloadSubmissionAttachments as RouteType),
  );

export default downloadRouter;
