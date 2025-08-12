import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import {
  DocumentAttributes,
  DocumentCreationAttributes,
  DocumentStatus,
  DocumentType,
} from "../types";

// Document model class
class Document
  extends Model<DocumentAttributes, DocumentCreationAttributes>
  implements DocumentAttributes
{
  public id!: string;
  public userId!: string;
  public name!: string;
  public type!: DocumentType;
  public description?: string;
  public fileName!: string;
  public fileSize!: number;
  public mimeType!: string;
  public s3Key!: string;
  public s3Bucket!: string;
  public url?: string;
  public status!: DocumentStatus;
  public uploadedAt!: Date;
  public verifiedAt?: Date;
  public verifiedBy?: string;
  public rejectionReason?: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Instance methods
  public markAsVerified(verifiedBy: string): void {
    this.status = DocumentStatus.VERIFIED;
    this.verifiedAt = new Date();
    this.verifiedBy = verifiedBy;
    this.rejectionReason = undefined;
  }

  public markAsRejected(rejectionReason: string): void {
    this.status = DocumentStatus.REJECTED;
    this.rejectionReason = rejectionReason;
    this.verifiedAt = undefined;
    this.verifiedBy = undefined;
  }

  public isPending(): boolean {
    return this.status === DocumentStatus.PENDING;
  }

  public isVerified(): boolean {
    return this.status === DocumentStatus.VERIFIED;
  }

  public isRejected(): boolean {
    return this.status === DocumentStatus.REJECTED;
  }

  public toJSON(): Partial<DocumentAttributes> {
    const values = { ...this.get() } as any;
    // Don't expose sensitive S3 details to frontend
    delete values.s3Key;
    delete values.s3Bucket;
    return values;
  }

  // Static methods
  public static async findByUserId(userId: string): Promise<Document[]> {
    return this.findAll({
      where: { userId },
      order: [["uploadedAt", "DESC"]],
    });
  }

  public static async findByUserIdAndType(
    userId: string,
    type: DocumentType
  ): Promise<Document[]> {
    return this.findAll({
      where: { userId, type },
      order: [["uploadedAt", "DESC"]],
    });
  }

  public static async findPendingDocuments(): Promise<Document[]> {
    return this.findAll({
      where: { status: DocumentStatus.PENDING },
      order: [["uploadedAt", "ASC"]],
    });
  }
}

// Initialize the model
Document.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    type: {
      type: DataTypes.ENUM(...Object.values(DocumentType)),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "file_name",
      validate: {
        notEmpty: true,
      },
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "file_size",
      validate: {
        min: 1,
        max: 5 * 1024 * 1024, // 5MB max
      },
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "mime_type",
      validate: {
        notEmpty: true,
        isIn: [
          [
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
        ],
      },
    },
    s3Key: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "s3_key",
      validate: {
        notEmpty: true,
      },
    },
    s3Bucket: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "s3_bucket",
      validate: {
        notEmpty: true,
      },
    },
    url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(DocumentStatus)),
      allowNull: false,
      defaultValue: DocumentStatus.PENDING,
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "uploaded_at",
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "verified_at",
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "verified_by",
      references: {
        model: "users",
        key: "id",
      },
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "rejection_reason",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "documents",
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["uploaded_at"],
      },
      {
        unique: true,
        fields: ["s3_key"],
      },
    ],
  }
);

export default Document;
