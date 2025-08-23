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
exports.JWTUtils = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const config_1 = require("../config");
const redis_1 = require("../config/redis");
const logger_1 = __importDefault(require("./logger"));
class JWTUtils {
    static generateAccessToken(payload) {
        const tokenPayload = {
            userId: payload.userId,
            role: payload.role,
            sessionId: payload.sessionId,
            iat: Math.floor(Date.now() / 1000),
        };
        const options = {
            expiresIn: config_1.config.jwt.expiresIn,
            issuer: config_1.config.appName,
            audience: "mwu-kenya-users",
        };
        return jwt.sign(tokenPayload, config_1.config.jwt.secret, options);
    }
    static generateRefreshToken(payload) {
        const refreshPayload = {
            userId: payload.userId,
            sessionId: payload.sessionId,
            type: "refresh",
        };
        const options = {
            expiresIn: config_1.config.jwt.refreshExpiresIn,
            issuer: config_1.config.appName,
            audience: "mwu-kenya-users",
        };
        return jwt.sign(refreshPayload, config_1.config.jwt.refreshSecret, options);
    }
    static async verifyAccessToken(token) {
        try {
            if (await this.isTokenBlacklisted(token)) {
                logger_1.default.warn("Attempted to use blacklisted token");
                return null;
            }
            const decoded = jwt.verify(token, config_1.config.jwt.secret, {
                issuer: config_1.config.appName,
                audience: "mwu-kenya-users",
            });
            const isValid = await this.isTokenValid(token, decoded.sessionId);
            if (!isValid) {
                return null;
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                logger_1.default.warn("Access token expired");
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                logger_1.default.warn("Invalid access token");
            }
            else {
                logger_1.default.error("Access token verification error:", error);
            }
            return null;
        }
    }
    static async verifyRefreshToken(token) {
        try {
            if (await this.isTokenBlacklisted(token)) {
                logger_1.default.warn("Attempted to use blacklisted refresh token");
                return null;
            }
            const decoded = jwt.verify(token, config_1.config.jwt.refreshSecret, {
                issuer: config_1.config.appName,
                audience: "mwu-kenya-users",
            });
            if (decoded.type !== "refresh") {
                return null;
            }
            const isValid = await this.isRefreshTokenValid(token, decoded.sessionId);
            if (!isValid) {
                return null;
            }
            return {
                userId: decoded.userId,
                sessionId: decoded.sessionId,
            };
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                logger_1.default.warn("Refresh token expired");
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                logger_1.default.warn("Invalid refresh token");
            }
            else {
                logger_1.default.error("Refresh token verification error:", error);
            }
            return null;
        }
    }
    static async storeTokenSession(sessionId, userId, accessToken, refreshToken) {
        const accessTokenTTL = this.getExpirationSeconds(config_1.config.jwt.expiresIn);
        const refreshTokenTTL = this.getExpirationSeconds(config_1.config.jwt.refreshExpiresIn);
        await redis_1.redisUtils.setex(`${this.ACCESS_TOKEN_PREFIX}${sessionId}`, accessToken, accessTokenTTL);
        await redis_1.redisUtils.setex(`${this.REFRESH_TOKEN_PREFIX}${sessionId}`, refreshToken, refreshTokenTTL);
        await redis_1.redisUtils.setJSON(`session:${sessionId}`, {
            userId,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
        }, refreshTokenTTL);
    }
    static async updateSessionActivity(sessionId) {
        const sessionKey = `session:${sessionId}`;
        const sessionData = await redis_1.redisUtils.getJSON(sessionKey);
        if (sessionData) {
            await redis_1.redisUtils.setJSON(sessionKey, {
                ...sessionData,
                lastActivity: new Date().toISOString(),
            });
        }
    }
    static async invalidateSession(sessionId) {
        const accessTokenKey = `${this.ACCESS_TOKEN_PREFIX}${sessionId}`;
        const refreshTokenKey = `${this.REFRESH_TOKEN_PREFIX}${sessionId}`;
        const sessionKey = `session:${sessionId}`;
        const accessToken = await redis_1.redisUtils.get(accessTokenKey);
        const refreshToken = await redis_1.redisUtils.get(refreshTokenKey);
        if (accessToken) {
            await this.blacklistToken(accessToken);
        }
        if (refreshToken) {
            await this.blacklistToken(refreshToken);
        }
        await Promise.all([
            redis_1.redisUtils.del(accessTokenKey),
            redis_1.redisUtils.del(refreshTokenKey),
            redis_1.redisUtils.del(sessionKey),
        ]);
    }
    static async invalidateAllUserSessions(userId) {
        logger_1.default.info(`Invalidating all sessions for user: ${userId}`);
    }
    static async blacklistToken(token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp) {
                const ttl = decoded.exp - Math.floor(Date.now() / 1000);
                if (ttl > 0) {
                    await redis_1.redisUtils.setex(`${this.BLACKLIST_PREFIX}${token}`, "blacklisted", ttl);
                }
            }
        }
        catch (error) {
            logger_1.default.error("Error blacklisting token:", error);
        }
    }
    static async isTokenBlacklisted(token) {
        return redis_1.redisUtils.exists(`${this.BLACKLIST_PREFIX}${token}`);
    }
    static async isTokenValid(token, sessionId) {
        const storedToken = await redis_1.redisUtils.get(`${this.ACCESS_TOKEN_PREFIX}${sessionId}`);
        return storedToken === token;
    }
    static async isRefreshTokenValid(token, sessionId) {
        const storedToken = await redis_1.redisUtils.get(`${this.REFRESH_TOKEN_PREFIX}${sessionId}`);
        return storedToken === token;
    }
    static getExpirationSeconds(timeString) {
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
                return 24 * 60 * 60;
        }
    }
    static generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.substring(7);
    }
}
exports.JWTUtils = JWTUtils;
JWTUtils.ACCESS_TOKEN_PREFIX = "access_token:";
JWTUtils.REFRESH_TOKEN_PREFIX = "refresh_token:";
JWTUtils.BLACKLIST_PREFIX = "blacklist:";
exports.default = JWTUtils;
//# sourceMappingURL=jwt.js.map