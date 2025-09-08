import { Op, Transaction } from "sequelize";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import sequelize from "../config/database";
import { config } from "../config";
import logger from "../utils/logger";
import { ApiError } from "../utils/apiError";
import DailySettlement from "../models/DailySettlement";
import CommissionPayout from "../models/CommissionPayout";
import Payment from "../models/Payment";
import { User } from "../models";
import ErrorRecoveryService from "./ErrorRecoveryService";
import BankTransferService from "./BankTransferService";

export interface SettlementSummary {
  id: string;
  date: string;
  settlementDate: Date;
  totalCollected: number;
  shaAmount: number;
  mwuAmount: number;
  totalDelegateCommissions: number;
  totalCoordinatorCommissions: number;
  totalPayments: number;
  uniqueMembers: number;
  status: string;
  processedAt?: Date;
}

export interface CommissionBreakdown {
  delegateBreakdown: Array<{
    delegateId: string;
    delegateName: string;
    totalCommission: number;
    paymentCount: number;
    phoneNumber?: string;
    email?: string;
  }>;
  coordinatorBreakdown: Array<{
    coordinatorId: string;
    coordinatorName: string;
    totalCommission: number;
    paymentCount: number;
    phoneNumber?: string;
    email?: string;
  }>;
}

export class SettlementService {
  /**
   * Generate daily settlement for a specific date
   */
  public async generateDailySettlement(date: Date): Promise<DailySettlement> {
    const transaction: Transaction = await sequelize.transaction();

    try {
      const settlementDate = startOfDay(date);

      // Check if settlement already exists
      const existingSettlement = await DailySettlement.getSettlementByDate(
        settlementDate
      );
      if (existingSettlement) {
        await transaction.rollback();
        throw new ApiError(
          `Settlement for ${format(
            settlementDate,
            "yyyy-MM-dd"
          )} already exists`,
          "SETTLEMENT_EXISTS",
          400
        );
      }

      // Calculate settlement data
      const calculation = await DailySettlement.calculateDailySettlement(
        settlementDate
      );

      // Create settlement record
      const settlement = await DailySettlement.create(
        {
          settlementDate,
          totalCollected: calculation.totalCollected,
          shaAmount: calculation.shaAmount,
          mwuAmount: calculation.mwuAmount,
          totalDelegateCommissions: calculation.totalDelegateCommissions,
          totalCoordinatorCommissions: calculation.totalCoordinatorCommissions,
          totalPayments: calculation.totalPayments,
          uniqueMembers: calculation.uniqueMembers,
          status: "pending",
        },
        { transaction }
      );

      // Create commission payouts within the same transaction
      await CommissionPayout.createCommissionPayouts(
        settlement.id,
        calculation.delegateBreakdown,
        calculation.coordinatorBreakdown,
        transaction
      );

      await transaction.commit();

      // Log settlement generation in audit trail
      try {
        const { default: AuditTrailService } = await import(
          "./AuditTrailService"
        );
        await AuditTrailService.logEvent({
          userId: "system",
          action: "SETTLEMENT_GENERATED",
          entityType: "DailySettlement",
          entityId: settlement.id,
          newValues: {
            settlementDate,
            totalCollected: calculation.totalCollected,
            shaAmount: calculation.shaAmount,
            mwuAmount: calculation.mwuAmount,
            totalDelegateCommissions: calculation.totalDelegateCommissions,
            totalCoordinatorCommissions:
              calculation.totalCoordinatorCommissions,
            totalPayments: calculation.totalPayments,
            uniqueMembers: calculation.uniqueMembers,
            status: "pending",
          },
          metadata: {
            delegatePayoutCount: calculation.delegateBreakdown.length,
            coordinatorPayoutCount: calculation.coordinatorBreakdown.length,
          },
        });

        // Log commission payout creation
        const allPayouts = [
          ...calculation.delegateBreakdown.map((d) => ({
            payoutId: "pending", // Will be updated when payouts are created
            recipientId: d.delegateId,
            recipientType: "delegate",
            amount: d.totalCommission,
          })),
          ...calculation.coordinatorBreakdown.map((c) => ({
            payoutId: "pending",
            recipientId: c.coordinatorId,
            recipientType: "coordinator",
            amount: c.totalCommission,
          })),
        ];

        await AuditTrailService.logEvent({
          userId: "system",
          action: "COMMISSION_PAYOUTS_CREATED",
          entityType: "CommissionPayout",
          entityId: settlement.id,
          newValues: {
            settlementId: settlement.id,
            totalPayouts: allPayouts.length,
            delegatePayouts: calculation.delegateBreakdown.length,
            coordinatorPayouts: calculation.coordinatorBreakdown.length,
          },
          metadata: {
            payouts: allPayouts,
            generatedAt: new Date(),
          },
        });
      } catch (auditError) {
        logger.warn(
          "Failed to log settlement generation in audit trail:",
          auditError
        );
      }

      logger.info("Daily settlement generated successfully:", {
        settlementId: settlement.id,
        date: format(settlementDate, "yyyy-MM-dd"),
        totalCollected: calculation.totalCollected,
        totalPayments: calculation.totalPayments,
      });

      return settlement;
    } catch (error: any) {
      await transaction.rollback();
      logger.error("Error generating daily settlement:", error);
      throw error;
    }
  }

