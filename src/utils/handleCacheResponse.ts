import { Response } from 'express';
import redisService from '../config/redis.config.js';

export async function handleCachedResponse(cacheKey: string, res: Response): Promise<boolean> {
  const isCached = await redisService.isCached(cacheKey);
  if (isCached) {
    const cachedResponse = await redisService.getCachedResponse(cacheKey);
    res.status(200).json(cachedResponse); // Return entire cached object
    return true; // Response was sent
  }
  return false; // No cached response was sent
}
