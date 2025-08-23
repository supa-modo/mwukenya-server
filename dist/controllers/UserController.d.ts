import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types";
export declare class UserController {
    static getProfile(req: Request, res: Response): Promise<void>;
    static updateProfile(req: Request, res: Response): Promise<void>;
    static changePassword(req: Request, res: Response): Promise<void>;
    static getDependants(req: Request, res: Response): Promise<void>;
    static getDocuments(req: Request, res: Response): Promise<void>;
    static getDelegate(req: Request, res: Response): Promise<void>;
    static getMyDelegates(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getMyMembers(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getMembersByDelegate(req: AuthenticatedRequest, res: Response): Promise<void>;
    static createDelegate(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateDelegate(req: AuthenticatedRequest, res: Response): Promise<void>;
    static deactivateDelegate(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getDelegateStats(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getCoordinatorStats(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=UserController.d.ts.map