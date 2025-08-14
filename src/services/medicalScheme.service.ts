import { Op } from "sequelize";
import MedicalScheme from "../models/MedicalScheme";
import MemberSubscription from "../models/MemberSubscription";
import {
  MedicalSchemeAttributes,
  MedicalSchemeCreationAttributes,
  CoverageType,
} from "../types";
import { ApiError } from "../utils/apiError";
import logger from "../utils/logger";

export class MedicalSchemeService {
  // Get all medical schemes with pagination and filtering
  async getAllSchemes(
    filters: {
      search?: string;
      coverageType?: CoverageType;
      isActive?: boolean;
    },
    pagination: {
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: "asc" | "desc";
    }
  ): Promise<{
    schemes: MedicalSchemeAttributes[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const { page, limit, sortBy, sortOrder } = pagination;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {};

      if (filters.isActive !== undefined) {
        whereClause.isActive = filters.isActive;
      }

      if (filters.coverageType) {
        whereClause.coverageType = filters.coverageType;
      }

      if (filters.search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${filters.search}%` } },
          { description: { [Op.iLike]: `%${filters.search}%` } },
          { code: { [Op.iLike]: `%${filters.search}%` } },
        ];
      }

      const { rows: schemes, count: total } =
        await MedicalScheme.findAndCountAll({
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
    } catch (error) {
      console.error("Error getting all medical schemes:", error);
      throw new ApiError(
        "Failed to retrieve medical schemes",
        "MS_SERVICE_001",
        500
      );
    }
  }

  // Get active medical schemes
  async getActiveSchemes(): Promise<MedicalSchemeAttributes[]> {
    try {
      const schemes = await MedicalScheme.findActiveSchemes();
      return schemes;
    } catch (error) {
      console.error("Error getting active medical schemes:", error);
      throw new ApiError(
        "Failed to retrieve active medical schemes",
        "MS_SERVICE_002",
        500
      );
    }
  }

  // Get medical scheme by ID
  async getSchemeById(id: string): Promise<MedicalSchemeAttributes | null> {
    try {
      const scheme = await MedicalScheme.findByPk(id);
      return scheme;
    } catch (error) {
      console.error("Error getting medical scheme by ID:", error);
      throw new ApiError(
        "Failed to retrieve medical scheme",
        "MS_SERVICE_003",
        500
      );
    }
  }

  // Create new medical scheme
  async createScheme(
    schemeData: Partial<MedicalSchemeCreationAttributes>
  ): Promise<MedicalSchemeAttributes> {
    try {
      // Validate required fields
      if (!schemeData.name || !schemeData.code || !schemeData.dailyPremium) {
        throw new ApiError("Missing required fields", "MS_SERVICE_004", 400);
      }

      // Check if scheme code already exists
      const existingScheme = await MedicalScheme.findOne({
        where: { code: schemeData.code },
      });

      if (existingScheme) {
        throw new ApiError(
          "A scheme with this code already exists",
          "MS_SERVICE_005",
          400
        );
      }

      // Create the scheme
      const scheme = await MedicalScheme.create(
        schemeData as MedicalSchemeCreationAttributes
      );
      return scheme;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Error creating medical scheme:", error);
      throw new ApiError(
        "Failed to create medical scheme",
        "MS_SERVICE_006",
        500
      );
    }
  }

  // Update medical scheme
  async updateScheme(
    id: string,
    updateData: Partial<MedicalSchemeAttributes>
  ): Promise<MedicalSchemeAttributes | null> {
    try {
      const scheme = await MedicalScheme.findByPk(id);
      if (!scheme) {
        return null;
      }

      // If updating code, check for conflicts
      if (updateData.code && updateData.code !== scheme.code) {
        const existingScheme = await MedicalScheme.findOne({
          where: {
            code: updateData.code,
            id: { [Op.ne]: id },
          },
        });

        if (existingScheme) {
          throw new ApiError(
            "A scheme with this code already exists",
            "MS_SERVICE_007",
            400
          );
        }
      }

      await scheme.update(updateData);
      return scheme;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Error updating medical scheme:", error);
      throw new ApiError(
        "Failed to update medical scheme",
        "MS_SERVICE_008",
        500
      );
    }
  }

  // Delete medical scheme
  async deleteScheme(id: string): Promise<boolean> {
    try {
      const scheme = await MedicalScheme.findByPk(id);
      if (!scheme) {
        return false;
      }

      // Check if scheme has active subscriptions
      const activeSubscriptions = await MemberSubscription.count({
        where: {
          schemeId: id,
          status: "active",
        },
      });

      if (activeSubscriptions > 0) {
        throw new ApiError(
          "Cannot delete scheme with active subscriptions",
          "MS_SERVICE_009",
          400
        );
      }

      await scheme.destroy();
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Error deleting medical scheme:", error);
      throw new ApiError(
        "Failed to delete medical scheme",
        "MS_SERVICE_010",
        500
      );
    }
  }

  // Get scheme subscribers
  async getSchemeSubscribers(
    schemeId: string,
    filters: { status?: string },
    pagination: { page: number; limit: number }
  ): Promise<{
    subscribers: any[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const whereClause: any = {
        schemeId: schemeId,
      };

      if (filters.status) {
        whereClause.status = filters.status;
      }

      const { rows: subscribers, count: total } =
        await MemberSubscription.findAndCountAll({
          where: whereClause,
          limit,
          offset,
          order: [["createdAt", "DESC"]],
          include: [
            {
              model: MedicalScheme,
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
    } catch (error) {
      console.error("Error getting scheme subscribers:", error);
      throw new ApiError(
        "Failed to retrieve scheme subscribers",
        "MS_SERVICE_011",
        500
      );
    }
  }

  // Validate scheme data (helper method)
  private async validateSchemeData(
    schemeData: Partial<MedicalSchemeCreationAttributes>
  ): Promise<void> {
    const errors: string[] = [];

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

    // Note: maxDependents might not be in the creation attributes, check if it exists
    if (
      "maxDependents" in schemeData &&
      typeof schemeData.maxDependents === "number" &&
      schemeData.maxDependents < 0
    ) {
      errors.push("Max dependents cannot be negative");
    }

    if (errors.length > 0) {
      throw new ApiError(errors.join(", "), "MS_SERVICE_VALIDATION", 400);
    }
  }
}
