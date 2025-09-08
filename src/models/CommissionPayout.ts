import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
} from "sequelize";
import sequelize from "../config/database";

export interface CommissionPayoutAttributes {
  id: string;
  settlementId: string;
  recipientId: string;
  recipientType: "delegate" | "coordinator";
  amount: number;
  paymentCount: number;
  paymentMethod?: string;
  transactionReference?: string;
  conversationId?: string;
  originatorConversationId?: string;
  status: "pending" | "processed" | "failed";
  processedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionPayoutCreationAttributes
  extends InferCreationAttributes<CommissionPayout> {}

class CommissionPayout extends Model<
  InferAttributes<CommissionPayout>,
  InferCreationAttributes<CommissionPayout>
> {
  declare id: CreationOptional<string>;
  declare settlementId: ForeignKey<string>;
  declare recipientId: ForeignKey<string>;
  declare recipientType: "delegate" | "coordinator";
  declare amount: number;
  declare paymentCount: number;
  declare paymentMethod: CreationOptional<string>;
  declare transactionReference: CreationOptional<string>;
  declare conversationId: CreationOptional<string>;
  declare originatorConversationId: CreationOptional<string>;
  declare status: "pending" | "processed" | "failed";
  declare processedAt: CreationOptional<Date>;
  declare failureReason: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Static methods for commission management
  public static async createCommissionPayouts(
    settlementId: string,
    delegateBreakdown: Array<{
      delegateId: string;
      delegateName: string;
      totalCommission: number;
      paymentCount: number;
    }>,
    coordinatorBreakdown: Array<{
      coordinatorId: string;
      coordinatorName: string;
      totalCommission: number;
      paymentCount: number;
    }>,
    transaction?: any
  ): Promise<CommissionPayout[]> {
    const payouts: CommissionPayout[] = [];

    // Create delegate payouts
    for (const delegate of delegateBreakdown) {
      if (delegate.totalCommission > 0) {
        const payout = await this.create(
          {
            settlementId,
            recipientId: delegate.delegateId,
            recipientType: "delegate",
            amount: delegate.totalCommission,
            paymentCount: delegate.paymentCount,
            status: "pending",
          },
          { transaction }
        );
        payouts.push(payout);
      }
    }

    // Create coordinator payouts
    for (const coordinator of coordinatorBreakdown) {
      if (coordinator.totalCommission > 0) {
        const payout = await this.create(
          {
            settlementId,
            recipientId: coordinator.coordinatorId,
            recipientType: "coordinator",
            amount: coordinator.totalCommission,
            paymentCount: coordinator.paymentCount,
            status: "pending",
          },
          { transaction }
        );
        payouts.push(payout);
      }
    }

    return payouts;
  }

  public static async getPayoutsBySettlement(
    settlementId: string
  ): Promise<CommissionPayout[]> {
    const { User } = require("./index");

    return await this.findAll({
      where: {
        settlementId,
      },
      include: [
        {
          model: User,
          as: "recipient",
          attributes: ["id", "firstName", "lastName", "phoneNumber", "email"],
        },
      ],
      order: [
        ["recipientType", "ASC"],
        ["amount", "DESC"],
      ],
    });
  }

  public static async getPayoutsByRecipient(
    recipientId: string,
    limit: number = 50
  ): Promise<CommissionPayout[]> {
    const { DailySettlement } = require("./index");

    return await this.findAll({
      where: {
        recipientId,
      },
      include: [
        {
          model: DailySettlement,
          as: "settlement",
          attributes: ["id", "settlementDate", "status"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
    });
  }

  public static async getPendingPayouts(): Promise<CommissionPayout[]> {
    const { User } = require("./index");

    return await this.findAll({
      where: {
        status: "pending",
      },
      include: [
        {
          model: User,
          as: "recipient",
          attributes: ["id", "firstName", "lastName", "phoneNumber", "email"],
        },
      ],
      order: [["amount", "DESC"]],
    });
  }

  public static async markAsProcessed(
    payoutId: string,
    transactionReference: string,
    paymentMethod: string = "mpesa"
  ): Promise<void> {
    await this.update(
      {
        status: "processed",
        processedAt: new Date(),
        transactionReference,
        paymentMethod,
      },
      {
        where: {
          id: payoutId,
        },
      }
    );
  }

  public static async markAsFailed(
    payoutId: string,
    failureReason: string
  ): Promise<void> {
    await this.update(
      {
        status: "failed",
        failureReason,
      },
      {
        where: {
          id: payoutId,
        },
      }
    );
  }

  public static async findByConversationId(
    conversationId: string
  ): Promise<CommissionPayout | null> {
    return this.findOne({
      where: {
        conversationId,
      },
      include: [
        {
          model: sequelize.models.User,
          as: "recipient",
          attributes: ["id", "firstName", "lastName", "phoneNumber"],
        },
      ],
    });
  }

  public static async updateByConversationId(
    conversationId: string,
    updateData: Partial<CommissionPayoutAttributes>
  ): Promise<void> {
    await this.update(updateData, {
      where: {
        conversationId,
      },
    });
  }

  public static async getCommissionSummary(
    recipientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalAmount: number;
    totalPayouts: number;
    pendingAmount: number;
    processedAmount: number;
    failedAmount: number;
  }> {
    const { Op } = require("sequelize");
    const { DailySettlement } = require("./index");

    const payouts = await this.findAll({
      where: {
        recipientId,
      },
      include: [
        {
          model: DailySettlement,
          as: "settlement",
          where: {
            settlementDate: {
              [Op.between]: [startDate, endDate],
            },
          },
        },
      ],
    });

    const summary = {
      totalAmount: 0,
      totalPayouts: payouts.length,
      pendingAmount: 0,
      processedAmount: 0,
      failedAmount: 0,
    };

    for (const payout of payouts) {
      const amount = parseFloat(payout.amount.toString());
      summary.totalAmount += amount;

      switch (payout.status) {
        case "pending":
          summary.pendingAmount += amount;
          break;
        case "processed":
          summary.processedAmount += amount;
          break;
        case "failed":
          summary.failedAmount += amount;
          break;
      }
    }

    return summary;
  }
}

CommissionPayout.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    settlementId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "daily_settlements",
        key: "id",
      },
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    recipientType: {
      type: DataTypes.ENUM("delegate", "coordinator"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paymentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    transactionReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    conversationId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    originatorConversationId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "processed", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failureReason: {
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
    tableName: "commission_payouts",
    timestamps: true,
    indexes: [
      {
        fields: ["settlementId"],
      },
      {
        fields: ["recipientId"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["recipientType"],
      },
      {
        fields: ["processedAt"],
      },
    ],
  }
);

export default CommissionPayout;
