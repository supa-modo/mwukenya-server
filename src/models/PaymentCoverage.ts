import {
  DataTypes,
  Model,
  Optional,
  Association,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  Op,
} from "sequelize";
import sequelize from "../config/database";
import {
  PaymentCoverageAttributes,
  PaymentCoverageCreationAttributes,
} from "./types";

class PaymentCoverage
  extends Model<PaymentCoverageAttributes, PaymentCoverageCreationAttributes>
  implements PaymentCoverageAttributes
{
  public id!: string;
  public userId!: string;
  public subscriptionId!: string;
  public coverageDate!: Date;
  public paymentId?: string;
  public isPaid!: boolean;
  public amount?: number;
  public createdAt!: Date;

  // Associations
  public static associations: {
    user: Association<PaymentCoverage, any>;
    subscription: Association<PaymentCoverage, any>;
    payment: Association<PaymentCoverage, any>;
  };

  // Association methods
  public getUser!: BelongsToGetAssociationMixin<any>;
  public setUser!: BelongsToSetAssociationMixin<any, string>;
  public getSubscription!: BelongsToGetAssociationMixin<any>;
  public setSubscription!: BelongsToSetAssociationMixin<any, string>;
  public getPayment!: BelongsToGetAssociationMixin<any>;
  public setPayment!: BelongsToSetAssociationMixin<any, string>;

  // Instance methods
  public markAsPaid(paymentId: string, amount: number): void {
    this.isPaid = true;
    this.paymentId = paymentId;
    this.amount = amount;
  }

  public markAsUnpaid(): void {
    this.isPaid = false;
    this.paymentId = undefined;
    this.amount = undefined;
  }

  // Static methods
  public static async findCoverageByDate(
    userId: string,
    subscriptionId: string,
    coverageDate: Date
  ): Promise<PaymentCoverage | null> {
    return this.findOne({
      where: {
        userId,
        subscriptionId,
        coverageDate,
      },
    });
  }

  public static async createCoverageRange(
    userId: string,
    subscriptionId: string,
    startDate: Date,
    endDate: Date,
    paymentId?: string,
    amount?: number
  ): Promise<PaymentCoverage[]> {
    const coverages: PaymentCoverageCreationAttributes[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      coverages.push({
        userId,
        subscriptionId,
        coverageDate: new Date(currentDate),
        isPaid: !!paymentId,
        paymentId,
        amount,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return this.bulkCreate(coverages, {
      updateOnDuplicate: ["isPaid", "paymentId", "amount"],
    });
  }

  public static async getUnpaidDays(
    userId: string,
    subscriptionId: string,
    endDate?: Date
  ): Promise<PaymentCoverage[]> {
    const whereClause: any = {
      userId,
      subscriptionId,
      isPaid: false,
    };

    if (endDate) {
      whereClause.coverageDate = {
        [Op.lte]: endDate,
      };
    }

    return this.findAll({
      where: whereClause,
      order: [["coverageDate", "ASC"]],
    });
  }

  public static async getPaidDays(
    userId: string,
    subscriptionId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PaymentCoverage[]> {
    const whereClause: any = {
      userId,
      subscriptionId,
      isPaid: true,
    };

    if (startDate || endDate) {
      whereClause.coverageDate = {};
      if (startDate) {
        whereClause.coverageDate[Op.gte] = startDate;
      }
      if (endDate) {
        whereClause.coverageDate[Op.lte] = endDate;
      }
    }

    return this.findAll({
      where: whereClause,
      order: [["coverageDate", "ASC"]],
    });
  }

  public static async getCoverageStats(
    userId: string,
    subscriptionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalDays: number;
    paidDays: number;
    unpaidDays: number;
    complianceRate: number;
  }> {
    const totalDays =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    const paidCount = await this.count({
      where: {
        userId,
        subscriptionId,
        isPaid: true,
        coverageDate: {
          [Op.between]: [startDate, endDate],
        },
      },
    });

    const unpaidDays = totalDays - paidCount;
    const complianceRate = totalDays > 0 ? (paidCount / totalDays) * 100 : 0;

    return {
      totalDays,
      paidDays: paidCount,
      unpaidDays,
      complianceRate: Math.round(complianceRate * 100) / 100,
    };
  }

  public static async getFirstUnpaidDate(
    userId: string,
    subscriptionId: string
  ): Promise<Date | null> {
    const coverage = await this.findOne({
      where: {
        userId,
        subscriptionId,
        isPaid: false,
      },
      order: [["coverageDate", "ASC"]],
    });

    return coverage ? coverage.coverageDate : null;
  }

  public static async getCurrentBalance(
    userId: string,
    subscriptionId: string
  ): Promise<number> {
    const result = await this.findAll({
      where: {
        userId,
        subscriptionId,
        isPaid: true,
      },
      attributes: [[sequelize.fn("SUM", sequelize.col("amount")), "totalPaid"]],
      raw: true,
    });

    const row = result[0] as any;
    return parseFloat(row?.totalPaid as string) || 0;
  }
}

PaymentCoverage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "member_subscriptions",
        key: "id",
      },
    },
    coverageDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "payments",
        key: "id",
      },
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "PaymentCoverage",
    tableName: "payment_coverage",
    timestamps: false, // Only createdAt, no updatedAt
    indexes: [
      {
        fields: ["userId", "subscriptionId", "coverageDate"],
        unique: true,
        name: "idx_coverage_user_subscription_date",
      },
      {
        fields: ["userId", "coverageDate"],
        name: "idx_coverage_user_date",
      },
      {
        fields: ["subscriptionId", "coverageDate"],
        name: "idx_coverage_subscription_date",
      },
      {
        fields: ["isPaid", "coverageDate"],
        name: "idx_coverage_paid_date",
      },
      {
        fields: ["paymentId"],
        name: "idx_coverage_payment",
      },
    ],
  }
);

export default PaymentCoverage;
