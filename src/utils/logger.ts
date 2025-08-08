import winston from "winston";
import { config } from "../config";

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (stack) {
      log += `\n${stack}`;
    }

    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: "HH:mm:ss",
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.env === "production" ? "info" : "debug",
  format: logFormat,
  defaultMeta: {
    service: config.appName,
    env: config.env,
  },
  transports: [
    // Console transport - only one console transport
    new winston.transports.Console({
      format: config.env === "production" ? logFormat : consoleFormat,
    }),

    // File transport for errors
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" }),
  ],
});

// Create logs directory if it doesn't exist
import fs from "fs";
import path from "path";

const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Export logger with additional methods
export const auditLogger = (action: string, userId?: string, details?: any) => {
  logger.info("AUDIT", {
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const securityLogger = (
  event: string,
  details: any,
  level: "warn" | "error" = "warn"
) => {
  logger[level]("SECURITY", {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const performanceLogger = (
  operation: string,
  duration: number,
  details?: any
) => {
  logger.info("PERFORMANCE", {
    operation,
    duration,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const apiLogger = (
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  userId?: string,
  error?: any
) => {
  const logData = {
    method,
    url,
    statusCode,
    duration,
    userId,
    timestamp: new Date().toISOString(),
  };

  if (error) {
    logger.error("API_ERROR", { ...logData, error: error.message || error });
  } else if (statusCode >= 400) {
    logger.warn("API_WARNING", logData);
  } else {
    logger.info("API_REQUEST", logData);
  }
};

export default logger;
