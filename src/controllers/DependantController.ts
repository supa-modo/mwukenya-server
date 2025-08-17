import { Request, Response } from "express";
import { DependantService } from "../services/dependant.service";
import logger from "../utils/logger";
import { AuthenticatedRequest } from "../types";

export class DependantController {
  /**
   * Create a new dependant
   */
  static async createDependant(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const dependantData = req.body;
      const result = await DependantService.createDependant(
        dependantData,
        userId
      );

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
    } catch (error) {
      logger.error("Error in createDependant controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get all dependants for the authenticated user
   */
  static async getUserDependants(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const includeDocuments = req.query.includeDocuments === "true";
      const result = await DependantService.getUserDependants(
        userId,
        includeDocuments
      );

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
    } catch (error) {
      logger.error("Error in getUserDependants controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get a specific dependant by ID
   */
  static async getDependantById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { dependantId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await DependantService.getDependantById(
        dependantId,
        userId
      );

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
    } catch (error) {
      logger.error("Error in getDependantById controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update a dependant
   */
  static async updateDependant(req: AuthenticatedRequest, res: Response) {
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

      const result = await DependantService.updateDependant(
        dependantId,
        userId,
        updateData
      );

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
    } catch (error) {
      logger.error("Error in updateDependant controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Delete a dependant
   */
  static async deleteDependant(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { dependantId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await DependantService.deleteDependant(
        dependantId,
        userId
      );

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
    } catch (error) {
      logger.error("Error in deleteDependant controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get dependant statistics for the authenticated user
   */
  static async getDependantStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await DependantService.getDependantStats(userId);

      if (!result.success) {
        return res.status(result.error?.statusCode || 500).json({
          success: false,
          message:
            result.error?.message || "Failed to fetch dependant statistics",
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Dependant statistics fetched successfully",
        data: result.data,
      });
    } catch (error) {
      logger.error("Error in getDependantStats controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Verify a dependant (admin/delegate function)
   */
  static async verifyDependant(req: AuthenticatedRequest, res: Response) {
    try {
      const verifiedBy = req.user?.id;
      const { dependantId } = req.params;

      if (!verifiedBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // Check if user has permission to verify dependants
      if (
        !["admin", "delegate", "coordinator"].includes(req.user?.role || "")
      ) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions to verify dependants",
        });
      }

      const result = await DependantService.verifyDependant(
        dependantId,
        verifiedBy
      );

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
    } catch (error) {
      logger.error("Error in verifyDependant controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get all dependants pending verification (admin/delegate function)
   */
  static async getPendingVerificationDependants(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // Check if user has permission to view pending verification dependants
      if (
        !["admin", "delegate", "coordinator"].includes(req.user?.role || "")
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Insufficient permissions to view pending verification dependants",
        });
      }

      const result = await DependantService.getPendingVerificationDependants();

      if (!result.success) {
        return res.status(result.error?.statusCode || 500).json({
          success: false,
          message:
            result.error?.message ||
            "Failed to fetch pending verification dependants",
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Pending verification dependants fetched successfully",
        data: result.data,
      });
    } catch (error) {
      logger.error(
        "Error in getPendingVerificationDependants controller:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
