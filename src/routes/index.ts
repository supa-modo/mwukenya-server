import { Router } from "express";
import authRoutes from "./auth";
import userRoutes from "./users";
// Import other route modules as they are created
// import medicalSchemeRoutes from './medicalSchemes';

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
// router.use('/medical-schemes', medicalSchemeRoutes);

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
