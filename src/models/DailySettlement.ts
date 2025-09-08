import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  BelongsToManyGetAssociationsMixin,
} from "sequelize";
import sequelize from "../config/database";

export interface DailySettlementAttributes {
  id: string;
  settlementDate: Date;
  totalCollected: number;
  shaAmount: number;
  mwuAmount: number;
  totalDelegateCommissions: number;
  totalCoordinatorCommissions: number;
  totalPayments: number;
  uniqueMembers: number;
  status: "pending" | "processing" | "completed" | "failed";
  processedAt?: Date;
  processedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailySettlementCreationAttributes
  extends InferCreationAttributes<DailySettlement> {}

class DailySettlement extends Model<
  InferAttributes<DailySettlement>,
  InferCreationAttributes<DailySettlement>
> {
  declare id: CreationOptional<string>;
  declare settlementDate: Date;
  declare totalCollected: number;
  declare shaAmount: number;
  declare mwuAmount: number;
  declare totalDelegateCommissions: number;
  declare totalCoordinatorCommissions: number;
  declare totalPayments: number;
  declare uniqueMembers: number;
  declare status: "pending" | "processing" | "completed" | "failed";
  declare processedAt: CreationOptional<Date>;
  declare processedBy: CreationOptional<ForeignKey<string>>;
  declare notes: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Association methods (will be added by Sequelize)
  // public getBankTransfers!: HasManyGetAssociationsMixin<BankTransfer>;

  public static associate(models: any): void {
    // DailySettlement has many BankTransfers
    DailySettlement.hasMany(models.BankTransfer, {
      foreignKey: "settlementId",
      as: "bankTransfers",
    });

    // Note: CommissionPayout association is handled in models/index.ts
    // to avoid duplicate associations
  }

  // Static methods for calculations
  public static async calculateDailySettlement(settlementDate: Date): Promise<{
    totalCollected: number;
    shaAmount: number;
    mwuAmount: number;
    totalDelegateCommissions: number;
    totalCoordinatorCommissions: number;
    totalPayments: number;
    uniqueMembers: number;
    delegateBreakdown: Array<{
      delegateId: string;
      delegateName: string;
      totalCommission: number;
      paymentCount: number;
    }>;
    coordinatorBreakdown: Array<{
      coordinatorId: string;
      coordinatorName: string;
      totalCommission: number;
      paymentCount: number;
    }>;
  }> {
    const { Op } = require("sequelize");
    const { User, Payment } = require("./index");
    const { startOfDay, endOfDay } = require("date-fns");

    const startDate = startOfDay(settlementDate);
    const endDate = endOfDay(settlementDate);

    // Get all completed payments for the settlement date
    const payments = await Payment.findAll({
      where: {
        paymentStatus: "completed",
        settlementDate: startOfDay(settlementDate),
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "delegateId",
            "coordinatorId",
          ],
        },
      ],
    });

    // Calculate totals
    const totalCollected = payments.reduce(
      (sum: number, p: any) => sum + parseFloat(p.amount),
      0
    );
    const shaAmount = payments.reduce(
      (sum: number, p: any) => sum + parseFloat(p.shaPortion || 0),
      0
    );
    const totalDelegateCommissions = payments.reduce(
      (sum: number, p: any) => sum + parseFloat(p.delegateCommission || 0),
      0
    );
    const totalCoordinatorCommissions = payments.reduce(
      (sum: number, p: any) => sum + parseFloat(p.coordinatorCommission || 0),
      0
    );
    const mwuAmount =
      totalCollected -
      shaAmount -
      totalDelegateCommissions -
      totalCoordinatorCommissions;

    // Calculate delegate breakdown
    const delegateMap = new Map();
    const coordinatorMap = new Map();

    for (const payment of payments) {
      const delegateId =
        payment.commissionDelegateId || payment.user?.delegateId;
      const coordinatorId =
        payment.commissionCoordinatorId || payment.user?.coordinatorId;

      if (delegateId) {
        if (!delegateMap.has(delegateId)) {
          const delegate = await User.findByPk(delegateId, {
            attributes: ["id", "firstName", "lastName"],
          });
          delegateMap.set(delegateId, {
            delegateId,
            delegateName: delegate
              ? `${delegate.firstName} ${delegate.lastName}`
              : "Unknown",
            totalCommission: 0,
            paymentCount: 0,
          });
        }
        const delegateData = delegateMap.get(delegateId);
        delegateData.totalCommission += parseFloat(
          payment.delegateCommission || 0
        );
        delegateData.paymentCount += 1;
      }

      if (coordinatorId) {
        if (!coordinatorMap.has(coordinatorId)) {
          const coordinator = await User.findByPk(coordinatorId, {
            attributes: ["id", "firstName", "lastName"],
          });
          coordinatorMap.set(coordinatorId, {
            coordinatorId,
            coordinatorName: coordinator
              ? `${coordinator.firstName} ${coordinator.lastName}`
              : "Unknown",
            totalCommission: 0,
            paymentCount: 0,
          });
        }
        const coordinatorData = coordinatorMap.get(coordinatorId);
        coordinatorData.totalCommission += parseFloat(
          payment.coordinatorCommission || 0
        );
        coordinatorData.paymentCount += 1;
      }
    }

    return {
      totalCollected,
      shaAmount,
      mwuAmount,
      totalDelegateCommissions,
      totalCoordinatorCommissions,
      totalPayments: payments.length,
      uniqueMembers: new Set(payments.map((p: any) => p.userId)).size,
      delegateBreakdown: Array.from(delegateMap.values()),
      coordinatorBreakdown: Array.from(coordinatorMap.values()),
    };
  }

  public static async createDailySettlement(
    settlementDate: Date
  ): Promise<DailySettlement> {
    const { startOfDay } = require("date-fns");
    const calculation = await this.calculateDailySettlement(settlementDate);

    return await this.create({
      settlementDate: startOfDay(settlementDate),
      totalCollected: calculation.totalCollected,
      shaAmount: calculation.shaAmount,
      mwuAmount: calculation.mwuAmount,
      totalDelegateCommissions: calculation.totalDelegateCommissions,
      totalCoordinatorCommissions: calculation.totalCoordinatorCommissions,
      totalPayments: calculation.totalPayments,
      uniqueMembers: calculation.uniqueMembers,
      status: "pending",
    });
  }

  public static async getSettlementByDate(
    date: Date
  ): Promise<DailySettlement | null> {
    const { startOfDay } = require("date-fns");
    return await this.findOne({
      where: {
        settlementDate: startOfDay(date),
      },
    });
  }

  public static async getPendingSettlements(): Promise<DailySettlement[]> {
    return await this.findAll({
      where: {
        status: "pending",
      },
      order: [["settlementDate", "ASC"]],
    });
  }
}

DailySettlement.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    settlementDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
    },
    totalCollected: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    shaAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    mwuAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalDelegateCommissions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalCoordinatorCommissions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalPayments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    uniqueMembers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("pending", "processing", "completed", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    processedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "daily_settlements",
    timestamps: true,
    indexes: [
      {
        fields: ["settlementDate"],
        unique: true,
      },
      {
        fields: ["status"],
      },
      {
        fields: ["processedAt"],
      },
    ],
  }
);

export default DailySettlement;
