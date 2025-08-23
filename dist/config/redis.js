"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnection = exports.RedisConnectionManager = exports.redisUtils = exports.redis = exports.testRedisConnection = exports.checkRedisHealth = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const index_1 = require("./index");
const logger_1 = __importDefault(require("../utils/logger"));
const getRedisConfig = () => {
    const baseConfig = {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false,
        maxLoadingTimeout: 10000,
        keepAliveInitialDelay: 10000,
        healthCheckInterval: 30000,
    };
    if (process.env.REDIS_URL) {
        return {
            ...baseConfig,
        };
    }
    return {
        ...baseConfig,
        host: index_1.config.redis.host,
        port: index_1.config.redis.port,
        password: index_1.config.redis.password || undefined,
        db: index_1.config.redis.db,
    };
};
const redis = process.env.REDIS_URL
    ? new ioredis_1.default(process.env.REDIS_URL, getRedisConfig())
    : new ioredis_1.default(getRedisConfig());
exports.redis = redis;
redis.on("connect", () => {
    logger_1.default.info("Redis client connected");
});
redis.on("ready", () => {
    logger_1.default.info("Redis client ready");
});
redis.on("error", (error) => {
    logger_1.default.error("Redis client error:", error);
    if (error.code === "ECONNREFUSED") {
        logger_1.default.warn("Redis connection refused - service may be down");
    }
    else if (error.code === "ETIMEDOUT") {
        logger_1.default.warn("Redis connection timeout");
    }
});
redis.on("close", () => {
    logger_1.default.info("Redis client connection closed");
});
redis.on("reconnecting", (delay) => {
    logger_1.default.info(`Redis client reconnecting in ${delay}ms`);
});
redis.on("end", () => {
    logger_1.default.info("Redis client connection ended");
});
const checkRedisHealth = async () => {
    try {
        const startTime = Date.now();
        await redis.ping();
        const responseTime = Date.now() - startTime;
        if (responseTime > 1000) {
            logger_1.default.warn(`Redis response time slow: ${responseTime}ms`);
        }
        return true;
    }
    catch (error) {
        logger_1.default.error("Redis health check failed:", error);
        return false;
    }
};
exports.checkRedisHealth = checkRedisHealth;
if (process.env.NODE_ENV === "production") {
    setInterval(async () => {
        const isHealthy = await (0, exports.checkRedisHealth)();
        if (!isHealthy) {
            logger_1.default.warn("Redis health check failed - connection may be unstable");
        }
    }, 30000);
}
const testRedisConnection = async () => {
    try {
        await redis.ping();
        logger_1.default.info("Redis connection established successfully");
        return true;
    }
    catch (error) {
        logger_1.default.error("Unable to connect to Redis:", error);
        return false;
    }
};
exports.testRedisConnection = testRedisConnection;
exports.redisUtils = {
    setex: async (key, value, ttl) => {
        await redis.setex(key, ttl, value);
    },
    get: async (key) => {
        return await redis.get(key);
    },
    del: async (key) => {
        return await redis.del(key);
    },
    setJSON: async (key, value, ttl) => {
        const jsonString = JSON.stringify(value);
        if (ttl) {
            await redis.setex(key, ttl, jsonString);
        }
        else {
            await redis.set(key, jsonString);
        }
    },
    getJSON: async (key) => {
        const value = await redis.get(key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch (error) {
            logger_1.default.error("Error parsing JSON from Redis:", error);
            return null;
        }
    },
    exists: async (key) => {
        return (await redis.exists(key)) === 1;
    },
    expireAt: async (key, timestamp) => {
        await redis.expireat(key, timestamp);
    },
    ttl: async (key) => {
        return await redis.ttl(key);
    },
    incr: async (key) => {
        return await redis.incr(key);
    },
    incrWithExpire: async (key, ttl) => {
        const multi = redis.multi();
        multi.incr(key);
        multi.expire(key, ttl);
        const results = await multi.exec();
        return results[0][1];
    },
};
class RedisConnectionManager {
    constructor() {
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
    }
    static getInstance() {
        if (!RedisConnectionManager.instance) {
            RedisConnectionManager.instance = new RedisConnectionManager();
        }
        return RedisConnectionManager.instance;
    }
    async gracefulShutdown() {
        try {
            logger_1.default.info("Starting graceful Redis shutdown...");
            redis.disconnect();
            await new Promise((resolve) => setTimeout(resolve, 1000));
            logger_1.default.info("Redis graceful shutdown completed");
        }
        catch (error) {
            logger_1.default.error("Error during Redis graceful shutdown:", error);
        }
    }
    async reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger_1.default.error("Max Redis reconnection attempts reached");
            return;
        }
        this.reconnectAttempts++;
        logger_1.default.info(`Attempting Redis reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        try {
            await redis.connect();
            this.reconnectAttempts = 0;
            logger_1.default.info("Redis reconnection successful");
        }
        catch (error) {
            logger_1.default.error("Redis reconnection failed:", error);
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            setTimeout(() => this.reconnect(), delay);
        }
    }
    getConnectionStatus() {
        return redis.status;
    }
    isConnected() {
        return redis.status === "ready";
    }
}
exports.RedisConnectionManager = RedisConnectionManager;
const closeRedisConnection = async () => {
    try {
        const manager = RedisConnectionManager.getInstance();
        await manager.gracefulShutdown();
        logger_1.default.info("Redis connection closed");
    }
    catch (error) {
        logger_1.default.error("Error closing Redis connection:", error);
        throw error;
    }
};
exports.closeRedisConnection = closeRedisConnection;
exports.default = redis;
//# sourceMappingURL=redis.js.map