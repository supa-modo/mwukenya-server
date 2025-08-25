import { Request, Response } from "express";
import { User, MemberSubscription, MedicalScheme, Document } from "../models";
import { ApiError } from "../utils/apiError";
import logger from "../utils/logger";
import { Op } from "sequelize";
import { MembershipStatus, DocumentStatus, UserRole } from "../models/types";

export class AdminController {
  /**
   * Get all users with pagination and filtering
   */
  public static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        status = "",
        role = "",
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = req.query;

      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const offset = (pageNumber - 1) * limitNumber;

      // Build where clause for filtering
      const whereClause: any = {};

      if (status && status !== "all") {
        whereClause.membershipStatus = status;
      }

      if (role && role !== "all") {
        whereClause.role = role;
      }

      // Build search conditions
      const searchConditions = [];
      if (search && typeof search === "string" && search.trim() !== "") {
        searchConditions.push(
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { otherNames: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phoneNumber: { [Op.iLike]: `%${search}%` } },
          { idNumber: { [Op.iLike]: `%${search}%` } },
          { membershipNumber: { [Op.iLike]: `%${search}%` } }
        );
      }

      if (searchConditions.length > 0) {
        whereClause[Op.or] = searchConditions;
      }

      // Build order clause
      const orderClause = [
        [sortBy as string, (sortOrder as string).toUpperCase()],
      ];

