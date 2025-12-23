import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  getUploadPresignedUrl,
  confirmUpload,
  deleteUpload,
  getUserUploads,
  getUploadByIdOrSlug,
  getMultiUploadPresignedUrls,
  getSignedUrl,
  downloadMultipleFiles,
} from '../controllers/upload.controller.js';
import {
  getUploadPresignedUrlSchema,
  confirmUploadSchema,
  deleteUploadSchema,
  getUploadByIdOrSlugSchema,
  getUserUploadsSchema,
  confirmMultiUploadSchema,
  getMultiUploadPresignedUrlSchema,
  getSignedUrlSchema,
  getMultipleDownloadUrlsSchema,
} from '../zodSchemas/upload.schema.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import configurableRateLimit from '../middlewares/rateLimiter.middleware.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Upload:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier for the upload
 *         filename:
 *           type: string
 *           description: The name of the uploaded file
 *         fileType:
 *           type: string
 *           enum: [IMAGE, VIDEO, DOCUMENT, PDF, OTHER]
 *           description: The type of file uploaded
 *         mimeType:
 *           type: string
 *           description: The MIME type of the uploaded file
 *         size:
 *           type: number
 *           description: The size of the file in bytes
 *         url:
 *           type: string
 *           description: The URL where the file can be accessed
 *         key:
 *           type: string
 *           description: The S3 key of the uploaded file
 *         slug:
 *           type: string
 *           description: A URL-friendly identifier for the upload
 *         isPublic:
 *           type: boolean
 *           description: Whether the upload is publicly accessible
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the upload was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the upload was last updated
 */

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload management with S3 presigned URLs
 */
/**
 * @swagger
 * /api/upload/presigned:
 *   post:
 *     tags: [Upload]
 *     summary: Get a presigned URL for file upload
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileNameWithExtension
 *             properties:
 *               fileNameWithExtension:
 *                 type: string
 *                 description: Name of file with extension (e.g., "document.pdf")
 *               isPublic:
 *                 type: boolean
 *                 description: Whether the upload should be publicly accessible
 *                 default: false
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 presignedUrl:
 *                   type: string
 *                   description: Temporary URL for uploading file to S3
 *                 downloadUrl:
 *                   type: string
 *                   description: URL where file will be accessible after upload (public S3/CloudFront URL or signed URL endpoint)
 *             example:
 *               presignedUrl: "https://t-shaped-bucket.s3.ap-south-1.amazonaws.com/uploads/private/e49a41c915e45cf676e5fa54c5fecb80?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA3FLDZBLA5GLLZ2MZ%2F20250122%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20250122T072432Z&X-Amz-Expires=300&X-Amz-Signature=0e0d40f25df61828ff226b833cb494dac16c1efb1c29ccaa10339eb301d41311&X-Amz-SignedHeaders=host&x-amz-checksum-crc32=AAAAAA%3D%3D&x-amz-sdk-checksum-algorithm=CRC32&x-id=PutObject"
 *               downloadUrl: "http://localhost:3000/api/upload/cm67kwfq70003w863xa6z4pvk/signed-url"
 */

/**
 * @swagger
 * /api/upload/multi-presigned:
 *   post:
 *     tags: [Upload]
 *     summary: Get presigned URLs for multiple file uploads
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - fileNameWithExtension
 *                   properties:
 *                     fileNameWithExtension:
 *                       type: string
 *                       description: Name of file with extension
 *               isPublic:
 *                 type: boolean
 *                 description: Whether the uploads should be publicly accessible
 *                 default: false
 *           example:
 *             files: [
 *               { "fileNameWithExtension": "document1.pdf" },
 *               { "fileNameWithExtension": "image1.jpg" }
 *             ]
 *             isPublic: false
 *     responses:
 *       200:
 *         description: Presigned URLs generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   presignedUrl:
 *                     type: string
 *                     description: Temporary URL for uploading file to S3
 *                   downloadUrl:
 *                     type: string
 *                     description: URL where file will be accessible after upload
 *             example:
 *               - presignedUrl: "https://t-shaped-bucket.s3.ap-south-1.amazonaws.com/uploads/private/doc1?X-Amz-Algorithm=AWS4-HMAC-SHA256..."
 *                 downloadUrl: "http://localhost:3000/api/upload/cm67kwfq70003w863xa6z4pvk/signed-url"
 *               - presignedUrl: "https://t-shaped-bucket.s3.ap-south-1.amazonaws.com/uploads/private/img1?X-Amz-Algorithm=AWS4-HMAC-SHA256..."
 *                 downloadUrl: "http://localhost:3000/api/upload/cm67kwfq70004w863xa6z4pvk/signed-url"
 */
