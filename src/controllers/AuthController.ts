import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { ApiError } from "../utils/apiError";
import logger, { apiLogger } from "../utils/logger";
import Joi from "joi";

// Validation schemas
const loginSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be in valid E.164 format",
    }),
  identifier: Joi.string().min(6).max(20).optional().messages({
    "string.min": "Identifier must be at least 6 characters long",
    "string.max": "Identifier cannot exceed 20 characters",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
}).or("phoneNumber", "identifier");

const registerSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "string.min": "First name must be at least 2 characters long",
      "string.max": "First name cannot exceed 100 characters",
      "string.pattern.base":
        "First name should only contain letters and spaces",
      "any.required": "First name is required",
    }),
  lastName: Joi.string()
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
    .required()
    .messages({
      "string.pattern.base": "Phone number must be in valid E.164 format",
      "any.required": "Phone number is required",
    }),
  idNumber: Joi.string().min(6).max(20).alphanum().required().messages({
    "string.min": "ID number must be at least 6 characters long",
    "string.max": "ID number cannot exceed 20 characters",
    "string.alphanum": "ID number should only contain letters and numbers",
    "any.required": "ID number is required",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "Password is required",
  }),
  gender: Joi.string().valid("Male", "Female").optional().messages({
    "any.only": "Gender must be either Male or Female",
  }),
  county: Joi.string().max(100).optional(),
  sacco: Joi.string().max(100).optional(),
  route: Joi.string().max(100).optional(),
  role: Joi.string()
    .valid("member", "delegate", "coordinator", "admin", "superadmin")
    .required()
    .messages({
      "any.only":
        "Role must be one of: member, delegate, coordinator, admin, superadmin",
      "any.required": "Role is required",
    }),
  delegateCode: Joi.string()
    .optional()
    .when("role", {
      is: "member",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      "any.required": "Delegate code is required for member registration",
      "any.unknown": "Delegate code is only allowed for member registration",
    }),
  coordinatorCode: Joi.string()
    .optional()
    .when("role", {
      is: "delegate",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      "any.required": "Coordinator code is required for delegate registration",
      "any.unknown":
        "Coordinator code is only allowed for delegate registration",
    }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required",
  }),
});

const forgotPasswordSchema = Joi.object({
  identifier: Joi.string()
    .required()
    .custom((value, helpers) => {
      // Check if it's an email
      if (value.includes("@")) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return helpers.error("any.invalid");
        }
      } else {
        // Check if it's a phone number
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

const resetPasswordWithTokenSchema = Joi.object({
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "Password is required",
  }),
});

const resetPasswordWithCodeSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+?[0-9]{9,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be valid (9-15 digits)",
      "any.required": "Phone number is required",
    }),
  resetCode: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.length": "Reset code must be exactly 6 digits",
      "string.pattern.base": "Reset code must contain only numbers",
      "any.required": "Reset code is required",
    }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "New password is required",
  }),
});

