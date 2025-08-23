import { Request, Response } from "express";
export declare class AuthController {
    static login(req: Request, res: Response): Promise<void>;
    static register(req: Request, res: Response): Promise<void>;
    static refreshToken(req: Request, res: Response): Promise<void>;
    static logout(req: Request, res: Response): Promise<void>;
    static forgotPassword(req: Request, res: Response): Promise<void>;
    static resetPasswordWithToken(req: Request, res: Response): Promise<void>;
    static resetPasswordWithCode(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AuthController.d.ts.map