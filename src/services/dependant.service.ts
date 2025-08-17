import { Transaction } from "sequelize";
import Dependant from "../models/Dependant";
import Document from "../models/Document";
import User from "../models/User";
import {
  DependantAttributes,
  DependantCreationAttributes,
  DependantStatus,
  ServiceResponse,
  UserRole,
} from "../types";
import logger from "../utils/logger";

export class DependantService {
  /**
   * Create a new dependant
   */
  static async createDependant(
    data: DependantCreationAttributes,
    userId: string,
    transaction?: Transaction
  ): Promise<ServiceResponse<DependantAttributes>> {
    try {
      // Validate user exists and is a member
      const user = await User.findByPk(userId);
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

      // Check if user has active subscription
      // This would be implemented when subscription service is ready
      // const hasActiveSubscription = await this.checkUserSubscription(userId);

      // Create dependant
      const dependant = await Dependant.create(
        {
          ...data,
          userId,
          status: DependantStatus.ACTIVE,
        },
        { transaction }
      );

      logger.info(`Dependant created: ${dependant.id} for user: ${userId}`);

      return {
        success: true,
        data: dependant.toJSON() as DependantAttributes,
      };
    } catch (error) {
      logger.error("Error creating dependant:", error);
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

  /**
   * Get all dependants for a user
   */
  static async getUserDependants(
    userId: string,
    includeDocuments: boolean = false
  ): Promise<ServiceResponse<DependantAttributes[]>> {
    try {
      const options: any = {
        where: { userId },
        order: [["createdAt", "DESC"]],
      };

      if (includeDocuments) {
        options.include = [
          {
            model: Document,
            as: "documents",
            where: { entityType: "dependant" },
            required: false,
          },
        ];
      }

      const dependants = await Dependant.findAll(options);

      return {
        success: true,
        data: dependants.map(
          (d: Dependant) => d.toJSON() as DependantAttributes
        ),
      };
    } catch (error) {
      logger.error("Error fetching user dependants:", error);
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

  /**
   * Get a specific dependant by ID
   */
  static async getDependantById(
    dependantId: string,
    userId: string
  ): Promise<ServiceResponse<DependantAttributes>> {
    try {
      const dependant = await Dependant.findOne({
        where: { id: dependantId, userId },
        include: [
          {
            model: User,
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

      // Convert to plain object and ensure all required fields are present
      const dependantData = dependant.toJSON() as DependantAttributes;

      return {
        success: true,
        data: dependantData,
      };
    } catch (error) {
      logger.error("Error getting dependant by ID:", error);
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

  /**
   * Update a dependant
   */
  static async updateDependant(
    dependantId: string,
    userId: string,
    data: Partial<DependantCreationAttributes>,
    transaction?: Transaction
  ): Promise<ServiceResponse<DependantAttributes>> {
    try {
      const dependant = await Dependant.findOne({
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

      // Update dependant
      await dependant.update(data, { transaction });

      logger.info(`Dependant updated: ${dependantId} by user: ${userId}`);

      return {
        success: true,
        data: dependant.toJSON() as DependantAttributes,
      };
    } catch (error) {
      logger.error("Error updating dependant:", error);
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

  /**
   * Delete a dependant
   */
  static async deleteDependant(
    dependantId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<ServiceResponse<boolean>> {
    try {
      const dependant = await Dependant.findOne({
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

      // Delete associated documents first
      await Document.destroy({
        where: { entityId: dependantId, entityType: "dependant" },
        transaction,
      });

      // Delete dependant
      await dependant.destroy({ transaction });

      logger.info(`Dependant deleted: ${dependantId} by user: ${userId}`);

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      logger.error("Error deleting dependant:", error);
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

  /**
   * Verify a dependant (admin/delegate function)
   */
  static async verifyDependant(
    dependantId: string,
    verifiedBy: string,
    transaction?: Transaction
  ): Promise<ServiceResponse<DependantAttributes>> {
    try {
      const dependant = await Dependant.findByPk(dependantId);

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

      // Mark as verified
      dependant.markAsVerified(verifiedBy);
      await dependant.save({ transaction });

      logger.info(`Dependant verified: ${dependantId} by: ${verifiedBy}`);

      return {
        success: true,
        data: dependant.toJSON() as DependantAttributes,
      };
    } catch (error) {
      logger.error("Error verifying dependant:", error);
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

  /**
   * Get dependants pending verification
   */
  static async getPendingVerificationDependants(): Promise<
    ServiceResponse<DependantAttributes[]>
  > {
    try {
      const dependants = await Dependant.findPendingVerification();

      return {
        success: true,
        data: dependants.map(
          (d: Dependant) => d.toJSON() as DependantAttributes
        ),
      };
    } catch (error) {
      logger.error("Error fetching pending verification dependants:", error);
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

  /**
   * Get dependant statistics for a user
   */
  static async getDependantStats(
    userId: string
  ): Promise<ServiceResponse<any>> {
    try {
      const [total, active, verified, pending] = await Promise.all([
        Dependant.count({ where: { userId } }),
        Dependant.count({ where: { userId, status: DependantStatus.ACTIVE } }),
        Dependant.count({ where: { userId, isVerified: true } }),
        Dependant.count({ where: { userId, isVerified: false } }),
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
    } catch (error) {
      logger.error("Error fetching dependant stats:", error);
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
