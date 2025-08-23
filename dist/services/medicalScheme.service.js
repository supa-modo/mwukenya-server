"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicalSchemeService = void 0;
const sequelize_1 = require("sequelize");
const MedicalScheme_1 = __importDefault(require("../models/MedicalScheme"));
const MemberSubscription_1 = __importDefault(require("../models/MemberSubscription"));
const apiError_1 = require("../utils/apiError");
class MedicalSchemeService {
    async getAllSchemes(filters, pagination) {
        try {
            const { page, limit, sortBy, sortOrder } = pagination;
            const offset = (page - 1) * limit;
            const whereClause = {};
            if (filters.isActive !== undefined) {
                whereClause.isActive = filters.isActive;
            }
            if (filters.coverageType) {
                whereClause.coverageType = filters.coverageType;
            }
            if (filters.search) {
                whereClause[sequelize_1.Op.or] = [
                    { name: { [sequelize_1.Op.iLike]: `%${filters.search}%` } },
                    { description: { [sequelize_1.Op.iLike]: `%${filters.search}%` } },
                    { code: { [sequelize_1.Op.iLike]: `%${filters.search}%` } },
                ];
            }
            const { rows: schemes, count: total } = await MedicalScheme_1.default.findAndCountAll({
                where: whereClause,
                limit,
                offset,
                order: [[sortBy, sortOrder.toUpperCase()]],
            });
            const totalPages = Math.ceil(total / limit);
            return {
                schemes,
                total,
                totalPages,
                currentPage: page,
            };
        }
        catch (error) {
            console.error("Error getting all medical schemes:", error);
            throw new apiError_1.ApiError("Failed to retrieve medical schemes", "MS_SERVICE_001", 500);
        }
    }
    async getActiveSchemes() {
        try {
            const schemes = await MedicalScheme_1.default.findActiveSchemes();
            return schemes;
        }
        catch (error) {
            console.error("Error getting active medical schemes:", error);
            throw new apiError_1.ApiError("Failed to retrieve active medical schemes", "MS_SERVICE_002", 500);
        }
    }
    async getSchemeById(id) {
        try {
            const scheme = await MedicalScheme_1.default.findByPk(id);
            return scheme;
        }
        catch (error) {
            console.error("Error getting medical scheme by ID:", error);
            throw new apiError_1.ApiError("Failed to retrieve medical scheme", "MS_SERVICE_003", 500);
        }
    }
    async createScheme(schemeData) {
        try {
            if (!schemeData.name || !schemeData.code || !schemeData.dailyPremium) {
                throw new apiError_1.ApiError("Missing required fields", "MS_SERVICE_004", 400);
            }
            const existingScheme = await MedicalScheme_1.default.findOne({
                where: { code: schemeData.code },
            });
            if (existingScheme) {
                throw new apiError_1.ApiError("A scheme with this code already exists", "MS_SERVICE_005", 400);
            }
            const scheme = await MedicalScheme_1.default.create(schemeData);
            return scheme;
        }
        catch (error) {
            if (error instanceof apiError_1.ApiError) {
                throw error;
            }
            console.error("Error creating medical scheme:", error);
            throw new apiError_1.ApiError("Failed to create medical scheme", "MS_SERVICE_006", 500);
        }
    }
    async updateScheme(id, updateData) {
        try {
            const scheme = await MedicalScheme_1.default.findByPk(id);
            if (!scheme) {
                return null;
            }
            if (updateData.code && updateData.code !== scheme.code) {
                const existingScheme = await MedicalScheme_1.default.findOne({
                    where: {
                        code: updateData.code,
                        id: { [sequelize_1.Op.ne]: id },
                    },
                });
                if (existingScheme) {
                    throw new apiError_1.ApiError("A scheme with this code already exists", "MS_SERVICE_007", 400);
                }
            }
            await scheme.update(updateData);
            return scheme;
        }
        catch (error) {
            if (error instanceof apiError_1.ApiError) {
                throw error;
            }
            console.error("Error updating medical scheme:", error);
            throw new apiError_1.ApiError("Failed to update medical scheme", "MS_SERVICE_008", 500);
        }
    }
    async deleteScheme(id) {
        try {
            const scheme = await MedicalScheme_1.default.findByPk(id);
            if (!scheme) {
                return false;
            }
            const activeSubscriptions = await MemberSubscription_1.default.count({
                where: {
                    schemeId: id,
                    status: "active",
                },
            });
            if (activeSubscriptions > 0) {
                throw new apiError_1.ApiError("Cannot delete scheme with active subscriptions", "MS_SERVICE_009", 400);
            }
            await scheme.destroy();
            return true;
        }
        catch (error) {
            if (error instanceof apiError_1.ApiError) {
                throw error;
            }
            console.error("Error deleting medical scheme:", error);
            throw new apiError_1.ApiError("Failed to delete medical scheme", "MS_SERVICE_010", 500);
        }
    }
    async getSchemeSubscribers(schemeId, filters, pagination) {
        try {
            const { page, limit } = pagination;
            const offset = (page - 1) * limit;
            const whereClause = {
                schemeId: schemeId,
            };
            if (filters.status) {
                whereClause.status = filters.status;
            }
            const { rows: subscribers, count: total } = await MemberSubscription_1.default.findAndCountAll({
                where: whereClause,
                limit,
                offset,
                order: [["createdAt", "DESC"]],
                include: [
                    {
                        model: MedicalScheme_1.default,
                        as: "scheme",
                        attributes: ["id", "name", "code"],
                    },
                ],
            });
            const totalPages = Math.ceil(total / limit);
            return {
                subscribers,
                total,
                totalPages,
                currentPage: page,
            };
        }
        catch (error) {
            console.error("Error getting scheme subscribers:", error);
            throw new apiError_1.ApiError("Failed to retrieve scheme subscribers", "MS_SERVICE_011", 500);
        }
    }
    async validateSchemeData(schemeData) {
        const errors = [];
        if (!schemeData.name || schemeData.name.trim().length === 0) {
            errors.push("Scheme name is required");
        }
        if (!schemeData.code || schemeData.code.trim().length === 0) {
            errors.push("Scheme code is required");
        }
        if (!schemeData.dailyPremium || schemeData.dailyPremium <= 0) {
            errors.push("Daily premium must be greater than 0");
        }
        if (!schemeData.coverageType) {
            errors.push("Coverage type is required");
        }
        if ("maxDependents" in schemeData &&
            typeof schemeData.maxDependents === "number" &&
            schemeData.maxDependents < 0) {
            errors.push("Max dependents cannot be negative");
        }
        if (errors.length > 0) {
            throw new apiError_1.ApiError(errors.join(", "), "MS_SERVICE_VALIDATION", 400);
        }
    }
}
exports.MedicalSchemeService = MedicalSchemeService;
//# sourceMappingURL=medicalScheme.service.js.map