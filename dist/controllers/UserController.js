"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const models_1 = require("../models");
const apiError_1 = require("../utils/apiError");
const logger_1 = __importDefault(require("../utils/logger"));
const joi_1 = __importDefault(require("joi"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = require("../config");
const sequelize_1 = require("sequelize");
const types_1 = require("../types");
const updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-Z\s]+$/)
        .optional()
        .messages({
        "string.min": "First name must be at least 2 characters long",
        "string.max": "First name cannot exceed 100 characters",
        "string.pattern.base": "First name should only contain letters and spaces",
    }),
    lastName: joi_1.default.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-Z\s]+$/)
        .optional()
        .messages({
        "string.min": "Last name must be at least 2 characters long",
        "string.max": "Last name cannot exceed 100 characters",
        "string.pattern.base": "Last name should only contain letters and spaces",
    }),
    otherNames: joi_1.default.string()
        .max(100)
        .pattern(/^[a-zA-Z\s]*$/)
        .allow("")
        .optional()
        .messages({
        "string.max": "Other names cannot exceed 100 characters",
        "string.pattern.base": "Other names should only contain letters and spaces",
    }),
    email: joi_1.default.string().email().optional().messages({
        "string.email": "Email must be a valid email address",
    }),
    phoneNumber: joi_1.default.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .optional()
        .messages({
        "string.pattern.base": "Phone number must be in valid E.164 format",
    }),
    gender: joi_1.default.string().valid("Male", "Female").optional().messages({
        "any.only": "Gender must be either Male or Female",
    }),
    county: joi_1.default.string().max(100).optional(),
    sacco: joi_1.default.string().max(100).optional(),
    route: joi_1.default.string().max(100).optional(),
});
const changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string().required().messages({
        "any.required": "Current password is required",
    }),
    newPassword: joi_1.default.string().min(8).required().messages({
        "string.min": "New password must be at least 8 characters long",
        "any.required": "New password is required",
    }),
    confirmPassword: joi_1.default.string()
        .valid(joi_1.default.ref("newPassword"))
        .required()
        .messages({
        "any.only": "Passwords do not match",
        "any.required": "Password confirmation is required",
    }),
});
class UserController {
    static async getProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const user = await models_1.User.findByPk(userId, {
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
                throw new apiError_1.ApiError("User not found", "USER_001", 404);
            }
            res.status(200).json({
                success: true,
                data: user,
                message: "Profile retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error getting user profile:", error);
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
    static async updateProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const { error, value } = updateProfileSchema.validate(req.body);
            if (error) {
                throw new apiError_1.ApiError(error.details[0].message, "VAL_001", 400);
            }
            const user = await models_1.User.findByPk(userId);
            if (!user) {
                throw new apiError_1.ApiError("User not found", "USER_001", 404);
            }
            if (value.phoneNumber && value.phoneNumber !== user.phoneNumber) {
                const existingUser = await models_1.User.findOne({
                    where: { phoneNumber: value.phoneNumber },
                });
                if (existingUser && existingUser.id !== userId) {
                    throw new apiError_1.ApiError("Phone number is already in use", "USER_002", 400);
                }
            }
            if (value.email && value.email !== user.email) {
                const existingUser = await models_1.User.findOne({
                    where: { email: value.email },
                });
                if (existingUser && existingUser.id !== userId) {
                    throw new apiError_1.ApiError("Email is already in use", "USER_003", 400);
                }
            }
            await user.update(value);
            const updatedUser = await models_1.User.findByPk(userId, {
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
        }
        catch (error) {
            logger_1.default.error("Error updating user profile:", error);
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
    static async changePassword(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const { error, value } = changePasswordSchema.validate(req.body);
            if (error) {
                throw new apiError_1.ApiError(error.details[0].message, "VAL_001", 400);
            }
            const user = await models_1.User.findByPk(userId);
            if (!user) {
                throw new apiError_1.ApiError("User not found", "USER_001", 404);
            }
            const isCurrentPasswordValid = await user.validatePassword(value.currentPassword);
            if (!isCurrentPasswordValid) {
                throw new apiError_1.ApiError("Current password is incorrect", "USER_004", 400);
            }
            await user.updatePassword(value.newPassword);
            res.status(200).json({
                success: true,
                message: "Password changed successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error changing password:", error);
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
    static async getDependants(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const user = await models_1.User.findByPk(userId);
            if (!user) {
                throw new apiError_1.ApiError("User not found", "USER_001", 404);
            }
            res.status(200).json({
                success: true,
                data: [],
                message: "Dependants retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error getting dependants:", error);
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
    static async getDocuments(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const user = await models_1.User.findByPk(userId);
            if (!user) {
                throw new apiError_1.ApiError("User not found", "USER_001", 404);
            }
            res.status(200).json({
                success: true,
                data: [],
                message: "Documents retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error getting documents:", error);
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
    static async getDelegate(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const user = await models_1.User.findByPk(userId);
            if (!user) {
                throw new apiError_1.ApiError("User not found", "USER_001", 404);
            }
            if (user.role !== "member") {
                throw new apiError_1.ApiError("Only members can access delegate information", "USER_002", 403);
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
            const delegate = await models_1.User.findByPk(user.delegateId, {
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
        }
        catch (error) {
            logger_1.default.error("Error getting delegate information:", error);
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
    static async getMyDelegates(req, res) {
        try {
            const coordinatorId = req.user?.id;
            const { page = 1, limit = 10, search = "" } = req.query;
            if (!coordinatorId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const whereConditions = {
                coordinatorId,
                role: types_1.UserRole.DELEGATE,
            };
            if (search) {
                whereConditions[sequelize_1.Op.or] = [
                    { firstName: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { lastName: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { phoneNumber: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { delegateCode: { [sequelize_1.Op.iLike]: `%${search}%` } },
                ];
            }
            const offset = (Number(page) - 1) * Number(limit);
            const { count, rows: delegates } = await models_1.User.findAndCountAll({
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
            const delegatesWithStats = await Promise.all(delegates.map(async (delegate) => {
                const memberCount = await models_1.User.count({
                    where: {
                        delegateId: delegate.id,
                        role: types_1.UserRole.MEMBER,
                    },
                });
                return {
                    ...delegate.toJSON(),
                    memberCount,
                };
            }));
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
        }
        catch (error) {
            logger_1.default.error("Error getting delegates:", error);
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
    static async getMyMembers(req, res) {
        try {
            const delegateId = req.user?.id;
            const { page = 1, limit = 10, search = "" } = req.query;
            if (!delegateId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const whereConditions = {
                delegateId,
                role: types_1.UserRole.MEMBER,
            };
            if (search) {
                whereConditions[sequelize_1.Op.or] = [
                    { firstName: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { lastName: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { phoneNumber: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { membershipNumber: { [sequelize_1.Op.iLike]: `%${search}%` } },
                ];
            }
            const offset = (Number(page) - 1) * Number(limit);
            const { count, rows: members } = await models_1.User.findAndCountAll({
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
        }
        catch (error) {
            logger_1.default.error("Error getting members:", error);
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
            const coordinatorId = req.user?.id;
            const { delegateId } = req.params;
            const { page = 1, limit = 10, search = "" } = req.query;
            if (!coordinatorId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            if (!delegateId) {
                throw new apiError_1.ApiError("Delegate ID is required", "VAL_001", 400);
            }
            const delegate = await models_1.User.findOne({
                where: {
                    id: delegateId,
                    coordinatorId,
                    role: types_1.UserRole.DELEGATE,
                    isActive: true,
                },
            });
            if (!delegate) {
                throw new apiError_1.ApiError("Delegate not found, not assigned to you, or is inactive", "USER_001", 404);
            }
            const whereConditions = {
                delegateId,
                role: types_1.UserRole.MEMBER,
                isActive: true,
            };
            if (search) {
                whereConditions[sequelize_1.Op.or] = [
                    { firstName: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { lastName: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { phoneNumber: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { membershipNumber: { [sequelize_1.Op.iLike]: `%${search}%` } },
                ];
            }
            const offset = (Number(page) - 1) * Number(limit);
            const { count, rows: members } = await models_1.User.findAndCountAll({
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
    static async createDelegate(req, res) {
        try {
            const coordinatorId = req.user?.id;
            const { firstName, lastName, otherNames, email, phoneNumber, idNumber, gender, county, sacco, route, password, } = req.body;
            if (!coordinatorId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            if (!firstName || !lastName || !phoneNumber || !idNumber || !password) {
                throw new apiError_1.ApiError("Missing required fields: firstName, lastName, phoneNumber, idNumber, and password are required", "VAL_001", 400);
            }
            const existingUser = await models_1.User.findOne({
                where: {
                    [sequelize_1.Op.or]: [{ phoneNumber }, { idNumber }],
                },
            });
            if (existingUser) {
                if (existingUser.phoneNumber === phoneNumber) {
                    throw new apiError_1.ApiError("Phone number is already in use", "USER_002", 400);
                }
                if (existingUser.idNumber === idNumber) {
                    throw new apiError_1.ApiError("ID number is already in use", "USER_006", 400);
                }
            }
            if (email) {
                const existingEmail = await models_1.User.findOne({ where: { email } });
                if (existingEmail) {
                    throw new apiError_1.ApiError("Email is already in use", "USER_003", 400);
                }
            }
            const delegateCode = models_1.User.generateDelegateCode();
            const newDelegate = await models_1.User.create({
                firstName,
                lastName,
                otherNames,
                email,
                phoneNumber,
                idNumber,
                passwordHash: await bcrypt_1.default.hash(password, config_1.config.security.bcryptRounds),
                gender,
                county,
                sacco,
                route,
                role: types_1.UserRole.DELEGATE,
                coordinatorId,
                delegateCode,
                membershipStatus: types_1.MembershipStatus.ACTIVE,
                isActive: true,
                isEmailVerified: false,
                isPhoneVerified: false,
                isIdNumberVerified: false,
            });
            const delegateData = await models_1.User.findByPk(newDelegate.id, {
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
        }
        catch (error) {
            logger_1.default.error("Error creating delegate:", error);
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
    static async updateDelegate(req, res) {
        try {
            const coordinatorId = req.user?.id;
            const { delegateId } = req.params;
            const updateData = req.body;
            if (!coordinatorId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const delegate = await models_1.User.findOne({
                where: {
                    id: delegateId,
                    coordinatorId,
                    role: types_1.UserRole.DELEGATE,
                },
            });
            if (!delegate) {
                throw new apiError_1.ApiError("Delegate not found", "USER_001", 404);
            }
            if (updateData.phoneNumber &&
                updateData.phoneNumber !== delegate.phoneNumber) {
                const existingUser = await models_1.User.findOne({
                    where: { phoneNumber: updateData.phoneNumber },
                });
                if (existingUser && existingUser.id !== delegateId) {
                    throw new apiError_1.ApiError("Phone number is already in use", "USER_002", 400);
                }
            }
            if (updateData.email && updateData.email !== delegate.email) {
                const existingUser = await models_1.User.findOne({
                    where: { email: updateData.email },
                });
                if (existingUser && existingUser.id !== delegateId) {
                    throw new apiError_1.ApiError("Email is already in use", "USER_003", 400);
                }
            }
            await delegate.update(updateData);
            const updatedDelegate = await models_1.User.findByPk(delegateId, {
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
        }
        catch (error) {
            logger_1.default.error("Error updating delegate:", error);
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
    static async deactivateDelegate(req, res) {
        try {
            const coordinatorId = req.user?.id;
            const { delegateId } = req.params;
            if (!coordinatorId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const delegate = await models_1.User.findOne({
                where: {
                    id: delegateId,
                    coordinatorId,
                    role: types_1.UserRole.DELEGATE,
                },
            });
            if (!delegate) {
                throw new apiError_1.ApiError("Delegate not found", "USER_001", 404);
            }
            const memberCount = await models_1.User.count({
                where: {
                    delegateId,
                    role: types_1.UserRole.MEMBER,
                    isActive: true,
                },
            });
            if (memberCount > 0) {
                throw new apiError_1.ApiError("Cannot deactivate delegate with active members. Please reassign members first.", "USER_007", 400);
            }
            await delegate.update({ isActive: false });
            res.status(200).json({
                success: true,
                message: "Delegate deactivated successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error deactivating delegate:", error);
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
    static async getDelegateStats(req, res) {
        try {
            const delegateId = req.user?.id;
            if (!delegateId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const totalMembers = await models_1.User.count({
                where: { delegateId, role: types_1.UserRole.MEMBER },
            });
            const activeMembers = await models_1.User.count({
                where: { delegateId, role: types_1.UserRole.MEMBER, isActive: true },
            });
            const newMembersThisMonth = await models_1.User.count({
                where: {
                    delegateId,
                    role: types_1.UserRole.MEMBER,
                    createdAt: {
                        [sequelize_1.Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
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
                    totalCollections: 0,
                    todaysCollections: 0,
                    commission: 0,
                },
                message: "Delegate statistics retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error getting delegate stats:", error);
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
    static async getCoordinatorStats(req, res) {
        try {
            const coordinatorId = req.user?.id;
            if (!coordinatorId) {
                throw new apiError_1.ApiError("User not authenticated", "AUTH_001", 401);
            }
            const totalDelegates = await models_1.User.count({
                where: { coordinatorId, role: types_1.UserRole.DELEGATE },
            });
            const activeDelegates = await models_1.User.count({
                where: { coordinatorId, role: types_1.UserRole.DELEGATE, isActive: true },
            });
            const delegates = await models_1.User.findAll({
                where: { coordinatorId, role: types_1.UserRole.DELEGATE },
                attributes: ["id"],
            });
            const delegateIds = delegates.map((d) => d.id);
            const totalMembers = await models_1.User.count({
                where: { delegateId: { [sequelize_1.Op.in]: delegateIds }, role: types_1.UserRole.MEMBER },
            });
            const activeMembers = await models_1.User.count({
                where: {
                    delegateId: { [sequelize_1.Op.in]: delegateIds },
                    role: types_1.UserRole.MEMBER,
                    isActive: true,
                },
            });
            const newMembersThisMonth = await models_1.User.count({
                where: {
                    delegateId: { [sequelize_1.Op.in]: delegateIds },
                    role: types_1.UserRole.MEMBER,
                    createdAt: {
                        [sequelize_1.Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            });
            const delegatesWithStats = await Promise.all(delegates.map(async (delegate) => {
                const memberCount = await models_1.User.count({
                    where: {
                        delegateId: delegate.id,
                        role: types_1.UserRole.MEMBER,
                    },
                });
                return { id: delegate.id, memberCount };
            }));
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
                    delegatesWithStats,
                    totalRevenue: 0,
                    todaysRevenue: 0,
                    commission: 0,
                },
                message: "Coordinator statistics retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error getting coordinator stats:", error);
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
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map