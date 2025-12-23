import { Request, Response, NextFunction } from 'express';
import { CustomRequest } from '../types/auth.types.js';
import { notificationService } from '../server.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import redisService from '../config/redis.config.js';
import { handleCachedResponse } from '../utils/handleCacheResponse.js';
import {
  getAdminNotification_registry_TTL,
  getStudentNotification_registry_TTL,
} from '../constants/redis.cacheTTL.js';

const getAdminNotifications = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const cacheKey = `getAdminNotifications:${req.user?.userId}:${page}:${limit}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const result = await notificationService.getAdminNotifications(page, limit);
  res.json(result);

  //  cache
  executeBackgroundTasks(
    [
      async () => {
        //Cache for 10 mins
        await redisService.cacheWithRegistry(
          cacheKey,
          {
            ...result,
          },
          getAdminNotification_registry_TTL, // 24 hrs in seconds
          `getAdminNotifications:${req.user?.userId}`,
        );
      },
    ],
    `getAdminNotifications`,
  );
};

const getStudentNotifications = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const cacheKey = `getStudentNotifications:${req.user?.userId}:${page}:${limit}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const result = await notificationService.getStudentNotifications(userId, page, limit);
  res.json(result);

  //  cache
  executeBackgroundTasks(
    [
      async () => {
        //Cache for 10 mins
        await redisService.cacheWithRegistry(
          cacheKey,
          {
            ...result,
          },
          getStudentNotification_registry_TTL, // 24 hrs in seconds
          `getStudentNotifications:${req.user?.userId}`,
        );
      },
    ],
    `getStudentNotifications`,
  );
};

const markAsRead = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  const { notificationId } = req.params;
    const userId = req.user?.userId;
  const notification = await notificationService.markAsRead(notificationId);
  res.json(notification);
  // Invalidate relevant caches after updating read status
  executeBackgroundTasks(
    [
      async () => {
        // Determine which registry to invalidate based on notification type
        if (notification.type === 'ADMIN') {
          await redisService.invalidateRegistry(`getAdminNotifications:${userId}`);
        } else {
          await redisService.invalidateRegistry(`getStudentNotifications:${userId}`);
        }
      },
    ],
    'invalidateNotificationCache',
  );
};

// Mark all notifications as read for a user
const markAllAsRead = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const count = await notificationService.markAllAsRead(userId);
  res.json({ success: true, count });

   // Invalidate all notification caches for this user
  executeBackgroundTasks(
    [
      async () => {
        // Invalidate both types of notification caches for this user
        await redisService.invalidateRegistry(`getAdminNotifications:${userId}`);
        await redisService.invalidateRegistry(`getStudentNotifications:${userId}`);
      },
    ],
    'invalidateAllNotificationCaches',
  );
};

export { getAdminNotifications, getStudentNotifications, markAsRead, markAllAsRead };
