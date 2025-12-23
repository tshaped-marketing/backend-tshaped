import { Request, Response, NextFunction } from 'express';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import fs from 'fs/promises';
import path from 'path';
import { handleCachedResponse } from '../utils/handleCacheResponse.js';
import redisService from '../config/redis.config.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import { titleToSlug } from '../utils/titleToSlug.js';
import { set } from 'lodash';
import {
  getAllSettings_TTL,
  getSettingsByIdentifier_registry_TTL,
} from '../constants/redis.cacheTTL.js';
interface GetSettingParams extends Request {
  params: {
    identifier: string;
  };
  query: {
    depth?: string;
  };
}

const createSetting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const reqBody = req.body;

  // Check if setting with slug existss
  const settingExists = await prismaClient.setting.findUnique({
    where: { slug: reqBody.slug? reqBody.slug : titleToSlug(reqBody.title) },
  });

  if (settingExists) {
    return await throwError('SET001');
  }

  // If parentId is provided, verify parent exists
  if (reqBody.parentId) {
    const parentExists = await prismaClient.setting.findUnique({
      where: { id: reqBody.parentId },
    });

    if (!parentExists) {
      return await throwError('SET002');
    }
  }

  const setting = await prismaClient.setting.create({
    data: {
      title: reqBody.title,
      slug: reqBody.slug ? reqBody.slug : titleToSlug(reqBody.title),
      description: reqBody.description,
      mode: reqBody.mode,
      dataType: reqBody.dataType,
      value: reqBody.value,
      parentId: reqBody.parentId,
      order: reqBody.order,
      isActive: reqBody.isActive ?? true,
    },
    include: {
      children: true,
      parent: true,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Setting created successfully',
    data: setting,
  });

  executeBackgroundTasks(
    [
      async () => {

               // First, always invalidate the general settings cache
         await redisService.deleteCachedResponse(`get_all_settings`);
        if (reqBody.parentId) {
          // First get the complete ancestor chain
          let currentParentId = reqBody.parentId;
          const ancestorIds = [currentParentId];

          // Traverse up the hierarchy to collect all ancestor IDs
          while (currentParentId) {
            const parent = await prismaClient.setting.findUnique({
              where: { id: currentParentId },
              select: { parentId: true },
            });

            if (parent?.parentId) {
              ancestorIds.push(parent.parentId);
              currentParentId = parent.parentId;
            } else {
              currentParentId = null;
            }
          }

          // Invalidate cache for all ancestors
          for (const ancestorId of ancestorIds) {
            await redisService.invalidateRegistry(`settings_depth:${ancestorId}`);
          }
        }
      },
    ],
    'createSettings',
  );
};

const getAllSettings = async (req: Request, res: Response) => {
  const { isActive, parentId, mode, dataType, platform } = req.query;
  const cacheKey = `get_all_settings`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }

  const settings = await prismaClient.setting.findMany({
    where: {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      parentId: parentId as string | undefined,
      mode: mode as any,
      dataType: dataType as any,
      platform: (platform as any) || undefined,
    },
    include: {
      children: true,
      parent: true,
    },
  });

  res.status(200).json({
    success: true,
    data: settings,
  });
  //  cache
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            data: settings,
          },
          getAllSettings_TTL, // 24 hrs in seconds)
        );
      },
    ],
    'getAllSettings',
  );
};

