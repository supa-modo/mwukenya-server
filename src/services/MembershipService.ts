import { Transaction, Op } from "sequelize";
import User from "../models/User";
import Payment from "../models/Payment";
import {
  PaymentStatus,
  PaymentType,
  UserRole,
  MembershipStatus,
} from "../models/types";
import { ApiError } from "../utils/apiError";
import logger from "../utils/logger";
import MpesaService from "./MpesaService";
import sequelize from "../config/database";

export interface MembershipPaymentRequest {
  userId: string;
  phoneNumber: string;
  amount: number;
  paymentMethod: string;
  description?: string;
}

export interface MembershipPaymentInitiationResponse {
  paymentId: string;
  transactionReference: string;
  checkoutRequestId: string;
  customerMessage: string;
  amount: number;
  membershipFeeAmount: number;
}

export class MembershipService {
  // Standard membership fee amount (500 KES as mentioned in the UnionMembershipModal)
  private static readonly MEMBERSHIP_FEE_AMOUNT = 500;

  /**
   * Check if user has paid membership fee
   */
  public static async hasPaidMembershipFee(userId: string): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new ApiError("User not found", "USER_NOT_FOUND", 404);
      }

      return user.hasPaidMembershipFee;
    } catch (error: any) {
      logger.error("Error checking membership fee status:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(
            "Failed to check membership fee status",
            "MEMBERSHIP_CHECK_ERROR",
            500
          );
    }
  }

  /**
   * Get membership fee payment details for a user
   */
  public static async getMembershipFeeDetails(userId: string): Promise<{
    hasPaid: boolean;
    amount?: number;
    paidAt?: Date;
    paymentId?: string;
    payment?: any;
  }> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new ApiError("User not found", "USER_NOT_FOUND", 404);
      }

      const result = {
        hasPaid: user.hasPaidMembershipFee,
        amount: user.membershipFeeAmount,
        paidAt: user.membershipFeePaidAt,
        paymentId: user.membershipFeePaymentId,
        payment: null as any,
      };

      // If user has paid, get the payment details
      if (user.hasPaidMembershipFee && user.membershipFeePaymentId) {
        const payment = await Payment.findByPk(user.membershipFeePaymentId);
        if (payment) {
          result.payment = payment.toJSON();
        }
      }

      return result;
    } catch (error: any) {
      logger.error("Error getting membership fee details:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(
            "Failed to get membership fee details",
            "MEMBERSHIP_DETAILS_ERROR",
            500
          );
    }
  }

  /**
   * Initiate membership fee payment
   */
  public static async initiateMembershipPayment(
    request: MembershipPaymentRequest
  ): Promise<MembershipPaymentInitiationResponse> {
    const transaction = await sequelize.transaction();

    try {
      const { userId, phoneNumber, paymentMethod, description } = request;
      const amount = this.MEMBERSHIP_FEE_AMOUNT; // Use fixed membership fee amount

      // Validate user exists and is a member
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new ApiError("User not found", "USER_NOT_FOUND", 404);
      }

      // Check if user is a member (only members pay membership fees)
      if (user.role !== UserRole.MEMBER) {
        throw new ApiError(
          "Only members need to pay membership fees",
          "INVALID_USER_ROLE",
          403
        );
      }

      // Check if user has already paid membership fee
      if (user.hasPaidMembershipFee) {
        throw new ApiError(
          "Membership fee already paid",
          "MEMBERSHIP_FEE_ALREADY_PAID",
          400
        );
      }

      // Generate transaction reference
      const transactionReference = this.generateTransactionReference(userId);

      // Create payment record
      const payment = await Payment.create(
        {
          userId,
          subscriptionId: null, // No subscription for membership payments
          amount,
          paymentDate: new Date(),
          paymentMethod,
          transactionReference,
          paymentStatus: PaymentStatus.PENDING,
          paymentType: PaymentType.MEMBERSHIP,
          daysCovered: 1, // Default value for membership fees (validation is skipped)
          coverageStartDate: new Date(),
          coverageEndDate: new Date(),
          delegateCommission: 0, // No commission for membership fees
          coordinatorCommission: 0,
          shaPortion: 0, // No SHA portion for membership fees
          mwuPortion: amount, // All goes to MWU
          totalCommissions: 0,
          settlementDate: new Date(),
        },
        { transaction }
      );

      let stkResponse;
      if (paymentMethod === "mpesa") {
        // Initiate M-Pesa STK Push
        stkResponse = await MpesaService.initiateSTKPush(
          phoneNumber,
          amount,
          userId,
          payment.id, // Use payment ID as subscription ID for M-Pesa
          description || "MWU Kenya Membership Registration Fee"
        );

        // Update payment with M-Pesa details
        await payment.update(
          {
            mpesaCheckoutRequestId: stkResponse.checkoutRequestId,
            mpesaAccountReference: stkResponse.transactionReference,
            mpesaPhoneNumber: phoneNumber,
            mpesaTransactionDescription:
              description || "Membership Fee Payment",
          },
          { transaction }
        );
      } else {
        throw new ApiError(
          "Unsupported payment method",
          "UNSUPPORTED_PAYMENT_METHOD",
          400
        );
      }

      await transaction.commit();

      logger.info("Membership payment initiated:", {
        paymentId: payment.id,
        userId,
        amount,
        transactionReference,
      });

      return {
        paymentId: payment.id,
        transactionReference,
        checkoutRequestId: stkResponse.checkoutRequestId,
        customerMessage: stkResponse.customerMessage,
        amount,
        membershipFeeAmount: amount,
      };
    } catch (error: any) {
      await transaction.rollback();
      logger.error("Error initiating membership payment:", error);

      throw error instanceof ApiError
        ? error
        : new ApiError(
            "Failed to initiate membership payment",
            "MEMBERSHIP_PAYMENT_INITIATION_ERROR",
            500
          );
    }
  }

  /**
   * Complete membership fee payment
   */
  public static async completeMembershipPayment(
    paymentId: string,
    mpesaReceiptNumber?: string,
    mpesaTransactionId?: string
  ): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      // Find the payment
      const payment = await Payment.findByPk(paymentId, { transaction });
      if (!payment) {
        throw new ApiError("Payment not found", "PAYMENT_NOT_FOUND", 404);
      }

      // Verify it's a membership payment
      if (payment.paymentType !== PaymentType.MEMBERSHIP) {
        throw new ApiError("Invalid payment type", "INVALID_PAYMENT_TYPE", 400);
      }

      // Update payment status
      await payment.update(
        {
          paymentStatus: PaymentStatus.COMPLETED,
          mpesaReceiptNumber,
          mpesaTransactionId,
          processedAt: new Date(),
          callbackReceived: true,
          callbackReceivedAt: new Date(),
        },
        { transaction }
      );

      // Update user's membership fee status
      const user = await User.findByPk(payment.userId, { transaction });
      if (!user) {
        throw new ApiError("User not found", "USER_NOT_FOUND", 404);
      }

      await user.update(
        {
          hasPaidMembershipFee: true,
          membershipFeeAmount: payment.amount,
          membershipFeePaidAt: new Date(),
          membershipFeePaymentId: payment.id,
          membershipStatus: MembershipStatus.ACTIVE, // Activate membership after payment
        },
        { transaction }
      );

      await transaction.commit();

      logger.info("Membership payment completed:", {
        paymentId,
        userId: payment.userId,
        amount: payment.amount,
        mpesaReceiptNumber,
      });
    } catch (error: any) {
      await transaction.rollback();
      logger.error("Error completing membership payment:", error);

      throw error instanceof ApiError
        ? error
        : new ApiError(
            "Failed to complete membership payment",
            "MEMBERSHIP_PAYMENT_COMPLETION_ERROR",
            500
          );
    }
  }

  /**
   * Get membership payment status
   */
  public static async getMembershipPaymentStatus(paymentId: string): Promise<{
    payment: any;
    status: string;
    isComplete: boolean;
    user?: any;
  }> {
    try {
      const payment = await Payment.findByPk(paymentId);

      if (!payment) {
        throw new ApiError("Payment not found", "PAYMENT_NOT_FOUND", 404);
      }

      if (payment.paymentType !== PaymentType.MEMBERSHIP) {
        throw new ApiError("Invalid payment type", "INVALID_PAYMENT_TYPE", 400);
      }

      // Get user details separately if needed
      let user = null;
      if (payment.userId) {
        const userRecord = await User.findByPk(payment.userId, {
          attributes: [
            "id",
            "firstName",
            "lastName",
            "phoneNumber",
            "hasPaidMembershipFee",
          ],
        });
        user = userRecord?.toJSON();
      }

      return {
        payment: payment.toJSON(),
        status: payment.paymentStatus,
        isComplete: payment.paymentStatus === PaymentStatus.COMPLETED,
        user,
      };
    } catch (error: any) {
      logger.error("Error getting membership payment status:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(
            "Failed to get membership payment status",
            "MEMBERSHIP_PAYMENT_STATUS_ERROR",
            500
          );
    }
  }

  /**
   * Get user's membership payment history
   */
  public static async getUserMembershipPayments(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    payments: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const offset = (page - 1) * limit;

      const { count, rows: payments } = await Payment.findAndCountAll({
        where: {
          userId,
          paymentType: PaymentType.MEMBERSHIP,
        },
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      return {
        payments: payments.map((payment) => payment.toJSON()),
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error: any) {
      logger.error("Error getting user membership payments:", error);
      throw new ApiError(
        "Failed to get membership payments",
        "MEMBERSHIP_PAYMENTS_ERROR",
        500
      );
    }
  }

  /**
   * Get all membership payments (Admin only)
   */
  public static async getAllMembershipPayments(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string
  ): Promise<{
    payments: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    statistics: {
      total: number;
      completed: number;
      pending: number;
      failed: number;
      totalAmount: number;
    };
  }> {
    try {
      const offset = (page - 1) * limit;
      const whereClause: any = {
        paymentType: PaymentType.MEMBERSHIP,
      };

      if (status) {
        whereClause.paymentStatus = status;
      }

      const includeOptions: any[] = [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "phoneNumber",
            "membershipNumber",
          ],
        },
      ];

      // Add search functionality
      if (search) {
        includeOptions[0].where = {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
            { phoneNumber: { [Op.iLike]: `%${search}%` } },
            { membershipNumber: { [Op.iLike]: `%${search}%` } },
          ],
        };
      }

      const { count, rows: payments } = await Payment.findAndCountAll({
        where: whereClause,
        include: includeOptions,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      // Get statistics
      const stats = await Payment.findAll({
        where: { paymentType: PaymentType.MEMBERSHIP },
        attributes: [
          "paymentStatus",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
          [sequelize.fn("SUM", sequelize.col("amount")), "totalAmount"],
        ],
        group: ["paymentStatus"],
        raw: true,
      });

      const statistics = {
        total: count,
        completed: 0,
        pending: 0,
        failed: 0,
        totalAmount: 0,
      };

      stats.forEach((stat: any) => {
        statistics[stat.paymentStatus as keyof typeof statistics] =
          parseInt(stat.count as string) || 0;
        statistics.totalAmount += parseFloat(stat.totalAmount as string) || 0;
      });

      return {
        payments: payments.map((payment) => payment.toJSON()),
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
        statistics,
      };
    } catch (error: any) {
      logger.error("Error getting all membership payments:", error);
      throw new ApiError(
        "Failed to get membership payments",
        "MEMBERSHIP_PAYMENTS_ERROR",
        500
      );
    }
  }

  /**
   * Admin manual verification of membership payment
   * Updates user membership status and payment record
   */
  public static async adminManualVerifyMembershipPayment(
    paymentId: string,
    mpesaReceiptNumber: string,
    adminUserId: string
  ): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const payment = await Payment.findByPk(paymentId, { transaction });
      if (!payment) {
        throw new ApiError("Payment not found", "PAYMENT_NOT_FOUND", 404);
      }

      if (payment.paymentType !== PaymentType.MEMBERSHIP) {
        throw new ApiError(
          "Payment is not a membership payment",
          "INVALID_PAYMENT_TYPE",
          400
        );
      }

      if (payment.paymentStatus === PaymentStatus.COMPLETED) {
        throw new ApiError(
          "Payment already completed",
          "PAYMENT_ALREADY_COMPLETED",
          400
        );
      }

      if (payment.paymentStatus !== PaymentStatus.PENDING) {
        throw new ApiError(
          "Only pending payments can be manually verified",
          "INVALID_PAYMENT_STATUS",
          400
        );
      }

      // Get the user
      const user = await User.findByPk(payment.userId, { transaction });
      if (!user) {
        throw new ApiError("User not found", "USER_NOT_FOUND", 404);
      }

      // Update payment status
      await payment.update(
        {
          paymentStatus: PaymentStatus.COMPLETED,
          processedAt: new Date(),
          processorId: adminUserId,
          mpesaReceiptNumber: mpesaReceiptNumber,
          callbackReceived: true, // Mark as if callback was received
          callbackReceivedAt: new Date(),
        },
        { transaction }
      );

      // Update user membership fee status
      await user.update(
        {
          hasPaidMembershipFee: true,
          membershipFeeAmount: payment.amount,
          membershipFeePaidAt: new Date(),
          membershipFeePaymentId: payment.id,
        },
        { transaction }
      );

      await transaction.commit();

      // Log admin verification in audit trail
      try {
        const { default: AuditTrailService } = await import(
          "./AuditTrailService"
        );
        await AuditTrailService.logAdminAction(
          adminUserId,
          "manual_membership_payment_verification",
          "payment",
          paymentId,
          {
            oldValues: {
              paymentStatus: "pending",
              mpesaReceiptNumber: null,
            },
            newValues: {
              paymentStatus: "completed",
              mpesaReceiptNumber,
              amount: payment.amount,
              userId: payment.userId,
              transactionReference: payment.transactionReference,
              membershipNumber: user.membershipNumber,
            },
          },
          undefined, // ipAddress
          {
            reason: "Admin manual verification of pending membership payment",
            originalStatus: "pending",
            newStatus: "completed",
          }
        );

        // Additional logging for membership fee payment
        await AuditTrailService.logAdminAction(
          adminUserId,
          "membership_fee_completed",
          "user",
          payment.userId,
          {
            oldValues: {
              hasPaidMembershipFee: false,
              membershipFeeAmount: null,
              membershipFeePaidAt: null,
            },
            newValues: {
              hasPaidMembershipFee: true,
              membershipFeeAmount: payment.amount,
              membershipFeePaidAt: new Date(),
              membershipFeePaymentId: payment.id,
            },
          },
          undefined, // ipAddress
          {
            reason: "Membership fee payment completed via admin verification",
            paymentMethod: payment.paymentMethod,
            mpesaReceiptNumber,
            adminVerified: true,
            transactionReference: payment.transactionReference,
            membershipNumber: user.membershipNumber,
          }
        );
      } catch (auditError) {
        logger.warn(
          "Failed to log admin membership verification in audit trail:",
          auditError
        );
      }

      logger.info("Membership payment manually verified by admin:", {
        paymentId,
        userId: payment.userId,
        adminUserId,
        receiptNumber: mpesaReceiptNumber,
        amount: payment.amount,
        membershipNumber: user.membershipNumber,
      });
    } catch (error: any) {
      await transaction.rollback();
      logger.error("Error in admin manual membership verification:", error);
      throw error;
    }
  }

  /**
   * Generate unique transaction reference for membership payment
   */
  private static generateTransactionReference(userId: string): string {
    const timestamp = Date.now().toString();
    const userIdSuffix = userId.slice(-8);
    return `MWU-MBR-${userIdSuffix}-${timestamp}`;
  }
}

export default MembershipService;
