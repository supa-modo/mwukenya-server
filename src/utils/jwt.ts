import * as jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { config } from "../config";
import { redisUtils } from "../config/redis";
import { AuthTokenPayload, UserRole } from "../types";
import logger from "./logger";

// JWT utility functions
export class JWTUtils {
  private static readonly ACCESS_TOKEN_PREFIX = "access_token:";
  private static readonly REFRESH_TOKEN_PREFIX = "refresh_token:";
  private static readonly BLACKLIST_PREFIX = "blacklist:";

  /**
   * Generate access token
   */
  public static generateAccessToken(payload: {
    userId: string;
    role: UserRole;
    sessionId: string;
  }): string {
    const tokenPayload: AuthTokenPayload = {
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
      iat: Math.floor(Date.now() / 1000),
    };

    const options: jwt.SignOptions = {
      expiresIn: config.jwt.expiresIn as StringValue,
      issuer: config.appName,
      audience: "mwu-kenya-users",
    };

    return jwt.sign(tokenPayload, config.jwt.secret, options);
  }

  /**
   * Generate refresh token
   */
  public static generateRefreshToken(payload: {
    userId: string;
    sessionId: string;
  }): string {
    const refreshPayload = {
      userId: payload.userId,
      sessionId: payload.sessionId,
      type: "refresh",
    };

    const options: jwt.SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn as StringValue,
      issuer: config.appName,
      audience: "mwu-kenya-users",
    };

    return jwt.sign(refreshPayload, config.jwt.refreshSecret, options);
  }

  /**
   * Verify access token
   */
  public static async verifyAccessToken(
    token: string
  ): Promise<AuthTokenPayload | null> {
    try {
      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(token)) {
        logger.warn("Attempted to use blacklisted token");
        return null;
      }

      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.appName,
        audience: "mwu-kenya-users",
      }) as AuthTokenPayload;

      // Verify token is still valid in Redis
      const isValid = await this.isTokenValid(token, decoded.sessionId);
      if (!isValid) {
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn("Access token expired");
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn("Invalid access token");
      } else {
        logger.error("Access token verification error:", error);
      }
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  public static async verifyRefreshToken(token: string): Promise<{
    userId: string;
    sessionId: string;
  } | null> {
    try {
      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(token)) {
        logger.warn("Attempted to use blacklisted refresh token");
        return null;
      }

      const decoded = jwt.verify(token, config.jwt.refreshSecret, {
        issuer: config.appName,
        audience: "mwu-kenya-users",
      }) as any;

      if (decoded.type !== "refresh") {
        return null;
      }

      // Verify refresh token exists in Redis
      const isValid = await this.isRefreshTokenValid(token, decoded.sessionId);
      if (!isValid) {
        return null;
      }

      return {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn("Refresh token expired");
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn("Invalid refresh token");
      } else {
        logger.error("Refresh token verification error:", error);
      }
      return null;
    }
  }

  /**
   * Store token session in Redis
   */
  public static async storeTokenSession(
    sessionId: string,
    userId: string,
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    const accessTokenTTL = this.getExpirationSeconds(config.jwt.expiresIn);
    const refreshTokenTTL = this.getExpirationSeconds(
      config.jwt.refreshExpiresIn
    );

    // Store access token
    await redisUtils.setex(
      `${this.ACCESS_TOKEN_PREFIX}${sessionId}`,
      accessToken,
      accessTokenTTL
    );

    // Store refresh token
    await redisUtils.setex(
      `${this.REFRESH_TOKEN_PREFIX}${sessionId}`,
      refreshToken,
      refreshTokenTTL
    );

    // Store session info
    await redisUtils.setJSON(
      `session:${sessionId}`,
      {
        userId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      },
      refreshTokenTTL
    );
  }

  /**
   * Update session activity
   */
  public static async updateSessionActivity(sessionId: string): Promise<void> {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await redisUtils.getJSON(sessionKey);

    if (sessionData) {
      await redisUtils.setJSON(sessionKey, {
        ...sessionData,
        lastActivity: new Date().toISOString(),
      });
    }
  }

  /**
   * Invalidate token session
   */
  public static async invalidateSession(sessionId: string): Promise<void> {
    const accessTokenKey = `${this.ACCESS_TOKEN_PREFIX}${sessionId}`;
    const refreshTokenKey = `${this.REFRESH_TOKEN_PREFIX}${sessionId}`;
    const sessionKey = `session:${sessionId}`;

    // Get tokens before deletion to blacklist them
    const accessToken = await redisUtils.get(accessTokenKey);
    const refreshToken = await redisUtils.get(refreshTokenKey);

    // Blacklist tokens
    if (accessToken) {
      await this.blacklistToken(accessToken);
    }
    if (refreshToken) {
      await this.blacklistToken(refreshToken);
    }

    // Delete session data
    await Promise.all([
      redisUtils.del(accessTokenKey),
      redisUtils.del(refreshTokenKey),
      redisUtils.del(sessionKey),
    ]);
  }

  /**
   * Invalidate all user sessions
   */
  public static async invalidateAllUserSessions(userId: string): Promise<void> {
    // This is a simplified implementation
    // In a production system, you might want to maintain a user-to-sessions mapping
    logger.info(`Invalidating all sessions for user: ${userId}`);
  }

  /**
   * Blacklist a token
   */
  public static async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redisUtils.setex(
            `${this.BLACKLIST_PREFIX}${token}`,
            "blacklisted",
            ttl
          );
        }
      }
    } catch (error) {
      logger.error("Error blacklisting token:", error);
    }
  }

  /**
   * Check if token is blacklisted
   */
  private static async isTokenBlacklisted(token: string): Promise<boolean> {
    return redisUtils.exists(`${this.BLACKLIST_PREFIX}${token}`);
  }

  /**
   * Check if access token is valid in Redis
   */
  private static async isTokenValid(
    token: string,
    sessionId: string
  ): Promise<boolean> {
    const storedToken = await redisUtils.get(
      `${this.ACCESS_TOKEN_PREFIX}${sessionId}`
    );
    return storedToken === token;
  }

  /**
   * Check if refresh token is valid in Redis
   */
  private static async isRefreshTokenValid(
    token: string,
    sessionId: string
  ): Promise<boolean> {
    const storedToken = await redisUtils.get(
      `${this.REFRESH_TOKEN_PREFIX}${sessionId}`
    );
    return storedToken === token;
  }

  /**
   * Convert time string to seconds
   */
  private static getExpirationSeconds(timeString: string): number {
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1));

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 24 * 60 * 60;
      default:
        return 24 * 60 * 60; // Default to 24 hours
    }
  }

  /**
   * Generate session ID
   */
  public static generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract token from Authorization header
   */
  public static extractTokenFromHeader(
    authHeader: string | undefined
  ): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
}

export default JWTUtils;
