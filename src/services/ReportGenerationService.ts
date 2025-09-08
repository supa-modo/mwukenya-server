import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { format } from "date-fns";
import logger from "../utils/logger";
import SettlementService from "./SettlementService";
import CommissionPayout from "../models/CommissionPayout";
import DailySettlement from "../models/DailySettlement";
import Payment from "../models/Payment";
import { User } from "../models";

export interface SettlementReportData {
  settlementId: string;
  settlementDate: string;
  totalCollected: number;
  shaAmount: number;
  mwuAmount: number;
  totalDelegateCommissions: number;
  totalCoordinatorCommissions: number;
  totalPayments: number;
  uniqueMembers: number;
  status: string;
  processedAt?: Date;
  processedBy?: string;
}

export interface CommissionBreakdownReportData {
  recipientId: string;
  recipientName: string;
  recipientType: string;
  phoneNumber?: string;
  totalCommission: number;
  paymentCount: number;
  status: string;
  processedAt?: Date;
  transactionReference?: string;
  failureReason?: string;
}

export interface PaymentReportData {
  paymentId: string;
  userId: string;
  memberName: string;
  membershipNumber?: string;
  phoneNumber: string;
  amount: number;
  paymentDate: Date;
  settlementDate: Date;
  paymentMethod: string;
  transactionReference: string;
  paymentStatus: string;
  mpesaReceiptNumber?: string;
  delegateCommission: number;
  coordinatorCommission: number;
  shaPortion: number;
  mwuPortion?: number;
  delegateName?: string;
  coordinatorName?: string;
}

