"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
const jwt_1 = require("../utils/jwt");
const apiError_1 = require("../utils/apiError");
const redis_1 = require("../config/redis");
const types_1 = require("../types");
const logger_1 = __importStar(require("../utils/logger"));
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../utils/emailService");
const smsService_1 = require("../utils/smsService");
class AuthService {
    static async login(credentials, ipAddress, userAgent) {
        try {
            const { phoneNumber, identifier, password, isAdminLogin } = credentials;
            const loginIdentifier = phoneNumber || identifier;
            logger_1.default.info("Login attempt", {
                phoneNumber,
                identifier,
                hasPassword: !!password,
                isAdminLogin,
                ipAddress,
                userAgent,
            });
            if (!loginIdentifier) {
                throw new apiError_1.ApiError(isAdminLogin
                    ? "Email or ID number is required"
                    : "Phone number or ID number is required", "AUTH_001", 400);
            }
            const loginAttemptKey = `login_attempts:${loginIdentifier}`;
            const attempts = await redis_1.redisUtils.get(loginAttemptKey);
            if (attempts && parseInt(attempts) >= 5) {
                (0, logger_1.securityLogger)("LOGIN_RATE_LIMIT_EXCEEDED", {
                    loginIdentifier,
                    ipAddress,
                    userAgent,
                });
                throw apiError_1.ApiError.rateLimitExceeded();
            }
            let user = null;
            if (isAdminLogin) {
                if (phoneNumber) {
                    throw new apiError_1.ApiError("Phone number login is not allowed for admin users. Please use email or ID number.", "AUTH_002", 400);
                }
                const isEmail = identifier && identifier.includes("@");
                if (isEmail) {
                    logger_1.default.info("Admin login: searching by email", { email: identifier });
                    user = await models_1.User.findOne({
                        where: { email: identifier },
                        include: [
                            {
                                model: models_1.User,
                                as: "delegate",
                                attributes: ["id", "firstName", "lastName", "delegateCode"],
                            },
                            {
                                model: models_1.User,
                                as: "coordinator",
                                attributes: ["id", "firstName", "lastName", "coordinatorCode"],
                            },
                        ],
                    });
                }
                else {
                    logger_1.default.info("Admin login: searching by ID number", {
                        idNumber: identifier,
                    });
                    user = await models_1.User.findOne({
                        where: { idNumber: identifier },
                        include: [
                            {
                                model: models_1.User,
                                as: "delegate",
                                attributes: ["id", "firstName", "lastName", "delegateCode"],
                            },
                            {
                                model: models_1.User,
                                as: "coordinator",
                                attributes: ["id", "firstName", "lastName", "coordinatorCode"],
                            },
                        ],
                    });
                }
                if (user && !["admin", "superadmin"].includes(user.role)) {
                    (0, logger_1.securityLogger)("NON_ADMIN_LOGIN_ATTEMPT", {
                        userId: user.id,
                        role: user.role,
                        loginIdentifier,
                        ipAddress,
                        userAgent,
                    });
                    throw new apiError_1.ApiError("Access denied. Admin privileges required.", "AUTH_003", 403);
                }
            }
            else {
                const isLikelyPhoneNumber = phoneNumber ||
                    (identifier &&
                        (identifier.length > 8 ||
                            identifier.includes("+") ||
                            identifier.includes("-") ||
                            identifier.includes(" ")));
                const isLikelyIdNumber = identifier && identifier.length === 8 && /^\d{8}$/.test(identifier);
                logger_1.default.info("User search strategy", {
                    isLikelyPhoneNumber,
                    isLikelyIdNumber,
                    phoneNumber,
                    identifier,
                });
                if (phoneNumber || isLikelyPhoneNumber) {
                    const searchPhone = phoneNumber || identifier;
                    logger_1.default.info("Searching by phone number", { searchPhone });
                    user = await models_1.User.findOne({
                        where: { phoneNumber: searchPhone },
                        include: [
                            {
                                model: models_1.User,
                                as: "delegate",
                                attributes: ["id", "firstName", "lastName", "delegateCode"],
                            },
                            {
                                model: models_1.User,
                                as: "coordinator",
                                attributes: ["id", "firstName", "lastName", "coordinatorCode"],
                            },
                        ],
                    });
                    logger_1.default.info("Phone number search result", {
                        found: !!user,
                        userId: user?.id,
                    });
                }
                if (!user && (identifier || isLikelyIdNumber)) {
                    const searchId = identifier;
                    logger_1.default.info("Searching by ID number", { searchId });
                    user = await models_1.User.findOne({
                        where: { idNumber: searchId },
                        include: [
                            {
                                model: models_1.User,
                                as: "delegate",
                                attributes: ["id", "firstName", "lastName", "delegateCode"],
                            },
                            {
                                model: models_1.User,
                                as: "coordinator",
                                attributes: ["id", "firstName", "lastName", "coordinatorCode"],
                            },
                        ],
                    });
                    logger_1.default.info("ID number search result", {
                        found: !!user,
                        userId: user?.id,
                    });
                }
                if (!user && identifier) {
                    logger_1.default.info("Attempting broader search", { identifier });
                    user = await models_1.User.findOne({
                        where: {
                            [sequelize_1.Op.or]: [{ phoneNumber: identifier }, { idNumber: identifier }],
                        },
                        include: [
                            {
                                model: models_1.User,
                                as: "delegate",
                                attributes: ["id", "firstName", "lastName", "delegateCode"],
                            },
                            {
                                model: models_1.User,
                                as: "coordinator",
                                attributes: ["id", "firstName", "lastName", "coordinatorCode"],
                            },
                        ],
                    });
                    logger_1.default.info("Broader search result", {
                        found: !!user,
                        userId: user?.id,
                    });
                }
            }
            if (!user) {
                await this.recordFailedLogin(loginIdentifier, ipAddress, userAgent);
                throw new apiError_1.ApiError(isAdminLogin
                    ? "Invalid email/ID number or password"
                    : "Invalid Phone/ID number or Password", "AUTH_001", 401);
            }
            if (!user.isActive) {
                (0, logger_1.securityLogger)("INACTIVE_USER_LOGIN_ATTEMPT", {
                    userId: user.id,
                    loginIdentifier,
                    ipAddress,
                    userAgent,
                });
                throw apiError_1.ApiError.accountLocked("Account is inactive");
            }
            const isValidPassword = await user.validatePassword(password);
            if (!isValidPassword) {
                await this.recordFailedLogin(loginIdentifier, ipAddress, userAgent);
                throw new apiError_1.ApiError(isAdminLogin
                    ? "Invalid email/ID number or password"
                    : "Invalid Phone/ID number or Password", "AUTH_001", 401);
            }
            await redis_1.redisUtils.del(loginAttemptKey);
            const sessionId = jwt_1.JWTUtils.generateSessionId();
            const accessToken = jwt_1.JWTUtils.generateAccessToken({
                userId: user.id,
                role: user.role,
                sessionId,
            });
            const refreshToken = jwt_1.JWTUtils.generateRefreshToken({
                userId: user.id,
                sessionId,
            });
            await jwt_1.JWTUtils.storeTokenSession(sessionId, user.id, accessToken, refreshToken);
            await user.update({
                refreshToken,
                lastLogin: new Date(),
            });
            (0, logger_1.auditLogger)("USER_LOGIN", user.id, {
                ipAddress,
                userAgent,
                sessionId,
            });
            const userResponse = user.toJSON();
            delete userResponse.passwordHash;
            delete userResponse.refreshToken;
            return {
                success: true,
                data: {
                    user: userResponse,
                    tokens: {
                        accessToken,
                        refreshToken,
                        expiresIn: "24h",
                    },
                },
            };
        }
        catch (error) {
            if (error instanceof apiError_1.ApiError) {
                return {
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        statusCode: error.statusCode,
                    },
                };
            }
            logger_1.default.error("Login error:", error);
            return {
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                    statusCode: 500,
                },
            };
        }
    }
    static async refreshToken(refreshToken) {
        try {
            const decoded = await jwt_1.JWTUtils.verifyRefreshToken(refreshToken);
            if (!decoded) {
                throw apiError_1.ApiError.invalidToken("Invalid refresh token");
            }
            const user = await models_1.User.findByPk(decoded.userId);
            if (!user || !user.isActive || user.refreshToken !== refreshToken) {
                throw apiError_1.ApiError.invalidToken("Invalid refresh token");
            }
            const newSessionId = jwt_1.JWTUtils.generateSessionId();
            const newAccessToken = jwt_1.JWTUtils.generateAccessToken({
                userId: user.id,
                role: user.role,
                sessionId: newSessionId,
            });
            const newRefreshToken = jwt_1.JWTUtils.generateRefreshToken({
                userId: user.id,
                sessionId: newSessionId,
            });
            await jwt_1.JWTUtils.invalidateSession(decoded.sessionId);
            await jwt_1.JWTUtils.storeTokenSession(newSessionId, user.id, newAccessToken, newRefreshToken);
            await user.update({ refreshToken: newRefreshToken });
            (0, logger_1.auditLogger)("TOKEN_REFRESH", user.id, { sessionId: newSessionId });
            return {
                success: true,
                data: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    expiresIn: "24h",
                },
            };
        }
        catch (error) {
            if (error instanceof apiError_1.ApiError) {
                return {
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        statusCode: error.statusCode,
                    },
                };
            }
            logger_1.default.error("Token refresh error:", error);
            return {
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                    statusCode: 500,
                },
            };
        }
    }
    static async logout(userId, sessionId) {
        try {
            await jwt_1.JWTUtils.invalidateSession(sessionId);
            await models_1.User.update({ refreshToken: undefined }, { where: { id: userId } });
            (0, logger_1.auditLogger)("USER_LOGOUT", userId, { sessionId });
            return { success: true };
        }
        catch (error) {
            logger_1.default.error("Logout error:", error);
            return {
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                    statusCode: 500,
                },
            };
        }
    }
    static async register(userData, registeredBy) {
        try {
            await this.validateRegistrationRequirements(userData);
            const existingUser = await models_1.User.findOne({
                where: {
                    [sequelize_1.Op.or]: [
                        { phoneNumber: userData.phoneNumber },
                        { idNumber: userData.idNumber },
                        ...(userData.email ? [{ email: userData.email }] : []),
                    ],
                },
            });
            if (existingUser) {
                if (existingUser.phoneNumber === userData.phoneNumber) {
                    throw apiError_1.ApiError.duplicate("Phone number");
                }
                if (existingUser.idNumber === userData.idNumber) {
                    throw apiError_1.ApiError.duplicate("ID number");
                }
                if (existingUser.email === userData.email) {
                    throw apiError_1.ApiError.duplicate("Email address");
                }
            }
            const passwordHash = await models_1.User.hashPassword(userData.password);
            let delegateId;
            let coordinatorId;
            let delegate = null;
            let coordinator = null;
            if (userData.role === types_1.UserRole.MEMBER && userData.delegateCode) {
                delegate = await models_1.User.findByDelegateCode(userData.delegateCode);
                if (!delegate) {
                    throw apiError_1.ApiError.invalidDelegateCode();
                }
                delegateId = delegate.id;
                coordinatorId = delegate.coordinatorId;
                if (coordinatorId) {
                    coordinator = await models_1.User.findByPk(coordinatorId);
                }
            }
            else if (userData.role === types_1.UserRole.DELEGATE &&
                userData.coordinatorCode) {
                coordinator = await models_1.User.findByCoordinatorCode(userData.coordinatorCode);
                if (!coordinator) {
                    throw new apiError_1.ApiError("Invalid coordinator code", "BUS_002", 400);
                }
                coordinatorId = coordinator.id;
            }
            const user = await models_1.User.create({
                firstName: userData.firstName,
                lastName: userData.lastName,
                otherNames: userData.otherNames,
                email: userData.email,
                phoneNumber: userData.phoneNumber,
                idNumber: userData.idNumber,
                passwordHash,
                gender: userData.gender,
                county: userData.county,
                sacco: userData.sacco,
                route: userData.route,
                role: userData.role,
                delegateId,
                coordinatorId,
                membershipStatus: userData.role === types_1.UserRole.MEMBER
                    ? types_1.MembershipStatus.PENDING
                    : types_1.MembershipStatus.ACTIVE,
                isActive: true,
                isEmailVerified: false,
                isPhoneVerified: false,
                isIdNumberVerified: false,
            });
            (0, logger_1.auditLogger)("USER_REGISTRATION", user.id, {
                role: userData.role,
                registeredBy,
                membershipNumber: user.membershipNumber,
            });
            try {
                if (userData.role === types_1.UserRole.MEMBER &&
                    delegate &&
                    user.membershipNumber) {
                    const smsSent = await smsService_1.smsService.sendRegistrationSuccessSMS(userData.phoneNumber, {
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        idNumber: userData.idNumber,
                        membershipNumber: user.membershipNumber,
                        sacco: userData.sacco || "N/A",
                        delegateName: delegate.fullName,
                        delegateCode: userData.delegateCode,
                        role: userData.role,
                    });
                    if (smsSent) {
                        logger_1.default.info(`Registration success SMS sent to ${userData.phoneNumber}`);
                    }
                    else {
                        logger_1.default.warn(`Failed to send registration success SMS to ${userData.phoneNumber}`);
                    }
                    const welcomeSmsSent = await smsService_1.smsService.sendWelcomeSMS(userData.phoneNumber, {
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        membershipNumber: user.membershipNumber,
                        sacco: userData.sacco || "N/A",
                    });
                    if (welcomeSmsSent) {
                        logger_1.default.info(`Welcome SMS sent to ${userData.phoneNumber}`);
                    }
                    else {
                        logger_1.default.warn(`Failed to send welcome SMS to ${userData.phoneNumber}`);
                    }
                }
            }
            catch (smsError) {
                logger_1.default.error("SMS notification failed during registration:", smsError);
            }
            try {
                if (userData.email && user.membershipNumber) {
                    let delegateInfo = undefined;
                    if (delegate && userData.role === types_1.UserRole.MEMBER) {
                        delegateInfo = {
                            delegateName: delegate.fullName,
                            delegateContact: delegate.phoneNumber,
                            delegateCode: userData.delegateCode,
                        };
                    }
                    const emailSent = await emailService_1.emailService.sendWelcomeEmail(userData.email, userData.firstName, userData.lastName, user.membershipNumber, delegateInfo);
                    if (emailSent) {
                        logger_1.default.info(`Welcome email sent to ${userData.email}`);
                    }
                    else {
                        logger_1.default.warn(`Failed to send welcome email to ${userData.email}`);
                    }
                }
            }
            catch (emailError) {
                logger_1.default.error("Email notification failed during registration:", emailError);
            }
            const userResponse = user.toJSON();
            const requiresApproval = userData.role === types_1.UserRole.MEMBER;
            return {
                success: true,
                data: {
                    user: userResponse,
                    requiresApproval,
                },
            };
        }
        catch (error) {
            if (error instanceof apiError_1.ApiError) {
                return {
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        statusCode: error.statusCode,
                    },
                };
            }
            logger_1.default.error("Registration error:", error);
            return {
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                    statusCode: 500,
                },
            };
        }
    }
    static async requestPasswordReset(identifier) {
        try {
            const isEmail = identifier.includes("@");
            let user = null;
            if (isEmail) {
                user = await models_1.User.findOne({ where: { email: identifier } });
            }
            else {
                const formattedPhone = smsService_1.smsService.formatPhoneNumber(identifier);
                user = await models_1.User.findByPhone(formattedPhone);
            }
            if (!user) {
                return {
                    success: true,
                    data: {
                        message: isEmail
                            ? "If the email exists, a password reset link has been sent"
                            : "If the phone number exists, a password reset code has been sent",
                        method: isEmail ? "email" : "sms",
                    },
                };
            }
            const resetToken = crypto_1.default.randomBytes(32).toString("hex");
            const resetExpires = new Date(Date.now() + 10 * 60 * 1000);
            if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                const logMessage = [
                    "🔐 TOKEN GENERATION DEBUG",
                    `Generated raw token: ${resetToken}`,
                    `Token expires at: ${resetExpires}`,
                ].join("\n");
                console.log(logMessage);
                logger_1.default.info(logMessage);
            }
            await user.update({
                passwordResetToken: resetToken,
                passwordResetExpires: resetExpires,
            });
            let messageSent = false;
            let method = isEmail ? "email" : "sms";
            if (isEmail && user.email) {
                messageSent = await emailService_1.emailService.sendPasswordResetEmail(user.email, resetToken, user.firstName);
            }
            else {
                const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
                const phoneKey = user.phoneNumber;
                if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                    const logMessage = [
                        "🔐 PASSWORD RESET CODE STORAGE DEBUG",
                        `User Phone: ${user.phoneNumber}`,
                        `Phone Key: ${phoneKey}`,
                        `Reset Code: ${resetCode}`,
                        `Redis Key: reset_code:${phoneKey}`,
                        `Expiry: 600 seconds (10 minutes)`,
                    ].join("\n");
                    console.log(logMessage);
                    logger_1.default.info(logMessage);
                }
                await redis_1.redisUtils.setex(`reset_code:${phoneKey}`, resetCode, 600);
                await redis_1.redisUtils.setex(`reset_token:${resetToken}`, user.id, 600);
                messageSent = await smsService_1.smsService.sendPasswordResetSMS(user.phoneNumber, resetCode, user.firstName);
                if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                    const logMessage = `Password reset code for ${user.phoneNumber}: ${resetCode}`;
                    console.log(logMessage);
                    logger_1.default.info(logMessage);
                }
            }
            (0, logger_1.auditLogger)("PASSWORD_RESET_REQUEST", user.id, {
                identifier: isEmail ? user.email : user.phoneNumber,
                method,
            });
            if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                const logMessage = [
                    "🔐 PASSWORD RESET REQUEST PROCESSED",
                    `User: ${user.firstName} ${user.lastName} (ID: ${user.id})`,
                    `Method: ${method.toUpperCase()}`,
                    `Identifier: ${isEmail ? user.email : user.phoneNumber}`,
                    `Message Sent: ${messageSent ? "✅ Yes" : "❌ No"}`,
                    !isEmail
                        ? `📱 Check SMS logs above for the reset code`
                        : `📧 Check email logs above for the reset link`,
                ].join("\n");
                console.log(logMessage);
                logger_1.default.info(logMessage);
            }
            return {
                success: true,
                data: {
                    message: messageSent
                        ? isEmail
                            ? "Password reset link has been sent to your email"
                            : "Password reset code has been sent to your phone"
                        : isEmail
                            ? "Password reset token generated. Email delivery may be delayed."
                            : "Password reset code generated. SMS delivery may be delayed.",
                    method,
                },
            };
        }
        catch (error) {
            logger_1.default.error("Password reset request error:", error);
            return {
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                    statusCode: 500,
                },
            };
        }
    }
    static async resetPasswordWithToken(token, newPassword) {
        try {
            if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                const logMessage = [
                    "🔍 TOKEN VERIFICATION DEBUG",
                    `Raw token received: ${token}`,
                ].join("\n");
                console.log(logMessage);
                logger_1.default.info(logMessage);
            }
            const user = await models_1.User.findOne({
                where: {
                    passwordResetToken: token,
                    passwordResetExpires: {
                        [sequelize_1.Op.gt]: new Date(),
                    },
                },
            });
            if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                if (!user) {
                    const logMessage = [
                        "❌ No user found with matching token",
                        "Check if token has expired or was already used",
                    ].join("\n");
                    console.log(logMessage);
                    logger_1.default.info(logMessage);
                }
                else {
                    const logMessage = `✅ User found: ${user.firstName} ${user.lastName}`;
                    console.log(logMessage);
                    logger_1.default.info(logMessage);
                }
            }
            if (!user) {
                throw new apiError_1.ApiError("Invalid or expired reset token", "AUTH_003", 400);
            }
            await user.updatePassword(newPassword);
            await user.update({
                passwordResetToken: undefined,
                passwordResetExpires: undefined,
                refreshToken: undefined,
            });
            await redis_1.redisUtils.del(`reset_code:${user.phoneNumber}`);
            await redis_1.redisUtils.del(`reset_token:${token}`);
            await jwt_1.JWTUtils.invalidateAllUserSessions(user.id);
            (0, logger_1.auditLogger)("PASSWORD_RESET", user.id, { method: "token" });
            if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                const logMessage = [
                    "✅ PASSWORD RESET COMPLETED (EMAIL TOKEN)",
                    `User: ${user.firstName} ${user.lastName} (ID: ${user.id})`,
                    `Email: ${user.email}`,
                    `Token Used: ${token.substring(0, 8)}...`,
                    `All user sessions have been invalidated`,
                ].join("\n");
                console.log(logMessage);
                logger_1.default.info(logMessage);
            }
            return {
                success: true,
                data: {
                    message: "Password has been reset successfully",
                },
            };
        }
        catch (error) {
            if (error instanceof apiError_1.ApiError) {
                return {
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        statusCode: error.statusCode,
                    },
                };
            }
            logger_1.default.error("Password reset with token error:", error);
            return {
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                    statusCode: 500,
                },
            };
        }
    }
    static async resetPasswordWithCode(phoneNumber, resetCode, newPassword) {
        try {
            const formattedPhone = models_1.User.formatPhoneNumber(phoneNumber);
            const storedCode = await redis_1.redisUtils.get(`reset_code:${formattedPhone}`);
            if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                const logMessage = [
                    "🔐 PASSWORD RESET CODE VALIDATION DEBUG",
                    `Input Phone: ${phoneNumber}`,
                    `Formatted Phone: ${formattedPhone}`,
                    `Redis Key: reset_code:${formattedPhone}`,
                    `Stored Code: ${storedCode ? storedCode : "NOT FOUND"}`,
                    `Provided Code: ${resetCode}`,
                    `Codes Match: ${storedCode === resetCode ? "YES" : "NO"}`,
                ].join("\n");
                console.log(logMessage);
                logger_1.default.info(logMessage);
            }
            if (!storedCode || storedCode !== resetCode) {
                throw new apiError_1.ApiError("Invalid or expired reset code", "AUTH_003", 400);
            }
            const user = await models_1.User.findByPhone(formattedPhone);
            if (!user) {
                throw new apiError_1.ApiError("User not found", "RES_001", 404);
            }
            await user.updatePassword(newPassword);
            await user.update({
                passwordResetToken: undefined,
                passwordResetExpires: undefined,
                refreshToken: undefined,
            });
            await redis_1.redisUtils.del(`reset_code:${formattedPhone}`);
            if (user.passwordResetToken) {
                await redis_1.redisUtils.del(`reset_token:${user.passwordResetToken}`);
            }
            await jwt_1.JWTUtils.invalidateAllUserSessions(user.id);
            (0, logger_1.auditLogger)("PASSWORD_RESET", user.id, {
                method: "sms",
                phoneNumber: formattedPhone,
            });
            if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                const logMessage = [
                    "✅ PASSWORD RESET COMPLETED (SMS CODE)",
                    `User: ${user.firstName} ${user.lastName} (ID: ${user.id})`,
                    `Phone: ${formattedPhone}`,
                    `Code Used: ${resetCode}`,
                    `All user sessions have been invalidated`,
                ].join("\n");
                console.log(logMessage);
                logger_1.default.info(logMessage);
            }
            return {
                success: true,
                data: {
                    message: "Password has been reset successfully",
                },
            };
        }
        catch (error) {
            if (error instanceof apiError_1.ApiError) {
                return {
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        statusCode: error.statusCode,
                    },
                };
            }
            logger_1.default.error("Password reset with code error:", error);
            return {
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                    statusCode: 500,
                },
            };
        }
    }
    static async validateRegistrationRequirements(userData) {
        if (userData.role === types_1.UserRole.MEMBER) {
            if (!userData.delegateCode) {
                throw new apiError_1.ApiError("Delegate code is required for member registration", "VAL_001", 400);
            }
            if (!userData.county || !userData.sacco || !userData.route) {
                throw new apiError_1.ApiError("County, SACCO, and route are required for members", "VAL_001", 400);
            }
        }
        else if (userData.role === types_1.UserRole.DELEGATE) {
            if (!userData.coordinatorCode) {
                throw new apiError_1.ApiError("Coordinator code is required for delegate registration", "VAL_001", 400);
            }
        }
    }
    static async recordFailedLogin(phoneNumber, ipAddress, userAgent) {
        const key = `login_attempts:${phoneNumber}`;
        await redis_1.redisUtils.incrWithExpire(key, 300);
        (0, logger_1.securityLogger)("FAILED_LOGIN_ATTEMPT", {
            phoneNumber,
            ipAddress,
            userAgent,
        });
    }
}
exports.AuthService = AuthService;
exports.default = AuthService;
//# sourceMappingURL=AuthService.js.map