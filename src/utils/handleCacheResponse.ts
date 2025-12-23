import { Response } from 'express';
import redisService from '../config/redis.config.js';
import { NODE_ENV } from '../constants/env.constant.js';

export async function handleCachedResponse(cacheKey: string, res: Response): Promise<boolean> {
  // In development/local, skip Redis to avoid timeouts when Redis is not available.
  if (NODE_ENV !== 'production') {
    return false;
  }

  try {
    const isCached = await redisService.isCached(cacheKey);
    if (isCached) {
      const cachedResponse = await redisService.getCachedResponse(cacheKey);
      res.status(200).json(cachedResponse); // Return entire cached object
      return true; // Response was sent
    }
  } catch (err) {
    // If Redis is unavailable, fall through without caching.
    return false;
  }
  return false; // No cached response was sent
}
