"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const models_1 = require("../models");
const apiError_1 = require("../utils/apiError");
const logger_1 = __importDefault(require("../utils/logger"));
const sequelize_1 = require("sequelize");
const types_1 = require("../models/types");
class AdminController {
    static async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 20, search = "", status = "", role = "", sortBy = "createdAt", sortOrder = "DESC", } = req.query;
            const pageNumber = parseInt(page);
            const limitNumber = parseInt(limit);
            const offset = (pageNumber - 1) * limitNumber;
            const whereClause = {};
            if (status && status !== "all") {
                whereClause.membershipStatus = status;
            }
            if (role && role !== "all") {
                whereClause.role = role;
            }
            const searchConditions = [];
            if (search && typeof search === "string" && search.trim() !== "") {
                searchConditions.push({ firstName: { [sequelize_1.Op.iLike]: `%${search}%` } }, { lastName: { [sequelize_1.Op.iLike]: `%${search}%` } }, { otherNames: { [sequelize_1.Op.iLike]: `%${search}%` } }, { email: { [sequelize_1.Op.iLike]: `%${search}%` } }, { phoneNumber: { [sequelize_1.Op.iLike]: `%${search}%` } }, { idNumber: { [sequelize_1.Op.iLike]: `%${search}%` } }, { membershipNumber: { [sequelize_1.Op.iLike]: `%${search}%` } });
            }
            if (searchConditions.length > 0) {
                whereClause[sequelize_1.Op.or] = searchConditions;
            }
            const orderClause = [
                [sortBy, sortOrder.toUpperCase()],
            ];
            const { count, rows: users } = await models_1.User.findAndCountAll({
                where: whereClause,
                attributes: {
                    exclude: [
                        "passwordHash",
                        "refreshToken",
                        "passwordResetToken",
                        "passwordResetExpires",
                    ],
                },
                order: orderClause,
                limit: limitNumber,
                offset: offset,
            });
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
                message: "Users retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error getting all users:", error);
            if (error instanceof apiError_1.ApiError) {
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
    static async getUserStats(req, res) {
        try {
            const totalUsers = await models_1.User.count();
            const activeUsers = await models_1.User.count({
                where: { membershipStatus: "active" },
            });
            const pendingUsers = await models_1.User.count({
                where: { membershipStatus: "pending" },
            });
            const suspendedUsers = await models_1.User.count({
                where: { membershipStatus: "suspended" },
            });
            const members = await models_1.User.count({
                where: { role: "member" },
            });
            const delegates = await models_1.User.count({
                where: { role: "delegate" },
            });
            const coordinators = await models_1.User.count({
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
        }
        catch (error) {
            logger_1.default.error("Error getting user statistics:", error);
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
    static async getDashboardStats(req, res) {
        try {
            const totalUsers = await models_1.User.count();
            const members = await models_1.User.count({
                where: { role: "member" },
            });
            const delegates = await models_1.User.count({
                where: { role: "delegate" },
            });
            const activeSubscriptions = await models_1.MemberSubscription.count({
                where: { status: "active" },
            });
            const activeMedicalSchemes = await models_1.MedicalScheme.count({
                where: { isActive: true },
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
                },
                message: "Dashboard statistics retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error getting dashboard statistics:", error);
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
    static async createUser(req, res) {
        try {
            const { firstName, lastName, otherNames, email, phoneNumber, idNumber, password, gender, county, sacco, route, role, membershipStatus, delegateId, coordinatorId, } = req.body;
            if (!firstName ||
                !lastName ||
                !phoneNumber ||
                !idNumber ||
                !password ||
                !role) {
                throw new apiError_1.ApiError("Missing required fields", "VAL_001", 400);
            }
            const existingPhone = await models_1.User.findByPhone(phoneNumber);
            if (existingPhone) {
                throw new apiError_1.ApiError(`Phone number "${phoneNumber}" is already registered by another user. Please use a different phone number.`, "USER_001", 400);
            }
            const existingId = await models_1.User.findByIdNumber(idNumber);
            if (existingId) {
                throw new apiError_1.ApiError(`ID number "${idNumber}" is already registered by another user. Please use a different ID number.`, "USER_002", 400);
            }
            if (email) {
                const existingEmail = await models_1.User.findByEmail(email);
                if (existingEmail) {
                    throw new apiError_1.ApiError(`Email "${email}" is already registered by another user. Please use a different email address.`, "USER_003", 400);
                }
            }
            if (role === types_1.UserRole.MEMBER && !delegateId) {
                throw new apiError_1.ApiError("Members must be assigned to a delegate. Please select a delegate from the dropdown.", "USER_004", 400);
            }
            if (role === types_1.UserRole.DELEGATE && !coordinatorId) {
                throw new apiError_1.ApiError("Delegates must be assigned to a coordinator. Please select a coordinator from the dropdown.", "USER_005", 400);
            }
            if (delegateId) {
                const delegate = await models_1.User.findByPk(delegateId);
                if (!delegate || delegate.role !== types_1.UserRole.DELEGATE) {
                    throw new apiError_1.ApiError(`The selected delegate (ID: ${delegateId}) does not exist or is not a delegate. Please select a valid delegate.`, "USER_006", 400);
                }
            }
            if (coordinatorId) {
                const coordinator = await models_1.User.findByPk(coordinatorId);
                if (!coordinator || coordinator.role !== types_1.UserRole.COORDINATOR) {
                    throw new apiError_1.ApiError(`The selected coordinator (ID: ${coordinatorId}) does not exist or is not a coordinator. Please select a valid coordinator.`, "USER_007", 400);
                }
            }
            const passwordHash = password;
            const user = await models_1.User.create({
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
                isEmailVerified: true,
                isPhoneVerified: true,
                isIdNumberVerified: true,
            });
            const createdUser = await models_1.User.findByPk(user.id, {
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
        }
        catch (error) {
            logger_1.default.error("Error creating user:", error);
            if (error instanceof apiError_1.ApiError) {
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
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const user = await models_1.User.findByPk(id);
            if (!user) {
                throw new apiError_1.ApiError("User not found", "USER_008", 404);
            }
            if (updateData.phoneNumber &&
                updateData.phoneNumber !== user.phoneNumber) {
                const existingUser = await models_1.User.findByPhone(updateData.phoneNumber);
                if (existingUser && existingUser.id !== id) {
                    throw new apiError_1.ApiError(`Phone number "${updateData.phoneNumber}" is already in use by another user. Please use a different phone number.`, "USER_009", 400);
                }
            }
            if (updateData.email && updateData.email !== user.email) {
                const existingUser = await models_1.User.findByEmail(updateData.email);
                if (existingUser && existingUser.id !== id) {
                    throw new apiError_1.ApiError(`Email "${updateData.email}" is already in use by another user. Please use a different email address.`, "USER_011", 400);
                }
            }
            if (updateData.idNumber && updateData.idNumber !== user.idNumber) {
                const existingUser = await models_1.User.findByIdNumber(updateData.idNumber);
                if (existingUser && existingUser.id !== id) {
                    throw new apiError_1.ApiError(`ID number "${updateData.idNumber}" is already in use by another user. Please use a different ID number.`, "USER_010", 400);
                }
            }
            if (updateData.role && updateData.role !== user.role) {
                updateData.delegateCode = undefined;
                updateData.coordinatorCode = undefined;
                if (updateData.role === types_1.UserRole.MEMBER) {
                    if (!updateData.delegateId) {
                        throw new apiError_1.ApiError("When changing a user to a member role, delegate assignment is required. Please select a delegate from the dropdown.", "USER_012", 400);
                    }
                }
                else if (updateData.role === types_1.UserRole.DELEGATE) {
                    if (!updateData.coordinatorId) {
                        throw new apiError_1.ApiError("When changing a user to a delegate role, coordinator assignment is required. Please select a coordinator from the dropdown.", "USER_013", 400);
                    }
                    updateData.delegateCode = models_1.User.generateDelegateCode();
                }
                else if (updateData.role === types_1.UserRole.COORDINATOR) {
                    updateData.coordinatorCode = models_1.User.generateCoordinatorCode();
                }
                if (user.role === types_1.UserRole.COORDINATOR) {
                    await models_1.User.update({ coordinatorId: undefined, coordinatorCode: undefined }, { where: { coordinatorId: id } });
                }
                else if (user.role === types_1.UserRole.DELEGATE) {
                    await models_1.User.update({ delegateId: undefined, delegateCode: undefined }, { where: { delegateId: id } });
                }
            }
            else {
                if (updateData.role === types_1.UserRole.MEMBER ||
                    user.role === types_1.UserRole.MEMBER) {
                    if (updateData.delegateId &&
                        updateData.delegateId !== user.delegateId) {
                        updateData.delegateCode = undefined;
                    }
                }
                else if (updateData.role === types_1.UserRole.DELEGATE ||
                    user.role === types_1.UserRole.DELEGATE) {
                    if (updateData.coordinatorId &&
                        updateData.coordinatorId !== user.coordinatorId) {
                        updateData.coordinatorCode = undefined;
                    }
                }
            }
            if (updateData.delegateId) {
                const delegate = await models_1.User.findByPk(updateData.delegateId);
                if (!delegate || delegate.role !== types_1.UserRole.DELEGATE) {
                    throw new apiError_1.ApiError(`The selected delegate (ID: ${updateData.delegateId}) does not exist or is not a delegate. Please select a valid delegate.`, "USER_014", 400);
                }
            }
            if (updateData.coordinatorId) {
                const coordinator = await models_1.User.findByPk(updateData.coordinatorId);
                if (!coordinator || coordinator.role !== types_1.UserRole.COORDINATOR) {
                    throw new apiError_1.ApiError(`The selected coordinator (ID: ${updateData.coordinatorId}) does not exist or is not a coordinator. Please select a valid coordinator.`, "USER_015", 400);
                }
            }
            if (updateData.password) {
                updateData.passwordHash = updateData.password;
                delete updateData.password;
            }
            if (updateData.delegateCode === "")
                updateData.delegateCode = undefined;
            if (updateData.coordinatorCode === "")
                updateData.coordinatorCode = undefined;
            await user.update(updateData);
            const updatedUser = await models_1.User.findByPk(id, {
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
        }
        catch (error) {
            logger_1.default.error("Error updating user:", error);
            if (error instanceof apiError_1.ApiError) {
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
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const user = await models_1.User.findByPk(id);
            if (!user) {
                throw new apiError_1.ApiError("User not found", "USER_016", 404);
            }
            if (user.role === types_1.UserRole.COORDINATOR) {
                const delegateCount = await models_1.User.count({
                    where: { coordinatorId: id },
                });
                if (delegateCount > 0) {
                    throw new apiError_1.ApiError(`Cannot delete coordinator "${user.firstName} ${user.lastName}" because they have ${delegateCount} active delegate(s). Please reassign or delete the delegates first.`, "USER_017", 400);
                }
            }
            if (user.role === types_1.UserRole.DELEGATE) {
                const memberCount = await models_1.User.count({ where: { delegateId: id } });
                if (memberCount > 0) {
                    throw new apiError_1.ApiError(`Cannot delete delegate "${user.firstName} ${user.lastName}" because they have ${memberCount} active member(s). Please reassign or delete the members first.`, "USER_018", 400);
                }
            }
            await user.destroy();
            res.status(200).json({
                success: true,
                message: "User deleted successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error deleting user:", error);
            if (error instanceof apiError_1.ApiError) {
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
    static async getMembersPendingVerification(req, res) {
        try {
            const { page = 1, limit = 20, search = "", filter = "all" } = req.query;
            const pageNumber = parseInt(page);
            const limitNumber = parseInt(limit);
            const offset = (pageNumber - 1) * limitNumber;
            const whereClause = {
                role: types_1.UserRole.MEMBER,
            };
            if (filter === "pending") {
                whereClause.membershipStatus = types_1.MembershipStatus.PENDING;
            }
            else if (filter === "verified") {
                whereClause.membershipStatus = types_1.MembershipStatus.ACTIVE;
            }
            else if (filter === "rejected") {
                whereClause.membershipStatus = types_1.MembershipStatus.SUSPENDED;
            }
            const searchConditions = [];
            if (search && typeof search === "string" && search.trim() !== "") {
                searchConditions.push({ firstName: { [sequelize_1.Op.iLike]: `%${search}%` } }, { lastName: { [sequelize_1.Op.iLike]: `%${search}%` } }, { otherNames: { [sequelize_1.Op.iLike]: `%${search}%` } }, { phoneNumber: { [sequelize_1.Op.iLike]: `%${search}%` } }, { idNumber: { [sequelize_1.Op.iLike]: `%${search}%` } }, { membershipNumber: { [sequelize_1.Op.iLike]: `%${search}%` } });
            }
            if (searchConditions.length > 0) {
                whereClause[sequelize_1.Op.or] = searchConditions;
            }
            const { count, rows: users } = await models_1.User.findAndCountAll({
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
                        model: models_1.Document,
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
        }
        catch (error) {
            logger_1.default.error("Error getting members pending verification:", error);
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
    static async getMemberVerificationDetails(req, res) {
        try {
            const { id } = req.params;
            const user = await models_1.User.findByPk(id, {
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
                        model: models_1.Document,
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
                        model: models_1.User,
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
                throw new apiError_1.ApiError("Member not found", "USER_019", 404);
            }
            if (user.role !== types_1.UserRole.MEMBER) {
                throw new apiError_1.ApiError("User is not a member", "USER_020", 400);
            }
            res.status(200).json({
                success: true,
                data: user,
                message: "Member verification details retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error getting member verification details:", error);
            if (error instanceof apiError_1.ApiError) {
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
    static async getHierarchyPerformance(req, res) {
        try {
            const coordinators = await models_1.User.findAll({
                where: { role: types_1.UserRole.COORDINATOR },
                attributes: ["id", "firstName", "lastName", "county", "createdAt"],
            });
            const hierarchyData = await Promise.all(coordinators.map(async (coordinator) => {
                const delegateCount = await models_1.User.count({
                    where: {
                        role: types_1.UserRole.DELEGATE,
                        coordinatorId: coordinator.id,
                    },
                });
                const totalMembers = await models_1.User.count({
                    where: {
                        role: types_1.UserRole.MEMBER,
                        coordinatorId: coordinator.id,
                    },
                });
                const activeMembers = await models_1.User.count({
                    where: {
                        role: types_1.UserRole.MEMBER,
                        coordinatorId: coordinator.id,
                        membershipStatus: types_1.MembershipStatus.ACTIVE,
                    },
                });
                const activeRate = totalMembers > 0
                    ? Math.round((activeMembers / totalMembers) * 100)
                    : 0;
                let performance = 0;
                if (activeRate >= 90)
                    performance = 1;
                else if (activeRate >= 80)
                    performance = 0;
                else
                    performance = -1;
                return {
                    id: coordinator.id,
                    name: `${coordinator.firstName} ${coordinator.lastName}`,
                    region: coordinator.county || "Unknown Region",
                    delegates: delegateCount,
                    totalMembers,
                    activeRate,
                    performance,
                };
            }));
            res.status(200).json({
                success: true,
                data: hierarchyData,
                message: "Hierarchy performance data retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error getting hierarchy performance:", error);
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
    static async verifyMember(req, res) {
        try {
            const { id } = req.params;
            const { action, documentId, reason, notes } = req.body;
            const user = await models_1.User.findByPk(id);
            if (!user) {
                throw new apiError_1.ApiError("Member not found", "USER_021", 404);
            }
            if (user.role !== types_1.UserRole.MEMBER) {
                throw new apiError_1.ApiError("User is not a member", "USER_022", 400);
            }
            if (action === "approve") {
                const documents = await models_1.Document.findAll({
                    where: { userId: id, entityType: "user" },
                });
                const requiredDocuments = ["identity", "photo"];
                const verifiedDocuments = documents.filter((doc) => doc.status === types_1.DocumentStatus.VERIFIED);
                if (verifiedDocuments.length < requiredDocuments.length) {
                    throw new apiError_1.ApiError("Cannot approve member: Not all required documents are verified", "VERIFY_001", 400);
                }
                await user.update({
                    membershipStatus: types_1.MembershipStatus.ACTIVE,
                    membershipDate: new Date(),
                });
                res.status(200).json({
                    success: true,
                    message: "Member verified and activated successfully",
                    timestamp: new Date().toISOString(),
                });
            }
            else if (action === "reject") {
                if (!reason) {
                    throw new apiError_1.ApiError("Rejection reason is required", "VERIFY_002", 400);
                }
                await user.update({
                    membershipStatus: types_1.MembershipStatus.SUSPENDED,
                });
                res.status(200).json({
                    success: true,
                    message: "Member verification rejected",
                    timestamp: new Date().toISOString(),
                });
            }
            else if (action === "verifyDocument") {
                if (!documentId) {
                    throw new apiError_1.ApiError("Document ID is required", "VERIFY_003", 400);
                }
                const document = await models_1.Document.findByPk(documentId);
                if (!document || document.userId !== id) {
                    throw new apiError_1.ApiError("Document not found", "VERIFY_004", 404);
                }
                await document.update({
                    status: types_1.DocumentStatus.VERIFIED,
                    verifiedAt: new Date(),
                    verifiedBy: req.user?.id,
                });
                res.status(200).json({
                    success: true,
                    message: "Document verified successfully",
                    timestamp: new Date().toISOString(),
                });
            }
            else if (action === "rejectDocument") {
                if (!documentId || !reason) {
                    throw new apiError_1.ApiError("Document ID and rejection reason are required", "VERIFY_005", 400);
                }
                const document = await models_1.Document.findByPk(documentId);
                if (!document || document.userId !== id) {
                    throw new apiError_1.ApiError("Document not found", "VERIFY_006", 404);
                }
                await document.update({
                    status: types_1.DocumentStatus.REJECTED,
                    rejectionReason: reason,
                    verifiedAt: new Date(),
                    verifiedBy: req.user?.id,
                });
                res.status(200).json({
                    success: true,
                    message: "Document rejected successfully",
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                throw new apiError_1.ApiError("Invalid action", "VERIFY_007", 400);
            }
        }
        catch (error) {
            logger_1.default.error("Error verifying member:", error);
            if (error instanceof apiError_1.ApiError) {
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
    static async getDelegatesByCoordinator(req, res) {
        try {
            const { coordinatorId } = req.params;
            const { page = 1, limit = 20, search = "" } = req.query;
            const pageNumber = parseInt(page);
            const limitNumber = parseInt(limit);
            const offset = (pageNumber - 1) * limitNumber;
            const coordinator = await models_1.User.findByPk(coordinatorId);
            if (!coordinator || coordinator.role !== types_1.UserRole.COORDINATOR) {
                throw new apiError_1.ApiError("Coordinator not found", "USER_023", 404);
            }
            const whereClause = {
                role: types_1.UserRole.DELEGATE,
                coordinatorId: coordinatorId,
            };
            const searchConditions = [];
            if (search && typeof search === "string" && search.trim() !== "") {
                searchConditions.push({ firstName: { [sequelize_1.Op.iLike]: `%${search}%` } }, { lastName: { [sequelize_1.Op.iLike]: `%${search}%` } }, { otherNames: { [sequelize_1.Op.iLike]: `%${search}%` } }, { phoneNumber: { [sequelize_1.Op.iLike]: `%${search}%` } }, { delegateCode: { [sequelize_1.Op.iLike]: `%${search}%` } });
            }
            if (searchConditions.length > 0) {
                whereClause[sequelize_1.Op.or] = searchConditions;
            }
            const { count, rows: delegates } = await models_1.User.findAndCountAll({
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
        }
        catch (error) {
            logger_1.default.error("Error getting delegates by coordinator:", error);
            if (error instanceof apiError_1.ApiError) {
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
    static async getMembersByDelegate(req, res) {
        try {
            const { delegateId } = req.params;
            const { page = 1, limit = 20, search = "" } = req.query;
            const pageNumber = parseInt(page);
            const limitNumber = parseInt(limit);
            const offset = (pageNumber - 1) * limitNumber;
            const delegate = await models_1.User.findByPk(delegateId);
            if (!delegate || delegate.role !== types_1.UserRole.DELEGATE) {
                throw new apiError_1.ApiError("Delegate not found", "USER_024", 404);
            }
            const whereClause = {
                role: types_1.UserRole.MEMBER,
                delegateId: delegateId,
            };
            const searchConditions = [];
            if (search && typeof search === "string" && search.trim() !== "") {
                searchConditions.push({ firstName: { [sequelize_1.Op.iLike]: `%${search}%` } }, { lastName: { [sequelize_1.Op.iLike]: `%${search}%` } }, { otherNames: { [sequelize_1.Op.iLike]: `%${search}%` } }, { phoneNumber: { [sequelize_1.Op.iLike]: `%${search}%` } }, { membershipNumber: { [sequelize_1.Op.iLike]: `%${search}%` } });
            }
            if (searchConditions.length > 0) {
                whereClause[sequelize_1.Op.or] = searchConditions;
            }
            const { count, rows: members } = await models_1.User.findAndCountAll({
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
        }
        catch (error) {
            logger_1.default.error("Error getting members by delegate:", error);
            if (error instanceof apiError_1.ApiError) {
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
exports.AdminController = AdminController;
//# sourceMappingURL=AdminController.js.map