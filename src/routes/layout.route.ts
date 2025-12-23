// routes/layoutRoutes.ts
import express from 'express';
import {
  createPage,
  deletePage,
  getPageByPathname,
  getPageBySlug,
  getPages,
  updatePage,
  updatePageSections,
} from '../controllers/layoutControllers/page.controller.js';
import {
  createSection,
  deleteLibrarySection,
  deleteSection,
  getLibrarySectionBySlug,
  getSectionBySlug,
  getSectionLibrary,
  getSectionLibraryById,
  getSections,
  reorderSections,
  updateLibrarySection,
  updateSection,
} from '../controllers/layoutControllers/section.controller.js';
import {
  createBulkContent,
  createContent,
  deleteContent,
  getContentById,
  getContents,
  getContentsByParentId,
  updateContent,
} from '../controllers/layoutControllers/content.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { MiddlewareType } from '../types/router.types';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
/**
 * @swagger
 * components:
 *   schemas:
 *     Page:
 *       type: object
 *       required:
 *         - title
 *         - slug
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *           description: Auto-generated unique identifier
 *         title:
 *           type: string
 *           description: Title of the page
 *         slug:
 *           type: string
 *           description: URL-friendly unique identifier
 *         schema:
 *           type: string
 *           description: Schema for the page layout
 *         canonicalUrl:
 *           type: string
 *           description: canonical url
 *         customClass:
 *           type: string
 *           description: Custom CSS classes for styling
 *         customStyles:
 *           type: string
 *           description: Optional custom styles for the page
 *         description:
 *           type: string
 *           description: Optional description of the page
 *         isActive:
 *           type: boolean
 *           default: true
 *         sections:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Section'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "ckj284u8900008jp3e0mxh2q1"
 *         title: "Homepage"
 *         slug: "homepage"
 *         description: "Main landing page"
 *         isActive: true
 *         createdAt: "2024-01-01T00:00:00.000Z"
 *         updatedAt: "2024-01-01T00:00:00.000Z"
 *
 *     Section:
 *       type: object
 *       required:
 *         - type
 *         - order
 *         - pageId
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         type:
 *           type: string
 *           enum: [HERO, CONTENT, GRID, CAROUSEL, BANNER, FORM]
 *         title:
 *           type: string
 *         slug:
 *           type: string
 *           description: Unique identifier for the section. Auto-generated if not provided.
 *         order:
 *           type: integer
 *           minimum: 0
 *         minHeight:
 *           type: integer
 *           minimum: 0
 *         maxHeight:
 *           type: integer
 *           minimum: 0
 *         columns:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         padding:
 *           type: object
 *           properties:
 *             top: { type: number }
 *             right: { type: number }
 *             bottom: { type: number }
 *             left: { type: number }
 *         margin:
 *           type: object
 *           properties:
 *             top: { type: number }
 *             right: { type: number }
 *             bottom: { type: number }
 *             left: { type: number }
 *         backgroundColor:
 *           type: string
 *         backgroundImage:
 *           type: string
 *         customClass:
 *           type: string
 *         customStyles:
 *           type: object
 *         pageId:
 *           type: string
 *           format: cuid
 *       example:
 *         id: "ckj284u8900018jp3e0mxh2q2"
 *         type: "HERO"
 *         backgroundType: "bg-gradient"
 *         title: "Hero Section"
 *         order: 0
 *         minHeight: 400
 *         maxHeight: 800
 *         columns: 2
 *         padding: { top: 20, right: 20, bottom: 20, left: 20 }
 *         backgroundColor: "#ffffff"
 *         pageId: "ckj284u8900008jp3e0mxh2q1"
 *
 *     Content:
 *       type: object
 *       required:
 *         - type
 *         - order
 *         - sectionId
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         type:
 *           type: string
 *           enum: [TEXT, IMAGE, VIDEO, FILE, BUTTON, CUSTOM]
 *         order:
 *           type: integer
 *           minimum: 0
 *         position:
 *           type: string
 *           enum: [LEFT, CENTER, RIGHT, TOP, BOTTOM]
 *           default: CENTER
 *         title:
 *           type: string
 *         subtitle:
 *           type: string
 *         content:
 *           type: string
 *         mediaUrl:
 *           type: string
 *           format: uri
 *         actionUrl:
 *           type: string
 *           format: uri
 *         settings:
 *           type: object
 *         metadata:
 *           type: object
 *         customClass:
 *           type: string
 *         customStyles:
 *           type: string
 *           description: Optional custom styles for the page
 *         sectionId:
 *           type: string
 *           format: cuid
 *       example:
 *         id: "ckj284u8900028jp3e0mxh2q3"
 *         type: "TEXT"
 *         order: 0
 *         position: "CENTER"
 *         title: "Welcome"
 *         content: "Welcome to our platform"
 *         sectionId: "ckj284u8900018jp3e0mxh2q2"
 *
 * @swagger
 * /api/layout/pages:
 *   post:
 *     summary: Create a new page
 *     tags: [Pages]
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
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               schema:
 *                 type: string
 *               metaData:
 *                 type: string
 *               metaTitle:
 *                 type: string
 *               metaDesc:
 *                 type: string
 *               customClass:
 *                 type: string
 *               customStyles:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *           example:
 *             title: "Homepage"
 *             slug: "homepage"
 *             schema: "schema for the page layout"
 *             description: "Main landing page"
 *             metaData: {optional}
 *             metaTitle: optional
 *             metaDesc: optional
 *             customClass: text-lg text-bold
 *             customStyles: bg-primary text-white
 *             canonicalUrl: any
 *             isActive: true
 *     responses:
 *       201:
 *         description: Page created successfully
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
 *                   $ref: '#/components/schemas/Page'
 *
 *   get:
 *     summary: Get all pages
 *     tags: [Pages]
 *     security:
 *         - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pages
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
 *                     $ref: '#/components/schemas/Page'
 *
 * @swagger
 * /api/layout/pages/{slug}:
 *   get:
 *     summary: Get page by slug with all sections
 *     tags: [Pages]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Page details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Page'
 *
 * @swagger
 * /api/layout/pages/{id}:
 *   put:
 *     summary: Update a page
 *     tags: [Pages]
 *     security:
 *         - bearerAuth: []
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
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *           example:
 *             title: "Updated Homepage"
 *             description: "Updated landing page"
 *     responses:
 *       200:
 *         description: Page updated successfully
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
 *                   $ref: '#/components/schemas/Page'
 *
 *   delete:
 *     summary: Delete a page
 *     tags: [Pages]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Page deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *
 * @swagger
 * /api/layout/sections:
 *   post:
 *     summary: Create a new section
 *     tags: [Sections]
 *     security:
 *         - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - pageSlug
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [HERO, CONTENT, GRID, CAROUSEL, BANNER, FORM]
 *               title:
 *                 type: string
 *               order:
 *                 type: integer
 *               minHeight:
 *                 type: integer
 *               maxHeight:
 *                 type: integer
 *               columns:
 *                 type: integer
 *               padding:
 *                 type: object
 *               margin:
 *                 type: object
 *               pageSlug:
 *                 type: string
 *           example:
 *             type: "HERO"
 *             backgroundType: "bg-gradient"
 *             title: "Hero Section"
 *             minHeight: 400
 *             maxHeight: 800
 *             columns: 2
 *             customClass: "bg-primary text-white"
 *             customStyles: "background-image:xyz"
 *             component: "HeroComponent"
 *             pageSlug: "hero-page"
 *     responses:
 *       201:
 *         description: Section created successfully
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
 *                   $ref: '#/components/schemas/Section'
 *
 * @swagger
 * /api/layout/pages/{pageSlug}/sections:
 *   get:
 *     summary: Get all sections of a page
 *     tags: [Sections]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sections
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
 *                     $ref: '#/components/schemas/Section'
 *
 * @swagger
 * /api/layout/sections/{id}:
 *   put:
 *     summary: Update a section
 *     tags: [Sections]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Section ID (starting with 'cm') or section slug
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               order:
 *                 type: integer
 *               minHeight:
 *                 type: integer
 *           example:
 *             title: "Updated Hero Section"
 *             minHeight: 500
 *     responses:
 *       200:
 *         description: Section updated successfully
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
 *                   $ref: '#/components/schemas/Section'
 *
 *   delete:
 *     summary: Delete a section
 *     tags: [Sections]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Section ID (starting with 'cm') or section slug
 *     responses:
 *       200:
 *         description: Section deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Content:
 *       type: object
 *       required:
 *         - type
 *         - order
 *         - sectionId
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         type:
 *           type: string
 *           enum: [TEXT, IMAGE, VIDEO, FILE, BUTTON, CUSTOM,LIST]
 *           description: |
 *             Content type that determines how the content will be rendered:
 *             * TEXT - For paragraphs, headlines, or any text content
 *             * IMAGE - For images, logos, or icons
 *             * VIDEO - For embedded videos or video files
 *             * FILE - For downloadable files or documents
 *             * BUTTON - For call-to-action buttons or links
 *             * CUSTOM - For custom HTML or component content
 *             * LIST - Contains other sub contents in it
 *         order:
 *           type: integer
 *           minimum: 0
 *           description: Determines the display order within the section
 *         position:
 *           type: string
 *           enum: [LEFT, CENTER, RIGHT, TOP, BOTTOM]
 *           default: CENTER
 *           description: Position of the content within its container
 *         title:
 *           type: string
 *           description: Primary heading or title for the content
 *         subtitle:
 *           type: string
 *           description: Secondary heading or subtitle
 *         content:
 *           type: string
 *           description: |
 *             Main content - usage varies by type:
 *             * TEXT - The actual text content, can include HTML
 *             * IMAGE - Alt text or image description
 *             * VIDEO - Video description
 *             * FILE - File description
 *             * BUTTON - Button text
 *             * CUSTOM - Custom HTML or component code
 *             * List - Contains Sub lists
 *         mediaUrl:
 *           type: string
 *           format: uri
 *           description: |
 *             URL for media content:
 *             * IMAGE - Image URL
 *             * VIDEO - Video URL
 *             * FILE - File download URL
 *         actionUrl:
 *           type: string
 *           format: uri
 *           description: |
 *             URL for clickable actions:
 *             * BUTTON - Button link destination
 *             * IMAGE - Optional click-through URL
 *             * FILE - Alternative download URL
 *         settings:
 *           type: object
 *           description: |
 *             Additional settings specific to content type:
 *             * IMAGE - {width, height, lazy, responsive}
 *             * VIDEO - {autoplay, controls, loop, muted}
 *             * BUTTON - {variant, size, icon}
 *           example:
 *             image:
 *               width: 800
 *               height: 600
 *               lazy: true
 *               responsive: true
 *             video:
 *               autoplay: false
 *               controls: true
 *               loop: false
 *               muted: true
 *             button:
 *               variant: "primary"
 *               size: "large"
 *               icon: "arrow-right"
 *         metadata:
 *           type: object
 *           description: |
 *             Additional metadata for SEO or tracking:
 *             * alt text
 *             * captions
 *             * tracking IDs
 *             * custom attributes
 *           example:
 *             alt: "Product showcase image"
 *             caption: "Latest model - 2024 edition"
 *             trackingId: "hero-cta-01"
 *         customClass:
 *           type: string
 *           description: Custom CSS classes for styling
 *         sectionId:
 *           type: string
 *           format: cuid
 *           description: ID of the parent section
 *         parentId:
 *           type: string
 *           format: cuid
 *           description: ID of the parent content ( for nested content)
 *       examples:
 *         heroText:
 *           value:
 *             type: "TEXT"
 *             order: 0
 *             position: "CENTER"
 *             title: "Welcome to Our Platform"
 *             subtitle: "Discover Amazing Features"
 *             content: "<h1>Transform Your Business</h1><p>With our innovative solutions</p>"
 *             settings:
 *               animation: "fade-in"
 *             sectionId: "hero-section-id"
 *             parentId: "parent-content-id"
 *         productImage:
 *           value:
 *             type: "IMAGE"
 *             order: 1
 *             position: "RIGHT"
 *             title: "Product Showcase"
 *             mediaUrl: "https://example.com/product.jpg"
 *             content: "Our flagship product in action"
 *             settings:
 *               width: 800
 *               height: 600
 *               lazy: true
 *             metadata:
 *               alt: "Product demonstration"
 *             sectionId: "product-section-id"
 *         ctaButton:
 *           value:
 *             type: "BUTTON"
 *             order: 2
 *             position: "CENTER"
 *             content: "Get Started Now"
 *             actionUrl: "/signup"
 *             settings:
 *               variant: "primary"
 *               size: "large"
 *               icon: "arrow-right"
 *             metadata:
 *               trackingId: "hero-cta-1"
 *             sectionId: "cta-section-id"
 *
 * @swagger
 * /api/layout/contents:
 *   post:
 *     summary: Create new content
 *     description: |
 *       Create different types of content elements for your layout sections.
 *       Each content type has specific use cases and properties.
 *     tags: [Contents]
 *     security:
 *         - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Content'
 *           examples:
 *             heroHeading:
 *               summary: Hero Section Heading
 *               value:
 *                 type: "TEXT"
 *                 order: 0
 *                 position: "CENTER"
 *                 title: "Welcome to Our Platform"
 *                 content: "<h1>Transform Your Business</h1><p>With our innovative solutions</p>"
 *                 settings:
 *                   animation: "fade-in"
 *                 sectionId: "hero-section-id"
 *                 parentId: "parent-content-id"
 *                 customClass: "text-lg text-bold"
 *                 customStyles: "color: #333; font-weight: bold"
 *             productShowcase:
 *               summary: Product Image with Settings
 *               value:
 *                 type: "IMAGE"
 *                 order: 1
 *                 position: "RIGHT"
 *                 title: "Product Showcase"
 *                 mediaUrl: "https://example.com/product.jpg"
 *                 content: "Our flagship product in action"
 *                 settings:
 *                   width: 800
 *                   height: 600
 *                   lazy: true
 *                 metadata:
 *                   alt: "Product demonstration"
 *                 sectionId: "product-section-id"
 *                 parentId: "parent-content-id"
 *             promotionalVideo:
 *               summary: Promotional Video Content
 *               value:
 *                 type: "VIDEO"
 *                 order: 2
 *                 position: "CENTER"
 *                 title: "See It in Action"
 *                 mediaUrl: "https://example.com/promo.mp4"
 *                 settings:
 *                   autoplay: false
 *                   controls: true
 *                   loop: false
 *                 metadata:
 *                   caption: "Product demonstration video"
 *                 sectionId: "video-section-id"
 *                 parentId: "parent-content-id"
 *             downloadBrochure:
 *               summary: Downloadable File Content
 *               value:
 *                 type: "FILE"
 *                 order: 3
 *                 position: "LEFT"
 *                 title: "Product Brochure"
 *                 content: "Download our detailed product brochure"
 *                 mediaUrl: "https://example.com/brochure.pdf"
 *                 metadata:
 *                   fileSize: "2.5MB"
 *                   fileType: "PDF"
 *                 sectionId: "resources-section-id"
 *             callToAction:
 *               summary: Call-to-Action Button
 *               value:
 *                 type: "BUTTON"
 *                 order: 4
 *                 position: "CENTER"
 *                 content: "Get Started Now"
 *                 actionUrl: "/signup"
 *                 settings:
 *                   variant: "primary"
 *                   size: "large"
 *                   icon: "arrow-right"
 *                 metadata:
 *                   trackingId: "hero-cta-1"
 *                 sectionId: "cta-section-id"
 *             customComponent:
 *               summary: Custom Component Content
 *               value:
 *                 type: "CUSTOM"
 *                 order: 5
 *                 position: "CENTER"
 *                 title: "Interactive Feature"
 *                 content: "<custom-calculator></custom-calculator>"
 *                 settings:
 *                   component: "calculator"
 *                   props:
 *                     theme: "dark"
 *                 sectionId: "interactive-section-id"
 *     responses:
 *       201:
 *         description: Content created successfully
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
 *                   $ref: '#/components/schemas/Content'
 */
