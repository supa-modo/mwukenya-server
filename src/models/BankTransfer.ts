import { DataTypes, Model, Optional, Op } from "sequelize";
import sequelize from "../config/database";

export interface BankTransferAttributes {
  id: string;
  recipientType: "SHA" | "UNION";
  amount: number;
  reference: string;
  description: string;
  settlementId: string;
  bankAccountNumber: string;
  bankName: string;
  bankCode: string;
  branchCode?: string;
  swiftCode?: string;
  transactionId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
  processingFee?: number;
  initiatedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankTransferCreationAttributes
  extends Optional<
    BankTransferAttributes,
    | "transactionId"
    | "errorMessage"
    | "processingFee"
    | "completedAt"
    | "branchCode"
    | "swiftCode"
    | "createdAt"
    | "updatedAt"
    | "initiatedAt"
  > {}

class BankTransfer
  extends Model<BankTransferAttributes, BankTransferCreationAttributes>
  implements BankTransferAttributes
{
  public id!: string;
  public recipientType!: "SHA" | "UNION";
  public amount!: number;
  public reference!: string;
  public description!: string;
  public settlementId!: string;
  public bankAccountNumber!: string;
  public bankName!: string;
  public bankCode!: string;
  public branchCode?: string;
  public swiftCode?: string;
  public transactionId?: string;
  public status!: "pending" | "processing" | "completed" | "failed";
  public errorMessage?: string;
  public processingFee?: number;
  public initiatedAt!: Date;
  public completedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association methods (will be added by Sequelize)
  // public getDailySettlement!: BelongsToGetAssociationMixin<DailySettlement>;

  public static associate(models: any): void {
    // BankTransfer belongs to DailySettlement
    BankTransfer.belongsTo(models.DailySettlement, {
      foreignKey: "settlementId",
      as: "settlement",
    });
  }

  /**
   * Find transfers by settlement ID
   */
  public static async findBySettlementId(
    settlementId: string
  ): Promise<BankTransfer[]> {
    return await BankTransfer.findAll({
      where: { settlementId },
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Find transfers by status
   */
  public static async findByStatus(
    status: BankTransferAttributes["status"]
  ): Promise<BankTransfer[]> {
    return await BankTransfer.findAll({
      where: { status },
      order: [["createdAt", "ASC"]],
    });
  }

  /**
   * Find pending transfers
   */
  public static async findPendingTransfers(): Promise<BankTransfer[]> {
    return await BankTransfer.findByStatus("pending");
  }

  /**
   * Find processing transfers
   */
  public static async findProcessingTransfers(): Promise<BankTransfer[]> {
    return await BankTransfer.findByStatus("processing");
  }

  /**
   * Get transfer statistics for a date range
   */
  public static async getTransferStats(
    startDate: Date,
    endDate: Date,
    recipientType?: "SHA" | "UNION"
  ): Promise<{
    totalTransfers: number;
    totalAmount: number;
    completedTransfers: number;
    completedAmount: number;
    failedTransfers: number;
    failedAmount: number;
    pendingTransfers: number;
    pendingAmount: number;
    totalFees: number;
  }> {
    const { Op } = await import("sequelize");

    const whereClause: any = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (recipientType) {
      whereClause.recipientType = recipientType;
    }

    const transfers = await BankTransfer.findAll({
      where: whereClause,
    });

    const stats = {
      totalTransfers: transfers.length,
      totalAmount: 0,
      completedTransfers: 0,
      completedAmount: 0,
      failedTransfers: 0,
      failedAmount: 0,
      pendingTransfers: 0,
      pendingAmount: 0,
      totalFees: 0,
    };

    for (const transfer of transfers) {
      stats.totalAmount += transfer.amount;

      if (transfer.processingFee) {
        stats.totalFees += transfer.processingFee;
      }

      switch (transfer.status) {
        case "completed":
          stats.completedTransfers++;
          stats.completedAmount += transfer.amount;
          break;
        case "failed":
          stats.failedTransfers++;
          stats.failedAmount += transfer.amount;
          break;
        case "pending":
        case "processing":
          stats.pendingTransfers++;
          stats.pendingAmount += transfer.amount;
          break;
      }
    }

    return stats;
  }

  /**
   * Mark transfer as completed
   */
  public async markAsCompleted(
    transactionId: string,
    processingFee?: number
  ): Promise<void> {
    await this.update({
      status: "completed",
      transactionId,
      processingFee,
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Mark transfer as failed
   */
  public async markAsFailed(errorMessage: string): Promise<void> {
    await this.update({
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
    });
  }

  /**
   * Check if transfer is in final state
   */
  public isFinalState(): boolean {
    return this.status === "completed" || this.status === "failed";
  }

  /**
   * Get transfer duration in minutes
   */
  public getTransferDuration(): number | null {
    if (!this.completedAt) {
      return null;
    }

    const startTime = this.initiatedAt || this.createdAt;
    const endTime = this.completedAt;

    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }
}

BankTransfer.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    recipientType: {
      type: DataTypes.ENUM("SHA", "UNION"),
      allowNull: false,
      validate: {
        isIn: [["SHA", "UNION"]],
      },
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    settlementId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "daily_settlements",
        key: "id",
      },
    },
    bankAccountNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    bankName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    bankCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    branchCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    swiftCode: {
      type: DataTypes.STRING(11),
      allowNull: true,
    },
    transactionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "processing", "completed", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processingFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    initiatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
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
    modelName: "BankTransfer",
    tableName: "bank_transfers",
    timestamps: true,
    indexes: [
      {
        fields: ["settlementId"],
        name: "idx_bank_transfers_settlement_id",
      },
      {
        fields: ["status"],
        name: "idx_bank_transfers_status",
      },
      {
        fields: ["recipientType"],
        name: "idx_bank_transfers_recipient_type",
      },
      {
        fields: ["createdAt"],
        name: "idx_bank_transfers_created_at",
      },
      {
        fields: ["reference"],
        name: "idx_bank_transfers_reference",
        unique: true,
      },
      {
        fields: ["transactionId"],
        name: "idx_bank_transfers_transaction_id",
        unique: true,
        where: {
          transactionId: {
            [Op.ne]: null,
          },
        },
      },
    ],
  }
);

export default BankTransfer;