export class AuthController {
  /**
   * User login
   */
  public static async login(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate request body
      const { error, value } = loginSchema.validate(req.body);

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        apiLogger("POST", "/auth/login", 400, Date.now() - startTime);

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

      const result = await AuthService.login(
        value,
        req.ip,
        req.get("User-Agent")
      );

      const statusCode = result.success ? 200 : result.error?.statusCode || 500;

      apiLogger(
        "POST",
        "/auth/login",
        statusCode,
        Date.now() - startTime,
        result.success ? result.data?.user.id : undefined,
        result.success ? undefined : result.error
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Login successful",
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(statusCode).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      apiLogger(
        "POST",
        "/auth/login",
        500,
        Date.now() - startTime,
        undefined,
        error
      );

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

  /**
   * User registration
   */
  public static async register(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate request body
      const { error, value } = registerSchema.validate(req.body);

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        apiLogger("POST", "/auth/register", 400, Date.now() - startTime);

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

      const result = await AuthService.register(value, req.user?.id);

      const statusCode = result.success ? 201 : result.error?.statusCode || 500;

      apiLogger(
        "POST",
        "/auth/register",
        statusCode,
        Date.now() - startTime,
        req.user?.id,
        result.success ? undefined : result.error
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: result.data?.requiresApproval
            ? "Registration successful. Account pending approval."
            : "Registration successful",
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(statusCode).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      apiLogger(
        "POST",
        "/auth/register",
        500,
        Date.now() - startTime,
        req.user?.id,
        error
      );

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

  /**
   * Refresh access token
   */
  public static async refreshToken(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate request body
      const { error, value } = refreshTokenSchema.validate(req.body);

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        apiLogger("POST", "/auth/refresh", 400, Date.now() - startTime);

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

      const result = await AuthService.refreshToken(value.refreshToken);

      const statusCode = result.success ? 200 : result.error?.statusCode || 500;

      apiLogger("POST", "/auth/refresh", statusCode, Date.now() - startTime);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Token refreshed successfully",
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(statusCode).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      apiLogger(
        "POST",
        "/auth/refresh",
        500,
        Date.now() - startTime,
        undefined,
        error
      );

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

  /**
   * User logout
   */
  public static async logout(req: Request, res: Response): Promise<void> {
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

      const result = await AuthService.logout(req.user.id, req.user.sessionId);

      const statusCode = result.success ? 200 : 500;

      apiLogger(
        "POST",
        "/auth/logout",
        statusCode,
        Date.now() - startTime,
        req.user.id
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Logout successful",
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      apiLogger(
        "POST",
        "/auth/logout",
        500,
        Date.now() - startTime,
        req.user?.id,
        error
      );

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

  /**
   * Request password reset
   */
  public static async forgotPassword(
    req: Request,
    res: Response
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate request body
      const { error, value } = forgotPasswordSchema.validate(req.body);

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        apiLogger("POST", "/auth/forgot-password", 400, Date.now() - startTime);

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

      // Log the password reset request in development
      if (process.env.NODE_ENV === "development") {
        const method = value.identifier.includes("@") ? "EMAIL" : "SMS";
        logger.info("🔑 FORGOT PASSWORD REQUEST RECEIVED");
        logger.info(`Method: ${method}`);
        logger.info(`Identifier: ${value.identifier}`);
      }

      const result = await AuthService.requestPasswordReset(value.identifier);

      apiLogger("POST", "/auth/forgot-password", 200, Date.now() - startTime);

      // Always return success for security (don't reveal if user exists)
      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      apiLogger(
        "POST",
        "/auth/forgot-password",
        500,
        Date.now() - startTime,
        undefined,
        error
      );

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

  /**
   * Reset password with token (from email)
   */
  public static async resetPasswordWithToken(
    req: Request,
    res: Response
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Get token from URL params
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

      // Validate request body
      const { error, value } = resetPasswordWithTokenSchema.validate(req.body);

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        apiLogger("POST", "/auth/reset-password", 400, Date.now() - startTime);

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

      // Log the token-based password reset attempt in development
      if (process.env.NODE_ENV === "development") {
        logger.info("🔐 PASSWORD RESET WITH TOKEN RECEIVED");
        logger.info(`Token: ${token.substring(0, 10)}...`);
      }

      const result = await AuthService.resetPasswordWithToken(
        token,
        value.password
      );

      apiLogger("POST", "/auth/reset-password", 200, Date.now() - startTime);

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      apiLogger(
        "POST",
        "/auth/reset-password",
        500,
        Date.now() - startTime,
        undefined,
        error
      );

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

  /**
   * Reset password with code (from SMS)
   */
  public static async resetPasswordWithCode(
    req: Request,
    res: Response
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate request body
      const { error, value } = resetPasswordWithCodeSchema.validate(req.body);

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        apiLogger(
          "POST",
          "/auth/reset-password-code",
          400,
          Date.now() - startTime
        );

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

      // Log the code-based password reset attempt in development
      if (process.env.NODE_ENV === "development") {
        logger.info("🔐 PASSWORD RESET WITH CODE RECEIVED");
        logger.info(`Phone: ${value.phoneNumber}`);
        logger.info(`Code: ${value.resetCode}`);
      }

      const result = await AuthService.resetPasswordWithCode(
        value.phoneNumber,
        value.resetCode,
        value.newPassword
      );

      apiLogger(
        "POST",
        "/auth/reset-password-code",
        200,
        Date.now() - startTime
      );

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      apiLogger(
        "POST",
        "/auth/reset-password-code",
        500,
        Date.now() - startTime,
        undefined,
        error
      );

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
