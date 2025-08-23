"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependantService = void 0;
const Dependant_1 = __importDefault(require("../models/Dependant"));
const Document_1 = __importDefault(require("../models/Document"));
const User_1 = __importDefault(require("../models/User"));
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
class DependantService {
    static async createDependant(data, userId, transaction) {
        try {
            const user = await User_1.default.findByPk(userId);
            if (!user) {
                return {
                    success: false,
                    error: {
                        code: "USER_NOT_FOUND",
                        message: "User not found",
                        statusCode: 404,
                    },
                };
            }
            if (user.role !== "member") {
                return {
                    success: false,
                    error: {
                        code: "INVALID_USER_ROLE",
                        message: "Only members can add dependants",
                        statusCode: 403,
                    },
                };
            }
            const dependant = await Dependant_1.default.create({
                ...data,
                userId,
                status: types_1.DependantStatus.ACTIVE,
            }, { transaction });
            logger_1.default.info(`Dependant created: ${dependant.id} for user: ${userId}`);
            return {
                success: true,
                data: dependant.toJSON(),
            };
        }
        catch (error) {
            logger_1.default.error("Error creating dependant:", error);
            return {
                success: false,
                error: {
                    code: "DEPENDANT_CREATION_FAILED",
                    message: "Failed to create dependant",
                    statusCode: 500,
                    details: error,
                },
            };
        }
    }
    static async getUserDependants(userId, includeDocuments = false) {
        try {
            const options = {
                where: { userId },
                order: [["createdAt", "DESC"]],
            };
            if (includeDocuments) {
                options.include = [
                    {
                        model: Document_1.default,
                        as: "documents",
                        where: { entityType: "dependant" },
                        required: false,
                    },
                ];
            }
            const dependants = await Dependant_1.default.findAll(options);
            return {
                success: true,
                data: dependants.map((d) => d.toJSON()),
            };
        }
        catch (error) {
            logger_1.default.error("Error fetching user dependants:", error);
            return {
                success: false,
                error: {
                    code: "FETCH_DEPENDANTS_FAILED",
                    message: "Failed to fetch dependants",
                    statusCode: 500,
                    details: error,
                },
            };
        }
    }
    static async getDependantById(dependantId, userId) {
        try {
            const dependant = await Dependant_1.default.findOne({
                where: { id: dependantId, userId },
                include: [
                    {
                        model: User_1.default,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "phoneNumber"],
                    },
                ],
            });
            if (!dependant) {
                return {
                    success: false,
                    error: {
                        code: "DEP_002",
                        message: "Dependant not found",
                        statusCode: 404,
                    },
                };
            }
            const dependantData = dependant.toJSON();
            return {
                success: true,
                data: dependantData,
            };
        }
        catch (error) {
            logger_1.default.error("Error getting dependant by ID:", error);
            return {
                success: false,
                error: {
                    code: "DEP_003",
                    message: "Failed to get dependant",
                    details: error instanceof Error ? error.message : "Unknown error",
                },
            };
        }
    }
    static async updateDependant(dependantId, userId, data, transaction) {
        try {
            const dependant = await Dependant_1.default.findOne({
                where: { id: dependantId, userId },
            });
            if (!dependant) {
                return {
                    success: false,
                    error: {
                        code: "DEPENDANT_NOT_FOUND",
                        message: "Dependant not found",
                        statusCode: 404,
                    },
                };
            }
            await dependant.update(data, { transaction });
            logger_1.default.info(`Dependant updated: ${dependantId} by user: ${userId}`);
            return {
                success: true,
                data: dependant.toJSON(),
            };
        }
        catch (error) {
            logger_1.default.error("Error updating dependant:", error);
            return {
                success: false,
                error: {
                    code: "DEPENDANT_UPDATE_FAILED",
                    message: "Failed to update dependant",
                    statusCode: 500,
                    details: error,
                },
            };
        }
    }
    static async deleteDependant(dependantId, userId, transaction) {
        try {
            const dependant = await Dependant_1.default.findOne({
                where: { id: dependantId, userId },
            });
            if (!dependant) {
                return {
                    success: false,
                    error: {
                        code: "DEPENDANT_NOT_FOUND",
                        message: "Dependant not found",
                        statusCode: 404,
                    },
                };
            }
            await Document_1.default.destroy({
                where: { entityId: dependantId, entityType: "dependant" },
                transaction,
            });
            await dependant.destroy({ transaction });
            logger_1.default.info(`Dependant deleted: ${dependantId} by user: ${userId}`);
            return {
                success: true,
                data: true,
            };
        }
        catch (error) {
            logger_1.default.error("Error deleting dependant:", error);
            return {
                success: false,
                error: {
                    code: "DEPENDANT_DELETION_FAILED",
                    message: "Failed to delete dependant",
                    statusCode: 500,
                    details: error,
                },
            };
        }
    }
    static async verifyDependant(dependantId, verifiedBy, transaction) {
        try {
            const dependant = await Dependant_1.default.findByPk(dependantId);
            if (!dependant) {
                return {
                    success: false,
                    error: {
                        code: "DEPENDANT_NOT_FOUND",
                        message: "Dependant not found",
                        statusCode: 404,
                    },
                };
            }
            dependant.markAsVerified(verifiedBy);
            await dependant.save({ transaction });
            logger_1.default.info(`Dependant verified: ${dependantId} by: ${verifiedBy}`);
            return {
                success: true,
                data: dependant.toJSON(),
            };
        }
        catch (error) {
            logger_1.default.error("Error verifying dependant:", error);
            return {
                success: false,
                error: {
                    code: "DEPENDANT_VERIFICATION_FAILED",
                    message: "Failed to verify dependant",
                    statusCode: 500,
                    details: error,
                },
            };
        }
    }
    static async getPendingVerificationDependants() {
        try {
            const dependants = await Dependant_1.default.findPendingVerification();
            return {
                success: true,
                data: dependants.map((d) => d.toJSON()),
            };
        }
        catch (error) {
            logger_1.default.error("Error fetching pending verification dependants:", error);
            return {
                success: false,
                error: {
                    code: "FETCH_PENDING_DEPENDANTS_FAILED",
                    message: "Failed to fetch pending verification dependants",
                    statusCode: 500,
                    details: error,
                },
            };
        }
    }
    static async getDependantStats(userId) {
        try {
            const [total, active, verified, pending] = await Promise.all([
                Dependant_1.default.count({ where: { userId } }),
                Dependant_1.default.count({ where: { userId, status: types_1.DependantStatus.ACTIVE } }),
                Dependant_1.default.count({ where: { userId, isVerified: true } }),
                Dependant_1.default.count({ where: { userId, isVerified: false } }),
            ]);
            return {
                success: true,
                data: {
                    total,
                    active,
                    verified,
                    pending,
                },
            };
        }
        catch (error) {
            logger_1.default.error("Error fetching dependant stats:", error);
            return {
                success: false,
                error: {
                    code: "FETCH_DEPENDANT_STATS_FAILED",
                    message: "Failed to fetch dependant statistics",
                    statusCode: 500,
                    details: error,
                },
            };
        }
    }
}
exports.DependantService = DependantService;
//# sourceMappingURL=dependant.service.js.map