/**
 * @swagger
 * /api/upload/confirm:
 *   post:
 *     tags: [Upload]
 *     summary: Confirm successful file upload to S3
 *     description: Confirms an upload using either an uploadId or uploadKey. At least one identifier must be provided.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: []
 *             properties:
 *               uploadId:
 *                 type: string
 *                 description: The unique identifier of the upload
 *                 example: "cm_abc123"
 *               uploadKey:
 *                 type: string
 *                 description: The S3 key of the uploaded file
 *                 example: "uploads/document1-xyz"
 *               size:
 *                 type: number
 *                 description: The size of the uploaded file in bytes (optional)
 *                 example: 1024576
 *           examples:
 *             withId:
 *               value:
 *                 uploadId: "cm_abc123"
 *                 size: 1024576
 *             withKey:
 *               value:
 *                 uploadKey: "uploads/document1-xyz"
 *                 size: 1024576
 *     responses:
 *       202:
 *         description: Upload confirmation received and being processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Upload confirmation received and being processed"
 *                 uploadId:
 *                   type: string
 *                   example: "cm_abc123"
 */

/**
 * @swagger
 * /api/upload/{id}:
 *   delete:
 *     tags: [Upload]
 *     summary: Delete an upload from S3
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
 *         description: Upload deleted successfully
 */

/**
 * @swagger
 * /api/upload/{identifier}:
 *   get:
 *     tags: [Upload]
 *     summary: Get upload by ID or slug
 *     description: Retrieves an upload using either a primary key (i.e cm.....) or slug identifier
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Either a primary key or a slug
 *     responses:
 *       200:
 *         description: Upload details with signed URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Upload'
 *       404:
 *         description: Upload not found
 *       403:
 *         description: Unauthorized access
 */

/**
 * @swagger
 * /api/upload/user:
 *   get:
 *     tags: [Upload]
 *     summary: Get all uploads for current user with filtering options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, fileType]
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: fileType
 *         schema:
 *           type: string
 *           enum: [IMAGE, VIDEO, DOCUMENT, PDF, OTHER]
 *         description: Filter by file type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by filename
 *     responses:
 *       200:
 *         description: List of filtered user uploads with signed URLs
 */

/**
 * @swagger
 * /api/upload/{identifier}/signed-url:
 *   get:
 *     tags: [Upload]
 *     summary: Get a fresh signed URL for an upload
 *     description: Gets a new signed URL for downloading a file using either its ID or slug
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Either a CM ID or a slug
 *     responses:
 *       200:
 *         description: Signed URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signedUrl:
 *                   type: string
 *                   description: The signed URL for downloading the file
 *                 fileType:
 *                   type: string
 *                   enum: [IMAGE, VIDEO, DOCUMENT, PDF, OTHER]
 *                 filename:
 *                   type: string
 *                 mimeType:
 *                   type: string
 *                 size:
 *                   type: number
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Upload not found
 *       500:
 *         description: Error generating signed URL
 */

/**
 * @swagger
 * /api/upload/download-multiple:
 *   post:
 *     summary: Download multiple files as a zip archive
 *     security:
 *       - bearerAuth: []
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keys
 *             properties:
 *               keys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of S3 keys for files to download
 *                 maxItems: 50
 *     responses:
 *       200:
 *         description: Returns a zip file containing the requested files
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request - empty keys array or too many files
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User doesn't have access to one or more files
 *       404:
 *         description: One or more files not found
 */
const uploadRouter = Router();

uploadRouter.post(
  '/confirm',
  zodValidator(confirmUploadSchema),
  catchAsync(confirmUpload as RouteType),
);

uploadRouter
  .use(authenticate as MiddlewareType)
  .post(
    '/presigned',
    zodValidator(getUploadPresignedUrlSchema),
    configurableRateLimit({windowMinutes:15,maxRequests:25}),
    catchAsync(getUploadPresignedUrl as RouteType),
  )
  .post(
    '/multi-presigned',
    configurableRateLimit({windowMinutes:15,maxRequests:25}),
    // zodValidator(getMultiUploadPresignedUrlSchema),
    catchAsync(getMultiUploadPresignedUrls as RouteType),
  )
  .get('/user', zodValidator(getUserUploadsSchema), catchAsync(getUserUploads as RouteType))
  .post(
    '/download-multiple',
    zodValidator(getMultipleDownloadUrlsSchema),
    catchAsync(downloadMultipleFiles as RouteType),
  )
  .get(
    '/:identifier/signed-url',
    zodValidator(getSignedUrlSchema),
    catchAsync(getSignedUrl as RouteType),
  )
  .delete('/:id', zodValidator(deleteUploadSchema), catchAsync(deleteUpload as RouteType))
  .get(
    '/:identifier',
    zodValidator(getUploadByIdOrSlugSchema),
    catchAsync(getUploadByIdOrSlug as RouteType),
  );

export { uploadRouter };
