"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalRateLimiter = exports.endpointRateLimiter = exports.userRateLimiter = exports.ipRateLimiter = exports.advancedRateLimiter = exports.rateLimitMiddleware = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
const rateLimitMiddleware = (keyPrefix, maxRequests, windowSeconds, keyGenerator) => {
    return async (req, res, next) => {
        try {
            const defaultKey = req.ip || "unknown";
            const identifier = keyGenerator ? keyGenerator(req) : defaultKey;
            const key = `rate_limit:${keyPrefix}:${identifier}`;
            const current = await redis_1.redisUtils.get(key);
            const count = current ? parseInt(current) : 0;
            if (count >= maxRequests) {
                const ttl = await redis_1.redisUtils.ttl(key);
                const resetTime = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + windowSeconds * 1000;
                (0, logger_1.securityLogger)("RATE_LIMIT_EXCEEDED", {
                    keyPrefix,
                    identifier,
                    currentCount: count,
                    maxRequests,
                    windowSeconds,
                    endpoint: req.path,
                    method: req.method,
                    userAgent: req.get("User-Agent"),
                });
                res.status(429).json({
                    success: false,
                    error: {
                        code: "SYS_003",
                        message: "Rate limit exceeded. Please try again later.",
                        details: {
                            limit: maxRequests,
                            windowSeconds,
                            resetTime: new Date(resetTime).toISOString(),
                        },
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const newCount = await redis_1.redisUtils.incrWithExpire(key, windowSeconds);
            const remaining = Math.max(0, maxRequests - newCount);
            res.set({
                "X-RateLimit-Limit": maxRequests.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": new Date(Date.now() + windowSeconds * 1000).toISOString(),
                "X-RateLimit-Window": windowSeconds.toString(),
            });
            if (remaining <= Math.ceil(maxRequests * 0.1)) {
                (0, logger_1.securityLogger)("RATE_LIMIT_WARNING", {
                    keyPrefix,
                    identifier,
                    currentCount: newCount,
                    remaining,
                    maxRequests,
                    endpoint: req.path,
                    method: req.method,
                }, "warn");
            }
            next();
        }
        catch (error) {
            (0, logger_1.securityLogger)("RATE_LIMIT_ERROR", {
                error: error instanceof Error ? error.message : "Unknown error",
                keyPrefix,
                endpoint: req.path,
                method: req.method,
            }, "error");
            next();
        }
    };
};
exports.rateLimitMiddleware = rateLimitMiddleware;
const advancedRateLimiter = (options) => {
    return async (req, res, next) => {
        try {
            const { keyPrefix, limits, userMultiplier = 1, whitelistRoles = [], } = options;
            if (req.user && whitelistRoles.includes(req.user.role)) {
                return next();
            }
            const identifier = req.user?.id || req.ip || "unknown";
            const multiplier = req.user ? userMultiplier : 1;
            for (const limit of limits) {
                const key = `rate_limit:${keyPrefix}:${limit.windowSeconds}:${identifier}`;
                const maxRequests = Math.ceil(limit.requests * multiplier);
                const current = await redis_1.redisUtils.get(key);
                const count = current ? parseInt(current) : 0;
                if (count >= maxRequests) {
                    const ttl = await redis_1.redisUtils.ttl(key);
                    const resetTime = ttl > 0
                        ? Date.now() + ttl * 1000
                        : Date.now() + limit.windowSeconds * 1000;
                    (0, logger_1.securityLogger)("ADVANCED_RATE_LIMIT_EXCEEDED", {
                        keyPrefix,
                        identifier,
                        windowSeconds: limit.windowSeconds,
                        currentCount: count,
                        maxRequests,
                        endpoint: req.path,
                        method: req.method,
                        userId: req.user?.id,
                    });
                    res.status(429).json({
                        success: false,
                        error: {
                            code: "SYS_003",
                            message: `Rate limit exceeded for ${limit.windowSeconds}s window. Please try again later.`,
                            details: {
                                limit: maxRequests,
                                windowSeconds: limit.windowSeconds,
                                resetTime: new Date(resetTime).toISOString(),
                            },
                        },
                        timestamp: new Date().toISOString(),
                    });
                    return;
                }
                await redis_1.redisUtils.incrWithExpire(key, limit.windowSeconds);
            }
            next();
        }
        catch (error) {
            (0, logger_1.securityLogger)("ADVANCED_RATE_LIMIT_ERROR", {
                error: error instanceof Error ? error.message : "Unknown error",
                keyPrefix: options.keyPrefix,
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
            }, "error");
            next();
        }
    };
};
exports.advancedRateLimiter = advancedRateLimiter;
const ipRateLimiter = (maxRequests, windowSeconds) => {
    return (0, exports.rateLimitMiddleware)("ip", maxRequests, windowSeconds, (req) => req.ip || "unknown");
};
exports.ipRateLimiter = ipRateLimiter;
const userRateLimiter = (maxRequests, windowSeconds) => {
    return (0, exports.rateLimitMiddleware)("user", maxRequests, windowSeconds, (req) => {
        return req.user?.id || req.ip || "unknown";
    });
};
exports.userRateLimiter = userRateLimiter;
const endpointRateLimiter = (maxRequests, windowSeconds) => {
    return (0, exports.rateLimitMiddleware)("endpoint", maxRequests, windowSeconds, (req) => {
        const identifier = req.user?.id || req.ip || "unknown";
        return `${identifier}:${req.method}:${req.path}`;
    });
};
exports.endpointRateLimiter = endpointRateLimiter;
exports.globalRateLimiter = (0, exports.advancedRateLimiter)({
    keyPrefix: "global",
    limits: [
        { requests: 1000, windowSeconds: 60 },
        { requests: 10000, windowSeconds: 3600 },
    ],
    userMultiplier: 2,
    whitelistRoles: ["admin", "superadmin"],
});
exports.default = exports.rateLimitMiddleware;
//# sourceMappingURL=rateLimiter.js.map