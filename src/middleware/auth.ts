import { Request, Response, NextFunction } from "express";
import { JWTUtils } from "../utils/jwt";
import { User } from "../models";
import { UserRole, AuthenticatedRequest } from "../types";
import { ApiError } from "../utils/apiError";
import { securityLogger } from "../utils/logger";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        sessionId: string;
      };
    }
  }
}

/**
 * Authentication middleware
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw new ApiError("Authentication required", "AUTH_001", 401);
    }

    const decoded = await JWTUtils.verifyAccessToken(token);

    if (!decoded) {
      throw new ApiError("Invalid or expired token", "AUTH_002", 401);
    }

    // Verify user still exists and is active
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      securityLogger("INACTIVE_USER_ACCESS_ATTEMPT", {
        userId: decoded.userId,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
      throw new ApiError("User account is inactive", "AUTH_005", 401);
    }

    // Update session activity
    await JWTUtils.updateSessionActivity(decoded.sessionId);

    // Add user to request
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    securityLogger(
      "AUTH_MIDDLEWARE_ERROR",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      },
      "error"
    );

    res.status(500).json({
      success: false,
      error: {
        code: "SYS_005",
        message: "Internal server error",
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Optional authentication middleware (for public endpoints that can benefit from user context)
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = await JWTUtils.verifyAccessToken(token);

      if (decoded) {
        const user = await User.findByPk(decoded.userId);

        if (user && user.isActive) {
          req.user = {
            id: decoded.userId,
            role: decoded.role,
            sessionId: decoded.sessionId,
          };

          await JWTUtils.updateSessionActivity(decoded.sessionId);
        }
      }
    }

    next();
  } catch (error) {
    // For optional auth, continue without user context if there's an error
    next();
  }
};

/**
 * Authorization middleware factory
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTH_001",
          message: "Authentication required",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      securityLogger("UNAUTHORIZED_ACCESS_ATTEMPT", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(403).json({
        success: false,
        error: {
          code: "AUTH_004",
          message: "Insufficient permissions",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

/**
 * Role-specific middleware shortcuts
 */
export const requireSuperAdmin = authorize([UserRole.SUPERADMIN]);
export const requireAdmin = authorize([UserRole.ADMIN, UserRole.SUPERADMIN]);
export const requireCoordinator = authorize([
  UserRole.COORDINATOR,
  UserRole.ADMIN,
  UserRole.SUPERADMIN,
]);
export const requireDelegate = authorize([
  UserRole.DELEGATE,
  UserRole.COORDINATOR,
  UserRole.ADMIN,
  UserRole.SUPERADMIN,
]);
export const requireMember = authorize([
  UserRole.MEMBER,
  UserRole.DELEGATE,
  UserRole.COORDINATOR,
  UserRole.ADMIN,
  UserRole.SUPERADMIN,
]);

/**
 * Self-access middleware (user can only access their own data)
 */
export const requireSelfAccess = (userIdParam: string = "userId") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTH_001",
          message: "Authentication required",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const targetUserId = req.params[userIdParam];

    // Admin and SuperAdmin can access any user's data
    if ([UserRole.ADMIN, UserRole.SUPERADMIN].includes(req.user.role)) {
      return next();
    }

    // Users can only access their own data
    if (req.user.id !== targetUserId) {
      securityLogger("UNAUTHORIZED_SELF_ACCESS_ATTEMPT", {
        userId: req.user.id,
        targetUserId,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(403).json({
        success: false,
        error: {
          code: "AUTH_004",
          message: "You can only access your own data",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

/**
 * Hierarchical access middleware (delegates can access their members, coordinators can access their delegates and their members)
 */
export const requireHierarchicalAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTH_001",
          message: "Authentication required",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const targetUserId = req.params.userId || req.params.memberId;

    // Admin and SuperAdmin can access any user's data
    if ([UserRole.ADMIN, UserRole.SUPERADMIN].includes(req.user.role)) {
      return next();
    }

    // Self-access is always allowed
    if (req.user.id === targetUserId) {
      return next();
    }

    // Check hierarchical access
    const targetUser = await User.findByPk(targetUserId);

    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: {
          code: "VAL_004",
          message: "User not found",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let hasAccess = false;

    if (req.user.role === UserRole.COORDINATOR) {
      // Coordinators can access their delegates and their delegates' members
      if (targetUser.coordinatorId === req.user.id) {
        hasAccess = true;
      } else if (targetUser.delegateId) {
        const delegate = await User.findByPk(targetUser.delegateId);
        if (delegate && delegate.coordinatorId === req.user.id) {
          hasAccess = true;
        }
      }
    } else if (req.user.role === UserRole.DELEGATE) {
      // Delegates can access their members
      if (targetUser.delegateId === req.user.id) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      securityLogger("UNAUTHORIZED_HIERARCHICAL_ACCESS_ATTEMPT", {
        userId: req.user.id,
        userRole: req.user.role,
        targetUserId,
        targetUserRole: targetUser.role,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(403).json({
        success: false,
        error: {
          code: "AUTH_004",
          message: "You do not have permission to access this user's data",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "SYS_005",
        message: "Internal server error",
      },
      timestamp: new Date().toISOString(),
    });
  }
};
