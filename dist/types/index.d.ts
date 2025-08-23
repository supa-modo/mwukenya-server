import { Request } from "express";
export * from "../models/types";
export interface RequestUser {
    id: string;
    role: UserRole;
    sessionId: string;
}
export interface AuthenticatedRequest extends Request {
    user?: RequestUser;
    file?: Express.Multer.File;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    timestamp: string;
}
export interface DatabaseTransaction {
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        statusCode?: number;
        details?: any;
    };
}
export interface ValidationError {
    field: string;
    message: string;
    code: string;
}
export interface PaginationQuery {
    page?: string;
    limit?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
}
export interface FileUpload {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
}
import { UserRole } from "../models/types";
//# sourceMappingURL=index.d.ts.map