// controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { CustomRequest } from '../types/auth.types.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import prismaClient from '../prisma/prisma.client.js';
import { handleCachedResponse } from '../utils/handleCacheResponse.js';
import redisService from '../config/redis.config.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import { getStudentProfile_TTL } from '../constants/redis.cacheTTL.js';

/**
 * Get the profile of the currently logged in student
 */
const getStudentProfile = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user!.userId;

  if (!userId) {
    return throwError('AUTH017');
  }

  const cacheKey = `student_profile:${userId}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }

  const user = await prismaClient.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      bio: true,
      phoneNumber: true,
      website: true,
      socialLinks: true,
      timezone: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return throwError('AUTH002');
  }

  res.status(200).json({
    success: true,
    data: user,
  });

  //  cache
  executeBackgroundTasks(
    [
      async () => {
        //Cache for 10 mins
        await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            data: user,
          },
          getStudentProfile_TTL, // 24 hrs in seconds
        );
      },
    ],
    'getStudentProfile',
  );
};

/**
 * Update the profile of the currently logged in student
 * Students can only update their own profile information
 */
const updateStudentProfile = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    return throwError('AUTH017');
  }

  const user = await prismaClient.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    return throwError('AUTH002');
  }

  // Check if trying to update role or status (not allowed for students)
  if (req.body.role || req.body.status) {
    return throwError('AUTH022');
  }

  const updatedUser = await prismaClient.user.update({
    where: {
      id: userId,
    },
    data: {
      name: req.body.name,
      email: req.body.email,
      bio: req.body.bio,
      phoneNumber: req.body.phoneNumber,
      website: req.body.website,
      socialLinks: req.body.socialLinks,
      timezone: req.body.timezone,
      preferences: req.body.preferences,
      avatar: req.body.avatar,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      bio: true,
      phoneNumber: true,
      website: true,
      socialLinks: true,
      timezone: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    success: true,
    data: updatedUser,
  });

  //  cache
  executeBackgroundTasks(
    [
      async () => {
        // Invalidate the cache for the updated user profile
        const cacheKey = `student_profile:${userId}`;
        await redisService.deleteCachedResponse(cacheKey);
      },
    ],
    'updateStudentProfile',
  );
};

export { getStudentProfile, updateStudentProfile };
