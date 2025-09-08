import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export interface AuditLogAttributes {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  severity: "info" | "warning" | "error" | "critical";
  createdAt: Date;
}

export interface AuditLogCreationAttributes
  extends Optional<
    AuditLogAttributes,
    | "id"
    | "userId"
    | "resourceId"
    | "details"
    | "ipAddress"
    | "userAgent"
    | "createdAt"
  > {}

class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  public id!: string;
  public userId?: string;
  public action!: string;
  public resourceType!: string;
  public resourceId?: string;
  public details?: any;
  public ipAddress?: string;
  public userAgent?: string;
  public severity!: "info" | "warning" | "error" | "critical";
  public readonly createdAt!: Date;

  public static associate(models: any): void {
    // AuditLog belongs to User (optional)
    if (models.User) {
      AuditLog.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
        constraints: false,
      });
    }
  }

  /**
   * Find audit logs by user ID
   */
  public static async findByUserId(userId: string): Promise<AuditLog[]> {
    return await AuditLog.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Find audit logs by resource
   */
  public static async findByResource(
    resourceType: string,
    resourceId: string
  ): Promise<AuditLog[]> {
    return await AuditLog.findAll({
      where: { resourceType, resourceId },
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Find audit logs by action
   */
  public static async findByAction(action: string): Promise<AuditLog[]> {
    return await AuditLog.findAll({
      where: { action },
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Find audit logs by severity
   */
  public static async findBySeverity(
    severity: "info" | "warning" | "error" | "critical"
  ): Promise<AuditLog[]> {
    return await AuditLog.findAll({
      where: { severity },
      order: [["createdAt", "DESC"]],
    });
  }
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    resourceType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    severity: {
      type: DataTypes.ENUM("info", "warning", "error", "critical"),
      allowNull: false,
      defaultValue: "info",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "AuditLog",
    tableName: "audit_logs",
    timestamps: false, // Only createdAt, no updatedAt
    indexes: [
      {
        fields: ["userId"],
        name: "idx_audit_logs_user_id",
      },
      {
        fields: ["action"],
        name: "idx_audit_logs_action",
      },
      {
        fields: ["resourceType"],
        name: "idx_audit_logs_resource_type",
      },
      {
        fields: ["resourceType", "resourceId"],
        name: "idx_audit_logs_resource",
      },
      {
        fields: ["severity"],
        name: "idx_audit_logs_severity",
      },
      {
        fields: ["createdAt"],
        name: "idx_audit_logs_created_at",
      },
    ],
  }
);

export default AuditLog;
