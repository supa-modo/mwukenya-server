import { Request, Response } from "express";
export declare class AdminController {
    static getAllUsers(req: Request, res: Response): Promise<void>;
    static getUserStats(req: Request, res: Response): Promise<void>;
    static getDashboardStats(req: Request, res: Response): Promise<void>;
    static createUser(req: Request, res: Response): Promise<void>;
    static updateUser(req: Request, res: Response): Promise<void>;
    static deleteUser(req: Request, res: Response): Promise<void>;
    static getMembersPendingVerification(req: Request, res: Response): Promise<void>;
    static getMemberVerificationDetails(req: Request, res: Response): Promise<void>;
    static getHierarchyPerformance(req: Request, res: Response): Promise<void>;
    static verifyMember(req: Request, res: Response): Promise<void>;
    static getDelegatesByCoordinator(req: Request, res: Response): Promise<void>;
    static getMembersByDelegate(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AdminController.d.ts.map