import { Model } from "sequelize";
import { DocumentAttributes, DocumentCreationAttributes, DocumentStatus, DocumentType } from "../types";
declare class Document extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
    id: string;
    userId: string;
    entityType: "user" | "dependant";
    entityId: string;
    name: string;
    type: DocumentType;
    description?: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    s3Key: string;
    s3Bucket: string;
    url?: string;
    status: DocumentStatus;
    uploadedAt: Date;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
    markAsVerified(verifiedBy: string): void;
    markAsRejected(rejectionReason: string): void;
    isPending(): boolean;
    isVerified(): boolean;
    isRejected(): boolean;
    toJSON(): Partial<DocumentAttributes>;
    static findByUserId(userId: string): Promise<Document[]>;
    static findByUserIdAndType(userId: string, type: DocumentType): Promise<Document[]>;
    static findPendingDocuments(): Promise<Document[]>;
}
export default Document;
//# sourceMappingURL=Document.d.ts.map