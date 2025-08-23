import Redis from "ioredis";
declare const redis: Redis;
export declare const checkRedisHealth: () => Promise<boolean>;
export declare const testRedisConnection: () => Promise<boolean>;
export { redis };
export declare const redisUtils: {
    setex: (key: string, value: string, ttl: number) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    del: (key: string) => Promise<number>;
    setJSON: (key: string, value: any, ttl?: number) => Promise<void>;
    getJSON: <T>(key: string) => Promise<T | null>;
    exists: (key: string) => Promise<boolean>;
    expireAt: (key: string, timestamp: number) => Promise<void>;
    ttl: (key: string) => Promise<number>;
    incr: (key: string) => Promise<number>;
    incrWithExpire: (key: string, ttl: number) => Promise<number>;
};
export declare class RedisConnectionManager {
    private static instance;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    static getInstance(): RedisConnectionManager;
    gracefulShutdown(): Promise<void>;
    reconnect(): Promise<void>;
    getConnectionStatus(): string;
    isConnected(): boolean;
}
export declare const closeRedisConnection: () => Promise<void>;
export default redis;
//# sourceMappingURL=redis.d.ts.map