      // Get users with pagination
      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        attributes: {
          exclude: [
            "passwordHash",
            "refreshToken",
            "passwordResetToken",
            "passwordResetExpires",
          ],
        },
        order: orderClause as any,
        limit: limitNumber,
        offset: offset,
      });

      // Add delegate and member counts for coordinators and delegates
      const usersWithCounts = await Promise.all(
        users.map(async (user) => {
          const userData = user.toJSON();

          if (user.role === UserRole.COORDINATOR) {
            // Count delegates under this coordinator
            const delegateCount = await User.count({
              where: {
                role: UserRole.DELEGATE,
                coordinatorId: user.id,
              },
            });

            // Count total members under this coordinator's delegates
            const memberCount = await User.count({
              where: {
                role: UserRole.MEMBER,
                coordinatorId: user.id,
              },
            });

            return {
              ...userData,
              delegateCount,
              memberCount,
            };
          } else if (user.role === UserRole.DELEGATE) {
            // Count members under this delegate
            const memberCount = await User.count({
              where: {
                role: UserRole.MEMBER,
                delegateId: user.id,
              },
            });

            return {
              ...userData,
              memberCount,
            };
          }

          return userData;
        })
      );

      // Calculate pagination info
      const totalPages = Math.ceil(count / limitNumber);
      const hasNextPage = pageNumber < totalPages;
      const hasPrevPage = pageNumber > 1;

      res.status(200).json({
        success: true,
        data: {
          users: usersWithCounts,
          pagination: {
            currentPage: pageNumber,
            totalPages,
            totalItems: count,
            itemsPerPage: limitNumber,
            hasNextPage,
            hasPrevPage,
          },
        },
        message: "Users retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting all users:", error);

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
   * Get comprehensive statistics for admin dashboard
   */
  public static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      // Get total users count
      const totalUsers = await User.count();

      // Get users by status
      const activeUsers = await User.count({
        where: { membershipStatus: "active" },
      });

      const pendingUsers = await User.count({
        where: { membershipStatus: "pending" },
      });

      const suspendedUsers = await User.count({
        where: { membershipStatus: "suspended" },
      });

      // Get users by role
      const members = await User.count({
        where: { role: "member" },
      });

      const delegates = await User.count({
        where: { role: "delegate" },
      });

      const coordinators = await User.count({
        where: { role: "coordinator" },
      });

      res.status(200).json({
        success: true,
        data: {
          totalUsers,
          byStatus: {
            active: activeUsers,
            pending: pendingUsers,
            suspended: suspendedUsers,
          },
          byRole: {
            members,
            delegates,
            coordinators,
          },
        },
        message: "User statistics retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting user statistics:", error);

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
   * Get comprehensive dashboard statistics
   */
  public static async getDashboardStats(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Get user statistics
      const totalUsers = await User.count();
      const members = await User.count({
        where: { role: "member" },
      });
      const delegates = await User.count({
        where: { role: "delegate" },
      });

      // Get subscription statistics
      const activeSubscriptions = await MemberSubscription.count({
        where: { status: "active" },
      });

      // Get medical scheme statistics
      const activeMedicalSchemes = await MedicalScheme.count({
        where: { isActive: true },
      });

      // Get pending verifications count
      const pendingVerifications = await User.count({
        where: {
          role: "member",
          membershipStatus: "pending",
        },
      });

      res.status(200).json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            members,
            delegates,
          },
          subscriptions: {
            active: activeSubscriptions,
          },
          medicalSchemes: {
            active: activeMedicalSchemes,
          },
          pendingVerifications,
        },
        message: "Dashboard statistics retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting dashboard statistics:", error);

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
   * Create a new user (admin only)
   */
  public static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const {
        firstName,
        lastName,
        otherNames,
        email,
        phoneNumber,
        idNumber,
        password,
        gender,
        county,
        sacco,
        route,
        role,
        membershipStatus,
        delegateId,
        coordinatorId,
      } = req.body;

      // Validate required fields
      if (
        !firstName ||
        !lastName ||
        !phoneNumber ||
        !idNumber ||
        !password ||
        !role
      ) {
        throw new ApiError("Missing required fields", "VAL_001", 400);
      }

      // Check if phone number already exists
      const existingPhone = await User.findByPhone(phoneNumber);
      if (existingPhone) {
        throw new ApiError(
          `Phone number "${phoneNumber}" is already registered by another user. Please use a different phone number.`,
          "USER_001",
          400
        );
      }

      // Check if ID number already exists
      const existingId = await User.findByIdNumber(idNumber);
      if (existingId) {
        throw new ApiError(
          `ID number "${idNumber}" is already registered by another user. Please use a different ID number.`,
          "USER_002",
          400
        );
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
          throw new ApiError(
            `Email "${email}" is already registered by another user. Please use a different email address.`,
            "USER_003",
            400
          );
        }
      }

      // Validate role hierarchy
      if (role === UserRole.MEMBER && !delegateId) {
        throw new ApiError(
          "Members must be assigned to a delegate. Please select a delegate from the dropdown.",
          "USER_004",
          400
        );
      }

      if (role === UserRole.DELEGATE && !coordinatorId) {
        throw new ApiError(
          "Delegates must be assigned to a coordinator. Please select a coordinator from the dropdown.",
          "USER_005",
          400
        );
      }

      // Verify delegate exists if assigned
      if (delegateId) {
        const delegate = await User.findByPk(delegateId);
        if (!delegate || delegate.role !== UserRole.DELEGATE) {
          throw new ApiError(
            `The selected delegate (ID: ${delegateId}) does not exist or is not a delegate. Please select a valid delegate.`,
            "USER_006",
            400
          );
        }
      }

      // Verify coordinator exists if assigned
      if (coordinatorId) {
        const coordinator = await User.findByPk(coordinatorId);
        if (!coordinator || coordinator.role !== UserRole.COORDINATOR) {
          throw new ApiError(
            `The selected coordinator (ID: ${coordinatorId}) does not exist or is not a coordinator. Please select a valid coordinator.`,
            "USER_007",
            400
          );
        }
      }

      // Hash password
      const passwordHash = password;

      // Create user
      const user = await User.create({
        firstName,
        lastName,
        otherNames,
        email,
        phoneNumber,
        idNumber,
        passwordHash,
        gender,
        county,
        sacco,
        route,
        role,
        membershipStatus,
        delegateId,
        coordinatorId,
        isActive: true,
        isEmailVerified: true, // Admin-created users are verified
        isPhoneVerified: true,
        isIdNumberVerified: true,
      });

      // Return created user (excluding sensitive fields)
      const createdUser = await User.findByPk(user.id, {
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
        data: createdUser,
        message: "User created successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error creating user:", error);

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
   * Update an existing user (admin only)
   */
  public static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Find user
      const user = await User.findByPk(id);
      if (!user) {
        throw new ApiError("User not found", "USER_008", 404);
      }

      // Check if phone number is being changed and if it's already taken
      if (
        updateData.phoneNumber &&
        updateData.phoneNumber !== user.phoneNumber
      ) {
        const existingUser = await User.findByPhone(updateData.phoneNumber);
        if (existingUser && existingUser.id !== id) {
          throw new ApiError(
            `Phone number "${updateData.phoneNumber}" is already in use by another user. Please use a different phone number.`,
            "USER_009",
            400
          );
        }
      }

      // Check if email is being changed and if it's already taken
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findByEmail(updateData.email);
        if (existingUser && existingUser.id !== id) {
          throw new ApiError(
            `Email "${updateData.email}" is already in use by another user. Please use a different email address.`,
            "USER_011",
            400
          );
        }
      }

      // Check if ID number is being changed and if it's already taken
      if (updateData.idNumber && updateData.idNumber !== user.idNumber) {
        const existingUser = await User.findByIdNumber(updateData.idNumber);
        if (existingUser && existingUser.id !== id) {
          throw new ApiError(
            `ID number "${updateData.idNumber}" is already in use by another user. Please use a different ID number.`,
            "USER_010",
            400
          );
        }
      }

      // Handle role changes and code generation
      if (updateData.role && updateData.role !== user.role) {
        // Clear old codes when role changes
        updateData.delegateCode = undefined;
        updateData.coordinatorCode = undefined;

        // Validate role hierarchy requirements
        if (updateData.role === UserRole.MEMBER) {
          if (!updateData.delegateId) {
            throw new ApiError(
              "When changing a user to a member role, delegate assignment is required. Please select a delegate from the dropdown.",
              "USER_012",
              400
            );
          }
        } else if (updateData.role === UserRole.DELEGATE) {
          if (!updateData.coordinatorId) {
            throw new ApiError(
              "When changing a user to a delegate role, coordinator assignment is required. Please select a coordinator from the dropdown.",
              "USER_013",
              400
            );
          }
          // Generate new delegate code
          updateData.delegateCode = User.generateDelegateCode();
        } else if (updateData.role === UserRole.COORDINATOR) {
          // Generate new coordinator code
          updateData.coordinatorCode = User.generateCoordinatorCode();
        }

        // Clear old relationships when role changes
        if (user.role === UserRole.COORDINATOR) {
          // If user was a coordinator, clear all delegate relationships
          await User.update(
            { coordinatorId: undefined, coordinatorCode: undefined },
            { where: { coordinatorId: id } }
          );
        } else if (user.role === UserRole.DELEGATE) {
          // If user was a delegate, clear all member relationships
          await User.update(
            { delegateId: undefined, delegateCode: undefined },
            { where: { delegateId: id } }
          );
        }
      } else {
        // Handle code updates for existing roles
        if (
          updateData.role === UserRole.MEMBER ||
          user.role === UserRole.MEMBER
        ) {
          if (
            updateData.delegateId &&
            updateData.delegateId !== user.delegateId
          ) {
            // Clear old delegate code when changing delegate
            updateData.delegateCode = undefined;
          }
        } else if (
          updateData.role === UserRole.DELEGATE ||
          user.role === UserRole.DELEGATE
        ) {
          if (
            updateData.coordinatorId &&
            updateData.coordinatorId !== user.coordinatorId
          ) {
            // Clear old coordinator code when changing coordinator
            updateData.coordinatorCode = undefined;
          }
        }
      }

      // Verify delegate exists if assigned
      if (updateData.delegateId) {
        const delegate = await User.findByPk(updateData.delegateId);
        if (!delegate || delegate.role !== UserRole.DELEGATE) {
          throw new ApiError(
            `The selected delegate (ID: ${updateData.delegateId}) does not exist or is not a delegate. Please select a valid delegate.`,
            "USER_014",
            400
          );
        }
      }

      // Verify coordinator exists if assigned
      if (updateData.coordinatorId) {
        const coordinator = await User.findByPk(updateData.coordinatorId);
        if (!coordinator || coordinator.role !== UserRole.COORDINATOR) {
          throw new ApiError(
            `The selected coordinator (ID: ${updateData.coordinatorId}) does not exist or is not a coordinator. Please select a valid coordinator.`,
            "USER_015",
            400
          );
        }
      }

      // Hash password if provided
      if (updateData.password) {
        updateData.passwordHash = updateData.password;
        delete updateData.password;
      }

      // Ensure codes are set to undefined instead of empty strings to avoid constraint violations
      if (updateData.delegateCode === "") updateData.delegateCode = undefined;
      if (updateData.coordinatorCode === "")
        updateData.coordinatorCode = undefined;

      // Update user
      await user.update(updateData);

      // Return updated user (excluding sensitive fields)
      const updatedUser = await User.findByPk(id, {
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
        message: "User updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error updating user:", error);

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
   * Delete a user (admin only)
   */
  public static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Find user
      const user = await User.findByPk(id);
      if (!user) {
        throw new ApiError("User not found", "USER_016", 404);
      }

      // Check if user has dependents
      if (user.role === UserRole.COORDINATOR) {
        const delegateCount = await User.count({
          where: { coordinatorId: id },
        });
        if (delegateCount > 0) {
          throw new ApiError(
            `Cannot delete coordinator "${user.firstName} ${user.lastName}" because they have ${delegateCount} active delegate(s). Please reassign or delete the delegates first.`,
            "USER_017",
            400
          );
        }
      }

      if (user.role === UserRole.DELEGATE) {
        const memberCount = await User.count({ where: { delegateId: id } });
        if (memberCount > 0) {
          throw new ApiError(
            `Cannot delete delegate "${user.firstName} ${user.lastName}" because they have ${memberCount} active member(s). Please reassign or delete the members first.`,
            "USER_018",
            400
          );
        }
      }

      // Delete user
      await user.destroy();

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error deleting user:", error);

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
   * Get members pending verification with their documents
   */
  public static async getMembersPendingVerification(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { page = 1, limit = 20, search = "", filter = "all" } = req.query;
      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const offset = (pageNumber - 1) * limitNumber;

      // Build where clause for filtering
      const whereClause: any = {
        role: UserRole.MEMBER,
      };

      // Filter by verification status
      if (filter === "pending") {
        whereClause.membershipStatus = MembershipStatus.PENDING;
      } else if (filter === "verified") {
        whereClause.membershipStatus = MembershipStatus.ACTIVE;
      } else if (filter === "rejected") {
        whereClause.membershipStatus = MembershipStatus.SUSPENDED;
      }

      // Build search conditions
      const searchConditions = [];
      if (search && typeof search === "string" && search.trim() !== "") {
        searchConditions.push(
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { otherNames: { [Op.iLike]: `%${search}%` } },
          { phoneNumber: { [Op.iLike]: `%${search}%` } },
          { idNumber: { [Op.iLike]: `%${search}%` } },
          { membershipNumber: { [Op.iLike]: `%${search}%` } }
        );
      }

      if (searchConditions.length > 0) {
        whereClause[Op.or] = searchConditions;
      }

      // Get users with pagination
      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        attributes: {
          exclude: [
            "passwordHash",
            "refreshToken",
            "passwordResetToken",
            "passwordResetExpires",
          ],
        },
        include: [
          {
            model: Document,
            as: "documents",
            attributes: ["id", "type", "name", "status", "uploadedAt", "url"],
            where: { entityType: "user" },
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: limitNumber,
        offset: offset,
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / limitNumber);
      const hasNextPage = pageNumber < totalPages;
      const hasPrevPage = pageNumber > 1;

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: pageNumber,
            totalPages,
            totalItems: count,
            itemsPerPage: limitNumber,
            hasNextPage,
            hasPrevPage,
          },
        },
        message: "Members pending verification retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting members pending verification:", error);

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
   * Get member verification details by ID
   */
  public static async getMemberVerificationDetails(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: {
          exclude: [
            "passwordHash",
            "refreshToken",
            "passwordResetToken",
            "passwordResetExpires",
          ],
        },
        include: [
          {
            model: Document,
            as: "documents",
            attributes: [
              "id",
              "type",
              "name",
              "description",
              "status",
              "uploadedAt",
              "url",
              "fileName",
              "fileSize",
              "mimeType",
              "verifiedAt",
              "verifiedBy",
              "rejectionReason",
            ],
            where: { entityType: "user" },
            required: false,
          },
          {
            model: User,
            as: "delegate",
            attributes: [
              "id",
              "firstName",
              "lastName",
              "phoneNumber",
              "delegateCode",
            ],
            required: false,
          },
        ],
      });

      if (!user) {
        throw new ApiError("Member not found", "USER_019", 404);
      }

      if (user.role !== UserRole.MEMBER) {
        throw new ApiError("User is not a member", "USER_020", 400);
      }

      res.status(200).json({
        success: true,
        data: user,
        message: "Member verification details retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting member verification details:", error);

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
   * Get hierarchy performance statistics
   */
  public static async getHierarchyPerformance(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Get all coordinators
      const coordinators = await User.findAll({
        where: { role: UserRole.COORDINATOR },
        attributes: ["id", "firstName", "lastName", "county", "createdAt"],
      });

      const hierarchyData = await Promise.all(
        coordinators.map(async (coordinator) => {
          // Count delegates for this coordinator
          const delegateCount = await User.count({
            where: {
              role: UserRole.DELEGATE,
              coordinatorId: coordinator.id,
            },
          });

          // Count total members under this coordinator's delegates
          const totalMembers = await User.count({
            where: {
              role: UserRole.MEMBER,
              coordinatorId: coordinator.id,
            },
          });

          // Count active members under this coordinator's delegates
          const activeMembers = await User.count({
            where: {
              role: UserRole.MEMBER,
              coordinatorId: coordinator.id,
              membershipStatus: MembershipStatus.ACTIVE,
            },
          });

          const activeRate =
            totalMembers > 0
              ? Math.round((activeMembers / totalMembers) * 100)
              : 0;

          // Calculate performance based on active rate and member count
          let performance = 0;
          if (activeRate >= 90) performance = 1;
          else if (activeRate >= 80) performance = 0;
          else performance = -1;

          return {
            id: coordinator.id,
            name: `${coordinator.firstName} ${coordinator.lastName}`,
            region: coordinator.county || "Unknown Region",
            delegates: delegateCount,
            totalMembers,
            activeRate,
            performance,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: hierarchyData,
        message: "Hierarchy performance data retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting hierarchy performance:", error);

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
   * Verify member documents and update membership status
   */
  public static async verifyMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, documentId, reason, notes } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        throw new ApiError("Member not found", "USER_021", 404);
      }

      if (user.role !== UserRole.MEMBER) {
        throw new ApiError("User is not a member", "USER_022", 400);
      }

      if (action === "approve") {
        // Check if all required documents are verified
        const documents = await Document.findAll({
          where: { userId: id, entityType: "user" },
        });

        const requiredDocuments = ["identity", "photo"];
        const verifiedDocuments = documents.filter(
          (doc) => doc.status === DocumentStatus.VERIFIED
        );

        if (verifiedDocuments.length < requiredDocuments.length) {
          throw new ApiError(
            "Cannot approve member: Not all required documents are verified",
            "VERIFY_001",
            400
          );
        }

        // Update user membership status to active
        await user.update({
          membershipStatus: MembershipStatus.ACTIVE,
          membershipDate: new Date(),
        });

        res.status(200).json({
          success: true,
          message: "Member verified and activated successfully",
          timestamp: new Date().toISOString(),
        });
      } else if (action === "reject") {
        if (!reason) {
          throw new ApiError("Rejection reason is required", "VERIFY_002", 400);
        }

        // Update user membership status to suspended
        await user.update({
          membershipStatus: MembershipStatus.SUSPENDED,
        });

        res.status(200).json({
          success: true,
          message: "Member verification rejected",
          timestamp: new Date().toISOString(),
        });
      } else if (action === "verifyDocument") {
        if (!documentId) {
          throw new ApiError("Document ID is required", "VERIFY_003", 400);
        }

        const document = await Document.findByPk(documentId);
        if (!document || document.userId !== id) {
          throw new ApiError("Document not found", "VERIFY_004", 404);
        }

        // Mark document as verified
        await document.update({
          status: DocumentStatus.VERIFIED,
          verifiedAt: new Date(),
          verifiedBy: req.user?.id,
        });

        res.status(200).json({
          success: true,
          message: "Document verified successfully",
          timestamp: new Date().toISOString(),
        });
      } else if (action === "rejectDocument") {
        if (!documentId || !reason) {
          throw new ApiError(
            "Document ID and rejection reason are required",
            "VERIFY_005",
            400
          );
        }

        const document = await Document.findByPk(documentId);
        if (!document || document.userId !== id) {
          throw new ApiError("Document not found", "VERIFY_006", 404);
        }

        // Mark document as rejected
        await document.update({
          status: DocumentStatus.REJECTED,
          rejectionReason: reason,
          verifiedAt: new Date(),
          verifiedBy: req.user?.id,
        });

        res.status(200).json({
          success: true,
          message: "Document rejected successfully",
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new ApiError("Invalid action", "VERIFY_007", 400);
      }
    } catch (error) {
      logger.error("Error verifying member:", error);

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
   * Get delegates under a specific coordinator
   */
  public static async getDelegatesByCoordinator(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { coordinatorId } = req.params;
      const { page = 1, limit = 20, search = "" } = req.query;
      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const offset = (pageNumber - 1) * limitNumber;

      // Verify coordinator exists and is a coordinator
      const coordinator = await User.findByPk(coordinatorId);
      if (!coordinator || coordinator.role !== UserRole.COORDINATOR) {
        throw new ApiError("Coordinator not found", "USER_023", 404);
      }

      // Build where clause for filtering
      const whereClause: any = {
        role: UserRole.DELEGATE,
        coordinatorId: coordinatorId,
      };

      // Build search conditions
      const searchConditions = [];
      if (search && typeof search === "string" && search.trim() !== "") {
        searchConditions.push(
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { otherNames: { [Op.iLike]: `%${search}%` } },
          { phoneNumber: { [Op.iLike]: `%${search}%` } },
          { delegateCode: { [Op.iLike]: `%${search}%` } }
        );
      }

      if (searchConditions.length > 0) {
        whereClause[Op.or] = searchConditions;
      }

      // Get delegates with pagination
      const { count, rows: delegates } = await User.findAndCountAll({
        where: whereClause,
        attributes: {
          exclude: [
            "passwordHash",
            "refreshToken",
            "passwordResetToken",
            "passwordResetExpires",
          ],
        },
        order: [["createdAt", "DESC"]],
        limit: limitNumber,
        offset: offset,
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / limitNumber);
      const hasNextPage = pageNumber < totalPages;
      const hasPrevPage = pageNumber > 1;

      res.status(200).json({
        success: true,
        data: {
          delegates,
          pagination: {
            currentPage: pageNumber,
            totalPages,
            totalItems: count,
            itemsPerPage: limitNumber,
            hasNextPage,
            hasPrevPage,
          },
        },
        message: "Delegates retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting delegates by coordinator:", error);

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
   * Get members under a specific delegate
   */
  public static async getMembersByDelegate(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { delegateId } = req.params;
      const { page = 1, limit = 20, search = "" } = req.query;
      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const offset = (pageNumber - 1) * limitNumber;

      // Verify delegate exists and is a delegate
      const delegate = await User.findByPk(delegateId);
      if (!delegate || delegate.role !== UserRole.DELEGATE) {
        throw new ApiError("Delegate not found", "USER_024", 404);
      }

      // Build where clause for filtering
      const whereClause: any = {
        role: UserRole.MEMBER,
        delegateId: delegateId,
      };

      // Build search conditions
      const searchConditions = [];
      if (search && typeof search === "string" && search.trim() !== "") {
        searchConditions.push(
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { otherNames: { [Op.iLike]: `%${search}%` } },
          { phoneNumber: { [Op.iLike]: `%${search}%` } },
          { membershipNumber: { [Op.iLike]: `%${search}%` } }
        );
      }

      if (searchConditions.length > 0) {
        whereClause[Op.or] = searchConditions;
      }

      // Get members with pagination
      const { count, rows: members } = await User.findAndCountAll({
        where: whereClause,
        attributes: {
          exclude: [
            "passwordHash",
            "refreshToken",
            "passwordResetToken",
            "passwordResetExpires",
          ],
        },
        order: [["createdAt", "DESC"]],
        limit: limitNumber,
        offset: offset,
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / limitNumber);
      const hasNextPage = pageNumber < totalPages;
      const hasPrevPage = pageNumber > 1;

      res.status(200).json({
        success: true,
        data: {
          members,
          pagination: {
            currentPage: pageNumber,
            totalPages,
            totalItems: count,
            itemsPerPage: limitNumber,
            hasNextPage,
            hasPrevPage,
          },
        },
        message: "Members retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting members by delegate:", error);

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
