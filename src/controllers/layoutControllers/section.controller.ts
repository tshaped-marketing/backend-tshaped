import { Request, Response, NextFunction } from 'express';
import {
  CreateLibrarySectionSchema,
  CreateSectionSchema,
  UpdateSectionSchema,
} from '../../zodSchemas/layout.schema.js';
import prismaClient from '../../prisma/prisma.client.js';
import { throwError } from '../../middlewares/errorHandler.middleware.js';
import { nanoid } from 'nanoid';
import { handleCachedResponse } from '../../utils/handleCacheResponse.js';
import redisService from '../../config/redis.config.js';
import executeBackgroundTasks from '../../utils/executeBackgroundTasks.js';
import { titleToSlug } from '../../utils/titleToSlug.js';
import { getAllSectionsByPageSlug_TTL, getSectionBySlug_TTL } from '../../constants/redis.cacheTTL.js';

const SECTION_LIBRARY_SLUG = 'section-library';

const ensureSectionLibraryPage = async () => {
  let page = await prismaClient.page.findUnique({
    where: { slug: SECTION_LIBRARY_SLUG },
  });

  if (!page) {
    page = await prismaClient.page.create({
      data: {
        title: 'Section Library',
        slug: SECTION_LIBRARY_SLUG,
        description: 'Global reusable sections library',
        isActive: true,
      },
    });
  }

  return page;
};

const createSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = CreateSectionSchema.parse(req.body);
    const { pageSlug, ...sectionData } = validatedData;

    if (!sectionData.slug) {
      sectionData.slug = titleToSlug(validatedData.title!);
    }

    const page = await prismaClient.page.findUnique({
      where: { slug: pageSlug },
    });

    if (!page) {
      return await throwError('SECTION001');
    }

    const highestOrderSection = await prismaClient.section.findFirst({
      where: { pageId: page.id },
      orderBy: { order: 'desc' },
    });

    const newOrder = highestOrderSection ? highestOrderSection.order + 1 : 1;

    const section = await prismaClient.section.create({
      data: {
        ...sectionData,
        pageSlug: pageSlug,
        pageId: page.id,
        order: newOrder,
      },
      include: {
        contents: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Section created successfully',
      data: section,
    });

    executeBackgroundTasks(
      [
        async () => {
          return await redisService.invalidateMultipleKeys([
            `getPageBySlug:${pageSlug}`,
            'list_pages',
            `getSecByPage:${section.pageSlug}`,
          ]);
        },
      ],
      'updateSection',
    );
  } catch (e: any) {
    console.error('createSection error', e);
    res.status(500).json({
      success: false,
      message: e?.message || 'Internal Server Error',
      code: e?.code,
      meta: e?.meta,
      stack: e?.stack,
    });
  }
};

// ===== Section Library (reusable blocks) =====

// GET /api/layout/sections - list library sections
const getSectionLibrary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const libraryPage = await ensureSectionLibraryPage();

  const sections = await prismaClient.section.findMany({
    where: { pageId: libraryPage.id },
    select: {
      id: true,
      slug: true,
      type: true,
      title: true,
      isActive: true,
      updatedAt: true,
      order: true,
    },
    orderBy: {
      order: 'asc',
    },
  });

  res.status(200).json({
    success: true,
    data: sections,
  });
};

