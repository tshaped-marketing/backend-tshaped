import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import {
  createAssignmentSchema,
  deleteAssignmentSchema,
  getAssignmentSchema,
  getAssignmentsSchema,
  getCourseAssignmentsSchema,
  getStudentSubmissionsSchema,
  gradeSubmissionSchema,
  updateAssignmentSchema,
} from '../zodSchemas/assignment.schema.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';
import {
  createAssignment,
  deleteAssignment,
  getAssignment,
  getCourseAssignments,
  getStudentSubmissions,
  gradeSubmission,
  updateAssignment,
} from '../controllers/assignment.controller.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Attachment:
 *       type: object
 *       required:
 *         - name
 *         - url
 *         - type
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the attachment file
 *         url:
 *           type: string
 *           format: uri
 *           description: URL where the attachment can be accessed
 *         type:
 *           type: string
 *           description: MIME type or format of the attachment
 *     Assignment:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - courseId
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         title:
 *           type: string
 *           description: Title of the assignment
 *         description:
 *           type: string
 *           description: Detailed description of the assignment
 *         status:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, NEEDS_REVISION]
 *           description: Current status of the assignment
 *         attachments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Attachment'
 *           description: Array of assignment attachments
 *     AssignmentSubmission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         status:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, NEEDS_REVISION]
 *         feedback:
 *           type: string
 *           description: Instructor feedback
 *         attachments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Attachment'
 *           description: Array of submission attachments
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Create a new assignment
 *     tags: [Assignments]
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
 *               - description
 *               - courseId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               courseId:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Attachment'
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Assignment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an instructor
 */

/**
 * @swagger
 * /api/assignments/course/{courseId}:
 *   get:
 *     summary: Get all assignments for a course
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, NEEDS_REVISION]
 *         description: Filter assignments by status
 *     responses:
 *       200:
 *         description: List of assignments
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
 *                     $ref: '#/components/schemas/Assignment'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Get a single assignment by ID
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Assignment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Assignment'
 *       404:
 *         description: Assignment not found
 *   put:
 *     summary: Update an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
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
 *               attachments:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Attachment'
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, NEEDS_REVISION]
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Assignment'
 *       403:
 *         description: Forbidden - Not the instructor of this course
 *   delete:
 *     summary: Delete an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Assignment deleted successfully
 *       403:
 *         description: Forbidden - Not the instructor of this course
 */

/**
 * @swagger
 * /api/assignments/submissions/course/{courseId}:
 *   get:
 *     summary: Get all submissions for a student in a course
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: List of student's submissions
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
 *                     $ref: '#/components/schemas/AssignmentSubmission'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/assignments/submissions/{submissionId}/grade:
 *   post:
 *     summary: Grade an assignment submission
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               feedback:
 *                 type: string
 *                 description: Instructor feedback
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, NEEDS_REVISION]
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AssignmentSubmission'
 *       403:
 *         description: Forbidden - Not the instructor of this course
 */
const assignmentRouter = Router()
  .use(catchAsync(authenticate) as MiddlewareType)
  .post(
    '/',
    catchAsync(authorize(['create_record'])),
    zodValidator(createAssignmentSchema),
    catchAsync(createAssignment as RouteType),
  )
  .get(
    '/course/:courseId',
    catchAsync(authorize(['read_record'])),
    zodValidator(getCourseAssignmentsSchema),
    catchAsync(getCourseAssignments as RouteType),
  )
  .get(
    '/:id',
    catchAsync(authorize(['read_record'])),
    zodValidator(getAssignmentSchema),
    catchAsync(getAssignment as RouteType),
  )
  .put(
    '/:id',
    catchAsync(authorize(['update_record'])),
    zodValidator(updateAssignmentSchema),
    catchAsync(updateAssignment as RouteType),
  )
  .delete(
    '/:id',
    catchAsync(authorize(['delete_record'])),
    zodValidator(deleteAssignmentSchema),
    catchAsync(deleteAssignment as RouteType),
  )
  .get(
    '/submissions/course/:courseId',
    catchAsync(authorize(['read_record'])),
    zodValidator(getStudentSubmissionsSchema),
    catchAsync(getStudentSubmissions as RouteType),
  )
  .post(
    '/submissions/:submissionId/grade',
    catchAsync(authorize(['update_record'])),
    zodValidator(gradeSubmissionSchema),
    catchAsync(gradeSubmission as RouteType),
  );

export default assignmentRouter;
