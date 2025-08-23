"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLogger = exports.performanceLogger = exports.securityLogger = exports.auditLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) {
        log += `\n${stack}`;
    }
    if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return log;
}));
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({
    format: "HH:mm:ss",
}), winston_1.default.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (stack) {
        log += `\n${stack}`;
    }
    return log;
}));
const logger = winston_1.default.createLogger({
    level: config_1.config.env === "production" ? "info" : "debug",
    format: logFormat,
    defaultMeta: {
        service: config_1.config.appName,
        env: config_1.config.env,
    },
    transports: [
        new winston_1.default.transports.Console({
            format: config_1.config.env === "production" ? logFormat : consoleFormat,
        }),
        new winston_1.default.transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston_1.default.transports.File({
            filename: "logs/combined.log",
            maxsize: 5242880,
            maxFiles: 5,
        }),
    ],
    exceptionHandlers: [
        new winston_1.default.transports.File({ filename: "logs/exceptions.log" }),
    ],
    rejectionHandlers: [
        new winston_1.default.transports.File({ filename: "logs/rejections.log" }),
    ],
});
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logsDir = path_1.default.join(process.cwd(), "logs");
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
const auditLogger = (action, userId, details) => {
    logger.info("AUDIT", {
        action,
        userId,
        details,
        timestamp: new Date().toISOString(),
    });
};
exports.auditLogger = auditLogger;
const securityLogger = (event, details, level = "warn") => {
    logger[level]("SECURITY", {
        event,
        details,
        timestamp: new Date().toISOString(),
    });
};
exports.securityLogger = securityLogger;
const performanceLogger = (operation, duration, details) => {
    logger.info("PERFORMANCE", {
        operation,
        duration,
        details,
        timestamp: new Date().toISOString(),
    });
};
exports.performanceLogger = performanceLogger;
const apiLogger = (method, url, statusCode, duration, userId, error) => {
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
    }
    else if (statusCode >= 400) {
        logger.warn("API_WARNING", logData);
    }
    else {
        logger.info("API_REQUEST", logData);
    }
};
exports.apiLogger = apiLogger;
exports.default = logger;
//# sourceMappingURL=logger.js.map