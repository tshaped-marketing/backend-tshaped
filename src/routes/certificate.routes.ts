import { Router } from 'express';

import {
  createCertificateSchema,
  updateCertificateSchema,
  getCertificateSchema,
  deleteCertificateSchema,
} from '../zodSchemas/certificate.schema.js';
import {
  createCertificate,
  getCertificate,
  getAllCertificates,
  updateCertificate,
  deleteCertificate,
  generateCertificateController,
} from '../controllers/certificate.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';

/**
 * @swagger
 * tags:
 *   name: Certificates
 *   description: Certificate management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Certificate:
 *       type: object
 *       required:
 *         - studentId
 *         - courseId
 *       properties:
 *         studentId:
 *           type: string
 *           description: ID of the student
 *         courseId:
 *           type: string
 *           description: ID of the course
 */

/**
 * @swagger
 * /api/certificates:
 *   post:
 *     summary: Create a new certificate
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Certificate'
 *     responses:
 *       201:
 *         description: Certificate created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get all certificates
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificates retrieved successfully
 *       401:
 *         description: Unauthorized
 *
 * /api/certificates/{id}:
 *   get:
 *     summary: Get a specific certificate
 *     tags: [Certificates]
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
 *         description: Certificate retrieved successfully
 *       404:
 *         description: Certificate not found
 *       401:
 *         description: Unauthorized
 *   patch:
 *     summary: Update a certificate
 *     tags: [Certificates]
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
 *             properties:
 *               certificateUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Certificate updated successfully
 *       404:
 *         description: Certificate not found
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Delete a certificate
 *     tags: [Certificates]
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
 *         description: Certificate deleted successfully
 *       404:
 *         description: Certificate not found
 *       401:
 *         description: Unauthorized
 */

const certificateRouter = Router()
 .post(
    '/certificate',
    // catchAsync(authorize(['create_record'])), // Adjust permissions as needed
    catchAsync(generateCertificateController)
  )


certificateRouter
.use(authenticate as MiddlewareType)
  .post(
    '/',
    authorize(['create_record']) as MiddlewareType,
    zodValidator(createCertificateSchema),
    catchAsync(createCertificate as RouteType),
  )
  .get(
    '/:id',
    authorize(['read_record']) as MiddlewareType,
    zodValidator(getCertificateSchema),
    catchAsync(getCertificate as RouteType),
  )
  .get(
    '/',
    authorize(['admin_only']) as MiddlewareType,
    catchAsync(getAllCertificates as RouteType),
  )
  .patch(
    '/:id',
    authorize(['update_record']) as MiddlewareType,
    zodValidator(updateCertificateSchema),
    catchAsync(updateCertificate as RouteType),
  )
  .delete(
    '/:id',
    authorize(['delete_record']) as MiddlewareType,
    zodValidator(deleteCertificateSchema),
    catchAsync(deleteCertificate as RouteType),
  );

export default certificateRouter;
