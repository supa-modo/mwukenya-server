import Redis from "ioredis";
import { config } from "./index";
import logger from "../utils/logger";

// Redis configuration with support for REDIS_URL
const getRedisConfig = () => {
  const baseConfig = {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000,
  };

  // If REDIS_URL is provided, use it directly
  if (process.env.REDIS_URL) {
    return {
      ...baseConfig,
    };
  }

  // Otherwise, use individual configuration
  return {
    ...baseConfig,
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    db: config.redis.db,
  };
};

// Create Redis instance
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, getRedisConfig())
  : new Redis(getRedisConfig());

export { redis };

// Redis event handlers
redis.on("connect", () => {
  logger.info("Redis client connected");
});

redis.on("ready", () => {
  logger.info("Redis client ready");
});

redis.on("error", (error) => {
  logger.error("Redis client error:", error);
});

redis.on("close", () => {
  logger.info("Redis client connection closed");
});

redis.on("reconnecting", () => {
  logger.info("Redis client reconnecting");
});

// Test Redis connection
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    await redis.ping();
    logger.info("Redis connection established successfully");
    return true;
  } catch (error) {
    logger.error("Unable to connect to Redis:", error);
    return false;
  }
};

// Redis utility functions
export const redisUtils = {
  // Set with expiration
  setex: async (key: string, value: string, ttl: number): Promise<void> => {
    await redis.setex(key, ttl, value);
  },

  // Get value
  get: async (key: string): Promise<string | null> => {
    return await redis.get(key);
  },

  // Delete key
  del: async (key: string): Promise<number> => {
    return await redis.del(key);
  },

  // Set JSON object
  setJSON: async (key: string, value: any, ttl?: number): Promise<void> => {
    const jsonString = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, jsonString);
    } else {
      await redis.set(key, jsonString);
    }
  },

  // Get JSON object
  getJSON: async <T>(key: string): Promise<T | null> => {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error("Error parsing JSON from Redis:", error);
      return null;
    }
  },

  // Check if key exists
  exists: async (key: string): Promise<boolean> => {
    return (await redis.exists(key)) === 1;
  },

  // Set with expiration at specific time
  expireAt: async (key: string, timestamp: number): Promise<void> => {
    await redis.expireat(key, timestamp);
  },

  // Get TTL
  ttl: async (key: string): Promise<number> => {
    return await redis.ttl(key);
  },

  // Increment
  incr: async (key: string): Promise<number> => {
    return await redis.incr(key);
  },

  // Increment with expiration
  incrWithExpire: async (key: string, ttl: number): Promise<number> => {
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, ttl);
    const results = await multi.exec();
    return results![0][1] as number;
  },
};

// Close Redis connection
export const closeRedisConnection = async (): Promise<void> => {
  try {
    redis.disconnect();
    logger.info("Redis connection closed");
  } catch (error) {
    logger.error("Error closing Redis connection:", error);
    throw error;
  }
};

export default redis;
