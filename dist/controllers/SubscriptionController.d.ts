import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types";
export declare class SubscriptionController {
    private subscriptionService;
    constructor();
    getMySubscription: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    createSubscription: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    changeScheme: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    cancelSubscription: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getAllSubscriptions: (req: Request, res: Response) => Promise<void>;
    getSubscriptionById: (req: Request, res: Response) => Promise<void>;
    updateSubscriptionStatus: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=SubscriptionController.d.ts.map