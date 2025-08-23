"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireHierarchicalAccess = exports.requireSelfAccess = exports.requireMember = exports.requireDelegate = exports.requireCoordinator = exports.requireAdmin = exports.requireSuperAdmin = exports.authorize = exports.optionalAuthenticate = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const models_1 = require("../models");
const types_1 = require("../types");
const apiError_1 = require("../utils/apiError");
const logger_1 = require("../utils/logger");
const authenticate = async (req, res, next) => {
    try {
        const token = jwt_1.JWTUtils.extractTokenFromHeader(req.headers.authorization);
        if (!token) {
            throw new apiError_1.ApiError("Authentication required", "AUTH_001", 401);
        }
        const decoded = await jwt_1.JWTUtils.verifyAccessToken(token);
        if (!decoded) {
            throw new apiError_1.ApiError("Invalid or expired token", "AUTH_002", 401);
        }
        const user = await models_1.User.findByPk(decoded.userId);
        if (!user || !user.isActive) {
            (0, logger_1.securityLogger)("INACTIVE_USER_ACCESS_ATTEMPT", {
                userId: decoded.userId,
                ip: req.ip,
                userAgent: req.get("User-Agent"),
            });
            throw new apiError_1.ApiError("User account is inactive", "AUTH_005", 401);
        }
        await jwt_1.JWTUtils.updateSessionActivity(decoded.sessionId);
        req.user = {
            id: decoded.userId,
            role: decoded.role,
            sessionId: decoded.sessionId,
        };
        next();
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
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
        (0, logger_1.securityLogger)("AUTH_MIDDLEWARE_ERROR", {
            error: error instanceof Error ? error.message : "Unknown error",
            ip: req.ip,
            userAgent: req.get("User-Agent"),
        }, "error");
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
exports.authenticate = authenticate;
const optionalAuthenticate = async (req, res, next) => {
    try {
        const token = jwt_1.JWTUtils.extractTokenFromHeader(req.headers.authorization);
        if (token) {
            const decoded = await jwt_1.JWTUtils.verifyAccessToken(token);
            if (decoded) {
                const user = await models_1.User.findByPk(decoded.userId);
                if (user && user.isActive) {
                    req.user = {
                        id: decoded.userId,
                        role: decoded.role,
                        sessionId: decoded.sessionId,
                    };
                    await jwt_1.JWTUtils.updateSessionActivity(decoded.sessionId);
                }
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
const authorize = (allowedRoles) => {
    return (req, res, next) => {
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
            (0, logger_1.securityLogger)("UNAUTHORIZED_ACCESS_ATTEMPT", {
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
exports.authorize = authorize;
exports.requireSuperAdmin = (0, exports.authorize)([types_1.UserRole.SUPERADMIN]);
exports.requireAdmin = (0, exports.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.SUPERADMIN]);
exports.requireCoordinator = (0, exports.authorize)([
    types_1.UserRole.COORDINATOR,
    types_1.UserRole.ADMIN,
    types_1.UserRole.SUPERADMIN,
]);
exports.requireDelegate = (0, exports.authorize)([
    types_1.UserRole.DELEGATE,
    types_1.UserRole.COORDINATOR,
    types_1.UserRole.ADMIN,
    types_1.UserRole.SUPERADMIN,
]);
exports.requireMember = (0, exports.authorize)([
    types_1.UserRole.MEMBER,
    types_1.UserRole.DELEGATE,
    types_1.UserRole.COORDINATOR,
    types_1.UserRole.ADMIN,
    types_1.UserRole.SUPERADMIN,
]);
const requireSelfAccess = (userIdParam = "userId") => {
    return (req, res, next) => {
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
        if ([types_1.UserRole.ADMIN, types_1.UserRole.SUPERADMIN].includes(req.user.role)) {
            return next();
        }
        if (req.user.id !== targetUserId) {
            (0, logger_1.securityLogger)("UNAUTHORIZED_SELF_ACCESS_ATTEMPT", {
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
exports.requireSelfAccess = requireSelfAccess;
const requireHierarchicalAccess = async (req, res, next) => {
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
        if ([types_1.UserRole.ADMIN, types_1.UserRole.SUPERADMIN].includes(req.user.role)) {
            return next();
        }
        if (req.user.id === targetUserId) {
            return next();
        }
        const targetUser = await models_1.User.findByPk(targetUserId);
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
        if (req.user.role === types_1.UserRole.COORDINATOR) {
            if (targetUser.coordinatorId === req.user.id) {
                hasAccess = true;
            }
            else if (targetUser.delegateId) {
                const delegate = await models_1.User.findByPk(targetUser.delegateId);
                if (delegate && delegate.coordinatorId === req.user.id) {
                    hasAccess = true;
                }
            }
        }
        else if (req.user.role === types_1.UserRole.DELEGATE) {
            if (targetUser.delegateId === req.user.id) {
                hasAccess = true;
            }
        }
        if (!hasAccess) {
            (0, logger_1.securityLogger)("UNAUTHORIZED_HIERARCHICAL_ACCESS_ATTEMPT", {
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
    }
    catch (error) {
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
exports.requireHierarchicalAccess = requireHierarchicalAccess;
//# sourceMappingURL=auth.js.map