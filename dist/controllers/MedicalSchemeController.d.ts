import { Request, Response } from "express";
export declare class MedicalSchemeController {
    private medicalSchemeService;
    constructor();
    getAllSchemes: (req: Request, res: Response) => Promise<void>;
    getActiveSchemes: (req: Request, res: Response) => Promise<void>;
    getSchemeById: (req: Request, res: Response) => Promise<void>;
    createScheme: (req: Request, res: Response) => Promise<void>;
    updateScheme: (req: Request, res: Response) => Promise<void>;
    deleteScheme: (req: Request, res: Response) => Promise<void>;
    getSchemeSubscribers: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=MedicalSchemeController.d.ts.map