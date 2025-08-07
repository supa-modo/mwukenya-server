import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import logger, { securityLogger } from "../utils/logger";
import { config, isDevelopment } from "../config";

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error details
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

  if (error instanceof ApiError) {
    // Handle known API errors
    logger.warn("API Error:", errorDetails);

    // Log security-related errors
    if (error.statusCode === 401 || error.statusCode === 403) {
      securityLogger("AUTHENTICATION_ERROR", errorDetails);
    }

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
        ...(isDevelopment && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === "SequelizeValidationError") {
    // Handle Sequelize validation errors
    logger.warn("Sequelize Validation Error:", errorDetails);

    const validationErrors = (error as any).errors.map((err: any) => ({
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
        ...(isDevelopment && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === "SequelizeUniqueConstraintError") {
    // Handle Sequelize unique constraint errors
    logger.warn("Sequelize Unique Constraint Error:", errorDetails);

    const field = (error as any).errors[0]?.path || "field";
    const value = (error as any).errors[0]?.value;

    res.status(409).json({
      success: false,
      error: {
        code: "VAL_004",
        message: `${field} '${value}' already exists`,
        details: {
          field,
          value,
          constraint: (error as any).parent?.constraint,
        },
        ...(isDevelopment && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === "SequelizeForeignKeyConstraintError") {
    // Handle foreign key constraint errors
    logger.warn("Sequelize Foreign Key Constraint Error:", errorDetails);

    res.status(400).json({
      success: false,
      error: {
        code: "VAL_005",
        message: "Invalid relationship reference",
        details: {
          constraint: (error as any).parent?.constraint,
          table: (error as any).table,
        },
        ...(isDevelopment && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === "SequelizeConnectionError") {
    // Handle database connection errors
    logger.error("Database Connection Error:", errorDetails);

    res.status(503).json({
      success: false,
      error: {
        code: "SYS_001",
        message: "Database connection error",
        ...(isDevelopment && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === "JsonWebTokenError") {
    // Handle JWT errors
    logger.warn("JWT Error:", errorDetails);

    res.status(401).json({
      success: false,
      error: {
        code: "AUTH_003",
        message: "Invalid token",
        ...(isDevelopment && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === "TokenExpiredError") {
    // Handle expired JWT
    logger.warn("Token Expired Error:", errorDetails);

    res.status(401).json({
      success: false,
      error: {
        code: "AUTH_002",
        message: "Token expired",
        ...(isDevelopment && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === "MulterError") {
    // Handle file upload errors
    logger.warn("File Upload Error:", errorDetails);

    let message = "File upload error";
    let code = "FILE_003";

    if ((error as any).code === "LIMIT_FILE_SIZE") {
      message = "File size too large";
      code = "FILE_001";
    } else if ((error as any).code === "LIMIT_FILE_COUNT") {
      message = "Too many files";
      code = "FILE_002";
    }

    res.status(400).json({
      success: false,
      error: {
        code,
        message,
        details: {
          multerCode: (error as any).code,
          field: (error as any).field,
        },
        ...(isDevelopment && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
    });
  } else if (error.name === "SyntaxError" && "body" in error) {
    // Handle JSON parsing errors
    logger.warn("JSON Parsing Error:", errorDetails);

    res.status(400).json({
      success: false,
      error: {
        code: "VAL_002",
        message: "Invalid JSON format",
        ...(isDevelopment && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  } else {
    // Handle unknown errors
    logger.error("Unhandled Error:", errorDetails);

    // Send minimal error info in production
    res.status(500).json({
      success: false,
      error: {
        code: "SYS_005",
        message: isDevelopment ? error.message : "Internal server error",
        ...(isDevelopment && {
          stack: error.stack,
          details: errorDetails,
        }),
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * 404 handler for non-existent routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: "RES_001",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request timeout handler
 */
export const timeoutHandler = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

export default errorHandler;
