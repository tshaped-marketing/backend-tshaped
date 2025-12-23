import { Request, Response, NextFunction } from 'express';
import { BulkCreateContentSchema, CreateContentSchema, UpdateContentSchema } from '../../zodSchemas/layout.schema.js';
import prismaClient from '../../prisma/prisma.client.js';
import { throwError } from '../../middlewares/errorHandler.middleware.js';
import redisService from '../../config/redis.config.js';
import { titleToSlug } from '../../utils/titleToSlug.js';
import executeBackgroundTasks from '../../utils/executeBackgroundTasks.js';
import { handleCachedResponse } from '../../utils/handleCacheResponse.js';
import {
  getContentByParentId_TTL,
  getContentsBySectionId_TTL,
} from '../../constants/redis.cacheTTL.js';
import getAllParentIds from '../../utils/getContentParents.js';

const createContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = CreateContentSchema.parse(req.body);

  // Check if section exists
    const sectionExists = await prismaClient.section.findUnique({
      where: { id: validatedData.sectionId },
    });

  if (!sectionExists) {
    return await throwError('CONTENT002');
  }

  // Check if parent exists if parentId is provided
  if (validatedData.parentId) {
    const parentExists = await prismaClient.content.findUnique({
      where: { id: validatedData.parentId },
    });

    if (!parentExists) {
      return await throwError('CONTENT003');
    }
  }

  // Create slug and check if it already exists
  const baseSlug = validatedData.slug ? validatedData.slug : titleToSlug(validatedData.title!);
  const slugExists = await prismaClient.content.findFirst({
    where: {
      slug: baseSlug,
      sectionId: validatedData.sectionId,
    },
  });

  // Determine the order based on whether it's nested or top-level.
  let order = 0;
  if (validatedData.parentId) {
    // Nested content: Find the highest order among siblings.
    const siblingCount = await prismaClient.content.count({
      where: { parentId: validatedData.parentId },
    });
    order = siblingCount;
  } else {
    // Top-level content: Find highest order in the section.
    const contentCount = await prismaClient.content.count({
      where: { sectionId: validatedData.sectionId },
    });
    order = contentCount;
  }

  const slug = slugExists ? `${baseSlug}-${order + 1}` : baseSlug;

  const finalValidatedData = {
    ...validatedData,
    order: order + 1,
    slug,
  };

    const content = await prismaClient.content.create({
      data: finalValidatedData as any,
    });

    res.status(201).json({
      success: true,
      message: 'Content created successfully',
      data: content,
    });
  // Invalidate cache
    executeBackgroundTasks(
      [
        async () => {
          const [section, parentIds] = await Promise.all([
            prismaClient.section.findUnique({
              where: { id: content.sectionId },
            }),
            await getAllParentIds(content.id),
          ]);

          const parentCacheKeys = parentIds.map(parentId => `getContentsByParentId:${parentId}`);
          if (content.parentId) {
            parentCacheKeys.push(`getContentsByParentId:${content.parentId}`);
          }
          const getContentsByIdKeys = parentIds.map(parentId => `getContentById:${parentId}`);
          return await redisService.invalidateMultipleKeys([
            ...new Set(parentCacheKeys),
            ...new Set(getContentsByIdKeys),
            `getSecByPage:${section!.pageSlug}`,
            `getSec:${section!.slug}`,
            `getPageBySlug:${section!.pageSlug}`,
            `list_pages`,
            `getContents:${content.sectionId}`,
          ]);
        },
      ],
      'createContent',
    );
  } catch (e) {
    console.error('createContent error', e);
    res.status(500).json({
      success: false,
      message: (e as Error).message,
      stack: (e as Error).stack,
    });
  }
};

