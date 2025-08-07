import { Request, Response, NextFunction } from "express";
import { redisUtils } from "../config/redis";
import { securityLogger } from "../utils/logger";

interface RateLimitInfo {
  totalHits: number;
  remainingPoints: number;
  msBeforeNext: number;
  totalHits24h?: number;
}

/**
 * Rate limiting middleware using Redis
 */
export const rateLimitMiddleware = (
  keyPrefix: string,
  maxRequests: number,
  windowSeconds: number,
  keyGenerator?: (req: Request) => string
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Generate rate limit key
      const defaultKey = req.ip || "unknown";
      const identifier = keyGenerator ? keyGenerator(req) : defaultKey;
      const key = `rate_limit:${keyPrefix}:${identifier}`;

      // Get current count
      const current = await redisUtils.get(key);
      const count = current ? parseInt(current) : 0;

      // Check if limit exceeded
      if (count >= maxRequests) {
        const ttl = await redisUtils.ttl(key);
        const resetTime =
          ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + windowSeconds * 1000;

        // Log rate limit violation
        securityLogger("RATE_LIMIT_EXCEEDED", {
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

      // Increment counter
      const newCount = await redisUtils.incrWithExpire(key, windowSeconds);
      const remaining = Math.max(0, maxRequests - newCount);

      // Set rate limit headers
      res.set({
        "X-RateLimit-Limit": maxRequests.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": new Date(
          Date.now() + windowSeconds * 1000
        ).toISOString(),
        "X-RateLimit-Window": windowSeconds.toString(),
      });

      // Warning when approaching limit
      if (remaining <= Math.ceil(maxRequests * 0.1)) {
        // 10% remaining
        securityLogger(
          "RATE_LIMIT_WARNING",
          {
            keyPrefix,
            identifier,
            currentCount: newCount,
            remaining,
            maxRequests,
            endpoint: req.path,
            method: req.method,
          },
          "warn"
        );
      }

      next();
    } catch (error) {
      // If Redis is down, allow the request but log the error
      securityLogger(
        "RATE_LIMIT_ERROR",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          keyPrefix,
          endpoint: req.path,
          method: req.method,
        },
        "error"
      );

      next();
    }
  };
};

/**
 * Advanced rate limiter with multiple windows and user-based limits
 */
export const advancedRateLimiter = (options: {
  keyPrefix: string;
  limits: Array<{ requests: number; windowSeconds: number }>;
  userMultiplier?: number; // Multiplier for authenticated users
  whitelistRoles?: string[];
}) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        keyPrefix,
        limits,
        userMultiplier = 1,
        whitelistRoles = [],
      } = options;

      // Check if user is whitelisted
      if (req.user && whitelistRoles.includes(req.user.role)) {
        return next();
      }

      const identifier = req.user?.id || req.ip || "unknown";
      const multiplier = req.user ? userMultiplier : 1;

      // Check each rate limit window
      for (const limit of limits) {
        const key = `rate_limit:${keyPrefix}:${limit.windowSeconds}:${identifier}`;
        const maxRequests = Math.ceil(limit.requests * multiplier);

        const current = await redisUtils.get(key);
        const count = current ? parseInt(current) : 0;

        if (count >= maxRequests) {
          const ttl = await redisUtils.ttl(key);
          const resetTime =
            ttl > 0
              ? Date.now() + ttl * 1000
              : Date.now() + limit.windowSeconds * 1000;

          securityLogger("ADVANCED_RATE_LIMIT_EXCEEDED", {
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

        // Increment counter for this window
        await redisUtils.incrWithExpire(key, limit.windowSeconds);
      }

      next();
    } catch (error) {
      securityLogger(
        "ADVANCED_RATE_LIMIT_ERROR",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          keyPrefix: options.keyPrefix,
          endpoint: req.path,
          method: req.method,
          userId: req.user?.id,
        },
        "error"
      );

      next();
    }
  };
};

/**
 * IP-based rate limiter
 */
export const ipRateLimiter = (maxRequests: number, windowSeconds: number) => {
  return rateLimitMiddleware(
    "ip",
    maxRequests,
    windowSeconds,
    (req) => req.ip || "unknown"
  );
};

/**
 * User-based rate limiter
 */
export const userRateLimiter = (maxRequests: number, windowSeconds: number) => {
  return rateLimitMiddleware("user", maxRequests, windowSeconds, (req) => {
    return req.user?.id || req.ip || "unknown";
  });
};

/**
 * Endpoint-specific rate limiter
 */
export const endpointRateLimiter = (
  maxRequests: number,
  windowSeconds: number
) => {
  return rateLimitMiddleware("endpoint", maxRequests, windowSeconds, (req) => {
    const identifier = req.user?.id || req.ip || "unknown";
    return `${identifier}:${req.method}:${req.path}`;
  });
};

/**
 * Global rate limiter for the entire API
 */
export const globalRateLimiter = advancedRateLimiter({
  keyPrefix: "global",
  limits: [
    { requests: 1000, windowSeconds: 60 }, // 1000 requests per minute
    { requests: 10000, windowSeconds: 3600 }, // 10000 requests per hour
  ],
  userMultiplier: 2, // Authenticated users get 2x the limit
  whitelistRoles: ["admin", "superadmin"],
});

export default rateLimitMiddleware;
