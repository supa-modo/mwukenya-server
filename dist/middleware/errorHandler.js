"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeoutHandler = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const apiError_1 = require("../utils/apiError");
const logger_1 = __importStar(require("../utils/logger"));
const config_1 = require("../config");
const errorHandler = (error, req, res, next) => {
    const errorDetails = {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        userId: req.user?.id,
        body: req.body,
        params: req.params,
        query: req.query,
    };
    if (error instanceof apiError_1.ApiError) {
        logger_1.default.warn("API Error:", errorDetails);
        if (error.statusCode === 401 || error.statusCode === 403) {
            (0, logger_1.securityLogger)("AUTHENTICATION_ERROR", errorDetails);
        }
        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
                ...(error.details && { details: error.details }),
                ...(config_1.isDevelopment && { stack: error.stack }),
            },
            timestamp: new Date().toISOString(),
        });
    }
    else if (error.name === "SequelizeValidationError") {
        logger_1.default.warn("Sequelize Validation Error:", errorDetails);
        const validationErrors = error.errors.map((err) => ({
            field: err.path,
            message: err.message,
            value: err.value,
        }));
        res.status(400).json({
            success: false,
            error: {
                code: "VAL_001",
                message: "Validation failed",
                details: { validationErrors },
                ...(config_1.isDevelopment && { stack: error.stack }),
            },
            timestamp: new Date().toISOString(),
        });
    }
    else if (error.name === "SequelizeUniqueConstraintError") {
        logger_1.default.warn("Sequelize Unique Constraint Error:", errorDetails);
        const field = error.errors[0]?.path || "field";
        const value = error.errors[0]?.value;
        res.status(409).json({
            success: false,
            error: {
                code: "VAL_004",
                message: `${field} '${value}' already exists`,
                details: {
                    field,
                    value,
                    constraint: error.parent?.constraint,
                },
                ...(config_1.isDevelopment && { stack: error.stack }),
            },
            timestamp: new Date().toISOString(),
        });
    }
    else if (error.name === "SequelizeForeignKeyConstraintError") {
        logger_1.default.warn("Sequelize Foreign Key Constraint Error:", errorDetails);
        res.status(400).json({
            success: false,
            error: {
                code: "VAL_005",
                message: "Invalid relationship reference",
                details: {
                    constraint: error.parent?.constraint,
                    table: error.table,
                },
                ...(config_1.isDevelopment && { stack: error.stack }),
            },
            timestamp: new Date().toISOString(),
        });
    }
    else if (error.name === "SequelizeConnectionError") {
        logger_1.default.error("Database Connection Error:", errorDetails);
        res.status(503).json({
            success: false,
            error: {
                code: "SYS_001",
                message: "Database connection error",
                ...(config_1.isDevelopment && { details: error.message }),
            },
            timestamp: new Date().toISOString(),
        });
    }
    else if (error.name === "JsonWebTokenError") {
        logger_1.default.warn("JWT Error:", errorDetails);
        res.status(401).json({
            success: false,
            error: {
                code: "AUTH_003",
                message: "Invalid token",
                ...(config_1.isDevelopment && { details: error.message }),
            },
            timestamp: new Date().toISOString(),
        });
    }
    else if (error.name === "TokenExpiredError") {
        logger_1.default.warn("Token Expired Error:", errorDetails);
        res.status(401).json({
            success: false,
            error: {
                code: "AUTH_002",
                message: "Token expired",
                ...(config_1.isDevelopment && { details: error.message }),
            },
            timestamp: new Date().toISOString(),
        });
    }
    else if (error.name === "MulterError") {
        logger_1.default.warn("File Upload Error:", errorDetails);
        let message = "File upload error";
        let code = "FILE_003";
        if (error.code === "LIMIT_FILE_SIZE") {
            message = "File size too large";
            code = "FILE_001";
        }
        else if (error.code === "LIMIT_FILE_COUNT") {
            message = "Too many files";
            code = "FILE_002";
        }
        res.status(400).json({
            success: false,
            error: {
                code,
                message,
                details: {
                    multerCode: error.code,
                    field: error.field,
                },
                ...(config_1.isDevelopment && { stack: error.stack }),
            },
            timestamp: new Date().toISOString(),
        });
    }
    else if (error.name === "SyntaxError" && "body" in error) {
        logger_1.default.warn("JSON Parsing Error:", errorDetails);
        res.status(400).json({
            success: false,
            error: {
                code: "VAL_002",
                message: "Invalid JSON format",
                ...(config_1.isDevelopment && { details: error.message }),
            },
            timestamp: new Date().toISOString(),
        });
    }
    else {
        logger_1.default.error("Unhandled Error:", errorDetails);
        res.status(500).json({
            success: false,
            error: {
                code: "SYS_005",
                message: config_1.isDevelopment ? error.message : "Internal server error",
                ...(config_1.isDevelopment && {
                    stack: error.stack,
                    details: errorDetails,
                }),
            },
            timestamp: new Date().toISOString(),
        });
    }
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: "RES_001",
            message: `Route ${req.method} ${req.originalUrl} not found`,
        },
        timestamp: new Date().toISOString(),
    });
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const timeoutHandler = (timeout = 30000) => {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    error: {
                        code: "SYS_006",
                        message: "Request timeout",
                    },
                    timestamp: new Date().toISOString(),
                });
            }
        }, timeout);
        res.on("finish", () => {
            clearTimeout(timer);
        });
        res.on("close", () => {
            clearTimeout(timer);
        });
        next();
    };
};
exports.timeoutHandler = timeoutHandler;
exports.default = exports.errorHandler;
//# sourceMappingURL=errorHandler.js.map