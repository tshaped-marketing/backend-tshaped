import {
  updateSubmissionSchema,
  getAllSubmissionsSchema,
  getSubmissionSchema,
  submitAssignmentSchema,
  getSubmissionsByAssignmentSchema,
} from '../../zodSchemas/assignmentSubmission.schema.js';
import {
  updateSubmission,
  submitAssignment,
  getSubmission,
  getAllSubmissions,
  getSubmissionsByAssignment,
  getCourseSubmissionHistory,
  getSubmissionHistory,
} from '../../controllers/assignmentSubmit.controller.js';
import { catchAsync } from '../../middlewares/errorHandler.middleware.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { zodValidator } from '../../middlewares/zodReqValidate.middleware.js';
import { MiddlewareType, RouteType } from '../../types/router.types.js';
import { Router } from 'express';

/**
 * @swagger
 * components:
 *   schemas:
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of records
 *         page:
 *           type: integer
 *           description: Current page number
 *         limit:
 *           type: integer
 *           description: Number of records per page
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 *     AssignmentSubmission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         assignmentId:
 *           type: string
 *           description: ID of the assignment being submitted
 *         studentId:
 *           type: string
 *           description: ID of the student making the submission
 *         textContent:
 *           type: string
 *           description: Text content of the submission
 *         attachments:
 *           type: array
 *           description: Array of attached files
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the file
 *               url:
 *                 type: string
 *                 description: URL of the uploaded file
 *               type:
 *                 type: string
 *                 description: Type/format of the file
 *         status:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, NEEDS_REVISION]
 *           description: Current status of the submission
 *         grade:
 *           type: number
 *           description: Grade awarded for the submission
 *         feedback:
 *           type: string
 *           description: Feedback from the instructor
 *         attempts:
 *           type: integer
 *           description: Number of submission attempts
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of submission
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/student/submissions:
 *   get:
 *     summary: Get all submissions with pagination and filters
 *     description: Retrieve all submissions for the authenticated student with pagination, sorting, and filtering options
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Number of records per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [submittedAt, status, grade]
 *           default: submittedAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, NEEDS_REVISION]
 *         description: Filter by submission status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter submissions after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter submissions before this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in assignment title and submission content
 *     responses:
 *       200:
 *         description: Submissions retrieved successfully
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
 *                     $ref: '#/components/schemas/AssignmentSubmission'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Not a student
 */

/**
 * @swagger
 * /api/student/submissions/{assignmentId}:
 *   post:
 *     summary: Submit an assignment
 *     description: Submit a new assignment
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment to submit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - textContent
 *             properties:
 *               textContent:
 *                 type: string
 *                 description: Main content of the submission
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *     responses:
 *       200:
 *         description: Assignment submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AssignmentSubmission'
 *                 message:
 *                   type: string
 *                   example: Assignment submitted successfully
 *       400:
 *         description: Invalid request or submission deadline passed
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Not authorized
 *       404:
 *         description: Assignment not found
 */

/**
 * @swagger
 * /api/student/submissions/{assignmentId}:
 *   get:
 *     summary: Get a specific submission
 *     description: Retrieve a student's submission for a specific assignment
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
 *     responses:
 *       200:
 *         description: Submission retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AssignmentSubmission'
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Not authorized
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/student/submissions/{assignmentId}:
 *   put:
 *     summary: Update a submission
 *     description: Update an existing draft submission for an assignment
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - textContent
 *             properties:
 *               textContent:
 *                 type: string
 *                 description: Updated content of the submission
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AssignmentSubmission'
 *                 message:
 *                   type: string
 *                   example: Submission updated successfully
 *       400:
 *         description: Cannot update non-draft submission
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Not authorized
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/student/submissions/course/{courseId}/history:
 *   get:
 *     summary: Get submission history for a course
 *     description: Retrieve all submissions history for a specific course with pagination and filtering options
 *     tags: [Student]
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
 *         description: Number of records per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [submittedAt, status, grade]
 *           default: submittedAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, NEEDS_REVISION]
 *         description: Filter by submission status
 *     responses:
 *       200:
 *         description: Submission history retrieved successfully
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/AssignmentSubmission'
 *                       - type: object
 *                         properties:
 *                           assignment:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               maxScore:
 *                                 type: number
 *                               dueDate:
 *                                 type: string
 *                                 format: date-time
 *                               course:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   title:
 *                                     type: string
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Not authorized
 *       404:
 *         description: Course not found
 */

/**
 * @swagger
 * /api/student/submissions/{assignmentId}/history:
 *   get:
 *     summary: Get submission history for an assignment
 *     description: Retrieve submission history for a student's specific assignment with versioning details
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
 *     responses:
 *       200:
 *         description: Submission history retrieved successfully
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
 *                     $ref: '#/components/schemas/AssignmentSubmission'
 *                 message:
 *                   type: string
 *                   example: Submission history retrieved successfully
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Not authorized
 *       404:
 *         description: Submission history not found
 */

const submissionStudentRouter = Router()
  .use(catchAsync(authenticate) as MiddlewareType)
  .post(
    '/:assignmentId',
    catchAsync(authorize(['read_record'])),
    zodValidator(submitAssignmentSchema),
    catchAsync(submitAssignment as RouteType),
  )
  .get(
    '/:assignmentId',
    catchAsync(authorize(['read_record'])),
    zodValidator(getSubmissionSchema),
    catchAsync(getSubmission as RouteType),
  )
  .get(
    '/:assignmentId/history',
    catchAsync(authorize(['read_record'])),
    catchAsync(getSubmissionHistory as RouteType),
  )
  .get(
    '/',
    catchAsync(authorize(['read_record'])),
    zodValidator(getAllSubmissionsSchema),
    catchAsync(getAllSubmissions as RouteType),
  )
  .put(
    '/:assignmentId',
    catchAsync(authorize(['read_record'])),
    zodValidator(updateSubmissionSchema),
    catchAsync(updateSubmission as RouteType),
  )
  .get(
    '/course/:courseId/history',
    catchAsync(authorize(['read_record'])),
    catchAsync(getCourseSubmissionHistory as RouteType),
  );

export default submissionStudentRouter;
