import { Request, Response } from "express";
import { User } from "../models";
import { ApiError } from "../utils/apiError";
import logger from "../utils/logger";
import Joi from "joi";
import bcrypt from "bcrypt";
import { config } from "../config";
import { Op } from "sequelize";
import { AuthenticatedRequest, UserRole, MembershipStatus } from "../types";

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

  /**
   * Get delegates under current coordinator
   */
  public static async getMyDelegates(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const coordinatorId = req.user?.id;
      const { page = 1, limit = 10, search = "" } = req.query;

      if (!coordinatorId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      // Build search conditions
      const whereConditions: any = {
        coordinatorId,
        role: UserRole.DELEGATE,
      };

      if (search) {
        whereConditions[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { phoneNumber: { [Op.iLike]: `%${search}%` } },
          { delegateCode: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows: delegates } = await User.findAndCountAll({
        where: whereConditions,
        attributes: {
          exclude: [
            "passwordHash",
            "refreshToken",
            "passwordResetToken",
            "passwordResetExpires",
          ],
        },
        order: [["createdAt", "DESC"]],
        limit: Number(limit),
        offset,
      });

      // Get member counts for each delegate
      const delegatesWithStats = await Promise.all(
        delegates.map(async (delegate) => {
          const memberCount = await User.count({
            where: {
              delegateId: delegate.id,
              role: UserRole.MEMBER,
            },
          });

          return {
            ...delegate.toJSON(),
            memberCount,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          delegates: delegatesWithStats,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(count / Number(limit)),
          },
        },
        message: "Delegates retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting delegates:", error);

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
   * Get members under current delegate
   */
  public static async getMyMembers(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const delegateId = req.user?.id;
      const { page = 1, limit = 10, search = "" } = req.query;

      if (!delegateId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      // Build search conditions
      const whereConditions: any = {
        delegateId,
        role: UserRole.MEMBER,
      };

      if (search) {
        whereConditions[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { phoneNumber: { [Op.iLike]: `%${search}%` } },
          { membershipNumber: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows: members } = await User.findAndCountAll({
        where: whereConditions,
        attributes: {
          exclude: [
            "passwordHash",
            "refreshToken",
            "passwordResetToken",
            "passwordResetExpires",
          ],
        },
        order: [["createdAt", "DESC"]],
        limit: Number(limit),
        offset,
      });

      res.status(200).json({
        success: true,
        data: {
          members,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(count / Number(limit)),
          },
        },
        message: "Members retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting members:", error);

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
   * Create a new delegate under current coordinator
   */
  public static async createDelegate(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const coordinatorId = req.user?.id;
      const {
        firstName,
        lastName,
        otherNames,
        email,
        phoneNumber,
        idNumber,
        gender,
        county,
        sacco,
        route,
        password,
      } = req.body;

      if (!coordinatorId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      // Validate required fields
      if (!firstName || !lastName || !phoneNumber || !idNumber || !password) {
        throw new ApiError(
          "Missing required fields: firstName, lastName, phoneNumber, idNumber, and password are required",
          "VAL_001",
          400
        );
      }

      // Check if phone number or ID number already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ phoneNumber }, { idNumber }],
        },
      });

      if (existingUser) {
        if (existingUser.phoneNumber === phoneNumber) {
          throw new ApiError("Phone number is already in use", "USER_002", 400);
        }
        if (existingUser.idNumber === idNumber) {
          throw new ApiError("ID number is already in use", "USER_006", 400);
        }
      }

      // Check if email exists (if provided)
      if (email) {
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
          throw new ApiError("Email is already in use", "USER_003", 400);
        }
      }

      // Generate delegate code
      const delegateCode = User.generateDelegateCode();

      // Create the delegate
      const newDelegate = await User.create({
        firstName,
        lastName,
        otherNames,
        email,
        phoneNumber,
        idNumber,
        passwordHash: await bcrypt.hash(password, config.security.bcryptRounds),
        gender,
        county,
        sacco,
        route,
        role: UserRole.DELEGATE,
        coordinatorId,
        delegateCode,
        membershipStatus: MembershipStatus.ACTIVE,
        isActive: true,
        isEmailVerified: false,
        isPhoneVerified: false,
        isIdNumberVerified: false,
      });

      // Return delegate data (excluding sensitive fields)
      const delegateData = await User.findByPk(newDelegate.id, {
        attributes: {
          exclude: [
            "passwordHash",
            "refreshToken",
            "passwordResetToken",
            "passwordResetExpires",
          ],
        },
      });

      res.status(201).json({
        success: true,
        data: delegateData,
        message: "Delegate created successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error creating delegate:", error);

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
   * Update delegate information
   */
  public static async updateDelegate(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const coordinatorId = req.user?.id;
      const { delegateId } = req.params;
      const updateData = req.body;

      if (!coordinatorId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      const delegate = await User.findOne({
        where: {
          id: delegateId,
          coordinatorId,
          role: UserRole.DELEGATE,
        },
      });

      if (!delegate) {
        throw new ApiError("Delegate not found", "USER_001", 404);
      }

      // Validate phone number uniqueness if changed
      if (
        updateData.phoneNumber &&
        updateData.phoneNumber !== delegate.phoneNumber
      ) {
        const existingUser = await User.findOne({
          where: { phoneNumber: updateData.phoneNumber },
        });
        if (existingUser && existingUser.id !== delegateId) {
          throw new ApiError("Phone number is already in use", "USER_002", 400);
        }
      }

      // Validate email uniqueness if changed
      if (updateData.email && updateData.email !== delegate.email) {
        const existingUser = await User.findOne({
          where: { email: updateData.email },
        });
        if (existingUser && existingUser.id !== delegateId) {
          throw new ApiError("Email is already in use", "USER_003", 400);
        }
      }

      // Update delegate
      await delegate.update(updateData);

      // Return updated delegate data
      const updatedDelegate = await User.findByPk(delegateId, {
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
        data: updatedDelegate,
        message: "Delegate updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error updating delegate:", error);

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
   * Deactivate/remove delegate
   */
  public static async deactivateDelegate(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const coordinatorId = req.user?.id;
      const { delegateId } = req.params;

      if (!coordinatorId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      const delegate = await User.findOne({
        where: {
          id: delegateId,
          coordinatorId,
          role: UserRole.DELEGATE,
        },
      });

      if (!delegate) {
        throw new ApiError("Delegate not found", "USER_001", 404);
      }

      // Check if delegate has active members
      const memberCount = await User.count({
        where: {
          delegateId,
          role: UserRole.MEMBER,
          isActive: true,
        },
      });

      if (memberCount > 0) {
        throw new ApiError(
          "Cannot deactivate delegate with active members. Please reassign members first.",
          "USER_007",
          400
        );
      }

      // Deactivate delegate
      await delegate.update({ isActive: false });

      res.status(200).json({
        success: true,
        message: "Delegate deactivated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error deactivating delegate:", error);

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
   * Get delegate statistics for dashboard
   */
  public static async getDelegateStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const delegateId = req.user?.id;

      if (!delegateId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      // Get member counts
      const totalMembers = await User.count({
        where: { delegateId, role: UserRole.MEMBER },
      });

      const activeMembers = await User.count({
        where: { delegateId, role: UserRole.MEMBER, isActive: true },
      });

      const newMembersThisMonth = await User.count({
        where: {
          delegateId,
          role: UserRole.MEMBER,
          createdAt: {
            [Op.gte]: new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1
            ),
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          totalMembers,
          activeMembers,
          inactiveMembers: totalMembers - activeMembers,
          newMembersThisMonth,
          // TODO: Add payment-related stats when payment system is implemented
          totalCollections: 0,
          todaysCollections: 0,
          commission: 0,
        },
        message: "Delegate statistics retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting delegate stats:", error);

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
   * Get coordinator statistics for dashboard
   */
  public static async getCoordinatorStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const coordinatorId = req.user?.id;

      if (!coordinatorId) {
        throw new ApiError("User not authenticated", "AUTH_001", 401);
      }

      // Get delegate counts
      const totalDelegates = await User.count({
        where: { coordinatorId, role: UserRole.DELEGATE },
      });

      const activeDelegates = await User.count({
        where: { coordinatorId, role: UserRole.DELEGATE, isActive: true },
      });

      // Get total members under all delegates
      const delegates = await User.findAll({
        where: { coordinatorId, role: UserRole.DELEGATE },
        attributes: ["id"],
      });

      const delegateIds = delegates.map((d) => d.id);

      const totalMembers = await User.count({
        where: { delegateId: { [Op.in]: delegateIds }, role: UserRole.MEMBER },
      });

      const activeMembers = await User.count({
        where: {
          delegateId: { [Op.in]: delegateIds },
          role: UserRole.MEMBER,
          isActive: true,
        },
      });

      const newMembersThisMonth = await User.count({
        where: {
          delegateId: { [Op.in]: delegateIds },
          role: UserRole.MEMBER,
          createdAt: {
            [Op.gte]: new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1
            ),
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          totalDelegates,
          activeDelegates,
          inactiveDelegates: totalDelegates - activeDelegates,
          totalMembers,
          activeMembers,
          inactiveMembers: totalMembers - activeMembers,
          newMembersThisMonth,
          // TODO: Add payment-related stats when payment system is implemented
          totalRevenue: 0,
          todaysRevenue: 0,
          commission: 0,
        },
        message: "Coordinator statistics retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting coordinator stats:", error);

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
