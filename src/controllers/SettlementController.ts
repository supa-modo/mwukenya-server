import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types";
import { ApiError } from "../utils/apiError";
import SettlementService from "../services/SettlementService";
import BankTransferService from "../services/BankTransferService";
import DailySettlement from "../models/DailySettlement";
import CommissionPayout from "../models/CommissionPayout";
import { startOfDay, endOfDay, subDays, parseISO } from "date-fns";
import logger from "../utils/logger";
import Joi from "joi";

export class SettlementController {
  /**
   * Generate daily settlement for a specific date
   */
  generateDailySettlement = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { date } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_001",
            message: "User not authenticated",
          },
        });
        return;
      }

      if (!date) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_002",
            message: "Date is required",
          },
        });
        return;
      }

      const settlementDate = parseISO(date);
      const settlement = await SettlementService.generateDailySettlement(
        settlementDate
      );

      res.status(201).json({
        success: true,
        data: settlement,
        message: "Daily settlement generated successfully",
      });
    } catch (error) {
      console.error("Error generating daily settlement:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "SETTLEMENT_003",
            message: "Failed to generate daily settlement",
          },
        });
      }
    }
  };

  /**
   * Get settlement summary for a date range
   */
  getSettlementSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, days = 30 } = req.query;

      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = parseISO(startDate as string);
        end = parseISO(endDate as string);
      } else {
        end = new Date();
        start = subDays(end, parseInt(days as string));
      }

      let summary: any[] = [];
      try {
        summary = await SettlementService.getSettlementSummary(start, end);
      } catch (error: any) {
        console.warn(
          "Settlement service not available, returning empty data:",
          error.message
        );
        summary = [];
      }

      res.status(200).json({
        success: true,
        data: summary,
        message: "Settlement summary retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting settlement summary:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_004",
          message: "Failed to retrieve settlement summary",
        },
      });
    }
  };

  /**
   * Get commission breakdown for a specific settlement
   */
  getCommissionBreakdown = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { settlementId } = req.params;

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_005",
            message: "Settlement ID is required",
          },
        });
        return;
      }

      const breakdown = await SettlementService.getCommissionBreakdown(
        settlementId
      );

      res.status(200).json({
        success: true,
        data: breakdown,
        message: "Commission breakdown retrieved successfully",
      });
    } catch (error: any) {
      console.error("Error getting commission breakdown:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "SETTLEMENT_006",
            message: "Failed to retrieve commission breakdown",
          },
        });
      }
    }
  };

  /**
   * Process a settlement (mark as completed)
   */
  processSettlement = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { settlementId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_007",
            message: "User not authenticated",
          },
        });
        return;
      }

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_008",
            message: "Settlement ID is required",
          },
        });
        return;
      }

      const result = await SettlementService.processSettlement(
        settlementId,
        userId,
        true, // initiatePayouts
        true // initiateBankTransfers
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "Settlement processed successfully",
      });
    } catch (error: any) {
      console.error("Error processing settlement:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "SETTLEMENT_009",
            message: "Failed to process settlement",
          },
        });
      }
    }
  };

  /**
   * Get pending settlements
   */
  getPendingSettlements = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const settlements = await SettlementService.getPendingSettlements();

      res.status(200).json({
        success: true,
        data: settlements,
        message: "Pending settlements retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting pending settlements:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_010",
          message: "Failed to retrieve pending settlements",
        },
      });
    }
  };

  /**
   * Auto-generate missing settlements
   */
  autoGenerateSettlements = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { daysBack = 7 } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_011",
            message: "User not authenticated",
          },
        });
        return;
      }

      const settlements = await SettlementService.autoGenerateSettlements(
        daysBack
      );

      res.status(200).json({
        success: true,
        data: settlements,
        message: `Auto-generated ${settlements.length} settlements`,
      });
    } catch (error) {
      console.error("Error auto-generating settlements:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_012",
          message: "Failed to auto-generate settlements",
        },
      });
    }
  };

  /**
   * Get commission payouts for a user
   */
  getMyCommissionPayouts = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { limit = 50 } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_013",
            message: "User not authenticated",
          },
        });
        return;
      }

      const payouts = await SettlementService.getCommissionPayouts(
        userId,
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: payouts,
        message: "Commission payouts retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting commission payouts:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_014",
          message: "Failed to retrieve commission payouts",
        },
      });
    }
  };

  /**
   * Get commission summary for a user
   */
  getMyCommissionSummary = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { startDate, endDate, days = 30 } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_015",
            message: "User not authenticated",
          },
        });
        return;
      }

      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = parseISO(startDate as string);
        end = parseISO(endDate as string);
      } else {
        end = new Date();
        start = subDays(end, parseInt(days as string));
      }

      const summary = await SettlementService.getCommissionSummary(
        userId,
        start,
        end
      );

      res.status(200).json({
        success: true,
        data: summary,
        message: "Commission summary retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting commission summary:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_016",
          message: "Failed to retrieve commission summary",
        },
      });
    }
  };

  /**
   * Mark commission payout as processed (admin only)
   */
  markPayoutAsProcessed = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { payoutId } = req.params;
      const { transactionReference, paymentMethod = "mpesa" } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_017",
            message: "User not authenticated",
          },
        });
        return;
      }

      if (!payoutId || !transactionReference) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_018",
            message: "Payout ID and transaction reference are required",
          },
        });
        return;
      }

      await SettlementService.markPayoutAsProcessed(
        payoutId,
        transactionReference,
        paymentMethod
      );

      res.status(200).json({
        success: true,
        message: "Commission payout marked as processed",
      });
    } catch (error) {
      console.error("Error marking payout as processed:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_019",
          message: "Failed to mark payout as processed",
        },
      });
    }
  };

  /**
   * Mark commission payout as failed (admin only)
   */
  markPayoutAsFailed = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { payoutId } = req.params;
      const { failureReason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_020",
            message: "User not authenticated",
          },
        });
        return;
      }

      if (!payoutId || !failureReason) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_021",
            message: "Payout ID and failure reason are required",
          },
        });
        return;
      }

      await SettlementService.markPayoutAsFailed(payoutId, failureReason);

      res.status(200).json({
        success: true,
        message: "Commission payout marked as failed",
      });
    } catch (error) {
      console.error("Error marking payout as failed:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_022",
          message: "Failed to mark payout as failed",
        },
      });
    }
  };

  /**
   * Get overall statistics
   */
  getOverallStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { days = 30 } = req.query;

      let stats: any = {
        totalCollected: 0,
        shaAmount: 0,
        mwuAmount: 0,
        totalDelegateCommissions: 0,
        totalCoordinatorCommissions: 0,
        totalPayments: 0,
        uniqueMembers: 0,
        pendingSettlements: 0,
        completedSettlements: 0,
        averageDailyCollection: 0,
      };

      try {
        const serviceStats = await SettlementService.getOverallStats(
          parseInt(days as string)
        );
        // Map the service response to our expected format
        stats = {
          totalCollected: serviceStats.totalCollected || 0,
          shaAmount: serviceStats.totalShaAmount || 0,
          mwuAmount: serviceStats.totalMwuAmount || 0,
          totalDelegateCommissions: serviceStats.totalCommissions || 0,
          totalCoordinatorCommissions: serviceStats.totalCommissions || 0,
          totalPayments: serviceStats.totalPayments || 0,
          uniqueMembers: 0,
          pendingSettlements: 0,
          completedSettlements: serviceStats.settlementCount || 0,
          averageDailyCollection: serviceStats.averagePerDay || 0,
        };
      } catch (error: any) {
        console.warn(
          "Settlement service not available, returning default stats:",
          error.message
        );
      }

      res.status(200).json({
        success: true,
        data: stats,
        message: "Overall statistics retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting overall stats:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_023",
          message: "Failed to retrieve overall statistics",
        },
      });
    }
  };

  /**
   * Get settlement by ID
   */
  getSettlementById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { settlementId } = req.params;

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_024",
            message: "Settlement ID is required",
          },
        });
        return;
      }

      const settlement = await DailySettlement.findByPk(settlementId);

      if (!settlement) {
        res.status(404).json({
          success: false,
          error: {
            code: "SETTLEMENT_025",
            message: "Settlement not found",
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: settlement,
        message: "Settlement retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting settlement by ID:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_026",
          message: "Failed to retrieve settlement",
        },
      });
    }
  };

  /**
   * Get pending commission payouts (admin only)
   */
  getPendingPayouts = async (req: Request, res: Response): Promise<void> => {
    try {
      let payouts: any[] = [];
      try {
        payouts = await CommissionPayout.getPendingPayouts();
      } catch (error: any) {
        console.warn(
          "Commission payout service not available, returning empty data:",
          error.message
        );
        payouts = [];
      }

      res.status(200).json({
        success: true,
        data: payouts,
        message: "Pending commission payouts retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting pending payouts:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_027",
          message: "Failed to retrieve pending payouts",
        },
      });
    }
  };

  /**
   * Initiate automated payouts for a settlement (admin only)
   */
  initiateSettlementPayouts = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { settlementId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_028",
            message: "User not authenticated",
          },
        });
        return;
      }

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_029",
            message: "Settlement ID is required",
          },
        });
        return;
      }

      const results = await SettlementService.initiateSettlementPayouts(
        settlementId,
        userId
      );

      res.status(200).json({
        success: true,
        data: results,
        message: "Settlement payouts initiated successfully",
      });
    } catch (error) {
      console.error("Error initiating settlement payouts:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "SETTLEMENT_030",
            message: "Failed to initiate settlement payouts",
          },
        });
      }
    }
  };

  /**
   * Retry failed payouts for a settlement (admin only)
   */
  retryFailedPayouts = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { settlementId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_031",
            message: "User not authenticated",
          },
        });
        return;
      }

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_032",
            message: "Settlement ID is required",
          },
        });
        return;
      }

      const results = await SettlementService.retryFailedPayouts(
        settlementId,
        userId
      );

      res.status(200).json({
        success: true,
        data: results,
        message: "Failed payouts retried successfully",
      });
    } catch (error) {
      console.error("Error retrying failed payouts:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "SETTLEMENT_033",
            message: "Failed to retry failed payouts",
          },
        });
      }
    }
  };

  /**
   * Get payout statistics for a settlement (admin only)
   */
  getPayoutStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { settlementId } = req.params;

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_034",
            message: "Settlement ID is required",
          },
        });
        return;
      }

      const statistics = await SettlementService.getPayoutStatistics(
        settlementId
      );

      res.status(200).json({
        success: true,
        data: statistics,
        message: "Payout statistics retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting payout statistics:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_035",
          message: "Failed to retrieve payout statistics",
        },
      });
    }
  };

  /**
   * Generate daily settlement report
   */
  generateDailyReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { settlementId } = req.params;

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_036",
            message: "Settlement ID is required",
          },
        });
        return;
      }

      const { default: ReportGenerationService } = await import(
        "../services/ReportGenerationService"
      );
      const result =
        await ReportGenerationService.generateDailySettlementReport(
          settlementId
        );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            fileName: result.fileName,
            filePath: result.filePath,
          },
          message: "Daily settlement report generated successfully",
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_037",
            message: result.error || "Failed to generate report",
          },
        });
      }
    } catch (error) {
      console.error("Error generating daily settlement report:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_038",
          message: "Failed to generate daily settlement report",
        },
      });
    }
  };

  /**
   * Generate monthly settlement report
   */
  generateMonthlyReport = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { year, month } = req.params;
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_039",
            message: "Invalid year or month provided",
          },
        });
        return;
      }

      const { default: ReportGenerationService } = await import(
        "../services/ReportGenerationService"
      );
      const result =
        await ReportGenerationService.generateMonthlySettlementReport(
          yearNum,
          monthNum
        );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            fileName: result.fileName,
            filePath: result.filePath,
          },
          message: "Monthly settlement report generated successfully",
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_040",
            message: result.error || "Failed to generate report",
          },
        });
      }
    } catch (error) {
      console.error("Error generating monthly settlement report:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_041",
          message: "Failed to generate monthly settlement report",
        },
      });
    }
  };

  /**
   * Generate commission payout report
   */
  generatePayoutReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, recipientType } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_042",
            message: "Start date and end date are required",
          },
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_043",
            message: "Invalid date format provided",
          },
        });
        return;
      }

      const type = recipientType as "delegate" | "coordinator" | undefined;
      if (type && !["delegate", "coordinator"].includes(type)) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_044",
            message:
              "Invalid recipient type. Must be 'delegate' or 'coordinator'",
          },
        });
        return;
      }

      const { default: ReportGenerationService } = await import(
        "../services/ReportGenerationService"
      );
      const result =
        await ReportGenerationService.generateCommissionPayoutReport(
          start,
          end,
          type
        );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            fileName: result.fileName,
            filePath: result.filePath,
          },
          message: "Commission payout report generated successfully",
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_045",
            message: result.error || "Failed to generate report",
          },
        });
      }
    } catch (error) {
      console.error("Error generating commission payout report:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_046",
          message: "Failed to generate commission payout report",
        },
      });
    }
  };

  /**
   * List available reports
   */
  listReports = async (req: Request, res: Response): Promise<void> => {
    try {
      const { default: ReportGenerationService } = await import(
        "../services/ReportGenerationService"
      );
      const reports = ReportGenerationService.listReports();

      res.status(200).json({
        success: true,
        data: reports,
        message: "Reports listed successfully",
      });
    } catch (error) {
      console.error("Error listing reports:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_047",
          message: "Failed to list reports",
        },
      });
    }
  };

  /**
   * Download report file
   */
  downloadReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileName } = req.params;

      if (!fileName) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_048",
            message: "File name is required",
          },
        });
        return;
      }

      const { default: ReportGenerationService } = await import(
        "../services/ReportGenerationService"
      );
      const reports = ReportGenerationService.listReports();
      const report = reports.find((r) => r.fileName === fileName);

      if (!report) {
        res.status(404).json({
          success: false,
          error: {
            code: "SETTLEMENT_049",
            message: "Report not found",
          },
        });
        return;
      }

      res.download(report.filePath, report.fileName, (err) => {
        if (err) {
          logger.error("Error downloading report:", err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: {
                code: "SETTLEMENT_050",
                message: "Failed to download report",
              },
            });
          }
        }
      });
    } catch (error) {
      console.error("Error downloading report:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_051",
          message: "Failed to download report",
        },
      });
    }
  };

  /**
   * Validate payment confirmation password
   */
  validatePaymentPassword = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const schema = Joi.object({
        password: Joi.string().required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_052",
            message: error.details[0].message,
          },
        });
        return;
      }

      const { password } = value;
      const isValid = BankTransferService.validatePaymentPassword(password);

      res.status(200).json({
        success: true,
        data: { isValid },
        message: isValid
          ? "Password validated successfully"
          : "Invalid password",
      });
    } catch (error) {
      logger.error("Error validating payment password:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_053",
          message: "Failed to validate payment password",
        },
      });
    }
  };

  /**
   * Get bank details for SHA and MWU
   */
  getBankDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const shaBank = BankTransferService.getShaBank();
      const mwuBank = BankTransferService.getMwuBank();

      res.status(200).json({
        success: true,
        data: {
          shaBank,
          mwuBank,
        },
        message: "Bank details retrieved successfully",
      });
    } catch (error) {
      logger.error("Error getting bank details:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "SETTLEMENT_054",
          message: "Failed to retrieve bank details",
        },
      });
    }
  };

  /**
   * Process commission payouts for a settlement
   */
  processCommissionPayouts = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { settlementId } = req.params;
      const userId = req.user?.id;

      const schema = Joi.object({
        password: Joi.string().required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_055",
            message: error.details[0].message,
          },
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_056",
            message: "User not authenticated",
          },
        });
        return;
      }

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_057",
            message: "Settlement ID is required",
          },
        });
        return;
      }

      const { password } = value;

      // Validate payment password
      const isValidPassword =
        BankTransferService.validatePaymentPassword(password);
      if (!isValidPassword) {
        res.status(403).json({
          success: false,
          error: {
            code: "SETTLEMENT_058",
            message: "Invalid payment confirmation password",
          },
        });
        return;
      }

      // Process commission payouts
      const results = await SettlementService.initiateSettlementPayouts(
        settlementId,
        userId
      );

      res.status(200).json({
        success: true,
        data: results,
        message: "Commission payouts processed successfully",
      });
    } catch (error: any) {
      logger.error("Error processing commission payouts:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "SETTLEMENT_059",
            message: "Failed to process commission payouts",
          },
        });
      }
    }
  };

  /**
   * Process SHA bank transfer
   */
  processShaTransfer = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { settlementId } = req.params;
      const userId = req.user?.id;

      const schema = Joi.object({
        password: Joi.string().required(),
        amount: Joi.number().positive().required(),
        bankDetails: Joi.object({
          bankName: Joi.string().required(),
          accountNumber: Joi.string().required(),
          accountName: Joi.string().required(),
          branchCode: Joi.string().allow(""),
          swiftCode: Joi.string().allow(""),
        }).optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_060",
            message: error.details[0].message,
          },
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_061",
            message: "User not authenticated",
          },
        });
        return;
      }

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_062",
            message: "Settlement ID is required",
          },
        });
        return;
      }

      const { password, amount, bankDetails } = value;

      // Validate payment password
      const isValidPassword =
        BankTransferService.validatePaymentPassword(password);
      if (!isValidPassword) {
        res.status(403).json({
          success: false,
          error: {
            code: "SETTLEMENT_063",
            message: "Invalid payment confirmation password",
          },
        });
        return;
      }

      // Process SHA transfer
      const result = await BankTransferService.processShaTransfer(
        settlementId,
        amount,
        bankDetails
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "SHA bank transfer processed successfully",
      });
    } catch (error: any) {
      logger.error("Error processing SHA transfer:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "SETTLEMENT_064",
            message: "Failed to process SHA transfer",
          },
        });
      }
    }
  };

  /**
   * Process MWU bank transfer
   */
  processMwuTransfer = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { settlementId } = req.params;
      const userId = req.user?.id;

      const schema = Joi.object({
        password: Joi.string().required(),
        amount: Joi.number().positive().required(),
        bankDetails: Joi.object({
          bankName: Joi.string().required(),
          accountNumber: Joi.string().required(),
          accountName: Joi.string().required(),
          branchCode: Joi.string().allow(""),
          swiftCode: Joi.string().allow(""),
        }).optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_065",
            message: error.details[0].message,
          },
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "SETTLEMENT_066",
            message: "User not authenticated",
          },
        });
        return;
      }

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: {
            code: "SETTLEMENT_067",
            message: "Settlement ID is required",
          },
        });
        return;
      }

      const { password, amount, bankDetails } = value;

      // Validate payment password
      const isValidPassword =
        BankTransferService.validatePaymentPassword(password);
      if (!isValidPassword) {
        res.status(403).json({
          success: false,
          error: {
            code: "SETTLEMENT_068",
            message: "Invalid payment confirmation password",
          },
        });
        return;
      }

      // Process MWU transfer
      const result = await BankTransferService.processMwuTransfer(
        settlementId,
        amount,
        bankDetails
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "MWU bank transfer processed successfully",
      });
    } catch (error: any) {
      logger.error("Error processing MWU transfer:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "SETTLEMENT_069",
            message: "Failed to process MWU transfer",
          },
        });
      }
    }
  };
}

export default new SettlementController();
