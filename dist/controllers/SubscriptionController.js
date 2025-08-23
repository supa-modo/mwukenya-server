"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
const memberSubscription_service_1 = require("../services/memberSubscription.service");
const apiError_1 = require("../utils/apiError");
class SubscriptionController {
    constructor() {
        this.getMySubscription = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        error: {
                            code: "SUB_001",
                            message: "User not authenticated",
                        },
                    });
                    return;
                }
                const subscription = await this.subscriptionService.getUserSubscription(userId);
                res.status(200).json({
                    success: true,
                    data: subscription,
                    message: subscription
                        ? "Subscription retrieved successfully"
                        : "No active subscription found",
                });
            }
            catch (error) {
                console.error("Error getting user subscription:", error);
                res.status(500).json({
                    success: false,
                    error: {
                        code: "SUB_002",
                        message: "Failed to retrieve subscription",
                    },
                });
            }
        };
        this.createSubscription = async (req, res) => {
            try {
                const userId = req.user?.id;
                const { schemeId } = req.body;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        error: {
                            code: "SUB_003",
                            message: "User not authenticated",
                        },
                    });
                    return;
                }
                if (!schemeId) {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: "SUB_004",
                            message: "Medical scheme ID is required",
                        },
                    });
                    return;
                }
                const subscription = await this.subscriptionService.createSubscription({
                    userId,
                    schemeId: schemeId,
                });
                res.status(201).json({
                    success: true,
                    data: subscription,
                    message: "Subscription created successfully",
                });
            }
            catch (error) {
                console.error("Error creating subscription:", error);
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
                            code: "SUB_005",
                            message: "Failed to create subscription",
                        },
                    });
                }
            }
        };
        this.changeScheme = async (req, res) => {
            try {
                const userId = req.user?.id;
                const { newSchemeId } = req.body;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        error: {
                            code: "SUB_006",
                            message: "User not authenticated",
                        },
                    });
                    return;
                }
                if (!newSchemeId) {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: "SUB_007",
                            message: "New medical scheme ID is required",
                        },
                    });
                    return;
                }
                const subscription = await this.subscriptionService.changeScheme(userId, newSchemeId);
                res.status(200).json({
                    success: true,
                    data: subscription,
                    message: "Medical scheme changed successfully",
                });
            }
            catch (error) {
                console.error("Error changing medical scheme:", error);
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
                            code: "SUB_008",
                            message: "Failed to change medical scheme",
                        },
                    });
                }
            }
        };
        this.cancelSubscription = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        error: {
                            code: "SUB_009",
                            message: "User not authenticated",
                        },
                    });
                    return;
                }
                const cancelled = await this.subscriptionService.cancelSubscription(userId);
                if (!cancelled) {
                    res.status(404).json({
                        success: false,
                        error: {
                            code: "SUB_010",
                            message: "No active subscription found to cancel",
                        },
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: "Subscription cancelled successfully",
                });
            }
            catch (error) {
                console.error("Error cancelling subscription:", error);
                res.status(500).json({
                    success: false,
                    error: {
                        code: "SUB_011",
                        message: "Failed to cancel subscription",
                    },
                });
            }
        };
        this.getAllSubscriptions = async (req, res) => {
            try {
                const { page = 1, limit = 10, status, schemeId, search } = req.query;
                const filters = {
                    status: status,
                    schemeId: schemeId,
                    search: search,
                };
                const pagination = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                };
                const result = await this.subscriptionService.getAllSubscriptions(filters, pagination);
                res.status(200).json({
                    success: true,
                    data: result,
                    message: "Subscriptions retrieved successfully",
                });
            }
            catch (error) {
                console.error("Error getting all subscriptions:", error);
                res.status(500).json({
                    success: false,
                    error: {
                        code: "SUB_012",
                        message: "Failed to retrieve subscriptions",
                    },
                });
            }
        };
        this.getSubscriptionById = async (req, res) => {
            try {
                const { id } = req.params;
                const subscription = await this.subscriptionService.getSubscriptionById(id);
                if (!subscription) {
                    res.status(404).json({
                        success: false,
                        error: {
                            code: "SUB_013",
                            message: "Subscription not found",
                        },
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: subscription,
                    message: "Subscription retrieved successfully",
                });
            }
            catch (error) {
                console.error("Error getting subscription by ID:", error);
                res.status(500).json({
                    success: false,
                    error: {
                        code: "SUB_014",
                        message: "Failed to retrieve subscription",
                    },
                });
            }
        };
        this.updateSubscriptionStatus = async (req, res) => {
            try {
                const { id } = req.params;
                const { status } = req.body;
                if (!status) {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: "SUB_015",
                            message: "Status is required",
                        },
                    });
                    return;
                }
                const subscription = await this.subscriptionService.updateSubscriptionStatus(id, status);
                if (!subscription) {
                    res.status(404).json({
                        success: false,
                        error: {
                            code: "SUB_016",
                            message: "Subscription not found",
                        },
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: subscription,
                    message: "Subscription status updated successfully",
                });
            }
            catch (error) {
                console.error("Error updating subscription status:", error);
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
                            code: "SUB_017",
                            message: "Failed to update subscription status",
                        },
                    });
                }
            }
        };
        this.subscriptionService = new memberSubscription_service_1.MemberSubscriptionService();
    }
}
exports.SubscriptionController = SubscriptionController;
//# sourceMappingURL=SubscriptionController.js.map