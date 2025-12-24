import { Router } from 'express';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import {
  getHeroComponents,
  updateHeroComponent,
  attachHeroToPage,
  getPageHero,
} from '../controllers/heroComponent.controller.js';
import { RouteType } from '../types/router.types.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import {
  updateHeroComponentSchema,
  attachHeroToPageSchema,
  getPageHeroSchema,
} from '../zodSchemas/heroComponent.schema.js';

const heroComponentRouter = Router()
  /**
   * @swagger
   * /api/hero-components:
   *   get:
   *     tags: [Components]
   *     summary: Get list of hero components
   *     responses:
   *       200:
   *         description: List of hero components
   */
  .get('/', catchAsync(getHeroComponents as RouteType))
  /**
   * @swagger
   * /api/hero-components/page:
   *   get:
   *     tags: [Components]
   *     summary: Get hero component for a specific page
   *     parameters:
   *       - in: query
   *         name: pageSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Hero component for the page
   */
  .get('/page', zodValidator(getPageHeroSchema), catchAsync(getPageHero as RouteType))
  /**
   * @swagger
   * /api/hero-components/attach:
   *   post:
   *     tags: [Components]
   *     summary: Attach hero component to a page with optional overrides
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - pageSlug
   *               - heroComponentId
   *             properties:
   *               pageSlug:
   *                 type: string
   *               heroComponentId:
   *                 type: string
   *               overrideTitle:
   *                 type: string
   *               overrideParagraph:
   *                 type: string
   *               overrideImageUrl:
   *                 type: string
   *     responses:
   *       200:
   *         description: Page hero configuration created/updated
   */
  .post('/attach', zodValidator(attachHeroToPageSchema), catchAsync(attachHeroToPage as RouteType))
  /**
   * @swagger
   * /api/hero-components/{id}:
   *   put:
   *     tags: [Components]
   *     summary: Update hero component (admin only)
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
   *               title:
   *                 type: string
   *               paragraph:
   *                 type: string
   *               imageUrl:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Updated hero component
   */
  .put(
    '/:id',
    zodValidator(updateHeroComponentSchema),
    catchAsync(updateHeroComponent as RouteType),
  );

export { heroComponentRouter };



