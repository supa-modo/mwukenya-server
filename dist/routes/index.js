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
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const users_1 = __importDefault(require("./users"));
const admin_1 = __importDefault(require("./admin"));
const documents_1 = __importDefault(require("./documents"));
const medicalSchemes_1 = __importDefault(require("./medicalSchemes"));
const subscriptions_1 = __importDefault(require("./subscriptions"));
const dependants_1 = __importDefault(require("./dependants"));
const contact_1 = __importDefault(require("./contact"));
const router = (0, express_1.Router)();
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
router.get("/health/redis", async (req, res) => {
    try {
        const { checkRedisHealth, RedisConnectionManager } = await Promise.resolve().then(() => __importStar(require("../config/redis")));
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
    }
    catch (error) {
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
router.get("/info", (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            name: "MWU Kenya Digital Platform API",
            version: process.env.npm_package_version || "1.0.0",
            environment: process.env.NODE_ENV || "development",
            apiVersion: "v1",
            timestamp: new Date().toISOString(),
            documentation: "/api/v1/docs",
        },
    });
});
router.use("/auth", auth_1.default);
router.use("/users", users_1.default);
router.use("/admin", admin_1.default);
router.use("/documents", documents_1.default);
router.use("/medical-schemes", medicalSchemes_1.default);
router.use("/subscriptions", subscriptions_1.default);
router.use("/dependants", dependants_1.default);
router.use("/contact", contact_1.default);
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
exports.default = router;
//# sourceMappingURL=index.js.map