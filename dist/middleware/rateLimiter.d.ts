import { Request, Response, NextFunction } from "express";
export declare const rateLimitMiddleware: (keyPrefix: string, maxRequests: number, windowSeconds: number, keyGenerator?: (req: Request) => string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const advancedRateLimiter: (options: {
    keyPrefix: string;
    limits: Array<{
        requests: number;
        windowSeconds: number;
    }>;
    userMultiplier?: number;
    whitelistRoles?: string[];
}) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const ipRateLimiter: (maxRequests: number, windowSeconds: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const userRateLimiter: (maxRequests: number, windowSeconds: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const endpointRateLimiter: (maxRequests: number, windowSeconds: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const globalRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export default rateLimitMiddleware;
//# sourceMappingURL=rateLimiter.d.ts.map