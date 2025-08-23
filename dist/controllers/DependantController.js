"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependantController = void 0;
const dependant_service_1 = require("../services/dependant.service");
const logger_1 = __importDefault(require("../utils/logger"));
class DependantController {
    static async createDependant(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const dependantData = req.body;
            const result = await dependant_service_1.DependantService.createDependant(dependantData, userId);
            if (!result.success) {
                return res.status(result.error?.statusCode || 500).json({
                    success: false,
                    message: result.error?.message || "Failed to create dependant",
                    error: result.error,
                });
            }
            return res.status(201).json({
                success: true,
                message: "Dependant created successfully",
                data: result.data,
            });
        }
        catch (error) {
            logger_1.default.error("Error in createDependant controller:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    static async getUserDependants(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const includeDocuments = req.query.includeDocuments === "true";
            const result = await dependant_service_1.DependantService.getUserDependants(userId, includeDocuments);
            if (!result.success) {
                return res.status(result.error?.statusCode || 500).json({
                    success: false,
                    message: result.error?.message || "Failed to fetch dependants",
                    error: result.error,
                });
            }
            return res.status(200).json({
                success: true,
                message: "Dependants fetched successfully",
                data: result.data,
            });
        }
        catch (error) {
            logger_1.default.error("Error in getUserDependants controller:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    static async getDependantById(req, res) {
        try {
            const userId = req.user?.id;
            const { dependantId } = req.params;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const result = await dependant_service_1.DependantService.getDependantById(dependantId, userId);
            if (!result.success) {
                return res.status(result.error?.statusCode || 500).json({
                    success: false,
                    message: result.error?.message || "Failed to fetch dependant",
                    error: result.error,
                });
            }
            return res.status(200).json({
                success: true,
                message: "Dependant fetched successfully",
                data: result.data,
            });
        }
        catch (error) {
            logger_1.default.error("Error in getDependantById controller:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    static async updateDependant(req, res) {
        try {
            const userId = req.user?.id;
            const { dependantId } = req.params;
            const updateData = req.body;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const result = await dependant_service_1.DependantService.updateDependant(dependantId, userId, updateData);
            if (!result.success) {
                return res.status(result.error?.statusCode || 500).json({
                    success: false,
                    message: result.error?.message || "Failed to update dependant",
                    error: result.error,
                });
            }
            return res.status(200).json({
                success: true,
                message: "Dependant updated successfully",
                data: result.data,
            });
        }
        catch (error) {
            logger_1.default.error("Error in updateDependant controller:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    static async deleteDependant(req, res) {
        try {
            const userId = req.user?.id;
            const { dependantId } = req.params;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const result = await dependant_service_1.DependantService.deleteDependant(dependantId, userId);
            if (!result.success) {
                return res.status(result.error?.statusCode || 500).json({
                    success: false,
                    message: result.error?.message || "Failed to delete dependant",
                    error: result.error,
                });
            }
            return res.status(200).json({
                success: true,
                message: "Dependant deleted successfully",
            });
        }
        catch (error) {
            logger_1.default.error("Error in deleteDependant controller:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    static async getDependantStats(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const result = await dependant_service_1.DependantService.getDependantStats(userId);
            if (!result.success) {
                return res.status(result.error?.statusCode || 500).json({
                    success: false,
                    message: result.error?.message || "Failed to fetch dependant statistics",
                    error: result.error,
                });
            }
            return res.status(200).json({
                success: true,
                message: "Dependant statistics fetched successfully",
                data: result.data,
            });
        }
        catch (error) {
            logger_1.default.error("Error in getDependantStats controller:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    static async verifyDependant(req, res) {
        try {
            const verifiedBy = req.user?.id;
            const { dependantId } = req.params;
            if (!verifiedBy) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            if (!["admin", "delegate", "coordinator"].includes(req.user?.role || "")) {
                return res.status(403).json({
                    success: false,
                    message: "Insufficient permissions to verify dependants",
                });
            }
            const result = await dependant_service_1.DependantService.verifyDependant(dependantId, verifiedBy);
            if (!result.success) {
                return res.status(result.error?.statusCode || 500).json({
                    success: false,
                    message: result.error?.message || "Failed to verify dependant",
                    error: result.error,
                });
            }
            return res.status(200).json({
                success: true,
                message: "Dependant verified successfully",
                data: result.data,
            });
        }
        catch (error) {
            logger_1.default.error("Error in verifyDependant controller:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    static async getPendingVerificationDependants(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            if (!["admin", "delegate", "coordinator"].includes(req.user?.role || "")) {
                return res.status(403).json({
                    success: false,
                    message: "Insufficient permissions to view pending verification dependants",
                });
            }
            const result = await dependant_service_1.DependantService.getPendingVerificationDependants();
            if (!result.success) {
                return res.status(result.error?.statusCode || 500).json({
                    success: false,
                    message: result.error?.message ||
                        "Failed to fetch pending verification dependants",
                    error: result.error,
                });
            }
            return res.status(200).json({
                success: true,
                message: "Pending verification dependants fetched successfully",
                data: result.data,
            });
        }
        catch (error) {
            logger_1.default.error("Error in getPendingVerificationDependants controller:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
}
exports.DependantController = DependantController;
//# sourceMappingURL=DependantController.js.map