import { Model } from "sequelize";
import { DependantAttributes, DependantCreationAttributes, DependantRelationship, DependantStatus, Gender } from "./types";
declare class Dependant extends Model<DependantAttributes, DependantCreationAttributes> implements DependantAttributes {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
    relationship: DependantRelationship;
    dateOfBirth: Date;
    gender: Gender;
    idNumber?: string;
    notes?: string;
    status: DependantStatus;
    isVerified: boolean;
    verifiedBy?: string;
    verifiedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    get age(): number;
    get fullName(): string;
    markAsVerified(verifiedBy: string): void;
    markAsSuspended(reason?: string): void;
    isActive(): boolean;
    isAdult(): boolean;
    toJSON(): Partial<DependantAttributes>;
    static findByUserId(userId: string): Promise<Dependant[]>;
    static findActiveByUserId(userId: string): Promise<Dependant[]>;
    static findPendingVerification(): Promise<Dependant[]>;
}
export default Dependant;
//# sourceMappingURL=Dependant.d.ts.map