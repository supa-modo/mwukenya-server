import MemberSubscription from "../models/MemberSubscription";
import { SubscriptionStatus } from "../types";
interface CreateSubscriptionData {
    userId: string;
    schemeId: string;
}
interface SubscriptionFilters {
    status?: string;
    schemeId?: string;
    search?: string;
}
interface PaginationOptions {
    page: number;
    limit: number;
}
export declare class MemberSubscriptionService {
    getUserSubscription(userId: string): Promise<MemberSubscription | null>;
    createSubscription(data: CreateSubscriptionData): Promise<MemberSubscription>;
    changeScheme(userId: string, newSchemeId: string): Promise<MemberSubscription>;
    cancelSubscription(userId: string): Promise<boolean>;
    getAllSubscriptions(filters: SubscriptionFilters, pagination: PaginationOptions): Promise<{
        subscriptions: MemberSubscription[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getSubscriptionById(id: string): Promise<MemberSubscription | null>;
    updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<MemberSubscription | null>;
    getSubscriptionStats(): Promise<{
        totalSubscriptions: number;
        activeSubscriptions: number;
        suspendedSubscriptions: number;
        cancelledSubscriptions: number;
        subscriptionsByScheme: Array<{
            schemeId: string;
            schemeName: string;
            count: number;
        }>;
    }>;
}
export {};
//# sourceMappingURL=memberSubscription.service.d.ts.map