import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { config, validateConfig } from "./config";
import { testConnection } from "./config/database";
import { testRedisConnection } from "./config/redis";
import { initializeDatabase } from "./models";
import routes from "./routes";
import {
  errorHandler,
  notFoundHandler,
  timeoutHandler,
} from "./middleware/errorHandler";
import { globalRateLimiter } from "./middleware/rateLimiter";
import logger, { apiLogger } from "./utils/logger";

// Create Express application
const app: Application = express();

// Validate configuration on startup
try {
  validateConfig();
  logger.info("Configuration validated successfully");
} catch (error) {
  logger.error("Configuration validation failed:", error);
  process.exit(1);
}

// Trust proxy (important for rate limiting and IP detection)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
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
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // In development, allow all origins
      if (config.env === "development") {
        return callback(null, true);
      }

      // In production, check against allowed origins
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://mwukenya.vercel.app",
        "https://www.mwukenya.co.ke",
        "https://mwukenya.co.ke",
        "https://app.mwukenya.co.ke",
        // Add your production domains here
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400, // 24 hours
  })
);

// Compression middleware
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Request timeout middleware
app.use(timeoutHandler(30000)); // 30 seconds timeout

// Body parsing middleware
app.use(
  express.json({
    limit: "10mb",
    strict: true,
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// Request logging middleware
const morganFormat =
  config.env === "production"
    ? "combined"
    : ":method :url :status :response-time ms - :res[content-length]";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        // Parse Morgan log format and use our custom logger
        const parts = message.trim().split(" ");
        if (parts.length >= 3) {
          const method = parts[0];
          const url = parts[1];
          const status = parseInt(parts[2]);
          const responseTime = parseFloat(parts[3]) || 0;

          apiLogger(method, url, status, responseTime);
        }
      },
    },
  })
);

// Global rate limiting
app.use("/api", globalRateLimiter);

// Health check endpoint (before rate limiting)
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

// API routes
app.use(`/api/${config.apiVersion}`, routes);

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: "MWU Kenya Digital Platform API",
      version: process.env.npm_package_version || "1.0.0",
      environment: config.env,
      apiVersion: config.apiVersion,
      timestamp: new Date().toISOString(),
      endpoints: {
        health: "/health",
        api: `/api/${config.apiVersion}`,
        auth: `/api/${config.apiVersion}/auth`,
      },
    },
    message: "Welcome to MWU Kenya Digital Platform API",
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Set a timeout for forceful shutdown
  const forceShutdownTimeout = setTimeout(() => {
    logger.error("Forceful shutdown due to timeout");
    process.exit(1);
  }, 30000); // 30 seconds

  try {
    // Close database connections
    const { closeConnection } = await import("./config/database");
    const { closeRedisConnection } = await import("./config/redis");

    await Promise.all([closeConnection(), closeRedisConnection()]);

    logger.info("Database connections closed");

    // Close HTTP server
    server.close(() => {
      logger.info("HTTP server closed");
      clearTimeout(forceShutdownTimeout);
      process.exit(0);
    });
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
};

// Initialize application
const initializeApp = async (): Promise<void> => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }

    // Test Redis connection
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      logger.warn(
        "Redis connection failed - some features may not work properly"
      );
    }

    // Initialize database models
    await initializeDatabase();
    logger.info("Database models initialized");

    logger.info("Application initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize application:", error);
    process.exit(1);
  }
};

// Start server
const server = app.listen(config.port, async () => {
  logger.info(`
🚀 MWU Kenya Digital Platform API is running!
📍 Environment: ${config.env}
🌐 Port: ${config.port}
📊 API Version: ${config.apiVersion}
🔗 Base URL: ${config.apiUrl}
📋 API Endpoints: ${config.apiUrl}/api/${config.apiVersion}
💚 Health Check: ${config.apiUrl}/health
  `);

  // Initialize application after server starts
  await initializeApp();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Close server gracefully
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception:", error);
  // Close server gracefully
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle process termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle Windows termination
if (process.platform === "win32") {
  const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("SIGINT", () => {
    process.emit("SIGINT" as any);
  });
}

export default app;