  /**
   * Process pending settlements (mark as processing and initiate payouts)
   */
  public async processSettlement(
    settlementId: string,
    processedBy: string,
    initiatePayouts: boolean = true,
    initiateBankTransfers: boolean = true
  ): Promise<{
    settlement: DailySettlement;
    payoutResults?: {
      totalPayouts: number;
      successfulPayouts: number;
      failedPayouts: number;
    };
    bankTransferResults?: {
      shaTransfer?: any;
      unionTransfer?: any;
      success: boolean;
    };
  }> {
    return await ErrorRecoveryService.executeWithRecovery(
      "settlement_processing",
      async () => {
        const transaction: Transaction = await sequelize.transaction();

        try {
          // Validate system health before processing
          const healthCheck = await ErrorRecoveryService.validateSystemHealth();
          if (!healthCheck.healthy) {
            logger.warn(
              "System health issues detected before settlement processing",
              {
                issues: healthCheck.issues,
              }
            );
          }

          const settlement = await DailySettlement.findByPk(settlementId, {
            transaction,
          });
          if (!settlement) {
            throw new ApiError(
              "Settlement not found",
              "SETTLEMENT_NOT_FOUND",
              404
            );
          }

          if (settlement.status !== "pending") {
            throw new ApiError(
              `Settlement is already ${settlement.status}`,
              "SETTLEMENT_NOT_PENDING",
              400
            );
          }

          // Update settlement status to processing
          await settlement.update(
            {
              status: "processing",
              processedAt: new Date(),
              processedBy,
            },
            { transaction }
          );

          await transaction.commit();

          logger.info("Settlement marked as processing:", {
            settlementId,
            processedBy,
            date: format(settlement.settlementDate, "yyyy-MM-dd"),
          });

          const results: {
            settlement: DailySettlement;
            payoutResults?: any;
            bankTransferResults?: any;
          } = { settlement };

          // Initiate commission payouts if requested
          if (initiatePayouts) {
            try {
              // Import CommissionPayoutService dynamically to avoid circular dependency
              const { default: CommissionPayoutService } = await import(
                "./CommissionPayoutService"
              );

              results.payoutResults =
                await ErrorRecoveryService.executeWithRecovery(
                  "mpesa_b2c_payout",
                  async () => {
                    return await CommissionPayoutService.processSettlementPayouts(
                      settlementId,
                      processedBy
                    );
                  },
                  { settlementId, processedBy }
                );

              logger.info("Commission payouts processed:", {
                settlementId,
                totalPayouts: results.payoutResults.totalPayouts,
                successfulPayouts: results.payoutResults.successfulPayouts,
                failedPayouts: results.payoutResults.failedPayouts,
              });
            } catch (payoutError: any) {
              logger.error("Commission payout processing failed:", payoutError);
              await ErrorRecoveryService.handleSettlementError(
                payoutError,
                settlementId,
                { phase: "commission_payouts", processedBy }
              );

              // Don't fail the entire settlement for payout errors
              results.payoutResults = {
                totalPayouts: 0,
                successfulPayouts: 0,
                failedPayouts: 0,
                error: payoutError.message,
              };
            }
          } else {
            // If not initiating payouts, still mark them as processed for zero-payment settlements
            results.payoutResults = {
              totalPayouts: 0,
              successfulPayouts: 0,
              failedPayouts: 0,
            };
          }

          // Initiate bank transfers if requested
          if (initiateBankTransfers) {
            try {
              results.bankTransferResults =
                await ErrorRecoveryService.executeWithRecovery(
                  "bank_transfer",
                  async () => {
                    return await BankTransferService.processSettlementTransfers(
                      settlementId,
                      parseFloat(settlement.shaAmount.toString()),
                      parseFloat(settlement.mwuAmount.toString()),
                      config.security.paymentConfirmationPassword ||
                        "default-password"
                    );
                  },
                  {
                    settlementId,
                    shaAmount: settlement.shaAmount,
                    mwuAmount: settlement.mwuAmount,
                  }
                );

              logger.info("Bank transfers processed:", {
                settlementId,
                shaTransferSuccess:
                  results.bankTransferResults?.shaTransfer?.success,
                unionTransferSuccess:
                  results.bankTransferResults?.unionTransfer?.success,
                overallSuccess: results.bankTransferResults?.success,
              });
            } catch (transferError: any) {
              logger.error("Bank transfer processing failed:", transferError);
              await ErrorRecoveryService.handleSettlementError(
                transferError,
                settlementId,
                { phase: "bank_transfers", processedBy }
              );

              // Don't fail the entire settlement for bank transfer errors
              results.bankTransferResults = {
                success: false,
                error: transferError.message,
              };
            }
          }

          // Determine final settlement status
          const allPayoutsSuccessful =
            !results.payoutResults || results.payoutResults.failedPayouts === 0;
          const allTransfersSuccessful =
            !results.bankTransferResults || results.bankTransferResults.success;

          // For settlements with zero payments, mark as completed if no errors occurred
          const hasZeroPayments = settlement.totalPayments === 0;

          if (allPayoutsSuccessful && allTransfersSuccessful) {
            await settlement.update({
              status: "completed",
            });

            logger.info("Settlement completed successfully:", {
              settlementId,
              totalPayouts: results.payoutResults?.totalPayouts || 0,
              bankTransfersSuccessful: allTransfersSuccessful,
              hasZeroPayments,
            });
          } else if (hasZeroPayments && !results.payoutResults?.error) {
            // For zero-payment settlements, mark as completed even if no transfers occurred
            await settlement.update({
              status: "completed",
            });

            logger.info("Zero-payment settlement completed:", {
              settlementId,
              totalPayments: 0,
              totalPayouts: 0,
            });
          } else {
            logger.warn("Settlement processing completed with some failures:", {
              settlementId,
              payoutFailures: results.payoutResults?.failedPayouts || 0,
              bankTransferFailures: !allTransfersSuccessful,
            });
          }

          return results;
        } catch (error: any) {
          await transaction.rollback();
          await ErrorRecoveryService.handleSettlementError(
            error,
            settlementId,
            { processedBy, phase: "settlement_processing" }
          );
          throw error;
        }
      },
      { settlementId, processedBy }
    );
  }

