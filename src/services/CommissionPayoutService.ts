import { Transaction } from "sequelize";
import sequelize from "../config/database";
import logger from "../utils/logger";
import { ApiError } from "../utils/apiError";
import CommissionPayout from "../models/CommissionPayout";
import { User } from "../models";
import MpesaService from "./MpesaService";

export interface PayoutResult {
  payoutId: string;
  success: boolean;
  conversationId?: string;
  error?: string;
}

export class CommissionPayoutService {
  /**
   * Process automated commission payouts for a settlement
   */
  public async processSettlementPayouts(
    settlementId: string,
    processedBy: string
  ): Promise<{
    totalPayouts: number;
    successfulPayouts: number;
    failedPayouts: number;
    results: PayoutResult[];
  }> {
    const transaction: Transaction = await sequelize.transaction();

    try {
      // Get all pending payouts for this settlement
      const payouts = await CommissionPayout.getPayoutsBySettlement(
        settlementId
      );
      const pendingPayouts = payouts.filter(
        (payout) => payout.status === "pending"
      );

      if (pendingPayouts.length === 0) {
        await transaction.rollback();
        return {
          totalPayouts: 0,
          successfulPayouts: 0,
          failedPayouts: 0,
          results: [],
        };
      }

      const results: PayoutResult[] = [];
      let successfulPayouts = 0;
      let failedPayouts = 0;

      // Process each payout
      for (const payout of pendingPayouts) {
        try {
          const recipient = (payout as any).recipient;
          if (!recipient || !recipient.phoneNumber) {
            throw new Error("Recipient phone number not found");
          }

          // Initiate M-Pesa B2C payment
          const b2cResult = await MpesaService.initiateB2CPayment(
            recipient.phoneNumber,
            parseFloat(payout.amount.toString()),
            `${
              payout.recipientType === "delegate" ? "Delegate" : "Coordinator"
            } Commission`,
            "Commission Payout"
          );

          // Update payout with conversation IDs
          await payout.update(
            {
              conversationId: b2cResult.conversationId,
              originatorConversationId: b2cResult.originatorConversationId,
              paymentMethod: "mpesa",
            },
            { transaction }
          );

          // Log payout initiation in audit trail
          try {
            const { default: AuditTrailService } = await import(
              "./AuditTrailService"
            );
            await AuditTrailService.logCommissionPayoutInitiated(
              processedBy,
              payout.id,
              payout.recipientId,
              parseFloat(payout.amount.toString()),
              b2cResult.conversationId,
              {
                recipientType: payout.recipientType,
                settlementId,
                paymentCount: payout.paymentCount,
              }
            );
          } catch (auditError) {
            logger.warn(
              "Failed to log payout initiation in audit trail:",
              auditError
            );
          }

          results.push({
            payoutId: payout.id,
            success: true,
            conversationId: b2cResult.conversationId,
          });

          successfulPayouts++;

          logger.info("Commission payout initiated successfully:", {
            payoutId: payout.id,
            recipientId: payout.recipientId,
            amount: payout.amount,
            conversationId: b2cResult.conversationId,
          });
        } catch (error: any) {
          // Mark payout as failed
          await payout.update(
            {
              status: "failed",
              failureReason: error.message,
            },
            { transaction }
          );

          results.push({
            payoutId: payout.id,
            success: false,
            error: error.message,
          });

          failedPayouts++;

          logger.error("Commission payout failed:", {
            payoutId: payout.id,
            recipientId: payout.recipientId,
            amount: payout.amount,
            error: error.message,
          });
        }
      }

      await transaction.commit();

      logger.info("Settlement payouts processed:", {
        settlementId,
        totalPayouts: pendingPayouts.length,
        successfulPayouts,
        failedPayouts,
        processedBy,
      });

      return {
        totalPayouts: pendingPayouts.length,
        successfulPayouts,
        failedPayouts,
        results,
      };
    } catch (error: any) {
      await transaction.rollback();
      logger.error("Error processing settlement payouts:", error);
      throw error;
    }
  }

