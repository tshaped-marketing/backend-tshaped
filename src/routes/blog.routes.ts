import { Router } from 'express';
import {
  createBlogSchema,
  updateBlogSchema,
  getBlogByIdSchema,
  deleteBlogSchema,
  getAllBlogsSchema,
} from '../zodSchemas/blog.schema.js';
import {
  createBlog,
  updateBlog,
  getBlogById,
  getAllBlogs,
  deleteBlog,
} from '../controllers/blog.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';

const blogRouter = Router()
  /**
   * @swagger
   * /api/blogs:
   *   get:
   *     tags: [Blogs]
   *     summary: Get all blog posts
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
   *         name: published
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: List of blog posts
   */
  .get('/', zodValidator(getAllBlogsSchema), catchAsync(getAllBlogs as RouteType))
  /**
   * @swagger
   * /api/blogs/{id}:
   *   get:
   *     tags: [Blogs]
   *     summary: Get a blog post by ID Or Slug
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Blog post details
   */
  .get('/:id', zodValidator(getBlogByIdSchema), catchAsync(getBlogById as RouteType))
  /**
   * @swagger
   * /api/blogs:
   *   post:
   *     tags: [Blogs]
   *     summary: Create a new blog post
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - summary
   *               - content
   *               - metaTitle
   *               - metaDescription
   *               - author
   *             properties:
   *               title:
   *                 type: string
   *               summary:
   *                 type: string
   *               content:
   *                 type: string
   *               metaTitle:
   *                 type: string
   *               metaDescription:
   *                 type: string
   *               authorLink:
   *                 type: string
   *               image:
   *                 type: string
   *               showUpdateDate:
   *                 type: boolean
   *               published:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Blog post created successfully
   */
  .post(
    '/',
    authenticate as MiddlewareType,
    authorize(['admin_only']) as any,
    zodValidator(createBlogSchema),
    catchAsync(createBlog as RouteType),
  )
  /**
   * @swagger
   * /api/blogs/{id}:
   *   put:
   *     tags: [Blogs]
   *     summary: Update a blog post
   *     security:
   *       - bearerAuth: []
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
   *               title:
   *                 type: string
   *               summary:
   *                 type: string
   *               content:
   *                 type: string
   *               metaTitle:
   *                 type: string
   *               metaDescription:
   *                 type: string
   *               authorLink:
   *                 type: string
   *               image:
   *                 type: string
   *               showUpdateDate:
   *                 type: string
   *               published:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Blog post updated successfully
   */
  .put(
    '/:id',
    authenticate as MiddlewareType,
    authorize(['admin_only']) as any,
    zodValidator(updateBlogSchema),
    catchAsync(updateBlog as RouteType),
  )
  /**
   * @swagger
   * /api/blogs/{id}:
   *   delete:
   *     tags: [Blogs]
   *     summary: Delete a blog post
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
   *         description: Blog post deleted successfully
   */
  .delete(
    '/:id',
    authenticate as MiddlewareType,
    authorize(['admin_only']) as any,
    zodValidator(deleteBlogSchema),
    catchAsync(deleteBlog as RouteType),
  );

export { blogRouter };
