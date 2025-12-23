import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  getAdminNotifications,
  getStudentNotifications,
  markAllAsRead,
  markAsRead,
} from '../controllers/notification.controller.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API endpoints for managing user notifications
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the notification
 *         userId:
 *           type: string
 *           description: ID of the user this notification belongs to
 *         type:
 *           type: string
 *           enum: [ADMIN, STUDENT]
 *           description: Type of notification
 *         message:
 *           type: string
 *           description: Notification message content
 *         metadata:
 *           type: object
 *           description: Additional data associated with the notification
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the notification was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the notification was last updated
 *       required:
 *         - id
 *         - userId
 *         - type
 *         - message
 *         - isRead
 *         - createdAt
 *         - updatedAt
 *     PaginatedResponse:
 *       type: object
 *       properties:
 *         notifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Notification'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               description: Total number of notifications
 *             page:
 *               type: integer
 *               description: Current page number
 *             pages:
 *               type: integer
 *               description: Total number of pages
 */

/**
 * @swagger
 * /api/notifications/admin:
 *   get:
 *     summary: Get all admin notifications
 *     description: Retrieves paginated admin notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved admin notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 */

/**
 * @swagger
 * /api/notifications/student:
 *   get:
 *     summary: Get student notifications
 *     description: Retrieves paginated notifications for the authenticated student
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved student notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 */

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Updates a notification's status to read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the notification to mark as read
 *     responses:
 *       200:
 *         description: Notification successfully marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized - User not authenticated
 *       404:
 *         description: Notification not found
 */

/**
 * @swagger
 * /api/notifications/read/all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Updates all unread notifications for the authenticated user to read status
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications successfully marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarkAsReadResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 */
const notificationRouter = Router()
  .use(authenticate as MiddlewareType)
  .get('/admin', authorize(['admin_only']) as any, catchAsync(getAdminNotifications as RouteType))
  .get('/student', catchAsync(getStudentNotifications as RouteType))
  .patch('/:notificationId/read', catchAsync(markAsRead as RouteType))
  .patch('/read/all', catchAsync(markAllAsRead as RouteType));
export { notificationRouter };