const getSettingByIdentifier = async (req: GetSettingParams, res: Response) => {
  const { identifier } = req.params;
  const requestedDepth = parseInt(req.query.depth || '1');

  const cacheKey = `get_setting_by_identifier:${identifier}|${requestedDepth}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  // Validate depth parameter
  if (isNaN(requestedDepth) || requestedDepth < 0) {
    return await throwError('SET004');
  }

  // Helper function to build include object for nested children
  const buildNestedInclude = (currentDepth: number): any => {
    if (currentDepth <= 0) {
      return {};
    }

    return {
      children: {
         orderBy: {
          order: 'asc', // Order children by the 'order' field ascending
        },
        include: {
          ...buildNestedInclude(currentDepth - 1),
          parent: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      },
      parent: {
        include: {
          parent: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      },
    };
  };

  try {
    const setting = await prismaClient.setting.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: buildNestedInclude(requestedDepth),
    });

    if (!setting) {
      return await throwError('SET003');
    }

    // Helper function to format the nested structure
    const formatSettingHierarchy = (setting: any, depth: number): any => {
      if (!setting || depth < 0) return null;

      const formattedSetting = {
        id: setting.id,
        title: setting.title,
        slug: setting.slug,
        description: setting.description,
        mode: setting.mode,
        dataType: setting.dataType, 
        order: setting.order,
        value: setting.value,
        isActive: setting.isActive,
        parentId: setting.parentId,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt,
        parent: setting.parent
          ? {
              id: setting.parent.id,
              title: setting.parent.title,
              slug: setting.parent.slug,
              parent: setting.parent.parent
                ? {
                    id: setting.parent.parent.id,
                    title: setting.parent.parent.title,
                    slug: setting.parent.parent.slug,
                  }
                : null,
            }
          : null,
        children:
          setting.children?.map((child: any) => formatSettingHierarchy(child, depth - 1)) || [],
      };

      return formattedSetting;
    };

    const formattedData = formatSettingHierarchy(setting, requestedDepth);

    res.status(200).json({
      success: true,
      data: formattedData,
    });

    //  cache
    executeBackgroundTasks(
      [
        async () => {
          return await redisService.cacheWithRegistry(
            cacheKey,
            {
              success: true,
              data: formattedData,
            },
            getSettingsByIdentifier_registry_TTL,
            `settings_depth:${setting.id}`,
          );
        },
      ],
      'getSettingsByIdentifier',
    );
  } catch (error) {
    return await throwError('SYS001');
  }
};

const updateSetting = async (req: Request, res: Response) => {
  const { id } = req.params;
  const reqBody = req.body;

  // Check if setting exists
  const settingExists = await prismaClient.setting.findUnique({
    where: { id },
  });

  if (!settingExists) {
    return await throwError('SET003');
  }

  // Prepare update data
  const updateData: any = {
    title: reqBody.title,
    description: reqBody.description,
    mode: reqBody.mode,
    dataType: reqBody.dataType,
    value: reqBody.value,
    order: reqBody.order,
    parentId: reqBody.parentId,
    isActive: reqBody.isActive,
  };

  // Update slug only if old title is not equal to new title
  if (reqBody.title && typeof reqBody.title === 'string' && settingExists.title !== reqBody.title) {

    updateData.slug = reqBody.slug ? reqBody.slug : titleToSlug(reqBody.title);
  }

  const setting = await prismaClient.setting.update({
    where: { id },
    data: updateData,
    include: {
      children: true,
      parent: true,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Setting updated successfully',
    data: setting,
  });

  //  invalidate cache
  executeBackgroundTasks(
    [
      async () => {
        await redisService.deleteCachedResponse(`get_all_settings`);
        if (setting.parentId) {
          // First get the complete ancestor chain
          let currentParentId = setting.parentId as any;
          const ancestorIds = [currentParentId];

          // Traverse up the hierarchy to collect all ancestor IDs
          while (currentParentId) {
            const parent = await prismaClient.setting.findUnique({
              where: { id: currentParentId },
              select: { parentId: true },
            });

            if (parent?.parentId) {
              ancestorIds.push(parent.parentId);
              currentParentId = parent.parentId;
            } else {
              currentParentId = null;
            }
          }

          // Invalidate cache for all ancestors
          for (const ancestorId of ancestorIds) {
            await redisService.invalidateRegistry(`settings_depth:${ancestorId}`);
          }
        }

        await redisService.invalidateRegistry(`settings_depth:${setting.id}`);
      },
    ],
    'updateSettings',
  );
};

const deleteSetting = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if setting exists
  const settingExists = await prismaClient.setting.findUnique({
    where: { id },
  });

  if (!settingExists) {
    return await throwError('SET003');
  }

  await prismaClient.setting.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'Setting deleted successfully',
  });

  //  invalidate cache
  executeBackgroundTasks(
    [
      async () => {
        await redisService.deleteCachedResponse(`get_all_settings`);
        if (settingExists.parentId) {
          // First get the complete ancestor chain
          let currentParentId = settingExists.parentId as any;
          const ancestorIds = [currentParentId];

          // Traverse up the hierarchy to collect all ancestor IDs
          while (currentParentId) {
            const parent = await prismaClient.setting.findUnique({
              where: { id: currentParentId },
              select: { parentId: true },
            });

            if (parent?.parentId) {
              ancestorIds.push(parent.parentId);
              currentParentId = parent.parentId;
            } else {
              currentParentId = null;
            }
          }

          // Invalidate cache for all ancestors
          for (const ancestorId of ancestorIds) {
            await redisService.invalidateRegistry(`settings_depth:${ancestorId}`);
          }
        }
        await redisService.invalidateRegistry(`settings_depth:${settingExists.id}`);
      },
    ],
    'deleteSettings',
  );
};

const batchUpdateSettings = async (req: Request, res: Response) => {
  const updates = req.body;

  if (!Array.isArray(updates)) {
    return await throwError('SET005');
  }

  const results = await prismaClient.$transaction(
    updates.map((update: any) =>
      prismaClient.setting.update({
        where: { id: update.id },
        data: { value: update.value },
      }),
    ),
  );

  res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    data: results,
  });
};

const createSettingsJson = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch all settings from the database
    const settings = await prismaClient.setting.findMany({
      where: {
        parentId: null, // Get only root settings
        isActive: true, // Get only active settings
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true, // Support up to 3 levels of nesting
              },
            },
          },
        },
      },
    });

    // Transform settings into a more manageable format
    const formatSettings = (setting: any) => {
      const formatted = {
        slug: setting.slug,
        value: setting.value,
      } as any;

      if (setting.children && setting.children.length > 0) {
        formatted.children = setting.children.map((child: any) => formatSettings(child));
      }

      return formatted;
    };

    const formattedSettings = settings.map(formatSettings);

    // Create the settings.json file in the config directory
    const configPath = path.join(process.cwd(), 'src', 'config');
    const filePath = path.join(configPath, 'settings.json');

    // Ensure config directory exists
    await fs.mkdir(configPath, { recursive: true });

    // Write settings to file
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          lastUpdated: new Date().toISOString(),
          settings: formattedSettings,
        },
        null,
        2,
      ),
    );

    res.status(200).json({
      success: true,
      message: 'Settings exported to JSON successfully',
      filePath: filePath,
    });
  } catch (error) {
    console.error('Error exporting settings:', error);
    await throwError('SYS001');
  }
};

export {
  createSetting,
  getAllSettings,
  getSettingByIdentifier,
  updateSetting,
  deleteSetting,
  batchUpdateSettings,
  createSettingsJson,
};
