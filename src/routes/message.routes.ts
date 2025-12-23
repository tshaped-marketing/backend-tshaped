import { Router } from 'express';

import {
  createContactSchema,
  getContactSchema,
  updateContactSchema,
  deleteContactSchema,
  listContactsSchema,
} from '../zodSchemas/contact.schema.js';
import {
  createContactMessage,
  getContactMessage,
  listContactMessages,
  updateContactMessage,
  deleteContactMessage,
} from '../controllers/contact.controller.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { RouteType } from '../types/router.types.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * /api/contact:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Create a new contact message
 *     description: Creates a new contact message and sends notification email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [High, Medium, Low]
 *     responses:
 *       201:
 *         description: Contact message created successfully
 */

/**
 * @swagger
 * /api/contact/{id}:
 *   get:
 *     tags:
 *       - Contact
 *     summary: Get a contact message by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact message retrieved successfully
 *       404:
 *         description: Contact message not found
 */

/**
 * @swagger
 * /api/contact:
 *   get:
 *     tags:
 *       - Contact
 *     summary: List contact messages
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
 *         name: responded
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [High, Medium, Low]
 *     responses:
 *       200:
 *         description: List of contact messages
 */

/**
 * @swagger
 * /api/contact/{id}:
 *   put:
 *     tags:
 *       - Contact
 *     summary: Update a contact message
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               responded:
 *                 type: boolean
 *               priority:
 *                 type: string
 *                 enum: [High, Medium, Low]
 *     responses:
 *       200:
 *         description: Contact message updated successfully
 *       404:
 *         description: Contact message not found
 */

/**
 * @swagger
 * /api/contact/{id}:
 *   delete:
 *     tags:
 *       - Contact
 *     summary: Delete a contact message
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Contact message deleted successfully
 *       404:
 *         description: Contact message not found
 */

const contactRouter = Router()
  .post('/', zodValidator(createContactSchema), catchAsync(createContactMessage as RouteType))
  .get(
    '/:id',
    authenticate as any,
    zodValidator(getContactSchema),
    catchAsync(getContactMessage as RouteType),
  )
  .get(
    '/',
    authenticate as any,
    zodValidator(listContactsSchema),
    catchAsync(listContactMessages as RouteType),
  )
  .put(
    '/:id',
    authenticate as any,
    zodValidator(updateContactSchema),
    catchAsync(updateContactMessage as RouteType),
  )
  .delete(
    '/:id',
    authenticate as any,
    zodValidator(deleteContactSchema),
    catchAsync(deleteContactMessage as RouteType),
  );

export { contactRouter };
