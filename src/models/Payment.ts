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
  PaymentAttributes,
  PaymentCreationAttributes,
  PaymentStatus,
} from "./types";

class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  public id!: string;
  public userId!: string;
  public subscriptionId!: string;
  public amount!: number;
  public paymentDate!: Date;
  public paymentMethod!: string;
  public transactionReference!: string;
  public paymentStatus!: PaymentStatus;
  public daysCovered!: number;
  public coverageStartDate!: Date;
  public coverageEndDate!: Date;
  public delegateCommission!: number;
  public coordinatorCommission!: number;
  public shaPortion!: number;
  public commissionDelegateId?: string;
  public commissionCoordinatorId?: string;
  public processedAt?: Date;
  public processorId?: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // M-Pesa specific fields
  public mpesaReceiptNumber?: string;
  public mpesaTransactionId?: string;
  public mpesaCheckoutRequestId?: string;
  public mpesaResultCode?: number;
  public mpesaResultDescription?: string;
  public mpesaPhoneNumber?: string;
  public mpesaAccountReference?: string;
  public mpesaTransactionDescription?: string;
  public callbackReceived?: boolean;
  public callbackReceivedAt?: Date;

  // Commission calculation fields
  public mwuPortion?: number;
  public totalCommissions?: number;

  // Associations
  public static associations: {
    user: Association<Payment, any>;
    subscription: Association<Payment, any>;
    delegate: Association<Payment, any>;
    coordinator: Association<Payment, any>;
    processor: Association<Payment, any>;
  };

  // Association methods
  public getUser!: BelongsToGetAssociationMixin<any>;
  public setUser!: BelongsToSetAssociationMixin<any, string>;
  public getSubscription!: BelongsToGetAssociationMixin<any>;
  public setSubscription!: BelongsToSetAssociationMixin<any, string>;
  public getDelegate!: BelongsToGetAssociationMixin<any>;
  public setDelegate!: BelongsToSetAssociationMixin<any, string>;
  public getCoordinator!: BelongsToGetAssociationMixin<any>;
  public setCoordinator!: BelongsToSetAssociationMixin<any, string>;

  // Instance methods
  public async calculateCommissions(): Promise<void> {
    // Skip if no subscription ID (new subscription payments)
    if (!this.subscriptionId) {
      return;
    }

    // Get the subscription to determine delegate and coordinator
    const subscription = await this.getSubscription({
      include: [
        {
          model: sequelize.models.User,
          as: "user",
          include: [
            { model: sequelize.models.User, as: "delegate" },
            { model: sequelize.models.User, as: "coordinator" },
          ],
        },
        { model: sequelize.models.MedicalScheme, as: "scheme" },
      ],
    });

    if (subscription && subscription.scheme) {
      const scheme = subscription.scheme;

      // Convert to numbers to avoid string concatenation issues
      const delegateCommission = parseFloat(
        scheme.delegateCommission?.toString() || "2.0"
      );
      const coordinatorCommission = parseFloat(
        scheme.coordinatorCommission?.toString() || "1.0"
      );
      const shaPortion = parseFloat(scheme.shaPortion?.toString() || "12.0");
      const amount = parseFloat(this.amount?.toString() || "0");

      // Set commission amounts from scheme
      this.delegateCommission = delegateCommission;
      this.coordinatorCommission = coordinatorCommission;
      this.shaPortion = shaPortion;

      // Calculate MWU portion with proper number arithmetic
      this.totalCommissions = delegateCommission + coordinatorCommission;
      this.mwuPortion = amount - shaPortion - this.totalCommissions;

      // Set delegate and coordinator IDs for commission tracking
      if (subscription.user?.delegate) {
        this.commissionDelegateId = subscription.user.delegate.id;
      }
      if (subscription.user?.coordinator) {
        this.commissionCoordinatorId = subscription.user.coordinator.id;
      }
    }
  }

  public isSuccessful(): boolean {
    return this.paymentStatus === PaymentStatus.COMPLETED;
  }

  public isPending(): boolean {
    return this.paymentStatus === PaymentStatus.PENDING;
  }

  public isFailed(): boolean {
    return this.paymentStatus === PaymentStatus.FAILED;
  }

  // Static methods
  public static async findByTransactionReference(
    transactionReference: string
  ): Promise<Payment | null> {
    return this.findOne({ where: { transactionReference } });
  }

  public static async findByMpesaReceiptNumber(
    mpesaReceiptNumber: string
  ): Promise<Payment | null> {
    return this.findOne({ where: { mpesaReceiptNumber } });
  }

  public static async findByMpesaCheckoutRequestId(
    mpesaCheckoutRequestId: string
  ): Promise<Payment | null> {
    return this.findOne({ where: { mpesaCheckoutRequestId } });
  }

  public static async getPaymentsByDateRange(
    startDate: Date,
    endDate: Date,
    status?: PaymentStatus
  ): Promise<Payment[]> {
    const whereClause: any = {
      paymentDate: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (status) {
      whereClause.paymentStatus = status;
    }

    return this.findAll({
      where: whereClause,
      order: [["paymentDate", "DESC"]],
    });
  }

  public static async getCommissionSummary(
    recipientId: string,
    recipientType: "delegate" | "coordinator",
    startDate: Date,
    endDate: Date
  ): Promise<{ totalAmount: number; paymentCount: number }> {
    const field =
      recipientType === "delegate"
        ? "commissionDelegateId"
        : "commissionCoordinatorId";

    const commissionField =
      recipientType === "delegate"
        ? "delegateCommission"
        : "coordinatorCommission";

    const result = await this.findAll({
      where: {
        [field]: recipientId,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentDate: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        [sequelize.fn("SUM", sequelize.col(commissionField)), "totalAmount"],
        [sequelize.fn("COUNT", sequelize.col("id")), "paymentCount"],
      ],
      raw: true,
    });

    const row = result[0] as any;
    return {
      totalAmount: parseFloat(row?.totalAmount as string) || 0,
      paymentCount: parseInt(row?.paymentCount as string) || 0,
    };
  }
}

