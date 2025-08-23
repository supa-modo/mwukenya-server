import { Response } from "express";
import { AuthenticatedRequest } from "../types";
export declare class DependantController {
    static createDependant(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getUserDependants(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getDependantById(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateDependant(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteDependant(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getDependantStats(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static verifyDependant(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPendingVerificationDependants(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=DependantController.d.ts.map