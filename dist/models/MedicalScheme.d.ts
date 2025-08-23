import { Model } from "sequelize";
import { MedicalSchemeAttributes, MedicalSchemeCreationAttributes, CoverageType } from "../types";
declare class MedicalScheme extends Model<MedicalSchemeAttributes, MedicalSchemeCreationAttributes> implements MedicalSchemeAttributes {
    id: string;
    name: string;
    code: string;
    description?: string;
    coverageType: CoverageType;
    dailyPremium: number;
    shaPortion: number;
    delegateCommission: number;
    coordinatorCommission: number;
    benefits?: string[];
    limitations?: string[];
    isActive: boolean;
    shaSchemeId?: string;
    createdAt: Date;
    updatedAt: Date;
    get mwuPortion(): number;
    get monthlyPremium(): number;
    get annualPremium(): number;
    get maxDependents(): number;
    get coverageDescription(): string;
    calculateCommissions(memberPayment: number): {
        delegateCommission: number;
        coordinatorCommission: number;
        shaPortion: number;
        mwuPortion: number;
    };
    isValidPaymentAmount(amount: number): boolean;
    getDaysCovered(amount: number): number;
    getMinimumPayment(): number;
    calculateCoveragePeriod(amount: number, startDate: Date): {
        startDate: Date;
        endDate: Date;
        daysCovered: number;
    };
    isEligibleForDependents(): boolean;
    static findByCode(code: string): Promise<MedicalScheme | null>;
    static findActiveSchemes(): Promise<MedicalScheme[]>;
    static findByCoverageType(coverageType: CoverageType): Promise<MedicalScheme[]>;
    static findWithSubscriberCount(): Promise<any[]>;
    static getCoverageTypeOptions(): Array<{
        value: CoverageType;
        label: string;
        description: string;
    }>;
}
export default MedicalScheme;
//# sourceMappingURL=MedicalScheme.d.ts.map