/**
 * @swagger
 * /api/layout/sections/{sectionId}/contents:
 *   get:
 *     summary: Get all contents of a section
 *     tags: [Contents]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Section ID (starting with 'cm') or section slug
 *     responses:
 *       200:
 *         description: List of contents
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
 *                     $ref: '#/components/schemas/Content'
 *
 * @swagger
 * /api/layout/contents:
 *   post:
 *     summary: Create new content
 *     tags: [Contents]
 *     security:
 *         - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - order
 *               - sectionId
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [TEXT, IMAGE, VIDEO, FILE, BUTTON, CUSTOM]
 *               order:
 *                 type: integer
 *               position:
 *                 type: string
 *                 enum: [LEFT, CENTER, RIGHT, TOP, BOTTOM]
 *               title:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               content:
 *                 type: string
 *               mediaUrl:
 *                 type: string
 *               actionUrl:
 *                 type: string
 *               sectionId:
 *                 type: string
 *           example:
 *             type: "TEXT"
 *             order: 0
 *             position: "CENTER"
 *             title: "Welcome"
 *             content: "Welcome to our platform"
 *             sectionId: "ckj284u8900018jp3e0mxh2q2"
 *     responses:
 *       201:
 *         description: Content created successfully
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
 *                   $ref: '#/components/schemas/Content'
 *
 * @swagger
 * /api/layout/sections/{sectionId}/contents:
 *   get:
 *     summary: Get all contents of a section with section details
 *     tags: [Contents]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of contents
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
 *                     $ref: '#/components/schemas/Content'
 *
 * @swagger
 * /api/layout/contents/{id}:
 *   put:
 *     summary: Update content
 *     tags: [Contents]
 *     security:
 *         - bearerAuth: []
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
 *               type:
 *                 type: string
 *                 enum: [TEXT, IMAGE, VIDEO, FILE, BUTTON, CUSTOM]
 *               order:
 *                 type: integer
 *               position:
 *                 type: string
 *                 enum: [LEFT, CENTER, RIGHT, TOP, BOTTOM]
 *               title:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               content:
 *                 type: string
 *               mediaUrl:
 *                 type: string
 *               actionUrl:
 *                 type: string
 *           example:
 *             title: "Updated Welcome Message"
 *             content: "Welcome to our updated platform"
 *             position: "CENTER"
 *     responses:
 *       200:
 *         description: Content updated successfully
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
 *                   $ref: '#/components/schemas/Content'
 *
 *   delete:
 *     summary: Delete content
 *     tags: [Contents]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/layout/contents/parent/{parentId}:
 *   get:
 *     summary: Get all nested contents by parent ID
 *     description: Retrieves all content items that are children of the specified parent content
 *     tags: [Contents]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: ID of the parent content item
 *     responses:
 *       200:
 *         description: List of nested contents
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
 *                     $ref: '#/components/schemas/Content'
 *       404:
 *         description: Parent content not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
/**
 * @swagger
 * /api/layout/pages/{pageSlug}/sections/reorder:
 *   post:
 *     summary: Reorder sections within a page
 *     description: Updates the order of sections based on the provided array of section IDs
 *     tags: [Sections]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: The slug of the page containing the sections
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sectionIds
 *             properties:
 *               sectionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: cuid
 *                 description: Array of section IDs in the desired order
 *           example:
 *             sectionIds: ["cuid1", "cuid2", "cuid3"]
 *     responses:
 *       200:
 *         description: Sections reordered successfully
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
 *                     $ref: '#/components/schemas/Section'
 *       400:
 *         description: Invalid input format or sections not found
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
 *         description: Page not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/layout/sections/slug/{slug}:
 *   get:
 *     summary: Get section by slug
 *     tags: [Sections]
 *     security:
 *         - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The slug of the section to retrieve
 *     responses:
 *       200:
 *         description: Section details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Section'
 *       404:
 *         description: Section not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ContentPosition:
 *       type: string
 *       enum: [LEFT, CENTER, RIGHT]
 *       default: CENTER
 *     
 *     ContentType:
 *       type: string
 *       enum: [TEXT, IMAGE, VIDEO, FILE, BUTTON, CUSTOM, LIST]
 *     
 *     BaseContent:
 *       type: object
 *       properties:
 *         type:
 *           $ref: '#/components/schemas/ContentType'
 *         position:
 *           $ref: '#/components/schemas/ContentPosition'
 *         title:
 *           type: string
 *           description: Content title
 *         slug:
 *           type: string
 *           description: URL-friendly identifier (will be auto-generated if not provided)
 *         order:
 *           type: integer
 *           minimum: 0
 *           description: Order within the parent or section
 *         subtitle:
 *           type: string
 *           description: Secondary title/subheading
 *         content:
 *           type: string
 *           description: Main content text, may include HTML markup
 *         mediaUrl:
 *           type: string
 *           description: URL to associated media (image, video, etc.)
 *         actionUrl:
 *           type: string
 *           description: URL for any action button/link
 *         settings:
 *           type: object
 *           description: Additional configuration settings
 *         metadata:
 *           type: object
 *           description: Metadata associated with the content
 *         customClass:
 *           type: string
 *           description: Custom CSS class to apply
 *         customStyles:
 *           type: string
 *           description: Inline CSS styles to apply
 *         parentId:
 *           type: string
 *           description: ID of parent content (for nesting)
 *     
 *     ContentItem:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseContent'
 *         - type: object
 *           properties:
 *             children:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ContentItem'
 *               description: Nested child content items
 *     
 *     BulkCreateContentRequest:
 *       type: object
 *       required:
 *         - sectionId
 *         - contents
 *       properties:
 *         sectionId:
 *           type: string
 *           description: ID of the section where content will be created
 *         contents:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContentItem'
 *           minItems: 1
 *           maxItems: 100
 *           description: Array of content items to create (can include nested children)
 *         preserveOrder:
 *           type: boolean
 *           default: true
 *           description: Whether to preserve the order of items as provided in the array
 *       example:
 *         sectionId: "cm9wbkuxq0001w8vbn6oww5xt"
 *         contents:
 *           - type: "TEXT"
 *             position: "CENTER"
 *             title: "Parent Section"
 *             subtitle: "Main content area"
 *             content: "<p>This is the parent content.</p>"
 *             children:
 *               - type: "IMAGE"
 *                 title: "Child Image"
 *                 mediaUrl: "https://example.com/image.jpg"
 *               - type: "TEXT"
 *                 title: "Child Text"
 *                 content: "<p>This is nested content.</p>"
 *         preserveOrder: true
 *     
 *     ContentResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier
 *         type:
 *           $ref: '#/components/schemas/ContentType'
 *         position:
 *           $ref: '#/components/schemas/ContentPosition'
 *         title:
 *           type: string
 *         slug:
 *           type: string
 *         order:
 *           type: integer
 *         subtitle:
 *           type: string
 *         content:
 *           type: string
 *         mediaUrl:
 *           type: string
 *         actionUrl:
 *           type: string
 *         settings:
 *           type: object
 *         metadata:
 *           type: object
 *         customClass:
 *           type: string
 *         customStyles:
 *           type: string
 *         sectionId:
 *           type: string
 *         parentId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     BulkCreateContentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContentResponse'
 *       example:
 *         success: true
 *         message: "Successfully created 3 content items"
 *         data: [
 *           {
 *             "id": "cm9wbkuxq0002w8vbn6oww5xu",
 *             "type": "LIST",
 *             "position": "CENTER",
 *             "title": "Parent Section",
 *             "slug": "parent-section",
 *             "order": 1,
 *             "subtitle": "Main content area",
 *             "content": "<p>This is the parent content.</p>",
 *             "sectionId": "cm9wbkuxq0001w8vbn6oww5xt",
 *             "parentId": null,
 *             "createdAt": "2025-04-25T14:30:00.000Z",
 *             "updatedAt": "2025-04-25T14:30:00.000Z"
 *           },
 *           {
 *             "id": "cm9wbkuxq0003w8vbn6oww5xv",
 *             "type": "IMAGE",
 *             "position": "CENTER",
 *             "title": "Child Image",
 *             "slug": "child-image",
 *             "order": 1,
 *             "mediaUrl": "https://example.com/image.jpg",
 *             "sectionId": "cm9wbkuxq0001w8vbn6oww5xt",
 *             "parentId": "cm9wbkuxq0002w8vbn6oww5xu",
 *             "createdAt": "2025-04-25T14:30:00.000Z",
 *             "updatedAt": "2025-04-25T14:30:00.000Z"
 *           }
 *         ]
 *     
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             details:
 *               type: string
 */

