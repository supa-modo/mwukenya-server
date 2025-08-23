import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types";
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: UserRole;
                sessionId: string;
            };
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuthenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireSuperAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireCoordinator: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireDelegate: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireMember: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireSelfAccess: (userIdParam?: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireHierarchicalAccess: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map