import express from 'express';
import {
  createSetting,
  getAllSettings,
  getSettingByIdentifier,
  updateSetting,
  deleteSetting,
  batchUpdateSettings,
  createSettingsJson,
} from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { createSettingsJsonSchema,
  createSettingSchema,
  getAllSettingsSchema,
  getSettingByIdentifierSchema,
  updateSettingSchema,
  deleteSettingSchema,
  batchUpdateSettingsSchema
 } from '../zodSchemas/settings.schema.js';
/**
 * @swagger
 * components:
 *   schemas:
 *     Setting:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the setting
 *         title:
 *           type: string
 *           description: Title of the setting
 *         order:
 *           type: string
 *           description: ( eg "1", "2", "3" )
 *         slug:
 *           type: string
 *           description: Unique slug identifier
 *           pattern: ^[a-z0-9-]+$
 *         description:
 *           type: string
 *           description: Optional description of the setting
 *         mode:
 *           type: string
 *           enum: [SINGLE, MULTIPLE, NESTED]
 *           description: Setting mode
 *         dataType:
 *           type: string
 *           enum: [TEXT, ARRAY, BOOLEAN, NUMBER, OBJECT, JSON]
 *           description: Data type of the setting value
 *         value:
 *           type: object
 *           description: The actual setting value
 *         platform:
 *           type: string
 *           enum: [ALL, WEB, MOBILE, DESKTOP]
 *           description: Target platform for the setting
 *           default: ALL
 *         isActive:
 *           type: boolean
 *           description: Whether the setting is active
 *         parentId:
 *           type: string
 *           description: ID of the parent setting (for nested settings)
 *           nullable: true
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Setting'
 *           description: Child settings (for nested settings)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: Create a new setting
 *     tags: [Settings]
 *     security:
 *         - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *               - mode
 *               - dataType
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the setting
 *               slug:
 *                 type: string
 *                 description: Unique identifier for the setting
 *                 pattern: ^[a-z0-9-]+$
 *               order:
 *                 type: string
 *                 description: ( eg "1", "2", "3" )
 *                 pattern: ^[0-9]+$
 *               description:
 *                 type: string
 *                 description: Optional description of the setting
 *               mode:
 *                 type: string
 *                 enum: [SINGLE, MULTIPLE, NESTED]
 *               dataType:
 *                 type: string
 *                 enum: [TEXT, ARRAY, BOOLEAN, NUMBER, OBJECT, JSON]
 *               value:
 *                 type: object
 *                 description: The value of the setting
 *               platform:
 *                 type: string
 *                 enum: [ALL, WEB, MOBILE, DESKTOP]
 *                 description: Target platform for the setting
 *                 default: ALL
 *               parentId:
 *                 type: string
 *                 description: Optional parent setting ID for nested settings
 *               isActive:
 *                 type: boolean
 *                 description: Whether the setting is active
 *                 default: true
 *           examples:
 *             simple_boolean:
 *               summary: Simple Boolean Setting
 *               value:
 *                 title: "Dark Mode"
 *                 slug: "dark-mode"
 *                 description: "Toggle between dark and light theme"
 *                 mode: "SINGLE"
 *                 order: 1
 *                 dataType: "BOOLEAN"
 *                 value: false
 *                 platform: "ALL"
 *                 isActive: true
 *             nested_notification_system:
 *               summary: Parent Setting - Notification System
 *               value:
 *                 title: "Notification System"
 *                 slug: "notification-system"
 *                 description: "Global notification settings"
 *                 mode: "NESTED"
 *                 dataType: "OBJECT"
 *                 value: {
 *                   "enabled": true,
 *                   "provider": "default"
 *                 }
 *                 platform: "ALL"
 *                 isActive: true
 *             nested_email_settings:
 *               summary: Child Setting - Email Notifications
 *               value:
 *                 title: "Email Notifications"
 *                 slug: "email-notifications"
 *                 description: "Email notification configuration"
 *                 mode: "NESTED"
 *                 dataType: "OBJECT"
 *                 value: {
 *                   "enabled": true,
 *                   "defaultFrom": "noreply@example.com"
 *                 }
 *                 platform: "ALL"
 *                 parentId: "notification-system-id"
 *                 isActive: true
 *             nested_email_templates:
 *               summary: Grandchild Setting - Email Templates
 *               value:
 *                 title: "Email Templates"
 *                 slug: "email-templates"
 *                 description: "Notification email templates"
 *                 mode: "SINGLE"
 *                 dataType: "JSON"
 *                 value: {
 *                   "welcomeEmail": {
 *                     "subject": "Welcome to {courseName}",
 *                     "template": "welcome-template"
 *                   },
 *                   "reminderEmail": {
 *                     "subject": "Reminder: {assignmentName} due soon",
 *                     "template": "reminder-template"
 *                   }
 *                 }
 *                 platform: "ALL"
 *                 parentId: "email-notifications-id"
 *                 isActive: true
 *             array_setting:
 *               summary: Array Setting Example
 *               value:
 *                 title: "Social Media Links"
 *                 slug: "social-links"
 *                 description: "Social media platform links"
 *                 mode: "MULTIPLE"
 *                 dataType: "ARRAY"
 *                 value: [
 *                   {
 *                     "platform": "Twitter",
 *                     "url": "https://twitter.com/example"
 *                   },
 *                   {
 *                     "platform": "Facebook",
 *                     "url": "https://facebook.com/example"
 *                   }
 *                 ]
 *                 platform: "ALL"
 *                 isActive: true
 *     responses:
 *       201:
 *         description: Setting created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Setting'
 *       400:
 *         description: Invalid request body or duplicate slug
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Settings]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *         description: Filter by parent setting ID
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [SINGLE, MULTIPLE, NESTED]
 *         description: Filter by setting mode
 *       - in: query
 *         name: dataType
 *         schema:
 *           type: string
 *           enum: [TEXT, ARRAY, BOOLEAN, NUMBER, OBJECT, JSON]
 *         description: Filter by data type
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [ALL, WEB, MOBILE, DESKTOP]
 *         description: Filter by target platform
 *     responses:
 *       200:
 *         description: List of settings
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
 *                     $ref: '#/components/schemas/Setting'
 */

