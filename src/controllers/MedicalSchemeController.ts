import { Request, Response } from "express";
import { MedicalSchemeService } from "../services/medicalScheme.service";
import { ApiError } from "../utils/apiError";
import { CoverageType } from "../types";

export class MedicalSchemeController {
  private medicalSchemeService: MedicalSchemeService;

  constructor() {
    this.medicalSchemeService = new MedicalSchemeService();
  }

  // Get all medical schemes with pagination and filtering
  getAllSchemes = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        coverageType,
        isActive,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const filters = {
        search: search as string,
        coverageType: coverageType as CoverageType,
        isActive: isActive ? isActive === "true" : undefined, // Don't filter by active status by default
      };

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const result = await this.medicalSchemeService.getAllSchemes(
        filters,
        pagination
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "Medical schemes retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting medical schemes:", error);

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
            code: "MS_001",
            message: "Failed to retrieve medical schemes",
          },
        });
      }
    }
  };

  // Get only active medical schemes (public endpoint)
  getActiveSchemes = async (req: Request, res: Response): Promise<void> => {
    try {
      const schemes = await this.medicalSchemeService.getActiveSchemes();

      res.status(200).json({
        success: true,
        data: schemes,
        message: "Active medical schemes retrieved successfully",
      });
    } catch (error) {
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

  // Get medical scheme by ID
  getSchemeById = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
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

  // Create new medical scheme (admin only)
  createScheme = async (req: Request, res: Response): Promise<void> => {
    try {
      const schemeData = req.body;
      const scheme = await this.medicalSchemeService.createScheme(schemeData);

      res.status(201).json({
        success: true,
        data: scheme,
        message: "Medical scheme created successfully",
      });
    } catch (error) {
      console.error("Error creating medical scheme:", error);

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
            code: "MS_005",
            message: "Failed to create medical scheme",
          },
        });
      }
    }
  };

  // Update medical scheme (admin only)
  updateScheme = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const scheme = await this.medicalSchemeService.updateScheme(
        id,
        updateData
      );

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
    } catch (error) {
      console.error("Error updating medical scheme:", error);

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
            code: "MS_007",
            message: "Failed to update medical scheme",
          },
        });
      }
    }
  };

  // Delete medical scheme (admin only)
  deleteScheme = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
      console.error("Error deleting medical scheme:", error);

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
            code: "MS_009",
            message: "Failed to delete medical scheme",
          },
        });
      }
    }
  };

  // Get scheme subscribers (admin only)
  getSchemeSubscribers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const filters = {
        status: status as string,
      };

      const result = await this.medicalSchemeService.getSchemeSubscribers(
        id,
        filters,
        pagination
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "Scheme subscribers retrieved successfully",
      });
    } catch (error) {
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
}