Payment.init(
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
      allowNull: true, // Allow null for new subscription payments
      references: {
        model: "member_subscriptions",
        key: "id",
      },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "mpesa",
    },
    transactionReference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    paymentStatus: {
      type: DataTypes.ENUM(...Object.values(PaymentStatus)),
      allowNull: false,
      defaultValue: PaymentStatus.PENDING,
    },
    daysCovered: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 365,
      },
    },
    coverageStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    coverageEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    delegateCommission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 2.0,
    },
    coordinatorCommission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.0,
    },
    shaPortion: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 12.0,
    },
    mwuPortion: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    totalCommissions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    commissionDelegateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    commissionCoordinatorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    processorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    // M-Pesa specific fields
    mpesaReceiptNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    mpesaTransactionId: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    mpesaCheckoutRequestId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    mpesaResultCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mpesaResultDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mpesaPhoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    mpesaAccountReference: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    mpesaTransactionDescription: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    callbackReceived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    callbackReceivedAt: {
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
    modelName: "Payment",
    tableName: "payments",
    timestamps: true,
    indexes: [
      {
        fields: ["userId", "paymentDate"],
        name: "idx_payments_user_date",
      },
      {
        fields: ["paymentStatus"],
        name: "idx_payments_status",
      },
      {
        fields: ["transactionReference"],
        unique: true,
        name: "idx_payments_transaction_ref",
      },
      {
        fields: ["mpesaReceiptNumber"],
        unique: true,
        name: "idx_payments_mpesa_receipt",
      },
      {
        fields: ["mpesaCheckoutRequestId"],
        unique: true,
        name: "idx_payments_checkout_request",
      },
      {
        fields: ["commissionDelegateId", "paymentDate"],
        name: "idx_payments_delegate_commission",
      },
      {
        fields: ["commissionCoordinatorId", "paymentDate"],
        name: "idx_payments_coordinator_commission",
      },
    ],
  }
);

export default Payment;
