import { Model } from "sequelize";
import { MemberSubscriptionAttributes, MemberSubscriptionCreationAttributes, SubscriptionStatus } from "../types";
declare class MemberSubscription extends Model<MemberSubscriptionAttributes, MemberSubscriptionCreationAttributes> implements MemberSubscriptionAttributes {
    id: string;
    userId: string;
    schemeId: string;
    subscriptionDate: Date;
    status: SubscriptionStatus;
    effectiveDate: Date;
    endDate?: Date;
    registrationDelegateId?: string;
    registrationCoordinatorId?: string;
    shaMemberNumber?: string;
    dependents?: Record<string, any>[];
    createdAt: Date;
    updatedAt: Date;
    user?: any;
    scheme?: any;
    registrationDelegate?: any;
    registrationCoordinator?: any;
    payments?: any[];
    getDependentsCount(): Promise<number>;
    getPaymentHistory(options?: {
        limit?: number;
        offset?: number;
        status?: string;
    }): Promise<any[]>;
    getPaymentSummary(): Promise<{
        totalPaid: number;
        totalDays: number;
        lastPaymentDate?: Date;
        nextDueDate?: Date;
        arrearsDays: number;
        arrearsAmount: number;
    }>;
    isActive(): Promise<boolean>;
    canMakePayment(): Promise<boolean>;
    addDependent(dependent: {
        firstName: string;
        lastName: string;
        relationship: string;
        dateOfBirth: Date;
        idNumber?: string;
    }): Promise<void>;
    removeDependent(dependentIndex: number): Promise<void>;
    static findActiveSubscription(userId: string): Promise<MemberSubscription | null>;
    static findByUserId(userId: string): Promise<MemberSubscription[]>;
    static findWithPaymentSummary(options?: {
        userId?: string;
        schemeId?: string;
        status?: SubscriptionStatus;
        limit?: number;
        offset?: number;
    }): Promise<any[]>;
    static getActiveSubscriptionsCount(): Promise<number>;
    static getSubscriptionsByScheme(): Promise<any[]>;
}
export default MemberSubscription;
//# sourceMappingURL=MemberSubscription.d.ts.map