export class ReportGenerationService {
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), "uploads", "reports");
    this.ensureReportsDirectory();
  }

  /**
   * Ensure reports directory exists
   */
  private ensureReportsDirectory(): void {
    try {
      if (!fs.existsSync(this.reportsDir)) {
        fs.mkdirSync(this.reportsDir, { recursive: true });
      }
    } catch (error: any) {
      logger.error("Failed to create reports directory:", error);
    }
  }

  /**
   * Generate daily settlement report
   */
  public async generateDailySettlementReport(settlementId: string): Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    error?: string;
  }> {
    try {
      // Get settlement data
      const settlement = await DailySettlement.findByPk(settlementId);
      if (!settlement) {
        return {
          success: false,
          error: "Settlement not found",
        };
      }

      // Get commission breakdown
      const breakdown = await SettlementService.getCommissionBreakdown(
        settlementId
      );

      // Get payout statistics
      const payoutStats = await SettlementService.getPayoutStatistics(
        settlementId
      );

      // Get detailed payment data for this settlement
      const payments = await Payment.findAll({
        where: {
          settlementDate: settlement.settlementDate,
          paymentStatus: "completed",
        },
        include: [
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
          {
            model: User,
            as: "delegate",
            attributes: ["id", "firstName", "lastName"],
          },
          {
            model: User,
            as: "coordinator",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
        order: [["paymentDate", "ASC"]],
      });

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Settlement Summary Sheet
      const settlementSummary = [
        ["Settlement Report"],
        ["Generated on:", new Date().toISOString()],
        [""],
        ["Settlement Details"],
        ["Settlement ID:", settlement.id],
        ["Settlement Date:", format(settlement.settlementDate, "yyyy-MM-dd")],
        ["Status:", settlement.status],
        [
          "Processed At:",
          settlement.processedAt
            ? settlement.processedAt.toISOString()
            : "Not processed",
        ],
        [""],
        ["Financial Summary"],
        ["Total Collected:", settlement.totalCollected],
        ["SHA Amount:", settlement.shaAmount],
        ["MWU Amount:", settlement.mwuAmount],
        ["Total Delegate Commissions:", settlement.totalDelegateCommissions],
        [
          "Total Coordinator Commissions:",
          settlement.totalCoordinatorCommissions,
        ],
        [""],
        ["Statistics"],
        ["Total Payments:", settlement.totalPayments],
        ["Unique Members:", settlement.uniqueMembers],
        [""],
        ["Payout Statistics"],
        ["Total Payouts:", payoutStats.totalPayouts],
        ["Processed Payouts:", payoutStats.processedPayouts],
        ["Pending Payouts:", payoutStats.pendingPayouts],
        ["Failed Payouts:", payoutStats.failedPayouts],
        ["Total Payout Amount:", payoutStats.totalAmount],
        ["Processed Amount:", payoutStats.processedAmount],
        ["Pending Amount:", payoutStats.pendingAmount],
        ["Failed Amount:", payoutStats.failedAmount],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(settlementSummary);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Delegate Commissions Sheet
      if (breakdown.delegateBreakdown.length > 0) {
        const delegateHeaders = [
          "Delegate ID",
          "Delegate Name",
          "Phone Number",
          "Total Commission",
          "Payment Count",
          "Status",
          "Processed At",
          "Transaction Reference",
          "Failure Reason",
        ];

        const delegateData = breakdown.delegateBreakdown.map((delegate) => [
          delegate.delegateId,
          delegate.delegateName,
          delegate.phoneNumber || "",
          delegate.totalCommission,
          delegate.paymentCount,
          "N/A", // Status will be filled from payout data
          "",
          "",
          "",
        ]);

        const delegateSheet = XLSX.utils.aoa_to_sheet([
          delegateHeaders,
          ...delegateData,
        ]);
        XLSX.utils.book_append_sheet(
          workbook,
          delegateSheet,
          "Delegate Commissions"
        );
      }

      // Coordinator Commissions Sheet
      if (breakdown.coordinatorBreakdown.length > 0) {
        const coordinatorHeaders = [
          "Coordinator ID",
          "Coordinator Name",
          "Phone Number",
          "Total Commission",
          "Payment Count",
          "Status",
          "Processed At",
          "Transaction Reference",
          "Failure Reason",
        ];

        const coordinatorData = breakdown.coordinatorBreakdown.map(
          (coordinator) => [
            coordinator.coordinatorId,
            coordinator.coordinatorName,
            coordinator.phoneNumber || "",
            coordinator.totalCommission,
            coordinator.paymentCount,
            "N/A", // Status will be filled from payout data
            "",
            "",
            "",
          ]
        );

        const coordinatorSheet = XLSX.utils.aoa_to_sheet([
          coordinatorHeaders,
          ...coordinatorData,
        ]);
        XLSX.utils.book_append_sheet(
          workbook,
          coordinatorSheet,
          "Coordinator Commissions"
        );
      }

      // Payments Detail Sheet
      if (payments.length > 0) {
        const paymentHeaders = [
          "Payment ID",
          "Member Name",
          "Membership Number",
          "Phone Number",
          "Amount",
          "Payment Date",
          "Payment Method",
          "Transaction Reference",
          "M-Pesa Receipt",
          "Delegate Commission",
          "Coordinator Commission",
          "SHA Portion",
          "MWU Portion",
          "Delegate Name",
          "Coordinator Name",
        ];

        const paymentData = payments.map((payment: any) => [
          payment.id,
          payment.user
            ? `${payment.user.firstName} ${payment.user.lastName}`
            : "Unknown",
          payment.user?.membershipNumber || "",
          payment.user?.phoneNumber || "",
          parseFloat(payment.amount.toString()),
          payment.paymentDate.toISOString(),
          payment.paymentMethod,
          payment.transactionReference,
          payment.mpesaReceiptNumber || "",
          parseFloat(payment.delegateCommission.toString()),
          parseFloat(payment.coordinatorCommission.toString()),
          parseFloat(payment.shaPortion.toString()),
          payment.mwuPortion ? parseFloat(payment.mwuPortion.toString()) : 0,
          payment.delegate
            ? `${payment.delegate.firstName} ${payment.delegate.lastName}`
            : "",
          payment.coordinator
            ? `${payment.coordinator.firstName} ${payment.coordinator.lastName}`
            : "",
        ]);

        const paymentsSheet = XLSX.utils.aoa_to_sheet([
          paymentHeaders,
          ...paymentData,
        ]);
        XLSX.utils.book_append_sheet(
          workbook,
          paymentsSheet,
          "Payment Details"
        );
      }

      // Generate filename and save
      const dateStr = format(settlement.settlementDate, "yyyy-MM-dd");
      const fileName = `settlement-report-${dateStr}-${settlement.id.slice(
        -8
      )}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);

      XLSX.writeFile(workbook, filePath);

      logger.info("Daily settlement report generated successfully:", {
        settlementId,
        fileName,
        filePath,
        paymentsCount: payments.length,
        delegateCount: breakdown.delegateBreakdown.length,
        coordinatorCount: breakdown.coordinatorBreakdown.length,
      });

      return {
        success: true,
        filePath,
        fileName,
      };
    } catch (error: any) {
      logger.error("Error generating daily settlement report:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate monthly settlement summary report
   */
  public async generateMonthlySettlementReport(
    year: number,
    month: number
  ): Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    error?: string;
  }> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Get settlements for the month
      const settlements = await SettlementService.getSettlementSummary(
        startDate,
        endDate
      );

      if (settlements.length === 0) {
        return {
          success: false,
          error: "No settlements found for the specified month",
        };
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Monthly Summary Sheet
      const totalCollected = settlements.reduce(
        (sum, s) => sum + s.totalCollected,
        0
      );
      const totalSHA = settlements.reduce((sum, s) => sum + s.shaAmount, 0);
      const totalMWU = settlements.reduce((sum, s) => sum + s.mwuAmount, 0);
      const totalDelegateCommissions = settlements.reduce(
        (sum, s) => sum + s.totalDelegateCommissions,
        0
      );
      const totalCoordinatorCommissions = settlements.reduce(
        (sum, s) => sum + s.totalCoordinatorCommissions,
        0
      );
      const totalPayments = settlements.reduce(
        (sum, s) => sum + s.totalPayments,
        0
      );
      const totalMembers = settlements.reduce(
        (sum, s) => sum + s.uniqueMembers,
        0
      );

      const monthlySummary = [
        ["Monthly Settlement Report"],
        ["Month:", `${year}-${month.toString().padStart(2, "0")}`],
        ["Generated on:", new Date().toISOString()],
        [""],
        ["Summary"],
        ["Total Settlements:", settlements.length],
        ["Total Collected:", totalCollected],
        ["Total SHA Amount:", totalSHA],
        ["Total MWU Amount:", totalMWU],
        ["Total Delegate Commissions:", totalDelegateCommissions],
        ["Total Coordinator Commissions:", totalCoordinatorCommissions],
        ["Total Payments:", totalPayments],
        ["Total Unique Members:", totalMembers],
        ["Average per Day:", totalCollected / settlements.length],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(monthlySummary);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Monthly Summary");

      // Daily Breakdown Sheet
      const dailyHeaders = [
        "Date",
        "Total Collected",
        "SHA Amount",
        "MWU Amount",
        "Delegate Commissions",
        "Coordinator Commissions",
        "Total Payments",
        "Unique Members",
        "Status",
        "Processed At",
      ];

      const dailyData = settlements.map((settlement) => [
        settlement.date,
        settlement.totalCollected,
        settlement.shaAmount,
        settlement.mwuAmount,
        settlement.totalDelegateCommissions,
        settlement.totalCoordinatorCommissions,
        settlement.totalPayments,
        settlement.uniqueMembers,
        settlement.status,
        settlement.processedAt ? settlement.processedAt.toISOString() : "",
      ]);

      const dailySheet = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyData]);
      XLSX.utils.book_append_sheet(workbook, dailySheet, "Daily Breakdown");

      // Generate filename and save
      const fileName = `monthly-settlement-report-${year}-${month
        .toString()
        .padStart(2, "0")}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);

      XLSX.writeFile(workbook, filePath);

      logger.info("Monthly settlement report generated successfully:", {
        year,
        month,
        fileName,
        filePath,
        settlementsCount: settlements.length,
      });

      return {
        success: true,
        filePath,
        fileName,
      };
    } catch (error: any) {
      logger.error("Error generating monthly settlement report:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate commission payout report
   */
  public async generateCommissionPayoutReport(
    startDate: Date,
    endDate: Date,
    recipientType?: "delegate" | "coordinator"
  ): Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    error?: string;
  }> {
    try {
      // Get commission payouts for the date range
      const payouts = await CommissionPayout.findAll({
        where: {
          ...(recipientType && { recipientType }),
          createdAt: {
            [require("sequelize").Op.between]: [startDate, endDate],
          },
        },
        include: [
          {
            model: User,
            as: "recipient",
            attributes: ["id", "firstName", "lastName", "phoneNumber", "email"],
          },
          {
            model: DailySettlement,
            as: "settlement",
            attributes: ["id", "settlementDate", "status"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      if (payouts.length === 0) {
        return {
          success: false,
          error: "No commission payouts found for the specified date range",
        };
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const totalAmount = payouts.reduce(
        (sum, p) => sum + parseFloat(p.amount.toString()),
        0
      );
      const processedAmount = payouts
        .filter((p) => p.status === "processed")
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
      const pendingAmount = payouts
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
      const failedAmount = payouts
        .filter((p) => p.status === "failed")
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

      const summary = [
        ["Commission Payout Report"],
        [
          "Date Range:",
          `${format(startDate, "yyyy-MM-dd")} to ${format(
            endDate,
            "yyyy-MM-dd"
          )}`,
        ],
        ["Recipient Type:", recipientType || "All"],
        ["Generated on:", new Date().toISOString()],
        [""],
        ["Summary"],
        ["Total Payouts:", payouts.length],
        ["Total Amount:", totalAmount],
        ["Processed Amount:", processedAmount],
        ["Pending Amount:", pendingAmount],
        ["Failed Amount:", failedAmount],
        [""],
        ["Status Breakdown"],
        ["Processed:", payouts.filter((p) => p.status === "processed").length],
        ["Pending:", payouts.filter((p) => p.status === "pending").length],
        ["Failed:", payouts.filter((p) => p.status === "failed").length],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summary);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Payout Details Sheet
      const headers = [
        "Payout ID",
        "Settlement Date",
        "Recipient Name",
        "Recipient Type",
        "Phone Number",
        "Email",
        "Amount",
        "Payment Count",
        "Status",
        "Payment Method",
        "Transaction Reference",
        "Processed At",
        "Failure Reason",
        "Created At",
      ];

      const data = payouts.map((payout: any) => [
        payout.id,
        payout.settlement
          ? format(payout.settlement.settlementDate, "yyyy-MM-dd")
          : "",
        payout.recipient
          ? `${payout.recipient.firstName} ${payout.recipient.lastName}`
          : "Unknown",
        payout.recipientType,
        payout.recipient?.phoneNumber || "",
        payout.recipient?.email || "",
        parseFloat(payout.amount.toString()),
        payout.paymentCount,
        payout.status,
        payout.paymentMethod || "",
        payout.transactionReference || "",
        payout.processedAt ? payout.processedAt.toISOString() : "",
        payout.failureReason || "",
        payout.createdAt.toISOString(),
      ]);

      const detailsSheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
      XLSX.utils.book_append_sheet(workbook, detailsSheet, "Payout Details");

      // Generate filename and save
      const dateStr = `${format(startDate, "yyyy-MM-dd")}_to_${format(
        endDate,
        "yyyy-MM-dd"
      )}`;
      const typeStr = recipientType ? `_${recipientType}` : "";
      const fileName = `commission-payout-report${typeStr}_${dateStr}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);

      XLSX.writeFile(workbook, filePath);

      logger.info("Commission payout report generated successfully:", {
        startDate,
        endDate,
        recipientType,
        fileName,
        filePath,
        payoutsCount: payouts.length,
      });

      return {
        success: true,
        filePath,
        fileName,
      };
    } catch (error: any) {
      logger.error("Error generating commission payout report:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate automated daily report (called by scheduler)
   */
  public async generateAutomatedDailyReport(date: Date): Promise<void> {
    try {
      // Find settlement for the date
      const settlement = await DailySettlement.getSettlementByDate(date);

      if (!settlement) {
        logger.info("No settlement found for automated report generation:", {
          date: format(date, "yyyy-MM-dd"),
        });
        return;
      }

      // Generate the report
      const result = await this.generateDailySettlementReport(settlement.id);

      if (result.success) {
        logger.info("Automated daily report generated successfully:", {
          date: format(date, "yyyy-MM-dd"),
          settlementId: settlement.id,
          fileName: result.fileName,
        });
      } else {
        logger.error("Failed to generate automated daily report:", {
          date: format(date, "yyyy-MM-dd"),
          settlementId: settlement.id,
          error: result.error,
        });
      }
    } catch (error: any) {
      logger.error("Error in automated daily report generation:", error);
    }
  }

  /**
   * List available reports
   */
  public listReports(): {
    fileName: string;
    filePath: string;
    size: number;
    createdAt: Date;
  }[] {
    try {
      const files = fs.readdirSync(this.reportsDir);

      return files
        .filter((file) => file.endsWith(".xlsx"))
        .map((file) => {
          const filePath = path.join(this.reportsDir, file);
          const stats = fs.statSync(filePath);

          return {
            fileName: file,
            filePath,
            size: stats.size,
            createdAt: stats.birthtime,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error: any) {
      logger.error("Error listing reports:", error);
      return [];
    }
  }

  /**
   * Delete old reports (cleanup)
   */
  public cleanupOldReports(daysToKeep: number = 30): void {
    try {
      const files = this.listReports();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;

      files.forEach((file) => {
        if (file.createdAt < cutoffDate) {
          try {
            fs.unlinkSync(file.filePath);
            deletedCount++;
            logger.info("Deleted old report:", { fileName: file.fileName });
          } catch (error: any) {
            logger.warn("Failed to delete old report:", {
              fileName: file.fileName,
              error: error.message,
            });
          }
        }
      });

      if (deletedCount > 0) {
        logger.info("Report cleanup completed:", {
          deletedCount,
          daysToKeep,
          cutoffDate,
        });
      }
    } catch (error: any) {
      logger.error("Error during report cleanup:", error);
    }
  }
}

export default new ReportGenerationService();
