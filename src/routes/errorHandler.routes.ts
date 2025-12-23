import { Router } from 'express';
import {
  createErrorHandlerSchema,
  updateErrorHandlerSchema,
  getErrorHandlerByIdSchema,
  deleteErrorHandlerSchema,
  listErrorHandlersSchema,
} from '../zodSchemas/errorHandler.schema.js';
import {
  createErrorHandler,
  updateErrorHandler,
  getErrorHandler,
  listErrorHandlers,
  deleteErrorHandler,
} from '../controllers/errorHandler.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';

/**
 * @swagger
 * /api/error-handlers:
 *   post:
 *     tags:
 *       - Error Handlers
 *     summary: Create a new error handler
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - error_code
 *               - error_message
 *             properties:
 *               error_code:
 *                 type: string
 *               error_message:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *               category:
 *                 type: string
 *               http_code:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 599
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Error handler created successfully
 *   get:
 *     tags:
 *       - Error Handlers
 *     summary: List error handlers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of error handlers
 *
 * /api/error-handlers/{id}:
 *   get:
 *     tags:
 *       - Error Handlers
 *     summary: Get error handler by ID
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
 *         description: Error handler details
 *   put:
 *     tags:
 *       - Error Handlers
 *     summary: Update error handler
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
 *               error_message:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *               category:
 *                 type: string
 *               http_code:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Error handler updated successfully
 *   delete:
 *     tags:
 *       - Error Handlers
 *     summary: Delete error handler
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Error handler deleted successfully
 */

const errorHandlerRouter = Router()
  .use(authenticate as MiddlewareType)
  .post(
    '/',
    authorize(['admin_only']) as any,
    zodValidator(createErrorHandlerSchema),
    catchAsync(createErrorHandler as RouteType),
  )
  .get(
    '/',
    authorize(['admin_only']) as any,
    zodValidator(listErrorHandlersSchema),
    catchAsync(listErrorHandlers as RouteType),
  )
  .get(
    '/:id',
    authorize(['admin_only']) as any,
    zodValidator(getErrorHandlerByIdSchema),
    catchAsync(getErrorHandler as RouteType),
  )
  .put(
    '/:id',
    authorize(['admin_only']) as any,
    zodValidator(updateErrorHandlerSchema),
    catchAsync(updateErrorHandler as RouteType),
  )
  .delete(
    '/:id',
    authorize(['admin_only']) as any,
    zodValidator(deleteErrorHandlerSchema),
    catchAsync(deleteErrorHandler as RouteType),
  );

export { errorHandlerRouter };
