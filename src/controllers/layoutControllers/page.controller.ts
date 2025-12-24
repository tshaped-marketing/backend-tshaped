import { Request, Response, NextFunction } from 'express';
import prismaClient from '../../prisma/prisma.client.js';
import { CreatePageSchema, UpdatePageSchema } from '../../zodSchemas/layout.schema.js';
import { throwError } from '../../middlewares/errorHandler.middleware.js';
import { handleCachedResponse } from '../../utils/handleCacheResponse.js';
import redisService from '../../config/redis.config.js';
import { titleToSlug } from '../../utils/titleToSlug.js';
import executeBackgroundTasks from '../../utils/executeBackgroundTasks.js';
import { getAllPages_TTL, getPageBySlug_TTL } from '../../constants/redis.cacheTTL.js';

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
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const page = await prismaClient.page.findUnique({
    where: {
      slug: req.params.slug,
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
                    // Added another level of children
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

  if (!page) {
    return await throwError('PAGE001');
  }

  res.status(200).json({
    success: true,
    data: page,
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
          getPageBySlug_TTL, // 24 hrs in seconds)
        );
      },
    ],
    'Cache page by slug - getPageBySlug',
  );
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

const getPageByPathname = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const decodedPathname= decodeURIComponent(req.query.q as string);
    if(!decodedPathname) {
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

  if (!page) {
    return await throwError('PAGE001');
  }

  res.status(200).json({
    success: true,
    data: page,
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
};

export { createPage, getPages, getPageBySlug, updatePage, deletePage,getPageByPathname };
