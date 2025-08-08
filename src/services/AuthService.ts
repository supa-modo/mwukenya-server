import { User } from "../models";
import { Op } from "sequelize";
import { JWTUtils } from "../utils/jwt";
import { ApiError } from "../utils/apiError";
import { redisUtils } from "../config/redis";
import {
  UserRole,
  ServiceResponse,
  LoginCredentials,
  MembershipStatus,
} from "../types";
import logger, { auditLogger, securityLogger } from "../utils/logger";
import crypto from "crypto";
import { emailService } from "../utils/emailService";
import { smsService } from "../utils/smsService";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResponse {
  user: Partial<User>;
  tokens: AuthTokens;
}

export interface RegistrationData {
  firstName: string;
  lastName: string;
  otherNames?: string;
  email?: string;
  phoneNumber: string;
  idNumber: string;
  password: string;
  gender?: string;
  county?: string;
  sacco?: string;
  route?: string;
  role: UserRole;
  delegateCode?: string;
  coordinatorCode?: string;
}

export class AuthService {
  /**
   * User login
   */
  public static async login(
    credentials: LoginCredentials,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ServiceResponse<LoginResponse>> {
    try {
      const { phoneNumber, identifier, password } = credentials;
      const loginIdentifier = phoneNumber || identifier;

      if (!loginIdentifier) {
        throw new ApiError(
          "Phone number or ID number is required",
          "AUTH_001",
          400
        );
      }

      // Check for rate limiting
      const loginAttemptKey = `login_attempts:${loginIdentifier}`;
      const attempts = await redisUtils.get(loginAttemptKey);

      if (attempts && parseInt(attempts) >= 5) {
        securityLogger("LOGIN_RATE_LIMIT_EXCEEDED", {
          loginIdentifier,
          ipAddress,
          userAgent,
        });
        throw ApiError.rateLimitExceeded();
      }

      // Find user by phone number or ID number
      let user = null;

      if (phoneNumber) {
        // Try to find by phone number first
        user = await User.findOne({
          where: { phoneNumber },
          include: [
            {
              model: User,
              as: "delegate",
              attributes: ["id", "firstName", "lastName", "delegateCode"],
            },
            {
              model: User,
              as: "coordinator",
              attributes: ["id", "firstName", "lastName", "coordinatorCode"],
            },
          ],
        });
      }

      // If not found by phone number, try by ID number
      if (!user && identifier) {
        user = await User.findOne({
          where: { idNumber: identifier },
          include: [
            {
              model: User,
              as: "delegate",
              attributes: ["id", "firstName", "lastName", "delegateCode"],
            },
            {
              model: User,
              as: "coordinator",
              attributes: ["id", "firstName", "lastName", "coordinatorCode"],
            },
          ],
        });
      }

      if (!user) {
        await this.recordFailedLogin(loginIdentifier, ipAddress, userAgent);
        throw new ApiError(
          "Invalid Phone/ID number or Password",
          "AUTH_001",
          401
        );
      }

      // Check if user is active
      if (!user.isActive) {
        securityLogger("INACTIVE_USER_LOGIN_ATTEMPT", {
          userId: user.id,
          loginIdentifier,
          ipAddress,
          userAgent,
        });
        throw ApiError.accountLocked("Account is inactive");
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);

      if (!isValidPassword) {
        await this.recordFailedLogin(loginIdentifier, ipAddress, userAgent);
        throw new ApiError(
          "Invalid Phone/ID number or Password",
          "AUTH_001",
          401
        );
      }

      // Clear failed login attempts
      await redisUtils.del(loginAttemptKey);

      // Generate session and tokens
      const sessionId = JWTUtils.generateSessionId();
      const accessToken = JWTUtils.generateAccessToken({
        userId: user.id,
        role: user.role,
        sessionId,
      });
      const refreshToken = JWTUtils.generateRefreshToken({
        userId: user.id,
        sessionId,
      });

      // Store session
      await JWTUtils.storeTokenSession(
        sessionId,
        user.id,
        accessToken,
        refreshToken
      );

      // Update user's refresh token and last login
      await user.update({
        refreshToken,
        lastLogin: new Date(),
      });

      // Log successful login
      auditLogger("USER_LOGIN", user.id, {
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
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
          },
        };
      }

      logger.error("Login error:", error);
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

  /**
   * Refresh access token
   */
  public static async refreshToken(
    refreshToken: string
  ): Promise<ServiceResponse<AuthTokens>> {
    try {
      const decoded = await JWTUtils.verifyRefreshToken(refreshToken);

      if (!decoded) {
        throw ApiError.invalidToken("Invalid refresh token");
      }

      const user = await User.findByPk(decoded.userId);

      if (!user || !user.isActive || user.refreshToken !== refreshToken) {
        throw ApiError.invalidToken("Invalid refresh token");
      }

      // Generate new tokens
      const newSessionId = JWTUtils.generateSessionId();
      const newAccessToken = JWTUtils.generateAccessToken({
        userId: user.id,
        role: user.role,
        sessionId: newSessionId,
      });
      const newRefreshToken = JWTUtils.generateRefreshToken({
        userId: user.id,
        sessionId: newSessionId,
      });

      // Invalidate old session
      await JWTUtils.invalidateSession(decoded.sessionId);

      // Store new session
      await JWTUtils.storeTokenSession(
        newSessionId,
        user.id,
        newAccessToken,
        newRefreshToken
      );

      // Update user's refresh token
      await user.update({ refreshToken: newRefreshToken });

      auditLogger("TOKEN_REFRESH", user.id, { sessionId: newSessionId });

      return {
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: "24h",
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
          },
        };
      }

      logger.error("Token refresh error:", error);
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

  /**
   * User logout
   */
  public static async logout(
    userId: string,
    sessionId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Invalidate session
      await JWTUtils.invalidateSession(sessionId);

      // Clear user's refresh token
      await User.update({ refreshToken: undefined }, { where: { id: userId } });

      auditLogger("USER_LOGOUT", userId, { sessionId });

      return { success: true };
    } catch (error) {
      logger.error("Logout error:", error);
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

  /**
   * Register new user
   */
  public static async register(
    userData: RegistrationData,
    registeredBy?: string
  ): Promise<
    ServiceResponse<{ user: Partial<User>; requiresApproval: boolean }>
  > {
    try {
      // Validate role-specific requirements
      await this.validateRegistrationRequirements(userData);

      // Check for existing users
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { phoneNumber: userData.phoneNumber },
            { idNumber: userData.idNumber },
            ...(userData.email ? [{ email: userData.email }] : []),
          ],
        },
      });

      if (existingUser) {
        if (existingUser.phoneNumber === userData.phoneNumber) {
          throw ApiError.duplicate("Phone number");
        }
        if (existingUser.idNumber === userData.idNumber) {
          throw ApiError.duplicate("ID number");
        }
        if (existingUser.email === userData.email) {
          throw ApiError.duplicate("Email address");
        }
      }

      // Hash password
      const passwordHash = await User.hashPassword(userData.password);

      // Set delegate and coordinator IDs based on codes
      let delegateId: string | undefined;
      let coordinatorId: string | undefined;

      if (userData.role === UserRole.MEMBER && userData.delegateCode) {
        const delegate = await User.findByDelegateCode(userData.delegateCode);
        if (!delegate) {
          throw ApiError.invalidDelegateCode();
        }
        delegateId = delegate.id;
        coordinatorId = delegate.coordinatorId;
      } else if (
        userData.role === UserRole.DELEGATE &&
        userData.coordinatorCode
      ) {
        const coordinator = await User.findByCoordinatorCode(
          userData.coordinatorCode
        );
        if (!coordinator) {
          throw new ApiError("Invalid coordinator code", "BUS_002", 400);
        }
        coordinatorId = coordinator.id;
      }

      // Create user
      const user = await User.create({
        firstName: userData.firstName,
        lastName: userData.lastName,
        otherNames: userData.otherNames,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        idNumber: userData.idNumber,
        passwordHash,
        gender: userData.gender as any,
        county: userData.county,
        sacco: userData.sacco,
        route: userData.route,
        role: userData.role,
        delegateId,
        coordinatorId,
        membershipStatus:
          userData.role === UserRole.MEMBER
            ? MembershipStatus.PENDING
            : MembershipStatus.ACTIVE,
        isActive: true,
        isEmailVerified: false,
        isPhoneVerified: false,
        isIdNumberVerified: false,
      });

      auditLogger("USER_REGISTRATION", user.id, {
        role: userData.role,
        registeredBy,
      });

      const userResponse = user.toJSON();
      const requiresApproval = userData.role === UserRole.MEMBER;

      return {
        success: true,
        data: {
          user: userResponse,
          requiresApproval,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
          },
        };
      }