  /**
   * Get settlement summary for a date range
   */
  public async getSettlementSummary(
    startDate: Date,
    endDate: Date
  ): Promise<SettlementSummary[]> {
    try {
      const settlements = await DailySettlement.findAll({
        where: {
          settlementDate: {
            [Op.between]: [startOfDay(startDate), endOfDay(endDate)],
          },
        },
        order: [["settlementDate", "DESC"]],
      });

      logger.info("Found settlements for summary:", {
        count: settlements.length,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
      });

      const summary = settlements.map((settlement) => ({
        id: settlement.id,
        date: format(settlement.settlementDate, "yyyy-MM-dd"),
        settlementDate: settlement.settlementDate,
        totalCollected: parseFloat(settlement.totalCollected.toString()),
        shaAmount: parseFloat(settlement.shaAmount.toString()),
        mwuAmount: parseFloat(settlement.mwuAmount.toString()),
        totalDelegateCommissions: parseFloat(
          settlement.totalDelegateCommissions.toString()
        ),
        totalCoordinatorCommissions: parseFloat(
          settlement.totalCoordinatorCommissions.toString()
        ),
        totalPayments: settlement.totalPayments,
        uniqueMembers: settlement.uniqueMembers,
        status: settlement.status,
        processedAt: settlement.processedAt,
      }));

      logger.info("Settlement summary mapped:", {
        summaryCount: summary.length,
        firstSettlement: summary[0]
          ? {
              id: summary[0].id,
              date: summary[0].date,
              status: summary[0].status,
              hasId: !!summary[0].id,
            }
          : null,
      });

      return summary;
    } catch (error: any) {
      logger.error("Error getting settlement summary:", error);
      throw error;
    }
  }

