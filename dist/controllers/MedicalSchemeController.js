"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicalSchemeController = void 0;
const medicalScheme_service_1 = require("../services/medicalScheme.service");
const apiError_1 = require("../utils/apiError");
class MedicalSchemeController {
    constructor() {
        this.getAllSchemes = async (req, res) => {
            try {
                const { page = 1, limit = 10, search, coverageType, isActive, sortBy = "createdAt", sortOrder = "desc", } = req.query;
                const filters = {
                    search: search,
                    coverageType: coverageType,
                    isActive: isActive ? isActive === "true" : undefined,
                };
                const pagination = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    sortBy: sortBy,
                    sortOrder: sortOrder,
                };
                const result = await this.medicalSchemeService.getAllSchemes(filters, pagination);
                res.status(200).json({
                    success: true,
                    data: result,
                    message: "Medical schemes retrieved successfully",
                });
            }
            catch (error) {
                console.error("Error getting medical schemes:", error);
                if (error instanceof apiError_1.ApiError) {
                    res.status(error.statusCode).json({
                        success: false,
                        error: {
                            code: error.code,
                            message: error.message,
                        },
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        error: {
                            code: "MS_001",
                            message: "Failed to retrieve medical schemes",
                        },
                    });
                }
            }
        };
        this.getActiveSchemes = async (req, res) => {
            try {
                const schemes = await this.medicalSchemeService.getActiveSchemes();
                res.status(200).json({
                    success: true,
                    data: schemes,
                    message: "Active medical schemes retrieved successfully",
                });
            }
            catch (error) {
                console.error("Error getting active medical schemes:", error);
                res.status(500).json({
                    success: false,
                    error: {
                        code: "MS_002",
                        message: "Failed to retrieve active medical schemes",
                    },
                });
            }
        };
        this.getSchemeById = async (req, res) => {
            try {
                const { id } = req.params;
                const scheme = await this.medicalSchemeService.getSchemeById(id);
                if (!scheme) {
                    res.status(404).json({
                        success: false,
                        error: {
                            code: "MS_003",
                            message: "Medical scheme not found",
                        },
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: scheme,
                    message: "Medical scheme retrieved successfully",
                });
            }
            catch (error) {
                console.error("Error getting medical scheme by ID:", error);
                res.status(500).json({
                    success: false,
                    error: {
                        code: "MS_004",
                        message: "Failed to retrieve medical scheme",
                    },
                });
            }
        };
        this.createScheme = async (req, res) => {
            try {
                const schemeData = req.body;
                const scheme = await this.medicalSchemeService.createScheme(schemeData);
                res.status(201).json({
                    success: true,
                    data: scheme,
                    message: "Medical scheme created successfully",
                });
            }
            catch (error) {
                console.error("Error creating medical scheme:", error);
                if (error instanceof apiError_1.ApiError) {
                    res.status(error.statusCode).json({
                        success: false,
                        error: {
                            code: error.code,
                            message: error.message,
                        },
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        error: {
                            code: "MS_005",
                            message: "Failed to create medical scheme",
                        },
                    });
                }
            }
        };
        this.updateScheme = async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;
                const scheme = await this.medicalSchemeService.updateScheme(id, updateData);
                if (!scheme) {
                    res.status(404).json({
                        success: false,
                        error: {
                            code: "MS_006",
                            message: "Medical scheme not found",
                        },
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: scheme,
                    message: "Medical scheme updated successfully",
                });
            }
            catch (error) {
                console.error("Error updating medical scheme:", error);
                if (error instanceof apiError_1.ApiError) {
                    res.status(error.statusCode).json({
                        success: false,
                        error: {
                            code: error.code,
                            message: error.message,
                        },
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        error: {
                            code: "MS_007",
                            message: "Failed to update medical scheme",
                        },
                    });
                }
            }
        };
        this.deleteScheme = async (req, res) => {
            try {
                const { id } = req.params;
                const deleted = await this.medicalSchemeService.deleteScheme(id);
                if (!deleted) {
                    res.status(404).json({
                        success: false,
                        error: {
                            code: "MS_008",
                            message: "Medical scheme not found",
                        },
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: "Medical scheme deleted successfully",
                });
            }
            catch (error) {
                console.error("Error deleting medical scheme:", error);
                if (error instanceof apiError_1.ApiError) {
                    res.status(error.statusCode).json({
                        success: false,
                        error: {
                            code: error.code,
                            message: error.message,
                        },
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        error: {
                            code: "MS_009",
                            message: "Failed to delete medical scheme",
                        },
                    });
                }
            }
        };
        this.getSchemeSubscribers = async (req, res) => {
            try {
                const { id } = req.params;
                const { page = 1, limit = 10, status } = req.query;
                const pagination = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                };
                const filters = {
                    status: status,
                };
                const result = await this.medicalSchemeService.getSchemeSubscribers(id, filters, pagination);
                res.status(200).json({
                    success: true,
                    data: result,
                    message: "Scheme subscribers retrieved successfully",
                });
            }
            catch (error) {
                console.error("Error getting scheme subscribers:", error);
                res.status(500).json({
                    success: false,
                    error: {
                        code: "MS_010",
                        message: "Failed to retrieve scheme subscribers",
                    },
                });
            }
        };
        this.medicalSchemeService = new medicalScheme_service_1.MedicalSchemeService();
    }
}
exports.MedicalSchemeController = MedicalSchemeController;
//# sourceMappingURL=MedicalSchemeController.js.map