      logger.error("Registration error:", error);
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

  /**
   * Request password reset - supports both email and phone
   */
  public static async requestPasswordReset(
    identifier: string
  ): Promise<ServiceResponse<{ message: string; method: "email" | "sms" }>> {
    try {
      const isEmail = identifier.includes("@");
      let user: any = null;

      if (isEmail) {
        user = await User.findOne({ where: { email: identifier } });
      } else {
        const formattedPhone = smsService.formatPhoneNumber(identifier);
        user = await User.findByPhone(formattedPhone);
      }

      if (!user) {
        // Don't reveal whether user exists for security
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

      // Generate reset token (storing raw token for simplicity)
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Debug logging for token generation
      if (process.env.NODE_ENV === "development") {
        logger.info("🔐 TOKEN GENERATION DEBUG");
        logger.info(`Generated raw token: ${resetToken}`);
        logger.info(`Token expires at: ${resetExpires}`);
      }

      await user.update({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      let messageSent = false;
      let method: "email" | "sms" = isEmail ? "email" : "sms";

      if (isEmail && user.email) {
        // Send email with reset link
        messageSent = await emailService.sendPasswordResetEmail(
          user.email,
          resetToken,
          user.firstName
        );
      } else {
        // Send SMS with reset code
        const resetCode = Math.floor(
          100000 + Math.random() * 900000
        ).toString();
        await redisUtils.setex(
          `reset_code:${user.phoneNumber}`,
          resetCode,
          600
        ); // 10 minutes
        await redisUtils.setex(`reset_token:${resetToken}`, user.id, 600);

        messageSent = await smsService.sendPasswordResetSMS(
          user.phoneNumber,
          resetCode,
          user.firstName
        );

        // For development, log the reset code
        if (process.env.NODE_ENV === "development") {
          logger.info(
            `Password reset code for ${user.phoneNumber}: ${resetCode}`
          );
        }
      }

      auditLogger("PASSWORD_RESET_REQUEST", user.id, {
        identifier: isEmail ? user.email : user.phoneNumber,
        method,
      });

      // Log password reset request details in development
      if (process.env.NODE_ENV === "development") {
        logger.info("🔐 PASSWORD RESET REQUEST PROCESSED");
        logger.info(
          `User: ${user.firstName} ${user.lastName} (ID: ${user.id})`
        );
        logger.info(`Method: ${method.toUpperCase()}`);
        logger.info(`Identifier: ${isEmail ? user.email : user.phoneNumber}`);
        logger.info(`Message Sent: ${messageSent ? "✅ Yes" : "❌ No"}`);
        if (!isEmail) {
          logger.info(`📱 Check SMS logs above for the reset code`);
        } else {
          logger.info(`📧 Check email logs above for the reset link`);
        }
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
    } catch (error) {
      logger.error("Password reset request error:", error);
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

  /**
   * Reset password with token (email) or code (SMS)
   */
  public static async resetPasswordWithToken(
    token: string,
    newPassword: string
  ): Promise<ServiceResponse<{ message: string }>> {
    try {
      // Debug logging for development
      if (process.env.NODE_ENV === "development") {
        logger.info("🔍 TOKEN VERIFICATION DEBUG");
        logger.info(`Raw token received: ${token}`);
      }

      // Find user by token (using raw token)
      const user = await User.findOne({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            [Op.gt]: new Date(),
          },
        },
      });

      // More debug logging
      if (process.env.NODE_ENV === "development") {
        if (!user) {
          logger.info("❌ No user found with matching token");
          logger.info("Check if token has expired or was already used");
        } else {
          logger.info(`✅ User found: ${user.firstName} ${user.lastName}`);
        }
      }

      if (!user) {
        throw new ApiError("Invalid or expired reset token", "AUTH_003", 400);
      }

      // Update password
      await user.updatePassword(newPassword);

      // Clear reset tokens
      await user.update({
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        refreshToken: undefined, // Force re-login
      });

      // Clear Redis keys if they exist
      await redisUtils.del(`reset_code:${user.phoneNumber}`);
      await redisUtils.del(`reset_token:${token}`);

      // Invalidate all user sessions
      await JWTUtils.invalidateAllUserSessions(user.id);

      auditLogger("PASSWORD_RESET", user.id, { method: "token" });

      // Log password reset completion in development
      if (process.env.NODE_ENV === "development") {
        logger.info("✅ PASSWORD RESET COMPLETED (EMAIL TOKEN)");
        logger.info(
          `User: ${user.firstName} ${user.lastName} (ID: ${user.id})`
        );
        logger.info(`Email: ${user.email}`);
        logger.info(`Token Used: ${token.substring(0, 8)}...`);
        logger.info(`All user sessions have been invalidated`);
      }

      return {
        success: true,
        data: {
          message: "Password has been reset successfully",
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
          },
        };
      }

      logger.error("Password reset with token error:", error);
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

  /**
   * Reset password with SMS code
   */
  public static async resetPasswordWithCode(
    phoneNumber: string,
    resetCode: string,
    newPassword: string
  ): Promise<ServiceResponse<{ message: string }>> {
    try {
      const formattedPhone = smsService.formatPhoneNumber(phoneNumber);

      // Verify reset code
      const storedCode = await redisUtils.get(`reset_code:${formattedPhone}`);

      if (!storedCode || storedCode !== resetCode) {
        throw new ApiError("Invalid or expired reset code", "AUTH_003", 400);
      }

      const user = await User.findByPhone(formattedPhone);

      if (!user) {
        throw new ApiError("User not found", "RES_001", 404);
      }

      // Update password
      await user.updatePassword(newPassword);

      // Clear reset tokens
      await user.update({
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        refreshToken: undefined, // Force re-login
      });

      // Clear Redis keys
      await redisUtils.del(`reset_code:${formattedPhone}`);
      if (user.passwordResetToken) {
        await redisUtils.del(`reset_token:${user.passwordResetToken}`);
      }

      // Invalidate all user sessions
      await JWTUtils.invalidateAllUserSessions(user.id);

      auditLogger("PASSWORD_RESET", user.id, {
        method: "sms",
        phoneNumber: formattedPhone,
      });

      // Log password reset completion in development
      if (process.env.NODE_ENV === "development") {
        logger.info("✅ PASSWORD RESET COMPLETED (SMS CODE)");
        logger.info(
          `User: ${user.firstName} ${user.lastName} (ID: ${user.id})`
        );
        logger.info(`Phone: ${formattedPhone}`);
        logger.info(`Code Used: ${resetCode}`);
        logger.info(`All user sessions have been invalidated`);
      }

      return {
        success: true,
        data: {
          message: "Password has been reset successfully",
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
          },
        };
      }

      logger.error("Password reset with code error:", error);
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

  /**
   * Validate registration requirements based on role
   */
  private static async validateRegistrationRequirements(
    userData: RegistrationData
  ): Promise<void> {
    if (userData.role === UserRole.MEMBER) {
      if (!userData.delegateCode) {
        throw new ApiError(
          "Delegate code is required for member registration",
          "VAL_001",
          400
        );
      }
      if (!userData.county || !userData.sacco || !userData.route) {
        throw new ApiError(
          "County, SACCO, and route are required for members",
          "VAL_001",
          400
        );
      }
    } else if (userData.role === UserRole.DELEGATE) {
      if (!userData.coordinatorCode) {
        throw new ApiError(
          "Coordinator code is required for delegate registration",
          "VAL_001",
          400
        );
      }
    }
  }

  /**
   * Record failed login attempt
   */
  private static async recordFailedLogin(
    phoneNumber: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const key = `login_attempts:${phoneNumber}`;
    await redisUtils.incrWithExpire(key, 300); // 5 minutes

    securityLogger("FAILED_LOGIN_ATTEMPT", {
      phoneNumber,
      ipAddress,
      userAgent,
    });
  }
}

export default AuthService;