// Bulk Content Creation Controller
const createBulkContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = BulkCreateContentSchema.parse(req.body);
    const { sectionId, contents, preserveOrder = true } = validatedData;

    // Prepare for flattening nested content structure
    const flattenedContents: Array<any> = [];
    
    // Function to flatten nested content structure
    const flattenContents = (items: any[], parentId: string | null = null, baseOrder: number = 0) => {
      items.forEach((item, index) => {
        const children = item.children || [];
        delete item.children; // Remove children from the item
        
        // Create temporary ID if we need to reference this item as a parent
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const orderWithinParent = preserveOrder ? baseOrder + index + 1 : 0;
        
        // Assign parent ID if available
        if (parentId) {
          item.parentId = parentId;
        }
        
        // Add to flattened array with additional metadata
        flattenedContents.push({
          ...item,
          _tempId: tempId,
          _order: orderWithinParent,
        });
        
        // Process children if they exist
        if (children.length > 0) {
          flattenContents(children, tempId, 0);
        }
      });
    };
    
    // Process root level contents
    flattenContents(contents);

    // Execute everything in a single transaction to manage connections properly
    const result = await prismaClient.$transaction(async (prisma) => {
      // First, check if section exists inside the transaction
      const sectionExists = await prisma.section.findUnique({
        where: { id: sectionId },
      });

      if (!sectionExists) {
        throw new Error('CONTENT002'); // We'll catch this outside the transaction
      }

      // Prepare keys to invalidate for cache
      const keysToInvalidate = new Set<string>([
        `getSecByPage:${sectionExists.pageSlug}`,
        `getSec:${sectionExists.slug}`,
        `getPageBySlug:${sectionExists.pageSlug}`,
        `list_pages`,
        `getContents:${sectionId}`,
      ]);
      
      // Map to store temporary IDs to real database IDs
      const idMap = new Map<string, string>();
      
      // Map to track content order per parent
      const orderMap = new Map<string | null, number>();
      
      // Process items in sequence to avoid opening too many connections
      const processedContents = [] as any;
      
      // First pass: create all content items without parent relationships
      for (const contentItem of flattenedContents) {
        // Create slug and check if it already exists
        const baseSlug = contentItem.slug 
          ? contentItem.slug 
          : contentItem.title 
            ? titleToSlug(contentItem.title) 
            : `content-${Date.now()}`;

        const slugExists = await prisma.content.findFirst({
          where: {
            slug: baseSlug,
            sectionId: sectionId,
          },
        });

        // Calculate order
        let order: number;
        const parentId = contentItem.parentId || null;
        
        if (contentItem._order && preserveOrder) {
          // Use the order from our flattening process
          order = contentItem._order;
        } else {
          // Get current count for this parent and increment it
          const currentCount = orderMap.get(parentId) || 0;
          order = currentCount + 1;
          orderMap.set(parentId, order);
        }

        const slug = slugExists ? `${baseSlug}-${order}` : baseSlug;

        // Prepare data for creation, removing our temp properties
        const { _tempId, _order, ...contentData } = contentItem;
        
        // If this has a temp parent ID, we need to resolve it to a real ID
        let finalParentId = contentData.parentId;
        if (finalParentId && finalParentId.startsWith('temp_')) {
          finalParentId = idMap.get(finalParentId) || null;
        }
        
        // Create the content item
        const createdContent = await prisma.content.create({
          data: {
            ...contentData,
            parentId: finalParentId,
            sectionId,
            order,
            slug,
          },
        });
        
        // Store the mapping from temp ID to real ID
        if (_tempId) {
          idMap.set(_tempId, createdContent.id);
        }
        
        processedContents.push(createdContent);
      }
      
      return { processedContents, keysToInvalidate };
    });

    res.status(201).json({
      success: true,
      message: `Successfully created ${result.processedContents.length} content items`,
      data: result.processedContents,
    });

    // Invalidate cache
    executeBackgroundTasks(
      [
        async () => {
          return await redisService.invalidateMultipleKeys([...result.keysToInvalidate]);
        },
      ],
      'createBulkContent',
    );
  } catch (error: any) {
    console.error('Bulk content creation error:', error);

    // Handle section not found
    if (error instanceof Error && error.message === 'CONTENT002') {
      await throwError('CONTENT002');
      return;
    }

    // Surface raw error for debugging
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create content',
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
      details: error,
    });
    return;
  }
};

const getContents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { sectionId } = req.params;
  const where = sectionId.startsWith('cm') ? { id: sectionId } : { slug: sectionId };

  const cacheKey = `getContents:${sectionId}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }

  // Find section details first
  const section = await prismaClient.section.findUnique({
    where,
  });

  if (!section) {
    return await throwError('CONTENT002');
  }

  // Get top-level content items (those without a parentId).
  const contents = await prismaClient.content.findMany({
    where: { sectionId: section.id, parentId: null }, // Only top-level
    orderBy: { order: 'asc' },
    include: { children: { orderBy: { order: 'asc' } } }, // Include nested children
  });

  res.status(200).json({
    success: true,
    data: contents,
    section,
  });

  // Execute caching
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            data: contents,
          },
          getContentsBySectionId_TTL, // 24 hrs in seconds
        );
      },
    ],
    'getContents',
  );
};

const getContentsByParentId = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { parentId } = req.params;

  const cacheKey = `getContentsByParentId:${parentId}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  // Check if parent content exists
  const parentExists = await prismaClient.content.findUnique({
    where: { id: parentId },
  });

  if (!parentExists) {
    return await throwError('CONTENT003');
  }

  const contents = await prismaClient.content.findMany({
    where: { parentId },
    orderBy: { order: 'asc' },
    include: { children: { orderBy: { order: 'asc' } } }, // Include nested children
  });

  res.status(200).json({
    success: true,
    data: contents,
  });

  // Execute caching
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            data: contents,
          },
          getContentByParentId_TTL, // 24 hrs in seconds
        );
      },
    ],
    'getContentsByParentId',
  );
};


const getContentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const where = id.startsWith('cm') ? { id } : { slug: id };

  const cacheKey = `getContentById:${id}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }

  // Find the content item
  const content = await prismaClient.content.findUnique({
    where,
    include: {
      children: {
        orderBy: { order: 'asc' },
        include: {
          children: {
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });

  if (!content) {
    return await throwError('CONTENT001');
  }

  // Get section details for context
  const section = await prismaClient.section.findUnique({
    where: { id: content.sectionId }
  });

  res.status(200).json({
    success: true,
    data: content,
    section
  });

  // Execute caching
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            data: content,
            section
          },
          getContentByParentId_TTL, // Reusing same TTL as parent content
        );
      },
    ],
    'getContentById',
  );
};

const updateContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const validatedData = UpdateContentSchema.parse(req.body);
  const where = req.params.id.startsWith('cm') ? { id: req.params.id } : { slug: req.params.id };

  // Check if content exists
  const contentExists = await prismaClient.content.findUnique({
    where,
  });

  if (!contentExists) {
    return await throwError('CONTENT001');
  }

  // If title is being updated, check if the new slug would conflict
  // If title is being updated, check if it's different from the existing title
  if (validatedData.title && validatedData.title !== contentExists.title) {
    const newSlug = titleToSlug(validatedData.title);
    const slugExists = await prismaClient.content.findFirst({
      where: {
        slug: newSlug,
        id: { not: contentExists.id },
        sectionId: contentExists.sectionId,
      },
    });

    if (slugExists) {
      return await throwError('CONTENT006');
    }

    // Update the slug based on the new title
    validatedData.slug = newSlug;
  }

  const content = await prismaClient.content.update({
    where,
    data: validatedData as any,
  });

  res.status(200).json({
    success: true,
    message: 'Content updated successfully',
    data: content,
  });
  // Execute cache deletion in background
  executeBackgroundTasks(
    [
      async () => {
      const [section, parentIds] = await Promise.all([
    prismaClient.section.findUnique({
      where: { id: content.sectionId },
    }),
    await getAllParentIds(content.id)
  ]);

   // Build all parent cache keys for the hierarchy
  const parentCacheKeys = parentIds.map(parentId => `getContentsByParentId:${parentId}`);
   const getContentsByIdKeys = parentIds.map(parentId => `getContentById:${parentId}`); 
  // Add immediate parent if it exists
  if (content.parentId) {
    parentCacheKeys.push(`getContentsByParentId:${content.parentId}`);
  }
  const page = await prismaClient.page.findUnique({
    where: { slug: section!.pageSlug as string },
  });
  const keysToInvalidate = [
    ...new Set(parentCacheKeys), // Remove duplicates
    ...new Set(getContentsByIdKeys), // Remove duplicates
    'list_pages',
    `getContents:${content.sectionId}`,
    `getPageBySlug:${section!.pageSlug}`,
    `getPageByPathname:${page!.pathname}`,
    `getSecByPage:${section!.pageSlug}`,
    `getSec:${section!.slug}`,
    `getContentById:${content.id}`,
  ];

  return redisService.invalidateMultipleKeys(keysToInvalidate);
}
    ],
    'Cache deletion - Content update',
  );
};

const deleteContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const where = req.params.id.startsWith('cm') ? { id: req.params.id } : { slug: req.params.id };

  // Check if content exists
  const contentExists = await prismaClient.content.findUnique({
    where,
  });

  if (!contentExists) {
    return await throwError('CONTENT001');
  }

  // Check if there are child contents
  const childrenCount = await prismaClient.content.count({
    where: { parentId: contentExists.id },
  });

  if (childrenCount > 0) {
    return await throwError('CONTENT007');
  }

  await prismaClient.content
    .delete({
      where,
    })
    .catch(() => {
      return throwError('CONTENT005');
    });

  res.status(200).json({
    success: true,
    message: 'Content deleted successfully',
  });
  // Execute cache deletion in background
  executeBackgroundTasks(
    [
      async () => {
      const [section, parentIds] = await Promise.all([
    prismaClient.section.findUnique({
      where: { id: contentExists.sectionId },
    }),
    await getAllParentIds(contentExists.id)
  ]);

   // Build all parent cache keys for the hierarchy
  const parentCacheKeys = parentIds.map(parentId => `getContentsByParentId:${parentId}`);
  const getContentsByIdKeys = parentIds.map(parentId => `getContentById:${parentId}`); 
  // Add immediate parent if it exists
  if (contentExists.parentId) {
    parentCacheKeys.push(`getContentsByParentId:${contentExists.parentId}`);
  }
    const page = await prismaClient.page.findUnique({
    where: { slug: section!.pageSlug as string },
  });
        const keysToInvalidate = [
    ...new Set(parentCacheKeys), // Remove duplicates
    ...new Set(getContentsByIdKeys), // Remove duplicates
    'list_pages',
    `getContents:${contentExists.sectionId}`,
    `getPageBySlug:${section!.pageSlug}`,
    `getPageByPathname:${page!.pathname}`,
    `getSecByPage:${section!.pageSlug}`,
    `getSec:${section!.slug}`,
    `getContentById:${contentExists.id}`,
  ];

  return redisService.invalidateMultipleKeys(keysToInvalidate);
}
    ],
    'Cache deletion - Content delete',
  );
};

export { createContent, getContents, getContentsByParentId, updateContent, deleteContent ,createBulkContent,getContentById};
