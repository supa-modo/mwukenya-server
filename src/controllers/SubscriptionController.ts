import { Request, Response } from "express";
import { MemberSubscriptionService } from "../services/memberSubscription.service";
import { ApiError } from "../utils/apiError";
import { AuthenticatedRequest } from "../types";

export class SubscriptionController {
  private subscriptionService: MemberSubscriptionService;

  constructor() {
    this.subscriptionService = new MemberSubscriptionService();
  }

  // Get current user's subscription
  getMySubscription = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const subscription = await this.subscriptionService.getUserSubscription(
        userId
      );

      res.status(200).json({
        success: true,
        data: subscription,
        message: subscription
          ? "Subscription retrieved successfully"
          : "No active subscription found",
      });
    } catch (error) {
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

  // Create new subscription
  createSubscription = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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
    } catch (error) {
      console.error("Error creating subscription:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
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

  // Change medical scheme
  changeScheme = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const subscription = await this.subscriptionService.changeScheme(
        userId,
        newSchemeId
      );

      res.status(200).json({
        success: true,
        data: subscription,
        message: "Medical scheme changed successfully",
      });
    } catch (error) {
      console.error("Error changing medical scheme:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
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

  // Cancel subscription
  cancelSubscription = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const cancelled = await this.subscriptionService.cancelSubscription(
        userId
      );

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
    } catch (error) {
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

  // Get all subscriptions (admin only)
  getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 10, status, schemeId, search } = req.query;

      const filters = {
        status: status as string,
        schemeId: schemeId as string,
        search: search as string,
      };

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const result = await this.subscriptionService.getAllSubscriptions(
        filters,
        pagination
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "Subscriptions retrieved successfully",
      });
    } catch (error) {
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

  // Get subscription by ID (admin only)
  getSubscriptionById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const subscription = await this.subscriptionService.getSubscriptionById(
        id
      );

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
    } catch (error) {
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

  // Update subscription status (admin only)
  updateSubscriptionStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
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

      const subscription =
        await this.subscriptionService.updateSubscriptionStatus(id, status);

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
    } catch (error) {
      console.error("Error updating subscription status:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
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
}
