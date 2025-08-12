import Redis from "ioredis";
import { config } from "./index";
import logger from "../utils/logger";

// Redis configuration with support for REDIS_URL and enhanced stability
const getRedisConfig = () => {
  const baseConfig = {
    // Connection settings
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Enhanced stability settings for production
    retryDelayOnClusterDown: 300,
    enableOfflineQueue: false,
    maxLoadingTimeout: 10000,

    // Connection pooling and health checks
    keepAliveInitialDelay: 10000,

    // Health check interval
    healthCheckInterval: 30000,
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

// Enhanced Redis event handlers with better error handling
redis.on("connect", () => {
  logger.info("Redis client connected");
});

redis.on("ready", () => {
  logger.info("Redis client ready");
});

redis.on("error", (error: any) => {
  logger.error("Redis client error:", error);

  // Don't crash the application on Redis errors
  // Just log them and continue
  if (error.code === "ECONNREFUSED") {
    logger.warn("Redis connection refused - service may be down");
  } else if (error.code === "ETIMEDOUT") {
    logger.warn("Redis connection timeout");
  }
});

redis.on("close", () => {
  logger.info("Redis client connection closed");
});

redis.on("reconnecting", (delay: number) => {
  logger.info(`Redis client reconnecting in ${delay}ms`);
});

redis.on("end", () => {
  logger.info("Redis client connection ended");
});

// Health check function
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const startTime = Date.now();
    await redis.ping();
    const responseTime = Date.now() - startTime;

    if (responseTime > 1000) {
      logger.warn(`Redis response time slow: ${responseTime}ms`);
    }

    return true;
  } catch (error) {
    logger.error("Redis health check failed:", error);
    return false;
  }
};

// Periodic health check (every 30 seconds)
if (process.env.NODE_ENV === "production") {
  setInterval(async () => {
    const isHealthy = await checkRedisHealth();
    if (!isHealthy) {
      logger.warn("Redis health check failed - connection may be unstable");
    }
  }, 30000);
}

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

export { redis };

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

// Redis connection manager for production environments
export class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  async gracefulShutdown(): Promise<void> {
    try {
      logger.info("Starting graceful Redis shutdown...");

      // Stop accepting new commands
      redis.disconnect();

      // Wait for pending commands to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      logger.info("Redis graceful shutdown completed");
    } catch (error) {
      logger.error("Error during Redis graceful shutdown:", error);
    }
  }

  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("Max Redis reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    logger.info(
      `Attempting Redis reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    );

    try {
      await redis.connect();
      this.reconnectAttempts = 0;
      logger.info("Redis reconnection successful");
    } catch (error) {
      logger.error("Redis reconnection failed:", error);

      // Exponential backoff
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      setTimeout(() => this.reconnect(), delay);
    }
  }

  getConnectionStatus(): string {
    return redis.status;
  }

  isConnected(): boolean {
    return redis.status === "ready";
  }
}

// Close Redis connection
export const closeRedisConnection = async (): Promise<void> => {
  try {
    const manager = RedisConnectionManager.getInstance();
    await manager.gracefulShutdown();
    logger.info("Redis connection closed");
  } catch (error) {
    logger.error("Error closing Redis connection:", error);
    throw error;
  }
};

export default redis;