/**
 * @swagger
 * /api/settings/{identifier}:
 *   get:
 *     summary: Get setting by ID or slug with specified depth of nested children
 *     tags: [Settings]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting ID or slug
 *       - in: query
 *         name: depth
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 1
 *         description: Number of levels of nested children to retrieve (0 means no children, 1 means immediate children only, 2+ means grandchildren and beyond)
 *     responses:
 *       200:
 *         description: Setting found with nested children up to specified depth
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Setting'
 *             examples:
 *               webSetting:
 *                 summary: Web-specific setting example
 *                 value: {
 *                   "success": true,
 *                   "data": {
 *                     "id": "web-navigation-id",
 *                     "title": "Web Navigation",
 *                     "slug": "web-navigation",
 *                     "mode": "NESTED",
 *                     "dataType": "OBJECT",
 *                     "platform": "WEB",
 *                     "value": {
 *                       "style": "horizontal",
 *                       "showSearch": true
 *                     },
 *                     "isActive": true,
 *                     "children": []
 *                   }
 *                 }
 *       400:
 *         description: Invalid depth parameter
 *       404:
 *         description: Setting not found
 */

/**
 * @swagger
 * /api/settings/{id}:
 *   patch:
 *     summary: Update a setting
 *     tags: [Settings]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *                 pattern: ^[a-z0-9-]+$
 *               description:
 *                 type: string
 *               mode:
 *                 type: string
 *                 enum: [SINGLE, MULTIPLE, NESTED]
 *               dataType:
 *                 type: string
 *                 enum: [TEXT, ARRAY, BOOLEAN, NUMBER, OBJECT, JSON]
 *               value:
 *                 type: object
 *               platform:
 *                 type: string
 *                 enum: [ALL, WEB, MOBILE, DESKTOP]
 *               parentId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Setting updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Setting'
 *       404:
 *         description: Setting not found
 */

/**
 * @swagger
 * /api/settings/{id}:
 *   delete:
 *     summary: Delete a setting
 *     tags: [Settings]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting ID
 *     responses:
 *       200:
 *         description: Setting deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Setting not found
 */

/**
 * @swagger
 * /api/settings/batch-update:
 *   post:
 *     summary: Batch update settings
 *     tags: [Settings]
 *     security:
 *         - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - id
 *                 - value
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Setting ID
 *                 value:
 *                   type: object
 *                   description: New value for the setting
 *                 platform:
 *                   type: string
 *                   enum: [ALL, WEB, MOBILE, DESKTOP]
 *                   description: Update platform targeting (optional)
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Setting'
 *       400:
 *         description: Invalid request body
 */

/**
 * @swagger
 * /api/settings/export/json:
 *   post:
 *     summary: Export all active settings to a JSON file
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [ALL, WEB, MOBILE, DESKTOP]
 *         description: Export settings for specific platform only
 *     responses:
 *       200:
 *         description: Settings exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 filePath:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
const settingsRouter = express.Router();

// Public route: Get setting by identifier
settingsRouter.get(
  '/:identifier', 
  zodValidator(getSettingByIdentifierSchema),
  catchAsync(getSettingByIdentifier as any)
);

// Protected routes
settingsRouter.use(catchAsync(authenticate) as MiddlewareType);

settingsRouter.post(
  '/',
  catchAsync(authorize(['admin_only'])),
  zodValidator(createSettingSchema),
  catchAsync(createSetting as RouteType),
);

settingsRouter.get(
  '/',
  catchAsync(authorize(['admin_only'])),
  zodValidator(getAllSettingsSchema),
  catchAsync(getAllSettings as RouteType),
);

settingsRouter.patch(
  '/:id',
  catchAsync(authorize(['admin_only'])),
  zodValidator(updateSettingSchema),
  catchAsync(updateSetting as RouteType),
);

settingsRouter.delete(
  '/:id',
  catchAsync(authorize(['admin_only'])),
  zodValidator(deleteSettingSchema),
  catchAsync(deleteSetting as RouteType),
);

settingsRouter.post(
  '/batch-update',
  catchAsync(authorize(['admin_only'])),
  zodValidator(batchUpdateSettingsSchema),
  catchAsync(batchUpdateSettings as RouteType),
);

settingsRouter.post(
  '/export/json',
  catchAsync(authorize(['admin_only'])),
  zodValidator(createSettingsJsonSchema),
  catchAsync(createSettingsJson as RouteType),
);

export default settingsRouter;
