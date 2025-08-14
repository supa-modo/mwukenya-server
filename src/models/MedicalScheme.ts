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
  public benefits?: string[];
  public limitations?: string[];
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

  public get monthlyPremium(): number {
    return this.dailyPremium * 30;
  }

  public get annualPremium(): number {
    return this.dailyPremium * 365;
  }

  public get maxDependents(): number {
    const coverageMap: Record<string, number> = {
      M: 0,
      "M+1": 1,
      "M+2": 2,
      "M+3": 3,
      "M+4": 4,
      "M+5": 5,
    };
    return coverageMap[this.coverageType] || 0;
  }

  public get coverageDescription(): string {
    const descriptions: Record<string, string> = {
      M: "Individual coverage for member only",
      "M+1": "Member plus one dependent (spouse)",
      "M+2": "Member plus spouse and one child",
      "M+3": "Member plus spouse and two children",
      "M+4": "Member plus spouse and three children",
      "M+5": "Member plus spouse and four children",
    };
    return descriptions[this.coverageType] || "Unknown coverage type";
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

  public getMinimumPayment(): number {
    return this.dailyPremium;
  }

  public calculateCoveragePeriod(
    amount: number,
    startDate: Date
  ): {
    startDate: Date;
    endDate: Date;
    daysCovered: number;
  } {
    const daysCovered = this.getDaysCovered(amount);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysCovered - 1);

    return {
      startDate,
      endDate,
      daysCovered,
    };
  }

  public isEligibleForDependents(): boolean {
    return this.maxDependents > 0;
  }

  // Static methods
  public static async findByCode(code: string): Promise<MedicalScheme | null> {
    return this.findOne({ where: { code, isActive: true } });
  }

  public static async findActiveSchemes(): Promise<MedicalScheme[]> {
    return this.findAll({
      where: { isActive: true },
      order: [
        ["coverageType", "ASC"],
        ["dailyPremium", "ASC"],
      ],
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

  public static async findWithSubscriberCount(): Promise<any[]> {
    return this.findAll({
      where: { isActive: true },
      attributes: [
        "id",
        "name",
        "code",
        "description",
        "coverageType",
        "dailyPremium",
        "shaPortion",
        "delegateCommission",
        "coordinatorCommission",
        "benefits",
        "isActive",
        [
          sequelize.fn("COUNT", sequelize.col("memberSubscriptions.id")),
          "subscriberCount",
        ],
      ],
      include: [
        {
          model: sequelize.models.MemberSubscription,
          as: "memberSubscriptions",
          attributes: [],
          where: { status: "active" },
          required: false,
        },
      ],
      group: ["MedicalScheme.id"],
      order: [
        ["coverageType", "ASC"],
        ["dailyPremium", "ASC"],
      ],
    });
  }

  public static getCoverageTypeOptions(): Array<{
    value: CoverageType;
    label: string;
    description: string;
  }> {
    return [
      {
        value: CoverageType.M,
        label: "Individual (M)",
        description: "Member only coverage",
      },
      {
        value: CoverageType.M_PLUS_1,
        label: "M+1",
        description: "Member plus one dependent",
      },
      {
        value: CoverageType.M_PLUS_2,
        label: "M+2",
        description: "Member plus two dependents",
      },
      {
        value: CoverageType.M_PLUS_3,
        label: "M+3",
        description: "Member plus three dependents",
      },
      {
        value: CoverageType.M_PLUS_4,
        label: "M+4",
        description: "Member plus four dependents",
      },
      {
        value: CoverageType.M_PLUS_5,
        label: "M+5",
        description: "Member plus five dependents",
      },
    ];
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
      defaultValue: [],
    },
    limitations: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
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
