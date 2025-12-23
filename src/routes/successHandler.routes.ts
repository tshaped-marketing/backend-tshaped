import { Router } from 'express';
import {
  createSuccessHandlerSchema,
  updateSuccessHandlerSchema,
  getSuccessHandlerByIdSchema,
  deleteSuccessHandlerSchema,
  listSuccessHandlersSchema,
} from '../zodSchemas/successHandler.schema.js';
import {
  createSuccessHandler,
  updateSuccessHandler,
  getSuccessHandler,
  listSuccessHandlers,
  deleteSuccessHandler,
} from '../controllers/successHandler.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';

/**
 * @swagger
 * /api/success-handlers:
 *   post:
 *     tags:
 *       - Success Handlers
 *     summary: Create a new success handler
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - success_code
 *               - success_message
 *             properties:
 *               success_code:
 *                 type: string
 *               success_message:
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
 *         description: Success handler created successfully
 *   get:
 *     tags:
 *       - Success Handlers
 *     summary: List success handlers
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
 *         description: List of success handlers
 *
 * /api/success-handlers/{id}:
 *   get:
 *     tags:
 *       - Success Handlers
 *     summary: Get success handler by ID
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
 *         description: Success handler details
 *   put:
 *     tags:
 *       - Success Handlers
 *     summary: Update success handler
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
 *               success_message:
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
 *         description: Success handler updated successfully
 *   delete:
 *     tags:
 *       - Success Handlers
 *     summary: Delete success handler
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
 *         description: Success handler deleted successfully
 */

const successHandlerRouter = Router()
  .use(authenticate as MiddlewareType)
  .post(
    '/',
    authorize(['admin_only']) as any,
    zodValidator(createSuccessHandlerSchema),
    catchAsync(createSuccessHandler as RouteType),
  )
  .get(
    '/',
    authorize(['admin_only']) as any,
    zodValidator(listSuccessHandlersSchema),
    catchAsync(listSuccessHandlers as RouteType),
  )
  .get(
    '/:id',
    authorize(['admin_only']) as any,
    zodValidator(getSuccessHandlerByIdSchema),
    catchAsync(getSuccessHandler as RouteType),
  )
  .put(
    '/:id',
    authorize(['admin_only']) as any,
    zodValidator(updateSuccessHandlerSchema),
    catchAsync(updateSuccessHandler as RouteType),
  )
  .delete(
    '/:id',
    authorize(['admin_only']) as any,
    zodValidator(deleteSuccessHandlerSchema),
    catchAsync(deleteSuccessHandler as RouteType),
  );

export { successHandlerRouter };