// Helper to build nested contents tree (same shape as existing ContentType)
const buildNestedContents = async (sectionId: string) => {
  const contents = await prismaClient.content.findMany({
    where: { sectionId, parentId: null },
    orderBy: { order: 'asc' },
    include: {
      children: {
        orderBy: { order: 'asc' },
        include: {
          children: {
            orderBy: { order: 'asc' },
            include: {
              children: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  return contents;
};

// GET /api/layout/sections/:id - full library section by id or slug
const getSectionLibraryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const libraryPage = await ensureSectionLibraryPage();

  const where = id.startsWith('cm') ? { id } : { slug: id };

  const section = await prismaClient.section.findFirst({
    where: {
      ...where,
      pageId: libraryPage.id,
    },
  });

  if (!section) {
    return await throwError('SECTION002');
  }

  const contents = await buildNestedContents(section.id);

  res.status(200).json({
    success: true,
    data: {
      ...section,
      contents,
    },
  });
};

// GET /api/layout/sections/slug/:slug - full library section by slug
const getLibrarySectionBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { slug } = req.params;
  const libraryPage = await ensureSectionLibraryPage();

  const section = await prismaClient.section.findFirst({
    where: {
      slug,
      pageId: libraryPage.id,
    },
  });

  if (!section) {
    return await throwError('SECTION002');
  }

  const contents = await buildNestedContents(section.id);

  res.status(200).json({
    success: true,
    data: {
      ...section,
      contents,
    },
  });
};

// POST /api/layout/sections - create library section
const createLibrarySection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const validatedData = CreateLibrarySectionSchema.parse(req.body);

  const libraryPage = await ensureSectionLibraryPage();

  const { slug, title, ...rest } = validatedData;

  const finalSlug = slug ?? (title ? titleToSlug(title) : nanoid());

  const highestOrderSection = await prismaClient.section.findFirst({
    where: { pageId: libraryPage.id },
    orderBy: { order: 'desc' },
  });

  const newOrder = highestOrderSection ? highestOrderSection.order + 1 : 1;

  const section = await prismaClient.section.create({
    data: {
      ...rest,
      title,
      slug: finalSlug,
      pageId: libraryPage.id,
      pageSlug: SECTION_LIBRARY_SLUG,
      order: newOrder,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Library section created successfully',
    data: section,
  });
};

// PATCH /api/layout/sections/:id - update library section
const updateLibrarySection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const validatedData = UpdateSectionSchema.parse(req.body);
  const { id } = req.params;
  const libraryPage = await ensureSectionLibraryPage();

  const where = id.startsWith('cm') ? { id } : { slug: id };

  const existingSection = await prismaClient.section.findFirst({
    where: {
      ...where,
      pageId: libraryPage.id,
    },
  });

  if (!existingSection) {
    return await throwError('SECTION002');
  }

  if (validatedData.title && validatedData.title !== existingSection.title) {
    validatedData.slug = titleToSlug(validatedData.title!);
  }

  const section = await prismaClient.section.update({
    where: { id: existingSection.id },
    data: validatedData,
  });

  res.status(200).json({
    success: true,
    message: 'Library section updated successfully',
    data: section,
  });
};

// DELETE /api/layout/sections/:id - delete library section
const deleteLibrarySection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const libraryPage = await ensureSectionLibraryPage();

  const where = id.startsWith('cm') ? { id } : { slug: id };

  const existingSection = await prismaClient.section.findFirst({
    where: {
      ...where,
      pageId: libraryPage.id,
    },
  });

  if (!existingSection) {
    return await throwError('SECTION002');
  }

  await prismaClient.section.delete({
    where: { id: existingSection.id },
  });

  res.status(200).json({
    success: true,
    message: 'Library section deleted successfully',
  });
};

const getSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { pageSlug } = req.params;

  const cacheKey = `getSecByPage:${pageSlug}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }

  const page = await prismaClient.page.findUnique({
    where: { slug: pageSlug },
  });

  if (!page) {
    return await throwError('SECTION001');
  }

  const sections = await prismaClient.section.findMany({
    where: { pageSlug: pageSlug },
    include: {
      contents: true,
    },
    orderBy: {
      order: 'asc',
    },
  });

  res.status(200).json({
    success: true,
    data: sections,
  });

  // Cache in redis for 1 hour
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            data: sections,
          },
          getAllSectionsByPageSlug_TTL, // 24 hrs in seconds)
        );
      },
    ],
    'getSections',
  );
};

const updateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const validatedData = UpdateSectionSchema.parse(req.body);
  const idOrSlug = req.params.id;

  // Determine if the parameter is an ID (starts with 'cm') or a slug
  const where = idOrSlug.startsWith('cm') ? { id: idOrSlug } : { slug: idOrSlug };

  const existingSection = await prismaClient.section.findUnique({
    where,
  });

  if (!existingSection) {
    return await throwError('SECTION002');
  }

 if (validatedData.title && validatedData.title !== existingSection.title) {
    validatedData.slug = titleToSlug(validatedData.title!);
  }

  const section = await prismaClient.section.update({
    where,
    data: validatedData,
    include: {
      contents: true,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Section updated successfully',
    data: section,
  });

  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.invalidateMultipleKeys([
          `getSecByPage:${section.pageSlug}`,
          `getSec:${section.slug}`,
          `getPageBySlug:${section.pageSlug}`,
          `getPageByPathname:${section.pageSlug}`,
          `list_pages`,
        ]);
      },
    ],
    'updateSection',
  );
};

const deleteSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const idOrSlug = req.params.id;

  // Determine if the parameter is an ID (starts with 'cm') or a slug
  const where = idOrSlug.startsWith('cm') ? { id: idOrSlug } : { slug: idOrSlug };

  const existingSection = await prismaClient.section.findUnique({
    where,
  });

  if (!existingSection) {
    return await throwError('SECTION002');
  }

  await prismaClient.section.delete({
    where,
  });

  res.status(200).json({
    success: true,
    message: 'Section deleted successfully',
  });

  // Invalidate cache
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.invalidateMultipleKeys([
          `getSecByPage:${existingSection.pageSlug}`,
          `getSec:${existingSection.slug}`,
          `getPageBySlug:${existingSection.pageSlug}`,
          `getPageByPathname:${existingSection.pageSlug}`,
          `list_pages`,
        ]);
      },
    ],
    'deleteSection',
  );
};

const reorderSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { pageSlug } = req.params;
  const { sectionIds } = req.body;

  if (!Array.isArray(sectionIds)) {
    return await throwError('SECTION004');
  }

  const page = await prismaClient.page.findUnique({
    where: { slug: pageSlug },
  });

  if (!page) {
    return await throwError('SECTION001');
  }

  // Verify all sections exist and belong to the page
  const existingSections = await prismaClient.section.findMany({
    where: {
      pageSlug: pageSlug,
      OR: [
        { id: { in: sectionIds.filter(id => id.startsWith('cm')) } },
        { slug: { in: sectionIds.filter(id => !id.startsWith('cm')) } },
      ],
    },
  });

  if (existingSections.length !== sectionIds.length) {
    return await throwError('SECTION005');
  }

  // First, set all sections to a temporary order (negative values)
  // to avoid unique constraint violations during reordering
  await prismaClient.$transaction(
    existingSections.map((section, index) =>
      prismaClient.section.update({
        where: { id: section.id },
        data: { order: -1000 - index }, // Use negative temporary values
      }),
    ),
  );

  // Then update to the final order values
  await prismaClient.$transaction(
    sectionIds.map((idOrSlug, index) =>
      prismaClient.section.update({
        where: idOrSlug.startsWith('cm') ? { id: idOrSlug } : { slug: idOrSlug },
        data: { order: index + 1 },
      }),
    ),
  );

  // Fetch updated sections
  const updatedSections = await prismaClient.section.findMany({
    where: { pageSlug: pageSlug },
    orderBy: { order: 'asc' },
    include: { contents: true },
  });

  res.status(200).json({
    success: true,
    message: 'Sections reordered successfully',
    data: updatedSections,
  });
};

const getSectionBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { slug } = req.params;
  const cacheKey = `getSec:${slug}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const section = await prismaClient.section.findUnique({
    where: { slug },
    include: {
      contents: true,
    },
  });

  if (!section) {
    return await throwError('SECTION002');
  }

  res.status(200).json({
    success: true,
    data: section,
  });
  // Cache in redis for 1 hour
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            data: section,
          },
          getSectionBySlug_TTL, // 24hrs in seconds)
        );
      },
    ],
    'getSectionBySlug',
  );
};
export {
  createSection,
  getSections,
  updateSection,
  deleteSection,
  reorderSections,
  getSectionBySlug,
  getSectionLibrary,
  getSectionLibraryById,
  getLibrarySectionBySlug,
  createLibrarySection,
  updateLibrarySection,
  deleteLibrarySection,
};
