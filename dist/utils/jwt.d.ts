import { AuthTokenPayload, UserRole } from "../types";
export declare class JWTUtils {
    private static readonly ACCESS_TOKEN_PREFIX;
    private static readonly REFRESH_TOKEN_PREFIX;
    private static readonly BLACKLIST_PREFIX;
    static generateAccessToken(payload: {
        userId: string;
        role: UserRole;
        sessionId: string;
    }): string;
    static generateRefreshToken(payload: {
        userId: string;
        sessionId: string;
    }): string;
    static verifyAccessToken(token: string): Promise<AuthTokenPayload | null>;
    static verifyRefreshToken(token: string): Promise<{
        userId: string;
        sessionId: string;
    } | null>;
    static storeTokenSession(sessionId: string, userId: string, accessToken: string, refreshToken: string): Promise<void>;
    static updateSessionActivity(sessionId: string): Promise<void>;
    static invalidateSession(sessionId: string): Promise<void>;
    static invalidateAllUserSessions(userId: string): Promise<void>;
    static blacklistToken(token: string): Promise<void>;
    private static isTokenBlacklisted;
    private static isTokenValid;
    private static isRefreshTokenValid;
    private static getExpirationSeconds;
    static generateSessionId(): string;
    static extractTokenFromHeader(authHeader: string | undefined): string | null;
}
export default JWTUtils;
//# sourceMappingURL=jwt.d.ts.map