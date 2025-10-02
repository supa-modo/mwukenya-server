import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { Op } from "sequelize";
import DailySettlement from "../models/DailySettlement";
import Payment from "../models/Payment";
import User from "../models/User";
import MemberSubscription from "../models/MemberSubscription";
import MedicalScheme from "../models/MedicalScheme";
import logger from "../utils/logger";

export class PaymentReportService {
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), "uploads", "reports");
    this.ensureReportsDirectory();
  }

  private ensureReportsDirectory(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Generate SHA bank transfer report with member list
   */
  public async generateShaBankTransferReport(
    settlementId: string,
    transactionDetails: any
  ): Promise<string> {
    try {
      const settlement = await DailySettlement.findByPk(settlementId);
      if (!settlement) {
        throw new Error("Settlement not found");
      }

      // Get all payments for this settlement
      const payments = await Payment.findAll({
        where: {
          paymentDate: {
            [Op.between]: [
              settlement.settlementDate,
              settlement.settlementDate,
            ],
          },
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
              "idNumber",
            ],
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

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Transaction Summary
      const transactionSummary = [
        ["SHA Bank Transfer Report"],
        ["Generated Date", new Date().toLocaleString()],
        ["Settlement Date", settlement.settlementDate],
        ["Settlement ID", settlement.id],
        [""],
        ["Transaction Details"],
        ["Bank Name", transactionDetails.bankName],
        ["Account Number", transactionDetails.accountNumber],
        ["Account Name", transactionDetails.accountName],
        ["Transaction Code", transactionDetails.transactionCode],
        ["Amount (KES)", transactionDetails.amount],
        ["Notes", transactionDetails.notes || ""],
        [""],
        ["Settlement Summary"],
        ["Total Collected", settlement.totalCollected],
        ["SHA Amount", settlement.shaAmount],
        ["Total Payments", settlement.totalPayments],
        ["Unique Members", settlement.uniqueMembers],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(transactionSummary);
      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        "Transaction Summary"
      );

      // Sheet 2: Member List
      const memberData = [
        ["Member List - SHA Payment Contributors"],
        ["Generated Date", new Date().toLocaleString()],
        ["Settlement Date", settlement.settlementDate],
        [""],
        [
          "S/N",
          "Member Name",
          "Phone Number",
          "ID Number",
          "Scheme",
          "Coverage Type",
          "Payment Amount",
          "SHA Portion",
          "Payment Date",
        ],
      ];

      payments.forEach((payment: any, index: number) => {
        memberData.push([
          index + 1,
          `${payment.user.firstName} ${payment.user.lastName}`,
          payment.user.phoneNumber,
          payment.user.idNumber,
          payment.subscription.scheme.name,
          payment.subscription.scheme.coverageType,
          payment.amount,
          payment.shaPortion,
          payment.paymentDate,
        ]);
      });

      const memberSheet = XLSX.utils.aoa_to_sheet(memberData);
      XLSX.utils.book_append_sheet(workbook, memberSheet, "Member List");

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `SHA_Bank_Transfer_${settlement.settlementDate}_${timestamp}.xlsx`;
      const filepath = path.join(this.reportsDir, filename);

      // Write file
      XLSX.writeFile(workbook, filepath);

      logger.info(`SHA bank transfer report generated: ${filename}`);
      return filename;
    } catch (error) {
      logger.error("Error generating SHA bank transfer report:", error);
      throw error;
    }
  }

  /**
   * Generate MWU bank transfer report
   */
  public async generateMwuBankTransferReport(
    settlementId: string,
    transactionDetails: any
  ): Promise<string> {
    try {
      const settlement = await DailySettlement.findByPk(settlementId);
      if (!settlement) {
        throw new Error("Settlement not found");
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Transaction Summary
      const transactionSummary = [
        ["MWU Bank Transfer Report"],
        ["Generated Date", new Date().toLocaleString()],
        ["Settlement Date", settlement.settlementDate],
        ["Settlement ID", settlement.id],
        [""],
        ["Transaction Details"],
        ["Bank Name", transactionDetails.bankName],
        ["Account Number", transactionDetails.accountNumber],
        ["Account Name", transactionDetails.accountName],
        ["Transaction Code", transactionDetails.transactionCode],
        ["Amount (KES)", transactionDetails.amount],
        ["Notes", transactionDetails.notes || ""],
        [""],
        ["Settlement Summary"],
        ["Total Collected", settlement.totalCollected],
        ["MWU Amount", settlement.mwuAmount],
        ["Total Payments", settlement.totalPayments],
        ["Unique Members", settlement.uniqueMembers],
        [""],
        ["Financial Breakdown"],
        ["SHA Portion", settlement.shaAmount],
        ["MWU Portion", settlement.mwuAmount],
        ["Total Delegate Commissions", settlement.totalDelegateCommissions],
        [
          "Total Coordinator Commissions",
          settlement.totalCoordinatorCommissions,
        ],
        ["Net Amount to MWU", settlement.mwuAmount],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(transactionSummary);
      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        "Transaction Summary"
      );

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `MWU_Bank_Transfer_${settlement.settlementDate}_${timestamp}.xlsx`;
      const filepath = path.join(this.reportsDir, filename);

      // Write file
      XLSX.writeFile(workbook, filepath);

      logger.info(`MWU bank transfer report generated: ${filename}`);
      return filename;
    } catch (error) {
      logger.error("Error generating MWU bank transfer report:", error);
      throw error;
    }
  }

  /**
   * Generate commission payout report
   */
  public async generateCommissionPayoutReport(
    settlementId: string,
    payoutData: any[]
  ): Promise<string> {
    try {
      const settlement = await DailySettlement.findByPk(settlementId);
      if (!settlement) {
        throw new Error("Settlement not found");
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ["Commission Payout Report"],
        ["Generated Date", new Date().toLocaleString()],
        ["Settlement Date", settlement.settlementDate],
        ["Settlement ID", settlement.id],
        [""],
        ["Payout Summary"],
        ["Total Delegate Commissions", settlement.totalDelegateCommissions],
        [
          "Total Coordinator Commissions",
          settlement.totalCoordinatorCommissions,
        ],
        ["Total Commission Payouts", payoutData.length],
        [""],
        ["Individual Payouts"],
        [
          "Recipient Type",
          "Recipient Name",
          "Phone Number",
          "Amount",
          "Payment Count",
        ],
      ];

      payoutData.forEach((payout) => {
        summaryData.push([
          payout.recipientType,
          payout.recipientName,
          payout.phoneNumber,
          payout.amount,
          payout.paymentCount,
        ]);
      });

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Payout Summary");

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `Commission_Payout_${settlement.settlementDate}_${timestamp}.xlsx`;
      const filepath = path.join(this.reportsDir, filename);

      // Write file
      XLSX.writeFile(workbook, filepath);

      logger.info(`Commission payout report generated: ${filename}`);
      return filename;
    } catch (error) {
      logger.error("Error generating commission payout report:", error);
      throw error;
    }
  }

  /**
   * List all available reports
   */
  public listReports(): {
    fileName: string;
    size: number;
    createdAt: string;
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
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
          };
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (error) {
      logger.error("Error listing reports:", error);
      return [];
    }
  }

  /**
   * Get report file path
   */
  public getReportPath(fileName: string): string {
    return path.join(this.reportsDir, fileName);
  }

  /**
   * Delete old reports (older than 30 days)
   */
  public cleanupOldReports(): void {
    try {
      const files = fs.readdirSync(this.reportsDir);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      files.forEach((file) => {
        const filePath = path.join(this.reportsDir, file);
        const stats = fs.statSync(filePath);

        if (stats.birthtime < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          logger.info(`Deleted old report: ${file}`);
        }
      });
    } catch (error) {
      logger.error("Error cleaning up old reports:", error);
    }
  }
}

export default new PaymentReportService();