/**
 * @swagger
 * /api/layout/contents/bulk:
 *   post:
 *     summary: Create multiple content items with support for nested hierarchies
 *     description: |
 *       Creates multiple content items in a single request with support for parent-child relationships.
 *       Content items can be nested using either explicit parentId references or by using the children array.
 *       This API supports creating complex content hierarchies in a single request.
 *     tags:
 *       - Contents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkCreateContentRequest'
 *     responses:
 *       201:
 *         description: Successfully created content items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkCreateContentResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               validationError:
 *                 value:
 *                   success: false
 *                   message: "Validation error"
 *                   error:
 *                     code: "INVALID_REQUEST"
 *                     details: "sectionId is required"
 *       404:
 *         description: Section not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               sectionNotFound:
 *                 value:
 *                   success: false
 *                   message: "Section not found"
 *                   error:
 *                     code: "CONTENT002"
 *                     details: "The specified section does not exist"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               serverError:
 *                 value:
 *                   success: false
 *                   message: "Internal server error"
 *                   error:
 *                     code: "SERVER_ERROR"
 *                     details: "An unexpected error occurred"
 */


/**
 * @swagger
 * /api/layout/contents/{id}:
 *   get:
 *     summary: Get content by ID or slug
 *     description: Retrieves a specific content item by its ID or slug with nested children
 *     tags:
 *       - Contents
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID (starting with 'cm') or slug
 *     responses:
 *       200:
 *         description: Content retrieved successfully
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
 *                       example: cm_123456789
 *                     title:
 *                       type: string
 *                       example: Content Title
 *                     slug:
 *                       type: string
 *                       example: content-title
 *                     content:
 *                       type: string
 *                       example: Content text here
 *                     order:
 *                       type: integer
 *                       example: 1
 *                     sectionId:
 *                       type: string
 *                       example: sec_123456789
 *                     parentId:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     children:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Content'
 *                 section:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: sec_123456789
 *                     title:
 *                       type: string
 *                       example: Section Title
 *                     slug:
 *                       type: string
 *                       example: section-title
 *                     pageSlug:
 *                       type: string
 *                       example: page-slug
 *       404:
 *         description: Content not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

const layoutRouter = express.Router();

// Public GET routes
layoutRouter.get('/pages', catchAsync(getPages));
layoutRouter.get('/pages/:slug', catchAsync(getPageBySlug));
layoutRouter.get('/pages/pathname', catchAsync(getPageByPathname));
layoutRouter.get('/sections', catchAsync(getSectionLibrary));
layoutRouter.get('/sections/:id', catchAsync(getSectionLibraryById));
layoutRouter.get('/sections/slug/:slug', catchAsync(getLibrarySectionBySlug));
layoutRouter
  .use(catchAsync(authenticate))
  .get('/pages/:pageSlug/sections', catchAsync(authorize(['admin_only'])), catchAsync(getSections));
layoutRouter
  .use(catchAsync(authenticate))
  .get(
    '/sections/:sectionId/contents',
    catchAsync(authorize(['admin_only'])),
    catchAsync(getContents),
  );
layoutRouter
  .use(catchAsync(authenticate))
  .get(
    '/contents/parent/:parentId',
    catchAsync(authorize(['admin_only'])),
    catchAsync(getContentsByParentId),
  );

// Protected routes (require authentication and authorization)
layoutRouter.use(catchAsync(authenticate) as MiddlewareType);

layoutRouter.post('/pages', catchAsync(authorize(['admin_only'])), catchAsync(createPage));
layoutRouter.put('/pages/:id', catchAsync(authorize(['admin_only'])), catchAsync(updatePage));
layoutRouter.patch(
  '/pages/:id/sections',
  catchAsync(authorize(['admin_only'])),
  catchAsync(updatePageSections),
);
layoutRouter.delete('/pages/:id', catchAsync(authorize(['admin_only'])), catchAsync(deletePage));

// Page-specific sections (inline sections)
layoutRouter.get('/pages/:pageSlug/inline-sections', catchAsync(authorize(['admin_only'])), catchAsync(getSections));
layoutRouter.post('/sections', catchAsync(authorize(['admin_only'])), catchAsync(createSection));
layoutRouter.put('/sections/:id', catchAsync(authorize(['admin_only'])), catchAsync(updateSection));
layoutRouter.delete('/sections/:id', catchAsync(authorize(['admin_only'])), catchAsync(deleteSection));

layoutRouter.post(
  '/pages/:pageSlug/sections/reorder',
  catchAsync(authorize(['admin_only'])),
  catchAsync(reorderSections),
);

layoutRouter.post('/contents', catchAsync(authorize(['admin_only'])), catchAsync(createContent));
layoutRouter.post('/contents/bulk', catchAsync(authorize(['admin_only'])), catchAsync(createBulkContent));
layoutRouter.get('/contents/:id', catchAsync(authorize(['admin_only'])), catchAsync(getContentById));
layoutRouter.put('/contents/:id', catchAsync(authorize(['admin_only'])), catchAsync(updateContent));
layoutRouter.delete(
  '/contents/:id',
  catchAsync(authorize(['admin_only'])),
  catchAsync(deleteContent),
);

export default layoutRouter;
