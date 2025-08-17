import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import {
  DependantAttributes,
  DependantCreationAttributes,
  DependantRelationship,
  DependantStatus,
  Gender,
} from "./types";

// Dependant model class
class Dependant
  extends Model<DependantAttributes, DependantCreationAttributes>
  implements DependantAttributes
{
  public id!: string;
  public userId!: string;
  public firstName!: string;
  public lastName!: string;
  public otherNames?: string;
  public relationship!: DependantRelationship;
  public dateOfBirth!: Date;
  public gender!: Gender;
  public idNumber?: string;
  public notes?: string;
  public status!: DependantStatus;
  public isVerified!: boolean;
  public verifiedBy?: string;
  public verifiedAt?: Date;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Virtual fields for computed values
  public get age(): number {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Instance methods
  public markAsVerified(verifiedBy: string): void {
    this.isVerified = true;
    this.verifiedAt = new Date();
    this.verifiedBy = verifiedBy;
    this.status = DependantStatus.ACTIVE;
  }

  public markAsSuspended(reason?: string): void {
    this.status = DependantStatus.SUSPENDED;
    this.notes = reason
      ? `${this.notes || ""}\nSuspended: ${reason}`.trim()
      : this.notes;
  }

  public isActive(): boolean {
    return this.status === DependantStatus.ACTIVE;
  }

  public isAdult(): boolean {
    return this.age >= 18;
  }

  public toJSON(): Partial<DependantAttributes> {
    const values = { ...this.get() } as any;
    values.age = this.age;
    values.fullName = this.fullName;
    return values;
  }

  // Static methods
  public static async findByUserId(userId: string): Promise<Dependant[]> {
    return this.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });
  }

  public static async findActiveByUserId(userId: string): Promise<Dependant[]> {
    return this.findAll({
      where: { userId, status: DependantStatus.ACTIVE },
      order: [["createdAt", "DESC"]],
    });
  }

  public static async findPendingVerification(): Promise<Dependant[]> {
    return this.findAll({
      where: { isVerified: false },
      order: [["createdAt", "ASC"]],
    });
  }
}

// Initialize the model
Dependant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "first_name",
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "last_name",
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    otherNames: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "other_names",
    },
    relationship: {
      type: DataTypes.ENUM("spouse", "child", "parent", "sibling", "other"),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [["spouse", "child", "parent", "sibling", "other"]],
      },
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "date_of_birth",
      validate: {
        notEmpty: true,
        isDate: true,
        isPast: true,
      },
    },
    gender: {
      type: DataTypes.ENUM("Male", "Female"),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [["Male", "Female"]],
      },
    },
    idNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "id_number",
      unique: true,
      validate: {
        len: [0, 20],
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "suspended"),
      defaultValue: DependantStatus.ACTIVE,
      validate: {
        isIn: [["active", "inactive", "suspended"]],
      },
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_verified",
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
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "verified_at",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "dependants",
    timestamps: true,
    underscored: true,
  }
);

export default Dependant;
