// routes/userRoutes.ts
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { catchAsync } from '../../middlewares/errorHandler.middleware.js';
import { zodValidator } from '../../middlewares/zodReqValidate.middleware.js';
import {
  getStudentProfile,
  updateStudentProfile,
} from '../../controllers/studentProfile.controller.js';
import {
  getStudentProfileSchema,
  updateStudentProfileSchema,
} from '../../zodSchemas/userProfile.schema.js';

/**
 * @swagger
 * /api/student/profile:
 *   get:
 *     summary: Get student profile
 *     description: Retrieves the profile of the currently logged in student
 *     tags:
 *       - Student
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved the student profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     website:
 *                       type: string
 *                     socialLinks:
 *                       type: object
 *                     timezone:
 *                       type: string
 *                     preferences:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *
 *   put:
 *     summary: Update student profile
 *     description: Updates the profile of the currently logged in student
 *     tags:
 *       - Student
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               bio:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *               socialLinks:
 *                 type: object
 *               timezone:
 *                 type: string
 *               preferences:
 *                 type: object
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully updated the student profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     website:
 *                       type: string
 *                     socialLinks:
 *                       type: object
 *                     timezone:
 *                       type: string
 *                     preferences:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Students cannot modify role or status
 *       404:
 *         description: User not found
 */
const profileStudentRouter = Router()
  .use(authenticate)
  .get('/', zodValidator(getStudentProfileSchema), catchAsync(getStudentProfile))
  .put('/', zodValidator(updateStudentProfileSchema), catchAsync(updateStudentProfile));

export { profileStudentRouter };
