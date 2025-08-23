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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("./config");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const models_1 = require("./models");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const logger_1 = __importStar(require("./utils/logger"));
const app = (0, express_1.default)();
try {
    (0, config_1.validateConfig)();
    logger_1.default.info("Configuration validated successfully");
}
catch (error) {
    logger_1.default.error("Configuration validation failed:", error);
    process.exit(1);
}
app.set("trust proxy", 1);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (config_1.config.env === "development") {
            return callback(null, true);
        }
        const allowedOrigins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "https://mwukenya.vercel.app",
            "https://www.mwukenya.co.ke",
            "https://mwukenya.co.ke",
            "https://app.mwukenya.co.ke",
            "https://mwukenya-production.up.railway.app",
        ];
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400,
}));
app.use((0, compression_1.default)({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers["x-no-compression"]) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
}));
app.use((0, errorHandler_1.timeoutHandler)(30000));
app.use(express_1.default.json({
    limit: "10mb",
    strict: true,
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: "10mb",
}));
const morganFormat = config_1.config.env === "production"
    ? "combined"
    : ":method :url :status :response-time ms - :res[content-length]";
app.use((0, morgan_1.default)(morganFormat, {
    stream: {
        write: (message) => {
            const parts = message.trim().split(" ");
            if (parts.length >= 3) {
                const method = parts[0];
                const url = parts[1];
                const status = parseInt(parts[2]);
                const responseTime = parseFloat(parts[3]) || 0;
                (0, logger_1.apiLogger)(method, url, status, responseTime);
            }
        },
    },
}));
app.use("/api", rateLimiter_1.globalRateLimiter);
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || "1.0.0",
        },
    });
});
app.use(`/api/${config_1.config.apiVersion}`, routes_1.default);
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            name: "MWU Kenya Digital Platform API",
            version: process.env.npm_package_version || "1.0.0",
            environment: config_1.config.env,
            apiVersion: config_1.config.apiVersion,
            timestamp: new Date().toISOString(),
            endpoints: {
                health: "/health",
                api: `/api/${config_1.config.apiVersion}`,
                auth: `/api/${config_1.config.apiVersion}/auth`,
            },
        },
        message: "Welcome to MWU Kenya Digital Platform API",
    });
});
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const gracefulShutdown = async (signal) => {
    logger_1.default.info(`Received ${signal}. Starting graceful shutdown...`);
    const forceShutdownTimeout = setTimeout(() => {
        logger_1.default.error("Forceful shutdown due to timeout");
        process.exit(1);
    }, 30000);
    try {
        const { closeConnection } = await Promise.resolve().then(() => __importStar(require("./config/database")));
        const { closeRedisConnection, RedisConnectionManager } = await Promise.resolve().then(() => __importStar(require("./config/redis")));
        const redisManager = RedisConnectionManager.getInstance();
        await Promise.all([closeConnection(), redisManager.gracefulShutdown()]);
        logger_1.default.info("Database connections closed");
        server.close(() => {
            logger_1.default.info("HTTP server closed");
            clearTimeout(forceShutdownTimeout);
            process.exit(0);
        });
    }
    catch (error) {
        logger_1.default.error("Error during graceful shutdown:", error);
        clearTimeout(forceShutdownTimeout);
        process.exit(1);
    }
};
const initializeApp = async () => {
    try {
        const dbConnected = await (0, database_1.testConnection)();
        if (!dbConnected) {
            throw new Error("Failed to connect to database");
        }
        const redisConnected = await (0, redis_1.testRedisConnection)();
        if (!redisConnected) {
            logger_1.default.warn("Redis connection failed - some features may not work properly");
        }
        await (0, models_1.initializeDatabase)();
        logger_1.default.info("Database models initialized");
        logger_1.default.info("Application initialized successfully");
    }
    catch (error) {
        logger_1.default.error("Failed to initialize application:", error);
        process.exit(1);
    }
};
const server = app.listen(config_1.config.port, async () => {
    logger_1.default.info(`
🚀 MWU Kenya Digital Platform API is running!
📍 Environment: ${config_1.config.env}
🌐 Port: ${config_1.config.port}
📊 API Version: ${config_1.config.apiVersion}
🔗 Base URL: ${config_1.config.apiUrl}
📋 API Endpoints: ${config_1.config.apiUrl}/api/${config_1.config.apiVersion}
💚 Health Check: ${config_1.config.apiUrl}/health
  `);
    console.log(`🚀 MWU Kenya Digital Platform API is running!
    📍 Environment: ${config_1.config.env}
    🌐 Port: ${config_1.config.port}
    📊 API Version: ${config_1.config.apiVersion}
    🔗 Base URL: ${config_1.config.apiUrl}
    📋 API Endpoints: ${config_1.config.apiUrl}/api/${config_1.config.apiVersion}
    💚 Health Check: ${config_1.config.apiUrl}/health
  `);
    await initializeApp();
});
process.on("unhandledRejection", (reason, promise) => {
    logger_1.default.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("UNHANDLED_REJECTION");
});
process.on("uncaughtException", (error) => {
    logger_1.default.error("Uncaught Exception:", error);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
});
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
if (process.platform === "win32") {
    const rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.on("SIGINT", () => {
        process.emit("SIGINT");
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map