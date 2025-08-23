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
exports.AuthController = void 0;
const AuthService_1 = require("../services/AuthService");
const logger_1 = __importStar(require("../utils/logger"));
const joi_1 = __importDefault(require("joi"));
const loginSchema = joi_1.default.object({
    phoneNumber: joi_1.default.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .optional()
        .messages({
        "string.pattern.base": "Phone number must be in valid E.164 format",
    }),
    identifier: joi_1.default.string().min(6).max(20).optional().messages({
        "string.min": "Identifier must be at least 6 characters long",
        "string.max": "Identifier cannot exceed 20 characters",
    }),
    password: joi_1.default.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "Password is required",
    }),
    isAdminLogin: joi_1.default.boolean().optional(),
})
    .or("phoneNumber", "identifier")
    .custom((value, helpers) => {
    if (!value.phoneNumber && !value.identifier) {
        return helpers.error("any.invalid");
    }
    return value;
}, "at-least-one-identifier");
const adminLoginSchema = joi_1.default.object({
    identifier: joi_1.default.string().required().messages({
        "any.required": "Email or ID number is required",
    }),
    password: joi_1.default.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "Password is required",
    }),
    isAdminLogin: joi_1.default.boolean().valid(true).required().messages({
        "any.only": "Admin login flag is required",
    }),
}).custom((value, helpers) => {
    const { identifier } = value;
    if (identifier.includes("@")) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(identifier)) {
            return helpers.error("any.invalid", { message: "Invalid email format" });
        }
    }
    else {
        if (identifier.length < 6 || identifier.length > 20) {
            return helpers.error("any.invalid", {
                message: "ID number must be between 6 and 20 characters",
            });
        }
    }
    return value;
}, "admin-identifier-validation");
const registerSchema = joi_1.default.object({
    firstName: joi_1.default.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-Z\s]+$/)
        .required()
        .messages({
        "string.min": "First name must be at least 2 characters long",
        "string.max": "First name cannot exceed 100 characters",
        "string.pattern.base": "First name should only contain letters and spaces",
        "any.required": "First name is required",
    }),
    lastName: joi_1.default.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-Z\s]+$/)
        .required()
        .messages({
        "string.min": "Last name must be at least 2 characters long",
        "string.max": "Last name cannot exceed 100 characters",
        "string.pattern.base": "Last name should only contain letters and spaces",
        "any.required": "Last name is required",
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
        .required()
        .messages({
        "string.pattern.base": "Phone number must be in valid E.164 format",
        "any.required": "Phone number is required",
    }),
    idNumber: joi_1.default.string()
        .length(8)
        .pattern(/^\d{8}$/)
        .required()
        .messages({
        "string.length": "ID number must be exactly 8 digits",
        "string.pattern.base": "ID number should only contain numbers",
        "any.required": "ID number is required",
    }),
    password: joi_1.default.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "Password is required",
    }),
    confirmPassword: joi_1.default.string().required().valid(joi_1.default.ref("password")).messages({
        "any.only": "Passwords do not match",
        "any.required": "Password confirmation is required",
    }),
    gender: joi_1.default.string().valid("Male", "Female").optional().messages({
        "any.only": "Gender must be either Male or Female",
    }),
    county: joi_1.default.string().max(100).optional(),
    sacco: joi_1.default.string().max(100).optional(),
    route: joi_1.default.string().max(100).optional(),
    role: joi_1.default.string()
        .valid("member", "delegate", "coordinator", "admin", "superadmin")
        .required()
        .messages({
        "any.only": "Role must be one of: member, delegate, coordinator, admin, superadmin",
        "any.required": "Role is required",
    }),
    delegateCode: joi_1.default.string()
        .optional()
        .when("role", {
        is: "member",
        then: joi_1.default.required(),
        otherwise: joi_1.default.forbidden(),
    })
        .messages({
        "any.required": "Delegate code is required for member registration",
        "any.unknown": "Delegate code is only allowed for member registration",
    }),
    coordinatorCode: joi_1.default.string()
        .optional()
        .when("role", {
        is: "delegate",
        then: joi_1.default.required(),
        otherwise: joi_1.default.forbidden(),
    })
        .messages({
        "any.required": "Coordinator code is required for delegate registration",
        "any.unknown": "Coordinator code is only allowed for delegate registration",
    }),
});
const refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string().required().messages({
        "any.required": "Refresh token is required",
    }),
});
const forgotPasswordSchema = joi_1.default.object({
    identifier: joi_1.default.string()
        .required()
        .custom((value, helpers) => {
        if (value.includes("@")) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return helpers.error("any.invalid");
            }
        }
        else {
            const phoneRegex = /^\+?[0-9]{9,15}$/;
            if (!phoneRegex.test(value)) {
                return helpers.error("any.invalid");
            }
        }
        return value;
    })
        .messages({
        "any.required": "Email or phone number is required",
        "any.invalid": "Must be a valid email address or phone number",
    }),
});
const resetPasswordWithTokenSchema = joi_1.default.object({
    password: joi_1.default.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "Password is required",
    }),
});
const resetPasswordWithCodeSchema = joi_1.default.object({
    phoneNumber: joi_1.default.string()
        .pattern(/^\+?[0-9]{9,15}$/)
        .required()
        .messages({
        "string.pattern.base": "Phone number must be valid (9-15 digits)",
        "any.required": "Phone number is required",
    }),
    resetCode: joi_1.default.string()
        .length(6)
        .pattern(/^\d{6}$/)
        .required()
        .messages({
        "string.length": "Reset code must be exactly 6 digits",
        "string.pattern.base": "Reset code must contain only numbers",
        "any.required": "Reset code is required",
    }),
    newPassword: joi_1.default.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "New password is required",
    }),
});
class AuthController {
    static async login(req, res) {
        const startTime = Date.now();
        try {
            const isAdminLogin = req.body.isAdminLogin === true;
            const validationSchema = isAdminLogin ? adminLoginSchema : loginSchema;
            const { error, value } = validationSchema.validate(req.body);
            if (error) {
                const validationErrors = error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                }));
                (0, logger_1.apiLogger)("POST", "/auth/login", 400, Date.now() - startTime);
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VAL_001",
                        message: "Validation failed",
                        details: { validationErrors },
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const result = await AuthService_1.AuthService.login(value, req.ip, req.get("User-Agent"));
            const statusCode = result.success ? 200 : result.error?.statusCode || 500;
            (0, logger_1.apiLogger)("POST", "/auth/login", statusCode, Date.now() - startTime, result.success ? result.data?.user.id : undefined, result.success ? undefined : result.error);
            if (result.success) {
                res.status(200).json({
                    success: true,
                    data: result.data,
                    message: "Login successful",
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                res.status(statusCode).json({
                    success: false,
                    error: result.error,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (error) {
            (0, logger_1.apiLogger)("POST", "/auth/login", 500, Date.now() - startTime, undefined, error);
            res.status(500).json({
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    static async register(req, res) {
        const startTime = Date.now();
        try {
            const { error, value } = registerSchema.validate(req.body);
            if (error) {
                const validationErrors = error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                }));
                (0, logger_1.apiLogger)("POST", "/auth/register", 400, Date.now() - startTime);
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VAL_001",
                        message: "Validation failed",
                        details: { validationErrors },
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const result = await AuthService_1.AuthService.register(value, req.user?.id);
            const statusCode = result.success ? 201 : result.error?.statusCode || 500;
            (0, logger_1.apiLogger)("POST", "/auth/register", statusCode, Date.now() - startTime, req.user?.id, result.success ? undefined : result.error);
            if (result.success) {
                res.status(201).json({
                    success: true,
                    data: result.data,
                    message: result.data?.requiresApproval
                        ? "Registration successful. Account pending approval."
                        : "Registration successful",
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                res.status(statusCode).json({
                    success: false,
                    error: result.error,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (error) {
            (0, logger_1.apiLogger)("POST", "/auth/register", 500, Date.now() - startTime, req.user?.id, error);
            res.status(500).json({
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    static async refreshToken(req, res) {
        const startTime = Date.now();
        try {
            const { error, value } = refreshTokenSchema.validate(req.body);
            if (error) {
                const validationErrors = error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                }));
                (0, logger_1.apiLogger)("POST", "/auth/refresh", 400, Date.now() - startTime);
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VAL_001",
                        message: "Validation failed",
                        details: { validationErrors },
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const result = await AuthService_1.AuthService.refreshToken(value.refreshToken);
            const statusCode = result.success ? 200 : result.error?.statusCode || 500;
            (0, logger_1.apiLogger)("POST", "/auth/refresh", statusCode, Date.now() - startTime);
            if (result.success) {
                res.status(200).json({
                    success: true,
                    data: result.data,
                    message: "Token refreshed successfully",
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                res.status(statusCode).json({
                    success: false,
                    error: result.error,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (error) {
            (0, logger_1.apiLogger)("POST", "/auth/refresh", 500, Date.now() - startTime, undefined, error);
            res.status(500).json({
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    static async logout(req, res) {
        const startTime = Date.now();
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: "AUTH_001",
                        message: "Authentication required",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const result = await AuthService_1.AuthService.logout(req.user.id, req.user.sessionId);
            const statusCode = result.success ? 200 : 500;
            (0, logger_1.apiLogger)("POST", "/auth/logout", statusCode, Date.now() - startTime, req.user.id);
            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: "Logout successful",
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: result.error,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (error) {
            (0, logger_1.apiLogger)("POST", "/auth/logout", 500, Date.now() - startTime, req.user?.id, error);
            res.status(500).json({
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    static async forgotPassword(req, res) {
        const startTime = Date.now();
        try {
            const { error, value } = forgotPasswordSchema.validate(req.body);
            if (error) {
                const validationErrors = error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                }));
                (0, logger_1.apiLogger)("POST", "/auth/forgot-password", 400, Date.now() - startTime);
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VAL_001",
                        message: "Validation failed",
                        details: { validationErrors },
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                const method = value.identifier.includes("@") ? "EMAIL" : "SMS";
                const logMessage = [
                    "🔑 FORGOT PASSWORD REQUEST RECEIVED",
                    `Method: ${method}`,
                    `Identifier: ${value.identifier}`,
                ].join("\n");
                console.log(logMessage);
                logger_1.default.info(logMessage);
            }
            const result = await AuthService_1.AuthService.requestPasswordReset(value.identifier);
            (0, logger_1.apiLogger)("POST", "/auth/forgot-password", 200, Date.now() - startTime);
            res.status(200).json({
                success: true,
                data: result.data,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            (0, logger_1.apiLogger)("POST", "/auth/forgot-password", 500, Date.now() - startTime, undefined, error);
            res.status(500).json({
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    static async resetPasswordWithToken(req, res) {
        const startTime = Date.now();
        try {
            const { token } = req.params;
            if (!token) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VAL_001",
                        message: "Reset token is required",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const { error, value } = resetPasswordWithTokenSchema.validate(req.body);
            if (error) {
                const validationErrors = error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                }));
                (0, logger_1.apiLogger)("POST", "/auth/reset-password", 400, Date.now() - startTime);
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VAL_001",
                        message: "Validation failed",
                        details: { validationErrors },
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            if (process.env.NODE_ENV === "development") {
                logger_1.default.info("🔐 PASSWORD RESET WITH TOKEN RECEIVED");
                logger_1.default.info(`Token: ${token.substring(0, 10)}...`);
            }
            const result = await AuthService_1.AuthService.resetPasswordWithToken(token, value.password);
            (0, logger_1.apiLogger)("POST", "/auth/reset-password", 200, Date.now() - startTime);
            res.status(200).json({
                success: true,
                data: result.data,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            (0, logger_1.apiLogger)("POST", "/auth/reset-password", 500, Date.now() - startTime, undefined, error);
            res.status(500).json({
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    static async resetPasswordWithCode(req, res) {
        const startTime = Date.now();
        try {
            const { error, value } = resetPasswordWithCodeSchema.validate(req.body);
            if (error) {
                const validationErrors = error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                }));
                (0, logger_1.apiLogger)("POST", "/auth/reset-password-code", 400, Date.now() - startTime);
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VAL_001",
                        message: "Validation failed",
                        details: { validationErrors },
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            if (process.env.NODE_ENV === "development") {
                logger_1.default.info("🔐 PASSWORD RESET WITH CODE RECEIVED");
                logger_1.default.info(`Phone: ${value.phoneNumber}`);
                logger_1.default.info(`Code: ${value.resetCode}`);
            }
            const result = await AuthService_1.AuthService.resetPasswordWithCode(value.phoneNumber, value.resetCode, value.newPassword);
            (0, logger_1.apiLogger)("POST", "/auth/reset-password-code", 200, Date.now() - startTime);
            res.status(200).json({
                success: true,
                data: result.data,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            (0, logger_1.apiLogger)("POST", "/auth/reset-password-code", 500, Date.now() - startTime, undefined, error);
            res.status(500).json({
                success: false,
                error: {
                    code: "SYS_005",
                    message: "Internal server error",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map