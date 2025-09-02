import { Op, Transaction } from "sequelize";
import Payment from "../models/Payment";
import PaymentCoverage from "../models/PaymentCoverage";
import { User, MemberSubscription, MedicalScheme } from "../models";
import {
  PaymentStatus,
  PaymentCreationAttributes,
  SubscriptionStatus,
} from "../models/types";
import { ApiError } from "../utils/apiError";
import logger from "../utils/logger";
import MpesaService from "./MpesaService";
import { addDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import sequelize from "../config/database";

export interface InitiatePaymentRequest {
  userId: string;
  subscriptionId: string;
  amount: number;
  phoneNumber: string;
  paymentMethod: string;
  daysCovered?: number;
  description?: string;
}

export interface PaymentInitiationResponse {
  success: boolean;
  paymentId: string;
  transactionReference: string;
  checkoutRequestId?: string;
  customerMessage?: string;
  amount: number;
  daysCovered: number;
  coverageStartDate: Date;
  coverageEndDate: Date;
}

export class PaymentService {
  /**
   * Initiate a new payment with proper subscription handling
   * Subscriptions are only created AFTER successful payment
   */
  public async initiatePayment(
    request: InitiatePaymentRequest
  ): Promise<PaymentInitiationResponse> {
    try {
      // Validate user
      const user = await User.findByPk(request.userId);
      if (!user) {
        throw new ApiError("User not found", "USER_NOT_FOUND", 404);
      }

      if (!user.isActive) {
        throw new ApiError("User account is inactive", "USER_INACTIVE", 400);
      }

      // Validate amount
      if (request.amount <= 0) {
        throw new ApiError("Invalid payment amount", "INVALID_AMOUNT", 400);
      }

      // Check if user has an active subscription
      let subscription = await MemberSubscription.findOne({
        where: {
          userId: request.userId,
          status: SubscriptionStatus.ACTIVE,
        },
        include: [
          {
            model: MedicalScheme,
            as: "scheme",
          },
        ],
      });

      let scheme: any;
      let isNewSubscription = false;

      if (!subscription) {
        // User wants to create a new subscription - validate the scheme
        scheme = await MedicalScheme.findOne({
          where: {
            id: request.subscriptionId, // This is actually the scheme ID
            isActive: true,
          },
        });

        if (!scheme) {
          throw new ApiError(
            "Medical scheme not found",
            "SCHEME_NOT_FOUND",
            404
          );
        }

        isNewSubscription = true;
      } else {
        scheme = subscription.scheme;
      }

      // Calculate coverage dates and validate amount
      const coverageDates = await this.calculateCoverageDates(
        request.userId,
        subscription?.id || request.subscriptionId, // Use subscription ID or scheme ID
        request.amount,
        scheme.dailyPremium,
        request.daysCovered
      );

      // Generate unique transaction reference
      const transactionReference = this.generateTransactionReference(
        request.userId
      );

      // Create payment record (without subscription ID for new subscriptions)
      const payment = await Payment.create({
        userId: request.userId,
        subscriptionId: subscription?.id, // Undefined for new subscriptions
        amount: request.amount,
        paymentDate: new Date(),
        paymentMethod: request.paymentMethod,
        transactionReference,
        paymentStatus: PaymentStatus.PENDING,
        daysCovered: coverageDates.daysCovered,
        coverageStartDate: coverageDates.startDate,
        coverageEndDate: coverageDates.endDate,
        delegateCommission: scheme.delegateCommission || 2.0,
        coordinatorCommission: scheme.coordinatorCommission || 1.0,
        shaPortion: scheme.shaPortion || 12.0,
        mpesaPhoneNumber: request.phoneNumber,
        mpesaAccountReference: transactionReference,
        mpesaTransactionDescription:
          request.description || "MWU Kenya Premium Payment",
        callbackReceived: false,
      });

      // Store scheme ID for new subscriptions (we'll need it when payment succeeds)
      if (isNewSubscription) {
        await payment.update({
          // Store scheme ID in the transaction description for retrieval later
          mpesaTransactionDescription: `${
            request.description || "MWU Kenya Premium Payment"
          } [SchemeID:${scheme.id}]`,
        });
      }

      // Commission values are already set during payment creation
      // No need to calculate them again since we don't have subscription yet

      let checkoutRequestId: string | undefined;
      let customerMessage: string | undefined;

      // Initiate payment based on method
      if (request.paymentMethod.toLowerCase() === "mpesa") {
        const stkResponse = await MpesaService.initiateSTKPush(
          request.phoneNumber,
          request.amount,
          request.userId,
          subscription?.id || scheme.id, // Use subscription ID or scheme ID
          request.description || "MWU Kenya Premium Payment"
        );

        // Update payment with M-Pesa details
        payment.mpesaCheckoutRequestId = stkResponse.checkoutRequestId;
        await payment.save();

        checkoutRequestId = stkResponse.checkoutRequestId;
        customerMessage = stkResponse.customerMessage;
      }

      logger.info("Payment initiated successfully:", {
        paymentId: payment.id,
        userId: request.userId,
        amount: request.amount,
        transactionReference,
        isNewSubscription,
        schemeId: scheme.id,
      });

      return {
        success: true,
        paymentId: payment.id,
        transactionReference,
        checkoutRequestId,
        customerMessage,
        amount: request.amount,
        daysCovered: coverageDates.daysCovered,
        coverageStartDate: coverageDates.startDate,
        coverageEndDate: coverageDates.endDate,
      };
    } catch (error: any) {
      logger.error("Error initiating payment:", error);

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        "Failed to initiate payment. Please try again.",
        "PAYMENT_INITIATION_ERROR",
        500
      );
    }
  }

  /**
   * Complete a payment (called from callback or manual verification)
   * Creates subscription if this is a new user's first payment
   */
  public async completePayment(
    paymentId: string,
    mpesaReceiptNumber?: string,
    mpesaTransactionId?: string
  ): Promise<void> {
    const transaction: Transaction = await sequelize.transaction();

    try {
      const payment = await Payment.findByPk(paymentId, { transaction });
      if (!payment) {
        throw new ApiError("Payment not found", "PAYMENT_NOT_FOUND", 404);
      }

      if (payment.paymentStatus === PaymentStatus.COMPLETED) {
        logger.warn("Payment already completed:", paymentId);
        await transaction.rollback();
        return;
      }

      // Check if this payment needs a subscription to be created
      let subscription: MemberSubscription | null = null;

      if (!payment.subscriptionId) {
        // This is a new subscription payment - extract scheme ID from description
        const schemeIdMatch = payment.mpesaTransactionDescription?.match(
          /\[SchemeID:([^\]]+)\]/
        );

        if (schemeIdMatch) {
          const schemeId = schemeIdMatch[1];

          // Validate the scheme exists
          const scheme = await MedicalScheme.findByPk(schemeId, {
            transaction,
          });
          if (!scheme) {
            throw new ApiError(
              "Medical scheme not found",
              "SCHEME_NOT_FOUND",
              404
            );
          }

          // Get user for delegate/coordinator info
          const user = await User.findByPk(payment.userId, { transaction });
          if (!user) {
            throw new ApiError("User not found", "USER_NOT_FOUND", 404);
          }

          // Create the subscription
          subscription = await MemberSubscription.create(
            {
              userId: payment.userId,
              schemeId: schemeId,
              subscriptionDate: new Date(),
              status: SubscriptionStatus.ACTIVE,
              effectiveDate: payment.coverageStartDate,
              registrationDelegateId: user.delegateId,
              registrationCoordinatorId: user.coordinatorId,
            },
            { transaction }
          );

          // Update the payment with the new subscription ID
          await payment.update(
            {
              subscriptionId: subscription.id,
            },
            { transaction }
          );

          logger.info("Created new subscription for successful payment:", {
            userId: payment.userId,
            subscriptionId: subscription.id,
            schemeId: schemeId,
            paymentId: payment.id,
          });
        }
      }

      // Update payment status
      await payment.update(
        {
          paymentStatus: PaymentStatus.COMPLETED,
          processedAt: new Date(),
          mpesaReceiptNumber: mpesaReceiptNumber || payment.mpesaReceiptNumber,
          mpesaTransactionId: mpesaTransactionId || payment.mpesaTransactionId,
        },
        { transaction }
      );

      // Create payment coverage records
      if (payment.subscriptionId) {
        await PaymentCoverage.createCoverageRange(
          payment.userId,
          payment.subscriptionId,
          payment.coverageStartDate,
          payment.coverageEndDate,
          payment.id,
          payment.amount
        );
      }

      await transaction.commit();

      logger.info("Payment completed successfully:", {
        paymentId,
        receiptNumber: mpesaReceiptNumber,
        amount: payment.amount,
        subscriptionCreated: !payment.subscriptionId && subscription !== null,
        subscriptionId: subscription?.id || payment.subscriptionId,
      });
    } catch (error: any) {
      await transaction.rollback();
      logger.error("Error completing payment:", error);
      throw error;
    }
  }

  /**
   * Fail a payment
   */
  public async failPayment(paymentId: string, reason: string): Promise<void> {
    try {
      const payment = await Payment.findByPk(paymentId);
      if (!payment) {
        throw new ApiError("Payment not found", "PAYMENT_NOT_FOUND", 404);
      }

      payment.paymentStatus = PaymentStatus.FAILED;
      payment.mpesaResultDescription = reason;
      await payment.save();

      // Remove coverage records for failed payment
      await PaymentCoverage.destroy({
        where: {
          userId: payment.userId,
          subscriptionId: payment.subscriptionId,
          coverageDate: {
            [Op.between]: [payment.coverageStartDate, payment.coverageEndDate],
          },
          isPaid: false,
        },
      });

      logger.info("Payment failed:", { paymentId, reason });
    } catch (error: any) {
      logger.error("Error failing payment:", error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  public async getPaymentStatus(paymentId: string): Promise<Payment> {
    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "phoneNumber"],
        },
        {
          model: MemberSubscription,
          as: "subscription",
          include: [
            {
              model: MedicalScheme,
              as: "scheme",
              attributes: ["name", "code", "coverageType"],
            },
          ],
        },
      ],
    });

    if (!payment) {
      throw new ApiError("Payment not found", "PAYMENT_NOT_FOUND", 404);
    }

    return payment;
  }

  /**
   * Query M-Pesa transaction status
   */
  public async queryMpesaStatus(checkoutRequestId: string): Promise<{
    isComplete: boolean;
    isSuccessful: boolean;
    resultDesc: string;
  }> {
    try {
      const result = await MpesaService.queryTransactionStatus(
        checkoutRequestId
      );
      return result;
    } catch (error: any) {
      logger.error("Error querying M-Pesa status:", error);
      throw error;
    }
  }

  /**
   * Get user payment history
   */
  public async getUserPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    payments: Payment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const offset = (page - 1) * limit;

      const { count, rows } = await Payment.findAndCountAll({
        where: { userId },
        include: [
          {
            model: MemberSubscription,
            as: "subscription",
            include: [
              {
                model: MedicalScheme,
                as: "scheme",
                attributes: ["name", "code", "coverageType"],
              },
            ],
          },
        ],
        order: [["paymentDate", "DESC"]],
        limit,
        offset,
      });

      return {
        payments: rows || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      // If table doesn't exist or other database error, return empty results
      logger.warn(
        "Error fetching payment history, returning empty results:",
        error
      );
      return {
        payments: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  /**
   * Get payment coverage status for user
   */
  public async getPaymentCoverageStatus(
    userId: string,
    subscriptionId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalDays: number;
    paidDays: number;
    unpaidDays: number;
    complianceRate: number;
    firstUnpaidDate: Date | null;
    currentBalance: number;
  }> {
    const start =
      startDate || startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = endDate || endOfDay(new Date());

    const stats = await PaymentCoverage.getCoverageStats(
      userId,
      subscriptionId,
      start,
      end
    );
    const firstUnpaidDate = await PaymentCoverage.getFirstUnpaidDate(
      userId,
      subscriptionId
    );
    const currentBalance = await PaymentCoverage.getCurrentBalance(
      userId,
      subscriptionId
    );

    return {
      ...stats,
      firstUnpaidDate,
      currentBalance,
    };
  }

  /**
   * Validate payment request
   */
  private async validatePaymentRequest(
    request: InitiatePaymentRequest
  ): Promise<{
    user: any;
    subscription: any;
    scheme: any;
  }> {
    // Validate user
    const user = await User.findByPk(request.userId);
    if (!user) {
      throw new ApiError("User not found", "USER_NOT_FOUND", 404);
    }

    if (!user.isActive) {
      throw new ApiError("User account is inactive", "USER_INACTIVE", 400);
    }

    // Validate subscription
    const subscription = await MemberSubscription.findOne({
      where: {
        id: request.subscriptionId,
        userId: request.userId,
        status: "active",
      },
      include: [
        {
          model: MedicalScheme,
          as: "scheme",
        },
      ],
    });

    if (!subscription) {
      throw new ApiError(
        "Active subscription not found",
        "SUBSCRIPTION_NOT_FOUND",
        404
      );
    }

    // Validate amount
    if (request.amount <= 0) {
      throw new ApiError("Invalid payment amount", "INVALID_AMOUNT", 400);
    }

    const dailyPremium = subscription.scheme.dailyPremium;
    if (request.amount < dailyPremium) {
      throw new ApiError(
        `Minimum payment amount is ${dailyPremium} KES`,
        "AMOUNT_TOO_LOW",
        400
      );
    }

    return { user, subscription, scheme: subscription.scheme };
  }

  /**
   * Calculate coverage dates based on amount and daily premium
   */
  private async calculateCoverageDates(
    userId: string,
    subscriptionId: string,
    amount: number,
    dailyPremium: number,
    requestedDays?: number
  ): Promise<{
    startDate: Date;
    endDate: Date;
    daysCovered: number;
  }> {
    // Calculate days covered based on amount
    const calculatedDays = Math.floor(amount / dailyPremium);
    const daysCovered = requestedDays || calculatedDays;

    if (daysCovered <= 0) {
      throw new ApiError(
        "Invalid number of days covered",
        "INVALID_DAYS_COVERED",
        400
      );
    }

    if (daysCovered > 365) {
      throw new ApiError(
        "Cannot pay for more than 365 days at once",
        "DAYS_LIMIT_EXCEEDED",
        400
      );
    }

    // Find the next unpaid date or start from today
    let startDate = await PaymentCoverage.getFirstUnpaidDate(
      userId,
      subscriptionId
    );
    if (!startDate) {
      startDate = startOfDay(new Date());
    } else {
      startDate = startOfDay(startDate);
    }

    const endDate = addDays(startDate, daysCovered - 1);

    return {
      startDate,
      endDate,
      daysCovered,
    };
  }

  /**
   * Update coverage records after payment completion
   */
  private async updateCoverageRecords(payment: Payment): Promise<void> {
    await PaymentCoverage.createCoverageRange(
      payment.userId,
      payment.subscriptionId,
      payment.coverageStartDate,
      payment.coverageEndDate,
      payment.id,
      payment.amount / payment.daysCovered
    );
  }

  /**
   * Generate unique transaction reference
   */
  private generateTransactionReference(userId: string): string {
    const timestamp = Date.now().toString();
    const userIdSuffix = userId.slice(-6);
    return `MWU${timestamp}${userIdSuffix}`;
  }
}

export default new PaymentService();
