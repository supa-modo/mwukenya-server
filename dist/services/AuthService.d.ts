import { User } from "../models";
import { UserRole, ServiceResponse, LoginCredentials } from "../types";
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
export declare class AuthService {
    static login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<ServiceResponse<LoginResponse>>;
    static refreshToken(refreshToken: string): Promise<ServiceResponse<AuthTokens>>;
    static logout(userId: string, sessionId: string): Promise<ServiceResponse<void>>;
    static register(userData: RegistrationData, registeredBy?: string): Promise<ServiceResponse<{
        user: Partial<User>;
        requiresApproval: boolean;
    }>>;
    static requestPasswordReset(identifier: string): Promise<ServiceResponse<{
        message: string;
        method: "email" | "sms";
    }>>;
    static resetPasswordWithToken(token: string, newPassword: string): Promise<ServiceResponse<{
        message: string;
    }>>;
    static resetPasswordWithCode(phoneNumber: string, resetCode: string, newPassword: string): Promise<ServiceResponse<{
        message: string;
    }>>;
    private static validateRegistrationRequirements;
    private static recordFailedLogin;
}
export default AuthService;
//# sourceMappingURL=AuthService.d.ts.map