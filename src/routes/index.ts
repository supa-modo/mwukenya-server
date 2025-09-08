import { Router } from "express";
import authRoutes from "./auth";
import userRoutes from "./users";
import adminRoutes from "./admin";
import documentRoutes from "./documents";
import medicalSchemeRoutes from "./medicalSchemes";
import subscriptionRoutes from "./subscriptions";
import dependantRoutes from "./dependants";
import contactRoutes from "./contact";
import paymentRoutes from "./payments";
import settlementRoutes from "./settlements";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    },
    message: "Service is running",
  });
});

// Redis health check endpoint
router.get("/health/redis", async (req, res) => {
  try {
    const { checkRedisHealth, RedisConnectionManager } = await import(
      "../config/redis"
    );

    const isHealthy = await checkRedisHealth();
    const redisManager = RedisConnectionManager.getInstance();
    const connectionStatus = redisManager.getConnectionStatus();

    res.status(200).json({
      success: true,
      data: {
        redis: {
          status: isHealthy ? "healthy" : "unhealthy",
          connectionStatus,
          isConnected: redisManager.isConnected(),
          timestamp: new Date().toISOString(),
        },
      },
      message: isHealthy ? "Redis is healthy" : "Redis health check failed",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "REDIS_001",
        message: "Failed to check Redis health",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// System info endpoint (no sensitive data)
router.get("/info", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: "MWU Kenya Digital Platform API",
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      apiVersion: "v1",
      timestamp: new Date().toISOString(),
      documentation: "/api/v1/docs", // Future API documentation endpoint
    },
  });
});

// Mount route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);
router.use("/documents", documentRoutes);
router.use("/medical-schemes", medicalSchemeRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/dependants", dependantRoutes);
router.use("/contact", contactRoutes);
router.use("/payments", paymentRoutes);
router.use("/settlements", settlementRoutes);

// 404 handler for API routes
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "RES_001",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