  /**
   * Get commission breakdown for a specific settlement
   */
  public async getCommissionBreakdown(
    settlementId: string
  ): Promise<CommissionBreakdown> {
    try {
      // First check if settlement exists
      const settlement = await DailySettlement.findByPk(settlementId);
      if (!settlement) {
        throw new ApiError("Settlement not found", "SETTLEMENT_NOT_FOUND", 404);
      }

      const payouts = await CommissionPayout.getPayoutsBySettlement(
        settlementId
      );

      const delegateBreakdown = payouts
        .filter((payout) => payout.recipientType === "delegate")
        .map((payout) => ({
          delegateId: payout.recipientId,
          delegateName: (payout as any).recipient
            ? `${(payout as any).recipient.firstName} ${
                (payout as any).recipient.lastName
              }`
            : "Unknown",
          totalCommission: parseFloat(payout.amount.toString()),
          paymentCount: payout.paymentCount,
          phoneNumber: (payout as any).recipient?.phoneNumber,
          email: (payout as any).recipient?.email,
        }));

      const coordinatorBreakdown = payouts
        .filter((payout) => payout.recipientType === "coordinator")
        .map((payout) => ({
          coordinatorId: payout.recipientId,
          coordinatorName: (payout as any).recipient
            ? `${(payout as any).recipient.firstName} ${
                (payout as any).recipient.lastName
              }`
            : "Unknown",
          totalCommission: parseFloat(payout.amount.toString()),
          paymentCount: payout.paymentCount,
          phoneNumber: (payout as any).recipient?.phoneNumber,
          email: (payout as any).recipient?.email,
        }));

      // If no payouts exist (zero payments), return empty breakdown
      return {
        delegateBreakdown,
        coordinatorBreakdown,
      };
    } catch (error: any) {
      logger.error("Error getting commission breakdown:", error);
      throw error;
    }
  }

  /**
   * Auto-generate settlements for missing dates
   */
  public async autoGenerateSettlements(
    daysBack: number = 7
  ): Promise<DailySettlement[]> {
    const settlements: DailySettlement[] = [];

    try {
      for (let i = 1; i <= daysBack; i++) {
        const date = subDays(new Date(), i);
        const settlementDate = startOfDay(date);

        // Check if settlement already exists
        const existing = await DailySettlement.getSettlementByDate(
          settlementDate
        );
        if (!existing) {
          // Check if there were any payments on this date
          const paymentCount = await Payment.count({
            where: {
              paymentStatus: "completed",
              processedAt: {
                [Op.between]: [
                  startOfDay(settlementDate),
                  endOfDay(settlementDate),
                ],
              },
            },
          });

          if (paymentCount > 0) {
            const settlement = await this.generateDailySettlement(
              settlementDate
            );
            settlements.push(settlement);

            logger.info(
              `Auto-generated settlement for ${format(
                settlementDate,
                "yyyy-MM-dd"
              )}`
            );
          }
        }
      }

      return settlements;
    } catch (error: any) {
      logger.error("Error auto-generating settlements:", error);
      throw error;
    }
  }

  /**
   * Get pending settlements
   */
  public async getPendingSettlements(): Promise<DailySettlement[]> {
    return await DailySettlement.getPendingSettlements();
  }

