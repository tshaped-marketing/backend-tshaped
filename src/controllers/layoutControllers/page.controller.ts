import { Request, Response, NextFunction } from 'express';
import prismaClient from '../../prisma/prisma.client.js';
import {
  CreatePageSchema,
  UpdatePageSchema,
  UpdatePageSectionsSchema,
} from '../../zodSchemas/layout.schema.js';
import { throwError } from '../../middlewares/errorHandler.middleware.js';
import { handleCachedResponse } from '../../utils/handleCacheResponse.js';
import redisService from '../../config/redis.config.js';
import { titleToSlug } from '../../utils/titleToSlug.js';
import executeBackgroundTasks from '../../utils/executeBackgroundTasks.js';
import { getAllPages_TTL, getPageBySlug_TTL } from '../../constants/redis.cacheTTL.js';

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

// Helper to fetch a section with nested contents, scoped by pageId
const fetchSectionWithContentsBySlug = async (slug: string, pageId: string) => {
  const section = await prismaClient.section.findFirst({
    where: {
      slug,
      pageId,
    },
    orderBy: {
      order: 'asc',
    },
    include: {
      contents: {
        where: {
          parentId: null,
        },
        orderBy: {
          order: 'asc',
        },
        include: {
          children: {
            orderBy: {
              order: 'asc',
            },
            include: {
              children: {
                orderBy: {
                  order: 'asc',
                },
                include: {
                  children: {
                    orderBy: {
                      order: 'asc',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return section;
};

const createPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const validatedData = CreatePageSchema.parse(req.body);
  const slug = validatedData.slug ? validatedData.slug : titleToSlug(validatedData.title);

  // Check if page with slug already exists
  const existingPage = await prismaClient.page.findUnique({
    where: { slug },
  });

  if (existingPage) {
    return await throwError('PAGE002');
  }

  // Create a new data object with the correct slug
  const page = await prismaClient.page.create({
    data: {
      ...validatedData,
      slug, // Override with the computed slug
    },
  });

  res.status(201).json({
    success: true,
    message: 'Page created successfully',
    data: page,
  });

  // Delete the cached response for the updated page
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.invalidateMultipleKeys([`list_pages`]);
      },
    ],
    'createPage',
  );
};
const getPages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const cacheKey = `list_pages`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const pages = await prismaClient.page.findMany({
    include: {
      sections: {
        orderBy: {
          order: 'asc',
        },
        include: {
          contents: {
            where: {
              parentId: null, // Only get top-level contents
            },
            orderBy: {
              order: 'asc',
            },
            include: {
              children: {
                orderBy: {
                  order: 'asc',
                },
                include: {
                  children: {
                    orderBy: {
                      order: 'asc',
                    },
                    include: {
                      children: {
                        // Added third level of children
                        orderBy: {
                          order: 'asc',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: pages,
  });

  // Cache in redis for 24 hour
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            data: pages,
          },
          getAllPages_TTL,
        );
      },
    ],
    'getPages',
  );
};

const getPageBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const cacheKey = `getPageBySlug:${req.params.slug}`;
  const respond500 = (e: Error) => {
    console.error('Unhandled error in getPageBySlug', e);
    res.status(500).json({
      success: false,
      message: e.message,
      stack: e.stack,
    });
  };

  try {
    const responseSent = await handleCachedResponse(cacheKey, res);
    if (responseSent) return;

    const page = await prismaClient.page.findUnique({
      where: { slug: req.params.slug },
    });
    if (!page) return await throwError('PAGE001');

    // Resolve sectionsConfig if present
    if (page.sectionsConfig && Array.isArray(page.sectionsConfig)) {
      try {
        const libraryPage = await ensureSectionLibraryPage();
        const configItems = (page.sectionsConfig as any[]).sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0),
        );
        const resolvedSections = [];

        for (const item of configItems) {
          if (item.source === 'section-library' && item.librarySectionSlug) {
            const section = await fetchSectionWithContentsBySlug(item.librarySectionSlug, libraryPage.id);
            if (section) resolvedSections.push(section);
          }
          if (item.source === 'inline' && item.inlineSectionSlug) {
            const section = await fetchSectionWithContentsBySlug(item.inlineSectionSlug, page.id);
            if (section) resolvedSections.push(section);
          }
        }

        res.status(200).json({
          success: true,
          data: { ...page, sections: resolvedSections },
        });
        return;
      } catch (e) {
        console.error('Error resolving sectionsConfig for page', page.slug, e);
        // fall through to fallback include
      }
    }

    // Fallback include (direct page.sections)
    const fallbackPage = await prismaClient.page.findUnique({
      where: { slug: req.params.slug },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            contents: {
              where: { parentId: null },
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
        },
      },
    });

    res.status(200).json({
      success: true,
      data: fallbackPage,
    });

    executeBackgroundTasks(
      [
        async () =>
          await redisService.cacheResponse(
            cacheKey,
            { success: true, data: page },
            getPageBySlug_TTL,
          ),
      ],
      'Cache page by slug - getPageBySlug',
    );
  } catch (e) {
    respond500(e as Error);
  }
};
const updatePage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const validatedData = UpdatePageSchema.parse(req.body);

  // Determine if the parameter is an ID (starts with 'cm') or a slug
  const where = req.params.id.startsWith('cm') ? { id: req.params.id } : { slug: req.params.id };
  // Check if page exists
  const existingPage = await prismaClient.page.findUnique({
    where,
  });

  if (!existingPage) {
    return await throwError('PAGE001');
  }

  // Generate or use provided slug
  const slug = validatedData.slug
    ? validatedData.slug
    : validatedData.title
      ? titleToSlug(validatedData.title)
      : existingPage.slug;

  // If slug is being updated, check if new slug is already taken
  if (slug !== existingPage.slug) {
    const slugExists = await prismaClient.page.findUnique({
      where: { slug },
    });

    if (slugExists) {
      return await throwError('PAGE002');
    }
  }

  const page = await prismaClient.page.update({
    where: { id: existingPage.id }, // Use the found page's ID
    data: {
      ...validatedData,
      slug,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Page updated successfully',
    data: page,
  });

  // Delete the cached response for the updated page
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.invalidateMultipleKeys([
          `getPageBySlug:${page.slug}`,
          `getPageByPathname:${page.pathname}`,
          `list_pages`,
        ]);
      },
    ],
    'updatePage',
  );
};

const deletePage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check if page exists
  const existingPage = await prismaClient.page.findUnique({
    where: { id: req.params.id },
  });

  if (!existingPage) {
    return await throwError('PAGE001');
  }

  // Check if page has sections or contents
  const hasSections = await prismaClient.section.findFirst({
    where: { pageId: req.params.id },
  });

  if (hasSections) {
    return await throwError('PAGE004');
  }

  await prismaClient.page.delete({
    where: { id: req.params.id },
  });

  res.status(200).json({
    success: true,
    message: 'Page deleted successfully',
  });

  // Delete the cached response for the updated page

  executeBackgroundTasks(
    [
      async () => {
        return await redisService.invalidateMultipleKeys([
          `getPageBySlug:${existingPage.slug}`,
          `getPageByPathname:${existingPage.pathname}`,
          `list_pages`,
        ]);
      },
    ],
    'deletePage',
  );
};

// PATCH /api/layout/pages/:id/sections
// Manages the sectionsConfig JSON for a page (library references + inline sections)
const updatePageSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = UpdatePageSectionsSchema.parse(req.body);

    // id can be page id (cm*) or slug, like in updatePage
    const where = req.params.id.startsWith('cm') ? { id: req.params.id } : { slug: req.params.id };

    const existingPage = await prismaClient.page.findUnique({
      where,
    });

    if (!existingPage) {
      return await throwError('PAGE001');
    }

    const libraryPage = await ensureSectionLibraryPage();

    // Validate that referenced sections actually exist
    for (const item of validatedData.sections) {
      if (item.source === 'section-library') {
        if (!item.librarySectionSlug) {
          return await throwError('SECTION002');
        }

        const libSection = await prismaClient.section.findFirst({
          where: {
            slug: item.librarySectionSlug,
            pageId: libraryPage.id,
          },
        });

        if (!libSection) {
          return await throwError('SECTION002');
        }
      }

      if (item.source === 'inline') {
        if (!item.inlineSectionSlug) {
          return await throwError('SECTION002');
        }

        const inlineSection = await prismaClient.section.findFirst({
          where: {
            slug: item.inlineSectionSlug,
            pageId: existingPage.id,
          },
        });

        if (!inlineSection) {
          return await throwError('SECTION002');
        }
      }
    }

    const sortedSections = [...validatedData.sections].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );

    const page = await prismaClient.page.update({
      where: { id: existingPage.id },
      data: {
        sectionsConfig: sortedSections,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Page sections updated successfully',
      data: page,
    });

    // Invalidate caches
    executeBackgroundTasks(
      [
        async () => {
          return await redisService.invalidateMultipleKeys([
            `getPageBySlug:${page.slug}`,
            `getPageByPathname:${page.pathname}`,
            `list_pages`,
          ]);
        },
      ],
      'updatePageSections',
    );
  } catch (e) {
    console.error('updatePageSections error', e);
    res.status(500).json({
      success: false,
      message: (e as Error).message,
      stack: (e as Error).stack,
      details: e,
    });
    return;
  }
};

const getPageByPathname = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const decodedPathname = decodeURIComponent(req.query.q as string);
    if (!decodedPathname) {
      return await throwError('PAGE001');
    }
    const cacheKey = `getPageByPathname:${decodedPathname}`;
    const responseSent = await handleCachedResponse(cacheKey, res);
    if (responseSent) {
      return;
    }

    const page = await prismaClient.page.findUnique({
      where: {
        pathname: decodedPathname,
      },
    });

    if (!page) {
      return await throwError('PAGE001');
    }

  // If sectionsConfig is defined, resolve sections like in getPageBySlug
  if (page.sectionsConfig && Array.isArray(page.sectionsConfig)) {
    try {
      const libraryPage = await ensureSectionLibraryPage();
      const configItems = (page.sectionsConfig as any[]).sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      );

      const resolvedSections = [];

      for (const item of configItems) {
        if (item.source === 'section-library' && item.librarySectionSlug) {
          const section = await fetchSectionWithContentsBySlug(
            item.librarySectionSlug,
            libraryPage.id,
          );
          if (section) {
            resolvedSections.push(section);
          }
        }

        if (item.source === 'inline' && item.inlineSectionSlug) {
          const section = await fetchSectionWithContentsBySlug(
            item.inlineSectionSlug,
            page.id,
          );
          if (section) {
            resolvedSections.push(section);
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          ...page,
          sections: resolvedSections,
        },
      });
      return;
    } catch (e) {
      console.error('Error resolving sectionsConfig for pathname', decodedPathname, e);
      // fall through to fallback behaviour below
    }
  }

  // Fallback to existing behavior (direct page.sections)
  const fallbackPage = await prismaClient.page.findUnique({
    where: {
      pathname: decodedPathname,
    },
    include: {
      sections: {
        orderBy: {
          order: 'asc',
        },
        include: {
          contents: {
            where: {
              parentId: null,
            },
            orderBy: {
              order: 'asc',
            },
            include: {
              children: {
                orderBy: {
                  order: 'asc',
                },
                include: {
                  children: {
                    orderBy: {
                      order: 'asc',
                    },
                    include: {
                      children: {
                        orderBy: {
                          order: 'asc',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

    res.status(200).json({
      success: true,
      data: fallbackPage,
    });

    // Cache in redis for 24 hour
    executeBackgroundTasks(
      [
        async () => {
          return await redisService.cacheResponse(
            cacheKey,
            {
              success: true,
              data: page,
            },
            getPageBySlug_TTL, // Reusing the same TTL constant
          );
        },
      ],
      'Cache page by pathname - getPageByPathname',
    );
  } catch (e) {
    console.error('Unhandled error in getPageByPathname', e);
    res.status(500).json({
      success: false,
      message: (e as Error).message,
      stack: (e as Error).stack,
    });
  }
};

export {
  createPage,
  getPages,
  getPageBySlug,
  updatePage,
  deletePage,
  getPageByPathname,
  updatePageSections,
};
