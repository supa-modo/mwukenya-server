"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberSubscriptionService = void 0;
const sequelize_1 = require("sequelize");
const MemberSubscription_1 = __importDefault(require("../models/MemberSubscription"));
const MedicalScheme_1 = __importDefault(require("../models/MedicalScheme"));
const User_1 = __importDefault(require("../models/User"));
const apiError_1 = require("../utils/apiError");
class MemberSubscriptionService {
    async getUserSubscription(userId) {
        try {
            const subscription = await MemberSubscription_1.default.findOne({
                where: {
                    userId,
                    status: "active",
                },
                include: [
                    {
                        model: MedicalScheme_1.default,
                        as: "scheme",
                    },
                    {
                        model: User_1.default,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email", "phoneNumber"],
                    },
                ],
                order: [["createdAt", "DESC"]],
            });
            return subscription;
        }
        catch (error) {
            console.error("Error getting user subscription:", error);
            throw new apiError_1.ApiError("Failed to retrieve user subscription", "MSUB_001", 500);
        }
    }
    async createSubscription(data) {
        try {
            const existingSubscription = await this.getUserSubscription(data.userId);
            if (existingSubscription) {
                throw new apiError_1.ApiError("User already has an active subscription", "MSUB_002", 400);
            }
            const scheme = await MedicalScheme_1.default.findOne({
                where: {
                    id: data.schemeId,
                    isActive: true,
                },
            });
            if (!scheme) {
                throw new apiError_1.ApiError("Medical scheme not found or inactive", "MSUB_003", 404);
            }
            const subscription = await MemberSubscription_1.default.create({
                userId: data.userId,
                schemeId: data.schemeId,
                status: "active",
                effectiveDate: new Date(),
                subscriptionDate: new Date(),
            });
            const fullSubscription = await MemberSubscription_1.default.findByPk(subscription.id, {
                include: [
                    {
                        model: MedicalScheme_1.default,
                        as: "scheme",
                    },
                    {
                        model: User_1.default,
                        as: "user",
                        attributes: [
                            "id",
                            "firstName",
                            "lastName",
                            "email",
                            "phoneNumber",
                        ],
                    },
                ],
            });
            if (!fullSubscription) {
                throw new apiError_1.ApiError("Failed to retrieve created subscription", "MSUB_004", 500);
            }
            return fullSubscription;
        }
        catch (error) {
            if (error instanceof apiError_1.ApiError) {
                throw error;
            }
            console.error("Error creating subscription:", error);
            throw new apiError_1.ApiError("Failed to create subscription", "MSUB_005", 500);
        }
    }
    async changeScheme(userId, newSchemeId) {
        try {
            const currentSubscription = await this.getUserSubscription(userId);
            if (!currentSubscription) {
                throw new apiError_1.ApiError("No active subscription found", "MSUB_006", 404);
            }
            const newScheme = await MedicalScheme_1.default.findOne({
                where: {
                    id: newSchemeId,
                    isActive: true,
                },
            });
            if (!newScheme) {
                throw new apiError_1.ApiError("New medical scheme not found or inactive", "MSUB_007", 404);
            }
            if (currentSubscription.schemeId === newSchemeId) {
                throw new apiError_1.ApiError("User is already subscribed to this scheme", "MSUB_008", 400);
            }
            await currentSubscription.update({
                schemeId: newSchemeId,
                effectiveDate: new Date(),
                updatedAt: new Date(),
            });
            const updatedSubscription = await MemberSubscription_1.default.findByPk(currentSubscription.id, {
                include: [
                    {
                        model: MedicalScheme_1.default,
                        as: "scheme",
                    },
                    {
                        model: User_1.default,
                        as: "user",
                        attributes: [
                            "id",
                            "firstName",
                            "lastName",
                            "email",
                            "phoneNumber",
                        ],
                    },
                ],
            });
            if (!updatedSubscription) {
                throw new apiError_1.ApiError("Failed to retrieve updated subscription", "MSUB_009", 500);
            }
            return updatedSubscription;
        }
        catch (error) {
            if (error instanceof apiError_1.ApiError) {
                throw error;
            }
            console.error("Error changing medical scheme:", error);
            throw new apiError_1.ApiError("Failed to change medical scheme", "MSUB_010", 500);
        }
    }
    async cancelSubscription(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription) {
                return false;
            }
            await subscription.update({
                status: "cancelled",
                endDate: new Date(),
                updatedAt: new Date(),
            });
            return true;
        }
        catch (error) {
            console.error("Error cancelling subscription:", error);
            throw new apiError_1.ApiError("Failed to cancel subscription", "MSUB_011", 500);
        }
    }
    async getAllSubscriptions(filters, pagination) {
        try {
            const { page, limit } = pagination;
            const offset = (page - 1) * limit;
            const whereClause = {};
            if (filters.status) {
                whereClause.status = filters.status;
            }
            if (filters.schemeId) {
                whereClause.schemeId = filters.schemeId;
            }
            const includeClause = [
                {
                    model: MedicalScheme_1.default,
                    as: "scheme",
                },
                {
                    model: User_1.default,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "phoneNumber"],
                },
            ];
            if (filters.search) {
                includeClause[1].where = {
                    [sequelize_1.Op.or]: [
                        { firstName: { [sequelize_1.Op.iLike]: `%${filters.search}%` } },
                        { lastName: { [sequelize_1.Op.iLike]: `%${filters.search}%` } },
                        { email: { [sequelize_1.Op.iLike]: `%${filters.search}%` } },
                    ],
                };
            }
            const { rows: subscriptions, count: total } = await MemberSubscription_1.default.findAndCountAll({
                where: whereClause,
                include: includeClause,
                limit,
                offset,
                order: [["createdAt", "DESC"]],
                distinct: true,
            });
            const totalPages = Math.ceil(total / limit);
            return {
                subscriptions,
                total,
                totalPages,
                currentPage: page,
            };
        }
        catch (error) {
            console.error("Error getting all subscriptions:", error);
            throw new apiError_1.ApiError("Failed to retrieve subscriptions", "MSUB_012", 500);
        }
    }
    async getSubscriptionById(id) {
        try {
            const subscription = await MemberSubscription_1.default.findByPk(id, {
                include: [
                    {
                        model: MedicalScheme_1.default,
                        as: "scheme",
                    },
                    {
                        model: User_1.default,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email", "phoneNumber"],
                    },
                ],
            });
            return subscription;
        }
        catch (error) {
            console.error("Error getting subscription by ID:", error);
            throw new apiError_1.ApiError("Failed to retrieve subscription", "MSUB_013", 500);
        }
    }
    async updateSubscriptionStatus(id, status) {
        try {
            const subscription = await MemberSubscription_1.default.findByPk(id);
            if (!subscription) {
                return null;
            }
            const updateData = {
                status,
                updatedAt: new Date(),
            };
            if (status === "cancelled") {
                updateData.endDate = new Date();
            }
            await subscription.update(updateData);
            const updatedSubscription = await MemberSubscription_1.default.findByPk(id, {
                include: [
                    {
                        model: MedicalScheme_1.default,
                        as: "scheme",
                    },
                    {
                        model: User_1.default,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email", "phoneNumber"],
                    },
                ],
            });
            return updatedSubscription;
        }
        catch (error) {
            console.error("Error updating subscription status:", error);
            throw new apiError_1.ApiError("Failed to update subscription status", "MSUB_014", 500);
        }
    }
    async getSubscriptionStats() {
        try {
            const [totalSubscriptions, activeSubscriptions, suspendedSubscriptions, cancelledSubscriptions,] = await Promise.all([
                MemberSubscription_1.default.count(),
                MemberSubscription_1.default.count({ where: { status: "active" } }),
                MemberSubscription_1.default.count({ where: { status: "suspended" } }),
                MemberSubscription_1.default.count({ where: { status: "cancelled" } }),
            ]);
            const subscriptionsByScheme = await MemberSubscription_1.default.findAll({
                attributes: [
                    "schemeId",
                    [
                        MemberSubscription_1.default.sequelize.fn("COUNT", MemberSubscription_1.default.sequelize.col("MemberSubscription.id")),
                        "count",
                    ],
                ],
                include: [
                    {
                        model: MedicalScheme_1.default,
                        as: "scheme",
                        attributes: ["name"],
                    },
                ],
                group: ["schemeId", "scheme.id", "scheme.name"],
                raw: false,
            });
            const formattedSchemeStats = subscriptionsByScheme.map((item) => ({
                schemeId: item.schemeId,
                schemeName: item.scheme?.name || "Unknown",
                count: parseInt(item.dataValues.count),
            }));
            return {
                totalSubscriptions,
                activeSubscriptions,
                suspendedSubscriptions,
                cancelledSubscriptions,
                subscriptionsByScheme: formattedSchemeStats,
            };
        }
        catch (error) {
            console.error("Error getting subscription stats:", error);
            throw new apiError_1.ApiError("Failed to retrieve subscription statistics", "MSUB_015", 500);
        }
    }
}
exports.MemberSubscriptionService = MemberSubscriptionService;
//# sourceMappingURL=memberSubscription.service.js.map