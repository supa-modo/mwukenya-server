import { Transaction } from "sequelize";
import { DependantAttributes, DependantCreationAttributes, ServiceResponse } from "../types";
export declare class DependantService {
    static createDependant(data: DependantCreationAttributes, userId: string, transaction?: Transaction): Promise<ServiceResponse<DependantAttributes>>;
    static getUserDependants(userId: string, includeDocuments?: boolean): Promise<ServiceResponse<DependantAttributes[]>>;
    static getDependantById(dependantId: string, userId: string): Promise<ServiceResponse<DependantAttributes>>;
    static updateDependant(dependantId: string, userId: string, data: Partial<DependantCreationAttributes>, transaction?: Transaction): Promise<ServiceResponse<DependantAttributes>>;
    static deleteDependant(dependantId: string, userId: string, transaction?: Transaction): Promise<ServiceResponse<boolean>>;
    static verifyDependant(dependantId: string, verifiedBy: string, transaction?: Transaction): Promise<ServiceResponse<DependantAttributes>>;
    static getPendingVerificationDependants(): Promise<ServiceResponse<DependantAttributes[]>>;
    static getDependantStats(userId: string): Promise<ServiceResponse<any>>;
}
//# sourceMappingURL=dependant.service.d.ts.map