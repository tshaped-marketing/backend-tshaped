import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { catchAsync } from '../../middlewares/errorHandler.middleware.js';
import {
  checkCertificateEligibility,
  getCertificateByCourseId,
  getStudentCertificates,
  getStudentSingleCertificate,
} from '../../controllers/certificate.controller.js';

/**
 * @swagger
 * /api/student/certificates:
 *   get:
 *     summary: Get all certificates for the student
 *     description: Retrieves all certificates earned by the authenticated student
 *     tags:
 *       - Student
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved student certificates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   description: Number of certificates
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       courseId:
 *                         type: string
 *                       certificateUrl:
 *                         type: string
 *                       issuedAt:
 *                         type: string
 *                         format: date-time
 *                       course:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           thumbnail:
 *                             type: string
 *                           description:
 *                             type: string
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 *
 * /api/student/certificates/{certificateId}:
 *   get:
 *     summary: Get a specific certificate for the student
 *     description: Retrieves details of a specific certificate owned by the authenticated student
 *     tags:
 *       - Student
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the certificate
 *     responses:
 *       200:
 *         description: Successfully retrieved the certificate
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
 *                     certificateUrl:
 *                       type: string
 *                     issuedAt:
 *                       type: string
 *                       format: date-time
 *                     course:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         instructor:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                     student:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Certificate not found
 *
 * /api/student/certificates/{courseId}/eligibility:
 *   get:
 *     summary: Check certificate eligibility for a course
 *     description: Determines if a student is eligible for a certificate in a specific course
 *     tags:
 *       - Student
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the course
 *     responses:
 *       200:
 *         description: Successfully checked certificate eligibility
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 eligible:
 *                   type: boolean
 *                   description: Whether the student is eligible for a certificate
 *                 certificateExists:
 *                   type: boolean
 *                   description: Whether a certificate has already been issued
 *                 progress:
 *                   type: number
 *                   description: Course completion percentage
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   description: Existing certificate details if already issued
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Course not found
 *
 * /api/student/certificates/course/{courseId}:
 *   get:
 *     summary: Get all certificates for a specific course
 *     description: Retrieves certificates issued for a specific course
 *     tags:
 *       - Student
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the course
 *     responses:
 *       200:
 *         description: Successfully retrieved course certificates
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       courseId:
 *                         type: string
 *                       certificateUrl:
 *                         type: string
 *                       issuedAt:
 *                         type: string
 *                         format: date-time
 *                       student:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *       401:
 *         description: Authentication required
 *       404:
 *         description: No certificates found for this course
 *       500:
 *         description: Internal server error
 */
const studentCertificateRouter = Router()
  .use(authenticate)
  .get('/', catchAsync(getStudentCertificates))
  .get('/:certificateId', catchAsync(getStudentSingleCertificate))
  .get('/:courseId/eligibility', catchAsync(checkCertificateEligibility))
  .get('/course/:courseId', catchAsync(getCertificateByCourseId));

export { studentCertificateRouter };
