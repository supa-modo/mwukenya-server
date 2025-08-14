import { Op } from "sequelize";
import MemberSubscription from "../models/MemberSubscription";
import MedicalScheme from "../models/MedicalScheme";
import User from "../models/User";
import { ApiError } from "../utils/apiError";
import { SubscriptionStatus } from "../types";

interface CreateSubscriptionData {
  userId: string;
  schemeId: string;
}

interface SubscriptionFilters {
  status?: string;
  schemeId?: string;
  search?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

export class MemberSubscriptionService {
  // Get user's current subscription
  async getUserSubscription(
    userId: string
  ): Promise<MemberSubscription | null> {
    try {
      const subscription = await MemberSubscription.findOne({
        where: {
          userId,
          status: {
            [Op.in]: ["active", "pending"],
          },
        },
        include: [
          {
            model: MedicalScheme,
            as: "scheme",
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "phoneNumber"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return subscription;
    } catch (error) {
      console.error("Error getting user subscription:", error);
      throw new ApiError(
        "Failed to retrieve user subscription",
        "MSUB_001",
        500
      );
    }
  }

  // Create new subscription
  async createSubscription(
    data: CreateSubscriptionData
  ): Promise<MemberSubscription> {
    try {
      // Check if user already has an active subscription
      const existingSubscription = await this.getUserSubscription(data.userId);

      if (existingSubscription) {
        throw new ApiError(
          "User already has an active subscription",
          "MSUB_002",
          400
        );
      }

      // Verify the medical scheme exists and is active
      const scheme = await MedicalScheme.findOne({
        where: {
          id: data.schemeId,
          isActive: true,
        },
      });

      if (!scheme) {
        throw new ApiError(
          "Medical scheme not found or inactive",
          "MSUB_003",
          404
        );
      }

      // Create the subscription
      const subscription = await MemberSubscription.create({
        userId: data.userId,
        schemeId: data.schemeId,
        status: "active" as SubscriptionStatus,
        effectiveDate: new Date(),
        subscriptionDate: new Date(),
      });

      // Return subscription with related data
      const fullSubscription = await MemberSubscription.findByPk(
        subscription.id,
        {
          include: [
            {
              model: MedicalScheme,
              as: "scheme",
            },
            {
              model: User,
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
        }
      );

      if (!fullSubscription) {
        throw new ApiError(
          "Failed to retrieve created subscription",
          "MSUB_004",
          500
        );
      }

      return fullSubscription;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Error creating subscription:", error);
      throw new ApiError("Failed to create subscription", "MSUB_005", 500);
    }
  }

  // Change medical scheme
  async changeScheme(
    userId: string,
    newSchemeId: string
  ): Promise<MemberSubscription> {
    try {
      // Get current subscription
      const currentSubscription = await this.getUserSubscription(userId);

      if (!currentSubscription) {
        throw new ApiError("No active subscription found", "MSUB_006", 404);
      }

      // Verify the new medical scheme exists and is active
      const newScheme = await MedicalScheme.findOne({
        where: {
          id: newSchemeId,
          isActive: true,
        },
      });

      if (!newScheme) {
        throw new ApiError(
          "New medical scheme not found or inactive",
          "MSUB_007",
          404
        );
      }

      // Check if it's the same scheme
      if (currentSubscription.schemeId === newSchemeId) {
        throw new ApiError(
          "User is already subscribed to this scheme",
          "MSUB_008",
          400
        );
      }

      // Update the subscription
      await currentSubscription.update({
        schemeId: newSchemeId,
        effectiveDate: new Date(), // New scheme takes effect immediately
        updatedAt: new Date(),
      });

      // Return updated subscription with related data
      const updatedSubscription = await MemberSubscription.findByPk(
        currentSubscription.id,
        {
          include: [
            {
              model: MedicalScheme,
              as: "scheme",
            },
            {
              model: User,
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
        }
      );

      if (!updatedSubscription) {
        throw new ApiError(
          "Failed to retrieve updated subscription",
          "MSUB_009",
          500
        );
      }

      return updatedSubscription;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Error changing medical scheme:", error);
      throw new ApiError("Failed to change medical scheme", "MSUB_010", 500);
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        return false;
      }

      await subscription.update({
        status: "cancelled" as SubscriptionStatus,
        endDate: new Date(),
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      throw new ApiError("Failed to cancel subscription", "MSUB_011", 500);
    }
  }

  // Get all subscriptions with filtering and pagination (admin)
  async getAllSubscriptions(
    filters: SubscriptionFilters,
    pagination: PaginationOptions
  ): Promise<{
    subscriptions: MemberSubscription[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {};

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.schemeId) {
        whereClause.schemeId = filters.schemeId;
      }

      // Build include for search
      const includeClause: any[] = [
        {
          model: MedicalScheme,
          as: "scheme",
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "phoneNumber"],
        },
      ];

      // Add search filter for user names
      if (filters.search) {
        includeClause[1].where = {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${filters.search}%` } },
            { lastName: { [Op.iLike]: `%${filters.search}%` } },
            { email: { [Op.iLike]: `%${filters.search}%` } },
          ],
        };
      }

      const { rows: subscriptions, count: total } =
        await MemberSubscription.findAndCountAll({
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
    } catch (error) {
      console.error("Error getting all subscriptions:", error);
      throw new ApiError("Failed to retrieve subscriptions", "MSUB_012", 500);
    }
  }

  // Get subscription by ID (admin)
  async getSubscriptionById(id: string): Promise<MemberSubscription | null> {
    try {
      const subscription = await MemberSubscription.findByPk(id, {
        include: [
          {
            model: MedicalScheme,
            as: "scheme",
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "phoneNumber"],
          },
        ],
      });

      return subscription;
    } catch (error) {
      console.error("Error getting subscription by ID:", error);
      throw new ApiError("Failed to retrieve subscription", "MSUB_013", 500);
    }
  }

  // Update subscription status (admin)
  async updateSubscriptionStatus(
    id: string,
    status: SubscriptionStatus
  ): Promise<MemberSubscription | null> {
    try {
      const subscription = await MemberSubscription.findByPk(id);

      if (!subscription) {
        return null;
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // Add endDate if cancelling (assuming this field exists or will be added)
      if (status === "cancelled") {
        updateData.endDate = new Date();
      }

      await subscription.update(updateData);

      // Return updated subscription with related data
      const updatedSubscription = await MemberSubscription.findByPk(id, {
        include: [
          {
            model: MedicalScheme,
            as: "scheme",
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "phoneNumber"],
          },
        ],
      });

      return updatedSubscription;
    } catch (error) {
      console.error("Error updating subscription status:", error);
      throw new ApiError(
        "Failed to update subscription status",
        "MSUB_014",
        500
      );
    }
  }

  // Get subscription statistics (admin)
  async getSubscriptionStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    pendingSubscriptions: number;
    cancelledSubscriptions: number;
    subscriptionsByScheme: Array<{
      schemeId: string;
      schemeName: string;
      count: number;
    }>;
  }> {
    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        pendingSubscriptions,
        cancelledSubscriptions,
      ] = await Promise.all([
        MemberSubscription.count(),
        MemberSubscription.count({ where: { status: "active" } }),
        MemberSubscription.count({ where: { status: "pending" } }),
        MemberSubscription.count({ where: { status: "cancelled" } }),
      ]);

      // Get subscriptions by scheme
      const subscriptionsByScheme = await MemberSubscription.findAll({
        attributes: [
          "medicalSchemeId",
          [
            MemberSubscription.sequelize!.fn(
              "COUNT",
              MemberSubscription.sequelize!.col("MemberSubscription.id")
            ),
            "count",
          ],
        ],
        include: [
          {
            model: MedicalScheme,
            as: "scheme",
            attributes: ["name"],
          },
        ],
        group: ["medicalSchemeId", "scheme.id", "scheme.name"],
        raw: false,
      });

      const formattedSchemeStats = subscriptionsByScheme.map((item: any) => ({
        schemeId: item.medicalSchemeId,
        schemeName: item.scheme?.name || "Unknown",
        count: parseInt(item.dataValues.count),
      }));

      return {
        totalSubscriptions,
        activeSubscriptions,
        pendingSubscriptions,
        cancelledSubscriptions,
        subscriptionsByScheme: formattedSchemeStats,
      };
    } catch (error) {
      console.error("Error getting subscription stats:", error);
      throw new ApiError(
        "Failed to retrieve subscription statistics",
        "MSUB_015",
        500
      );
    }
  }
}
