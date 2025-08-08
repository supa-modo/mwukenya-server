import { Request, Response } from "express";
import { User } from "../models";
import { ApiError } from "../utils/apiError";
import logger from "../utils/logger";
import Joi from "joi";
import bcrypt from "bcrypt";
import { config } from "../config";

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({
      "string.min": "First name must be at least 2 characters long",
      "string.max": "First name cannot exceed 100 characters",
      "string.pattern.base":
        "First name should only contain letters and spaces",
    }),
  lastName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({
      "string.min": "Last name must be at least 2 characters long",
      "string.max": "Last name cannot exceed 100 characters",
      "string.pattern.base": "Last name should only contain letters and spaces",
    }),
  otherNames: Joi.string()
    .max(100)
    .pattern(/^[a-zA-Z\s]*$/)
    .allow("")
    .optional()
    .messages({
      "string.max": "Other names cannot exceed 100 characters",
      "string.pattern.base":
        "Other names should only contain letters and spaces",
    }),
  email: Joi.string().email().optional().messages({
    "string.email": "Email must be a valid email address",
  }),
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be in valid E.164 format",
    }),
  gender: Joi.string().valid("Male", "Female").optional().messages({
    "any.only": "Gender must be either Male or Female",
  }),
  county: Joi.string().max(100).optional(),
  sacco: Joi.string().max(100).optional(),
  route: Joi.string().max(100).optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "New password must be at least 8 characters long",
    "any.required": "New password is required",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Password confirmation is required",
    }),
});

export class UserController {
  /**
   * Get user profile
   */
  public static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      const user = await User.findByPk(userId, {
        attributes: {
          exclude: [
            "passwordHash",
            "refreshToken",
            "passwordResetToken",
            "passwordResetExpires",
          ],
        },
      });

      if (!user) {
        throw new ApiError("User not found", "USER_001", 404);
      }

      res.status(200).json({
        success: true,
        data: user,
        message: "Profile retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting user profile:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "SYS_001",
          message: "Internal server error",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update user profile
   */
  public static async updateProfile(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      // Validate request body
      const { error, value } = updateProfileSchema.validate(req.body);
      if (error) {
        throw new ApiError(error.details[0].message, "VAL_001", 400);
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError("User not found", "USER_001", 404);
      }

      // Check if phone number is being changed and if it's already taken
      if (value.phoneNumber && value.phoneNumber !== user.phoneNumber) {
        const existingUser = await User.findOne({
          where: { phoneNumber: value.phoneNumber },
        });

        if (existingUser && existingUser.id !== userId) {
          throw new ApiError("Phone number is already in use", "USER_002", 400);
        }
      }

      // Check if email is being changed and if it's already taken
      if (value.email && value.email !== user.email) {
        const existingUser = await User.findOne({
          where: { email: value.email },
        });

        if (existingUser && existingUser.id !== userId) {
          throw new ApiError("Email is already in use", "USER_003", 400);
        }
      }

      // Update user profile
      await user.update(value);

      // Return updated user data (excluding sensitive fields)
      const updatedUser = await User.findByPk(userId, {
        attributes: {
          exclude: [
            "passwordHash",
            "refreshToken",
            "passwordResetToken",
            "passwordResetExpires",
          ],
        },
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: "Profile updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error updating user profile:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "SYS_001",
          message: "Internal server error",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Change user password
   */
  public static async changePassword(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      // Validate request body
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        throw new ApiError(error.details[0].message, "VAL_001", 400);
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError("User not found", "USER_001", 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await user.validatePassword(
        value.currentPassword
      );
      if (!isCurrentPasswordValid) {
        throw new ApiError("Current password is incorrect", "USER_004", 400);
      }

      // Update password
      await user.updatePassword(value.newPassword);

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error changing password:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "SYS_001",
          message: "Internal server error",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get user's dependants (if any)
   */
  public static async getDependants(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError("User not found", "USER_001", 404);
      }

      // For now, return empty array as dependants functionality will be implemented later
      res.status(200).json({
        success: true,
        data: [],
        message: "Dependants retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting dependants:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "SYS_001",
          message: "Internal server error",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get user's documents (if any)
   */
  public static async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError("User not found", "USER_001", 404);
      }

      // For now, return empty array as documents functionality will be implemented later
      res.status(200).json({
        success: true,
        data: [],
        message: "Documents retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting documents:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "SYS_001",
          message: "Internal server error",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get delegate information for a member
   */
  public static async getDelegate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError("User not found", "USER_001", 404);
      }

      if (user.role !== "member") {
        throw new ApiError(
          "Only members can access delegate information",
          "USER_002",
          403
        );
      }

      if (!user.delegateId) {
        res.status(200).json({
          success: true,
          data: null,
          message: "No delegate assigned",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch delegate information separately
      const delegate = await User.findByPk(user.delegateId, {
        attributes: [
          "id",
          "firstName",
          "lastName",
          "phoneNumber",
          "delegateCode",
        ],
      });

      if (!delegate) {
        res.status(200).json({
          success: true,
          data: null,
          message: "Delegate not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: delegate.id,
          firstName: delegate.firstName,
          lastName: delegate.lastName,
          fullName: `${delegate.firstName} ${delegate.lastName}`,
          phoneNumber: delegate.phoneNumber,
          delegateCode: delegate.delegateCode,
        },
        message: "Delegate information retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting delegate information:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "SYS_001",
          message: "Internal server error",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