  /**
   * Get commission payouts for a recipient
   */
  public async getCommissionPayouts(
    recipientId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const payouts = await CommissionPayout.getPayoutsByRecipient(
        recipientId,
        limit
      );

      return payouts.map((payout) => ({
        id: payout.id,
        amount: parseFloat(payout.amount.toString()),
        paymentCount: payout.paymentCount,
        status: payout.status,
        settlementDate: (payout as any).settlement?.settlementDate,
        processedAt: payout.processedAt,
        transactionReference: payout.transactionReference,
        paymentMethod: payout.paymentMethod,
      }));
    } catch (error: any) {
      logger.error("Error getting commission payouts:", error);
      throw error;
    }
  }

  /**
   * Get commission summary for a recipient
   */
  public async getCommissionSummary(
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
    return await CommissionPayout.getCommissionSummary(
      recipientId,
      startDate,
      endDate
    );
  }

  /**
   * Mark commission payout as processed
   */
  public async markPayoutAsProcessed(
    payoutId: string,
    transactionReference: string,
    paymentMethod: string = "mpesa"
  ): Promise<void> {
    await CommissionPayout.markAsProcessed(
      payoutId,
      transactionReference,
      paymentMethod
    );
    logger.info("Commission payout marked as processed:", {
      payoutId,
      transactionReference,
    });
  }

  /**
   * Mark commission payout as failed
   */
  public async markPayoutAsFailed(
    payoutId: string,
    failureReason: string
  ): Promise<void> {
    await CommissionPayout.markAsFailed(payoutId, failureReason);
    logger.info("Commission payout marked as failed:", {
      payoutId,
      failureReason,
    });
  }

  /**
   * Initiate automated payouts for a settlement
   */
  public async initiateSettlementPayouts(
    settlementId: string,
    processedBy: string
  ): Promise<{
    totalPayouts: number;
    successfulPayouts: number;
    failedPayouts: number;
  }> {
    try {
      // Import CommissionPayoutService dynamically to avoid circular dependency
      const { default: CommissionPayoutService } = await import(
        "./CommissionPayoutService"
      );

      const results = await CommissionPayoutService.processSettlementPayouts(
        settlementId,
        processedBy
      );

      logger.info("Settlement payouts initiated:", {
        settlementId,
        totalPayouts: results.totalPayouts,
        successfulPayouts: results.successfulPayouts,
        failedPayouts: results.failedPayouts,
        processedBy,
      });

      return {
        totalPayouts: results.totalPayouts,
        successfulPayouts: results.successfulPayouts,
        failedPayouts: results.failedPayouts,
      };
    } catch (error: any) {
      logger.error("Error initiating settlement payouts:", error);
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
  }> {
    try {
      // Import CommissionPayoutService dynamically to avoid circular dependency
      const { default: CommissionPayoutService } = await import(
        "./CommissionPayoutService"
      );

      const results = await CommissionPayoutService.retryFailedPayouts(
        settlementId,
        processedBy
      );

      logger.info("Failed payouts retried:", {
        settlementId,
        retriedPayouts: results.retriedPayouts,
        successfulRetries: results.successfulRetries,
        failedRetries: results.failedRetries,
        processedBy,
      });

      return results;
    } catch (error: any) {
      logger.error("Error retrying failed payouts:", error);
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
      // Import CommissionPayoutService dynamically to avoid circular dependency
      const { default: CommissionPayoutService } = await import(
        "./CommissionPayoutService"
      );

      return await CommissionPayoutService.getPayoutStatistics(settlementId);
    } catch (error: any) {
      logger.error("Error getting payout statistics:", error);
      throw error;
    }
  }

  /**
   * Get overall statistics
   */
  public async getOverallStats(days: number = 30): Promise<{
    totalCollected: number;
    totalShaAmount: number;
    totalMwuAmount: number;
    totalCommissions: number;
    totalPayments: number;
    averagePerDay: number;
    settlementCount: number;
  }> {
    try {
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      const settlements = await DailySettlement.findAll({
        where: {
          settlementDate: {
            [Op.between]: [startDate, endDate],
          },
          status: {
            [Op.in]: ["completed", "pending"],
          },
        },
      });

      const stats = settlements.reduce(
        (acc, settlement) => {
          acc.totalCollected += parseFloat(
            settlement.totalCollected.toString()
          );
          acc.totalShaAmount += parseFloat(settlement.shaAmount.toString());
          acc.totalMwuAmount += parseFloat(settlement.mwuAmount.toString());
          acc.totalCommissions +=
            parseFloat(settlement.totalDelegateCommissions.toString()) +
            parseFloat(settlement.totalCoordinatorCommissions.toString());
          acc.totalPayments += settlement.totalPayments;
          return acc;
        },
        {
          totalCollected: 0,
          totalShaAmount: 0,
          totalMwuAmount: 0,
          totalCommissions: 0,
          totalPayments: 0,
        }
      );

      return {
        ...stats,
        averagePerDay:
          settlements.length > 0
            ? stats.totalCollected / settlements.length
            : 0,
        settlementCount: settlements.length,
      };
    } catch (error: any) {
      logger.error("Error getting overall stats:", error);
      throw error;
    }
  }
}

export default new SettlementService();
