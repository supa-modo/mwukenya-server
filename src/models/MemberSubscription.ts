import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";
import {
  MemberSubscriptionAttributes,
  MemberSubscriptionCreationAttributes,
  SubscriptionStatus,
  CoverageType,
} from "../types";

class MemberSubscription
  extends Model<
    MemberSubscriptionAttributes,
    MemberSubscriptionCreationAttributes
  >
  implements MemberSubscriptionAttributes
{
  public id!: string;
  public userId!: string;
  public schemeId!: string;
  public subscriptionDate!: Date;
  public status!: SubscriptionStatus;
  public effectiveDate!: Date;
  public endDate?: Date;
  public registrationDelegateId?: string;
  public registrationCoordinatorId?: string;
  public shaMemberNumber?: string;
  public dependents?: Record<string, any>[];
  public createdAt!: Date;
  public updatedAt!: Date;

  // Association properties
  public user?: any;
  public scheme?: any;
  public registrationDelegate?: any;
  public registrationCoordinator?: any;
  public payments?: any[];

  // Instance methods
  public async getDependentsCount(): Promise<number> {
    return this.dependents ? this.dependents.length : 0;
  }

  public async getPaymentHistory(options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<any[]> {
    const { Payment } = sequelize.models;
    return Payment.findAll({
      where: {
        subscriptionId: this.id,
        ...(options?.status && { paymentStatus: options.status }),
      },
      order: [["paymentDate", "DESC"]],
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  public async getPaymentSummary(): Promise<{
    totalPaid: number;
    totalDays: number;
    lastPaymentDate?: Date;
    nextDueDate?: Date;
    arrearsDays: number;
    arrearsAmount: number;
  }> {
    const { Payment } = sequelize.models;
    const payments = await Payment.findAll({
      where: {
        subscriptionId: this.id,
        paymentStatus: "completed",
      },
      order: [["paymentDate", "DESC"]],
    });

    const totalPaid = payments.reduce(
      (sum: number, payment: any) => sum + parseFloat(payment.amount),
      0
    );
    const totalDays = payments.reduce(
      (sum: number, payment: any) => sum + payment.daysCovered,
      0
    );
    const lastPaymentDate = payments.length > 0 ? new Date() : undefined; // Mock for now

    // Calculate arrears
    const daysSinceStart = Math.floor(
      (new Date().getTime() - this.effectiveDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const arrearsDays = Math.max(0, daysSinceStart - totalDays);
    const arrearsAmount = arrearsDays * (this.scheme?.dailyPremium || 0);

    // Calculate next due date
    const nextDueDate = new Date(this.effectiveDate);
    nextDueDate.setDate(nextDueDate.getDate() + totalDays);

    return {
      totalPaid,
      totalDays,
      lastPaymentDate,
      nextDueDate: arrearsDays > 0 ? new Date() : nextDueDate,
      arrearsDays,
      arrearsAmount,
    };
  }

  public async isActive(): Promise<boolean> {
    return this.status === SubscriptionStatus.ACTIVE;
  }

  public async canMakePayment(): Promise<boolean> {
    return this.status === SubscriptionStatus.ACTIVE;
  }

  public async addDependent(dependent: {
    firstName: string;
    lastName: string;
    relationship: string;
    dateOfBirth: Date;
    idNumber?: string;
  }): Promise<void> {
    const currentDependents = this.dependents || [];
    const maxDependents = this.scheme?.maxDependents || 0;

    if (currentDependents.length >= maxDependents) {
      throw new Error(
        `Maximum ${maxDependents} dependents allowed for this scheme`
      );
    }

    const updatedDependents = [...currentDependents, dependent];
    await this.update({ dependents: updatedDependents });
  }

  public async removeDependent(dependentIndex: number): Promise<void> {
    const currentDependents = this.dependents || [];
    if (dependentIndex < 0 || dependentIndex >= currentDependents.length) {
      throw new Error("Invalid dependent index");
    }

    const updatedDependents = currentDependents.filter(
      (_, index) => index !== dependentIndex
    );
    await this.update({ dependents: updatedDependents });
  }

  // Static methods
  public static async findActiveSubscription(
    userId: string
  ): Promise<MemberSubscription | null> {
    return this.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: [
        {
          model: sequelize.models.MedicalScheme,
          as: "scheme",
        },
        {
          model: sequelize.models.User,
          as: "user",
        },
      ],
    });
  }

  public static async findByUserId(
    userId: string
  ): Promise<MemberSubscription[]> {
    return this.findAll({
      where: { userId },
      include: [
        {
          model: sequelize.models.MedicalScheme,
          as: "scheme",
        },
      ],
      order: [["subscriptionDate", "DESC"]],
    });
  }

  public static async findWithPaymentSummary(options?: {
    userId?: string;
    schemeId?: string;
    status?: SubscriptionStatus;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const whereClause: any = {};
    if (options?.userId) whereClause.userId = options.userId;
    if (options?.schemeId) whereClause.schemeId = options.schemeId;
    if (options?.status) whereClause.status = options.status;

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.MedicalScheme,
          as: "scheme",
        },
        {
          model: sequelize.models.User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "phoneNumber"],
        },
        {
          model: sequelize.models.Payment,
          as: "payments",
          where: { paymentStatus: "completed" },
          required: false,
        },
      ],
      order: [["subscriptionDate", "DESC"]],
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  public static async getActiveSubscriptionsCount(): Promise<number> {
    return this.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });
  }

  public static async getSubscriptionsByScheme(): Promise<any[]> {
    return this.findAll({
      attributes: [
        "schemeId",
        [sequelize.fn("COUNT", sequelize.col("id")), "subscriptionCount"],
      ],
      include: [
        {
          model: sequelize.models.MedicalScheme,
          as: "scheme",
          attributes: ["name", "code", "coverageType"],
        },
      ],
      where: { status: SubscriptionStatus.ACTIVE },
      group: ["schemeId", "scheme.id"],
      order: [[sequelize.literal("subscriptionCount"), "DESC"]],
    });
  }
}

// Initialize the model
MemberSubscription.init(
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
    },
    schemeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "scheme_id",
      references: {
        model: "medical_schemes",
        key: "id",
      },
    },
    subscriptionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "subscription_date",
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SubscriptionStatus)),
      allowNull: false,
      defaultValue: SubscriptionStatus.ACTIVE,
    },
    effectiveDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "effective_date",
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "end_date",
    },
    registrationDelegateId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "registration_delegate_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    registrationCoordinatorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "registration_coordinator_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    shaMemberNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "sha_member_number",
    },
    dependents: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
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
    tableName: "member_subscriptions",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "scheme_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["scheme_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["effective_date"],
      },
      {
        fields: ["end_date"],
      },
      {
        fields: ["registration_delegate_id"],
      },
      {
        fields: ["registration_coordinator_id"],
      },
    ],
    validate: {
      // Ensure effective date is not in the future
      effectiveDateValid() {
        if (this.effectiveDate && this.effectiveDate > new Date()) {
          throw new Error("Effective date cannot be in the future");
        }
      },
    },
  }
);

export default MemberSubscription;
