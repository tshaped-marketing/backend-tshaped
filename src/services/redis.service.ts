import { Redis, Cluster } from 'ioredis';

class RedisCacheService {
  private redis: Redis | Cluster;

  constructor(redisClient: Redis | Cluster) {
    this.redis = redisClient;
  }

  async cacheResponse(key: string, data: any, ttl: number): Promise<boolean> {
    try {
      const serializedData = JSON.stringify(data);
      await this.redis.setex(key, ttl, serializedData);
      return true;
    } catch (error) {
      console.error('Error caching response:', error);
      return false;
    }
  }

  async getCachedResponse<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch (error) {
      console.error('Error retrieving cached response:', error);
      return null;
    }
  }

  async isCached(key: string): Promise<boolean> {
    return Boolean(await this.redis.exists(key));
  }

  async deleteCachedResponse(key: string): Promise<boolean> {
    const result = await this.redis.del(key);
    return result > 0;
  }

  async getRemainingTTL(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async updateTTL(key: string, ttl: number): Promise<boolean> {
    if (!(await this.redis.exists(key))) return false;
    await this.redis.expire(key, ttl);
    return true;
  }

  /**
   * Register a cache key with a registry group for bulk invalidation
   * @param key The cache key to register
   * @param registryName The name of the registry group
   */
  async registerWithRegistry(key: string, registryName: string): Promise<boolean> {
    try {
      await this.redis.sadd(`registry:${registryName}`, key);
      return true;
    } catch (error) {
      console.error('Error registering key with registry:', error);
      return false;
    }
  }

  /**
   * Cache data and register the key with a registry group
   * @param key The cache key
   * @param data The data to cache
   * @param ttl Time to live in seconds
   * @param registryName The name of the registry group
   */
  async cacheWithRegistry(
    key: string,
    data: any,
    ttl: number,
    registryName: string,
  ): Promise<boolean> {
    try {
      const cached = await this.cacheResponse(key, data, ttl);
      if (cached) {
        await this.registerWithRegistry(key, registryName);
      }
      return cached;
    } catch (error) {
      console.error('Error caching with registry:', error);
      return false;
    }
  }

  /**
   * Invalidate all cache keys in a registry group
   * @param registryName The name of the registry group
   * @returns Number of keys invalidated
   */
  async invalidateRegistry(registryName: string): Promise<number> {
    try {
      console.log(`[REDIS] Starting invalidation of registry: ${registryName}`);
      const registryKey = `registry:${registryName}`;
      
      console.log(`[REDIS] Getting members of registry: ${registryKey}`);
      const keys = await this.redis.smembers(registryKey);
      console.log(`[REDIS] Found ${keys.length} keys in registry`);
  
      if (keys.length === 0) {
        console.log(`[REDIS] No keys to invalidate for registry: ${registryName}`);
        return 0;
      }
  
      // Delete keys individually for cluster compatibility
      let deletedCount = 0;
      for (const key of keys) {
        console.log(`[REDIS] Deleting key: ${key}`);
        const result = await this.redis.del(key);
        deletedCount += result;
      }
  
      // Remove the registry itself
      console.log(`[REDIS] Removing registry key: ${registryKey}`);
      await this.redis.del(registryKey);
      console.log(`[REDIS] Invalidation complete, deleted ${deletedCount} keys`);
  
      return deletedCount;
    } catch (error) {
      console.error(`[REDIS] Error invalidating registry ${registryName}:`, error);
      return 0;
    }
  }

  /**
   * Get all keys registered in a registry group
   * @param registryName The name of the registry group
   */

  async getRegistryKeys(registryName: string): Promise<string[]> {
    try {
      return await this.redis.smembers(`registry:${registryName}`);
    } catch (error) {
      console.error('Error getting registry keys:', error);
      return [];
    }
  }

  /**
   * Invalidate multiple cache keys
   * @param keys Array of keys to invalidate
   * @returns Number of keys successfully deleted
   */
  async invalidateMultipleKeys(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;

      // Delete keys individually for cluster compatibility
      let deletedCount = 0;
      for (const key of keys) {
        const result = await this.redis.del(key);
        deletedCount += result;
      }
      return deletedCount;
    } catch (error) {
      console.error('Error invalidating multiple keys:', error);
      return 0;
    }
  }
}

export default RedisCacheService;
