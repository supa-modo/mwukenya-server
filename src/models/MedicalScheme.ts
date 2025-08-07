import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";
import {
  MedicalSchemeAttributes,
  MedicalSchemeCreationAttributes,
  CoverageType,
} from "../types";

class MedicalScheme
  extends Model<MedicalSchemeAttributes, MedicalSchemeCreationAttributes>
  implements MedicalSchemeAttributes
{
  public id!: string;
  public name!: string;
  public code!: string;
  public description?: string;
  public coverageType!: CoverageType;
  public dailyPremium!: number;
  public shaPortion!: number;
  public delegateCommission!: number;
  public coordinatorCommission!: number;
  public benefits?: Record<string, any>;
  public isActive!: boolean;
  public shaSchemeId?: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Computed properties
  public get mwuPortion(): number {
    return (
      this.dailyPremium -
      this.shaPortion -
      this.delegateCommission -
      this.coordinatorCommission
    );
  }

  // Instance methods
  public calculateCommissions(memberPayment: number): {
    delegateCommission: number;
    coordinatorCommission: number;
    shaPortion: number;
    mwuPortion: number;
  } {
    const paymentRatio = memberPayment / this.dailyPremium;

    return {
      delegateCommission: this.delegateCommission * paymentRatio,
      coordinatorCommission: this.coordinatorCommission * paymentRatio,
      shaPortion: this.shaPortion * paymentRatio,
      mwuPortion: this.mwuPortion * paymentRatio,
    };
  }

  public isValidPaymentAmount(amount: number): boolean {
    return amount > 0 && amount <= this.dailyPremium * 30; // Max 30 days advance
  }

  public getDaysCovered(amount: number): number {
    return Math.floor(amount / this.dailyPremium);
  }

  // Static methods
  public static async findByCode(code: string): Promise<MedicalScheme | null> {
    return this.findOne({ where: { code, isActive: true } });
  }

  public static async findActiveSchemes(): Promise<MedicalScheme[]> {
    return this.findAll({
      where: { isActive: true },
      order: [["coverageType", "ASC"]],
    });
  }

  public static async findByCoverageType(
    coverageType: CoverageType
  ): Promise<MedicalScheme[]> {
    return this.findAll({
      where: { coverageType, isActive: true },
      order: [["dailyPremium", "ASC"]],
    });
  }
}

// Initialize the model
MedicalScheme.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 100],
      },
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 20],
        isUppercase: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    coverageType: {
      type: DataTypes.ENUM(...Object.values(CoverageType)),
      allowNull: false,
      field: "coverage_type",
    },
    dailyPremium: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "daily_premium",
      validate: {
        min: 1,
        max: 10000,
      },
    },
    shaPortion: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "sha_portion",
      validate: {
        min: 0,
      },
    },
    delegateCommission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 2.0,
      field: "delegate_commission",
      validate: {
        min: 0,
      },
    },
    coordinatorCommission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.0,
      field: "coordinator_commission",
      validate: {
        min: 0,
      },
    },
    benefits: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    shaSchemeId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "sha_scheme_id",
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
    tableName: "medical_schemes",
    indexes: [
      {
        unique: true,
        fields: ["code"],
      },
      {
        fields: ["coverage_type"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["daily_premium"],
      },
    ],
    validate: {
      // Ensure premium structure is valid
      premiumStructureValid() {
        const total =
          Number(this.shaPortion) +
          Number(this.delegateCommission) +
          Number(this.coordinatorCommission);
        if (total > Number(this.dailyPremium)) {
          throw new Error(
            "Total of SHA portion and commissions cannot exceed daily premium"
          );
        }
      },
    },
  }
);

export default MedicalScheme;