  /**
   * Process individual commission payout manually
   */
  public async processIndividualPayout(
    payoutId: string,
    processedBy: string
  ): Promise<PayoutResult> {
    try {
      const payout = await CommissionPayout.findByPk(payoutId, {
        include: [
          {
            model: User,
            as: "recipient",
            attributes: ["id", "firstName", "lastName", "phoneNumber"],
          },
        ],
      });

      if (!payout) {
        throw new ApiError(
          "Commission payout not found",
          "PAYOUT_NOT_FOUND",
          404
        );
      }

      if (payout.status !== "pending") {
        throw new ApiError(
          `Payout is already ${payout.status}`,
          "PAYOUT_NOT_PENDING",
          400
        );
      }

      const recipient = (payout as any).recipient;
      if (!recipient || !recipient.phoneNumber) {
        throw new ApiError(
          "Recipient phone number not found",
          "RECIPIENT_PHONE_MISSING",
          400
        );
      }

      // Initiate M-Pesa B2C payment
      const b2cResult = await MpesaService.initiateB2CPayment(
        recipient.phoneNumber,
        parseFloat(payout.amount.toString()),
        `${
          payout.recipientType === "delegate" ? "Delegate" : "Coordinator"
        } Commission`,
        "Commission Payout"
      );

      // Update payout with conversation IDs
      await payout.update({
        conversationId: b2cResult.conversationId,
        originatorConversationId: b2cResult.originatorConversationId,
        paymentMethod: "mpesa",
      });

      logger.info("Individual commission payout initiated:", {
        payoutId,
        recipientId: payout.recipientId,
        amount: payout.amount,
        conversationId: b2cResult.conversationId,
        processedBy,
      });

      return {
        payoutId,
        success: true,
        conversationId: b2cResult.conversationId,
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error("Error processing individual payout:", error);
      throw new ApiError(
        "Failed to process commission payout",
        "PAYOUT_PROCESSING_ERROR",
        500
      );
    }
  }

  /**
   * Complete a commission payout (called from B2C callback)
   */
  public async completePayoutFromCallback(
    conversationId: string,
    transactionId: string,
    transactionReceipt: string,
    amount: number
  ): Promise<void> {
    try {
      const payout = await CommissionPayout.findByConversationId(
        conversationId
      );

      if (!payout) {
        logger.warn(
          "Commission payout not found for conversation ID:",
          conversationId
        );
        return;
      }

      await payout.update({
        status: "processed",
        processedAt: new Date(),
        transactionReference: transactionReceipt,
      });

      // Log payout completion in audit trail
      try {
        const { default: AuditTrailService } = await import(
          "./AuditTrailService"
        );
        await AuditTrailService.logCommissionPayoutCompleted(
          payout.id,
          payout.recipientId,
          amount,
          transactionId,
          transactionReceipt,
          {
            conversationId,
            recipientType: payout.recipientType,
            settlementId: payout.settlementId,
          }
        );
      } catch (auditError) {
        logger.warn(
          "Failed to log payout completion in audit trail:",
          auditError
        );
      }

      logger.info("Commission payout completed from callback:", {
        payoutId: payout.id,
        conversationId,
        transactionId,
        transactionReceipt,
        amount,
      });
    } catch (error: any) {
      logger.error("Error completing payout from callback:", error);
      throw error;
    }
  }

  /**
   * Fail a commission payout (called from B2C callback or timeout)
   */
  public async failPayoutFromCallback(
    conversationId: string,
    resultCode: number,
    resultDesc: string
  ): Promise<void> {
    try {
      const payout = await CommissionPayout.findByConversationId(
        conversationId
      );

      if (!payout) {
        logger.warn(
          "Commission payout not found for conversation ID:",
          conversationId
        );
        return;
      }

      await payout.update({
        status: "failed",
        failureReason: `M-Pesa Error ${resultCode}: ${resultDesc}`,
      });

      // Log payout failure in audit trail
      try {
        const { default: AuditTrailService } = await import(
          "./AuditTrailService"
        );
        await AuditTrailService.logCommissionPayoutFailed(
          payout.id,
          payout.recipientId,
          parseFloat(payout.amount.toString()),
          `M-Pesa Error ${resultCode}: ${resultDesc}`,
          {
            conversationId,
            resultCode,
            recipientType: payout.recipientType,
            settlementId: payout.settlementId,
          }
        );
      } catch (auditError) {
        logger.warn("Failed to log payout failure in audit trail:", auditError);
      }

      logger.warn("Commission payout failed from callback:", {
        payoutId: payout.id,
        conversationId,
        resultCode,
        resultDesc,
      });
    } catch (error: any) {
      logger.error("Error failing payout from callback:", error);
      throw error;
    }
  }

  /**
   * Get payout statistics for a settlement
   */
  public async getPayoutStatistics(settlementId: string): Promise<{
    totalPayouts: number;
    pendingPayouts: number;
    processedPayouts: number;
    failedPayouts: number;
    totalAmount: number;
    processedAmount: number;
    pendingAmount: number;
    failedAmount: number;
  }> {
    try {
      const payouts = await CommissionPayout.getPayoutsBySettlement(
        settlementId
      );

      const stats = {
        totalPayouts: payouts.length,
        pendingPayouts: 0,
        processedPayouts: 0,
        failedPayouts: 0,
        totalAmount: 0,
        processedAmount: 0,
        pendingAmount: 0,
        failedAmount: 0,
      };

      for (const payout of payouts) {
        const amount = parseFloat(payout.amount.toString());
        stats.totalAmount += amount;

        switch (payout.status) {
          case "pending":
            stats.pendingPayouts++;
            stats.pendingAmount += amount;
            break;
          case "processed":
            stats.processedPayouts++;
            stats.processedAmount += amount;
            break;
          case "failed":
            stats.failedPayouts++;
            stats.failedAmount += amount;
            break;
        }
      }

      return stats;
    } catch (error: any) {
      logger.error("Error getting payout statistics:", error);
      throw error;
    }
  }

  /**
   * Retry failed payouts for a settlement
   */
  public async retryFailedPayouts(
    settlementId: string,
    processedBy: string
  ): Promise<{
    retriedPayouts: number;
    successfulRetries: number;
    failedRetries: number;
    results: PayoutResult[];
  }> {
    try {
      const payouts = await CommissionPayout.getPayoutsBySettlement(
        settlementId
      );
      const failedPayouts = payouts.filter(
        (payout) => payout.status === "failed"
      );

      if (failedPayouts.length === 0) {
        return {
          retriedPayouts: 0,
          successfulRetries: 0,
          failedRetries: 0,
          results: [],
        };
      }

      const results: PayoutResult[] = [];
      let successfulRetries = 0;
      let failedRetries = 0;

      // Reset failed payouts to pending and retry
      for (const payout of failedPayouts) {
        await payout.update({
          status: "pending",
          failureReason: undefined,
          conversationId: undefined,
          originatorConversationId: undefined,
        });
      }

      // Process the retried payouts
      const retryResult = await this.processSettlementPayouts(
        settlementId,
        processedBy
      );

      logger.info("Failed payouts retried:", {
        settlementId,
        retriedPayouts: failedPayouts.length,
        successfulRetries: retryResult.successfulPayouts,
        failedRetries: retryResult.failedPayouts,
        processedBy,
      });

      return {
        retriedPayouts: failedPayouts.length,
        successfulRetries: retryResult.successfulPayouts,
        failedRetries: retryResult.failedPayouts,
        results: retryResult.results,
      };
    } catch (error: any) {
      logger.error("Error retrying failed payouts:", error);
      throw error;
    }
  }
}

export default new CommissionPayoutService();
