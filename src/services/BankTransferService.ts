import { config } from "../config";
import logger from "../utils/logger";
import { ApiError } from "../utils/apiError";

/**
 * Bank Transfer Service
 * Handles bank transfers for SHA and MWU portions of settlements
 */
export default class BankTransferService {
  /**
   * Validate payment confirmation password
   */
  public static validatePaymentPassword(password: string): boolean {
    const expectedPassword = config.security.paymentConfirmationPassword;

    if (!expectedPassword) {
      throw new ApiError(
        "Payment confirmation password not configured",
        "CONFIG_ERROR",
        500
      );
    }

    return password === expectedPassword;
  }

  /**
   * Get SHA bank details
   */
  public static getShaBank() {
    return {
      bankName: config.external.banking.shaBank.bankName,
      accountNumber: config.external.banking.shaBank.accountNumber,
      accountName: config.external.banking.shaBank.accountName,
      branchCode: config.external.banking.shaBank.branchCode,
      swiftCode: config.external.banking.shaBank.swiftCode,
    };
  }

  /**
   * Get MWU bank details
   */
  public static getMwuBank() {
    return {
      bankName: config.external.banking.mwuBank.bankName,
      accountNumber: config.external.banking.mwuBank.accountNumber,
      accountName: config.external.banking.mwuBank.accountName,
      branchCode: config.external.banking.mwuBank.branchCode,
      swiftCode: config.external.banking.mwuBank.swiftCode,
    };
  }

  /**
   * Process SHA bank transfer
   */
  public static async processShaTransfer(
    settlementId: string,
    amount: number,
    password: string,
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      branchCode?: string;
      swiftCode?: string;
    }
  ): Promise<{
    success: boolean;
    transactionId?: string;
    message: string;
  }> {
    try {
      // Validate password
      if (!this.validatePaymentPassword(password)) {
        throw new ApiError(
          "Invalid payment confirmation password",
          "INVALID_PASSWORD",
          401
        );
      }

      // Use provided bank details or defaults
      const shaBank = bankDetails
        ? { ...this.getShaBank(), ...bankDetails }
        : this.getShaBank();

      logger.info("Processing SHA bank transfer", {
        settlementId,
        amount,
        bankDetails: shaBank,
      });

      // Simulate bank transfer processing
      // In a real implementation, this would integrate with banking APIs
      const success = Math.random() > 0.05; // 95% success rate
      const transactionId = success
        ? `SHA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : undefined;

      if (success) {
        logger.info("SHA bank transfer completed successfully", {
          settlementId,
          amount,
          transactionId,
        });

        return {
          success: true,
          transactionId,
          message: `SHA transfer of ${amount} KES completed successfully`,
        };
      } else {
        logger.error("SHA bank transfer failed", {
          settlementId,
          amount,
        });

        return {
          success: false,
          message: "SHA bank transfer failed - please retry",
        };
      }
    } catch (error: any) {
      logger.error("Error processing SHA bank transfer:", error);

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        "Failed to process SHA bank transfer",
        "TRANSFER_ERROR",
        500,
        error.message
      );
    }
  }

  /**
   * Process MWU bank transfer
   */
  public static async processMwuTransfer(
    settlementId: string,
    amount: number,
    password: string,
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      branchCode?: string;
      swiftCode?: string;
    }
  ): Promise<{
    success: boolean;
    transactionId?: string;
    message: string;
  }> {
    try {
      // Validate password
      if (!this.validatePaymentPassword(password)) {
        throw new ApiError(
          "Invalid payment confirmation password",
          "INVALID_PASSWORD",
          401
        );
      }

      // Use provided bank details or defaults
      const mwuBank = bankDetails
        ? { ...this.getMwuBank(), ...bankDetails }
        : this.getMwuBank();

      logger.info("Processing MWU bank transfer", {
        settlementId,
        amount,
        bankDetails: mwuBank,
      });

      // Simulate bank transfer processing
      // In a real implementation, this would integrate with banking APIs
      const success = Math.random() > 0.05; // 95% success rate
      const transactionId = success
        ? `MWU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : undefined;

      if (success) {
        logger.info("MWU bank transfer completed successfully", {
          settlementId,
          amount,
          transactionId,
        });

        return {
          success: true,
          transactionId,
          message: `MWU transfer of ${amount} KES completed successfully`,
        };
      } else {
        logger.error("MWU bank transfer failed", {
          settlementId,
          amount,
        });

        return {
          success: false,
          message: "MWU bank transfer failed - please retry",
        };
      }
    } catch (error: any) {
      logger.error("Error processing MWU bank transfer:", error);

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        "Failed to process MWU bank transfer",
        "TRANSFER_ERROR",
        500,
        error.message
      );
    }
  }

  /**
   * Process settlement transfers (SHA and MWU)
   */
  public static async processSettlementTransfers(
    settlementId: string,
    shaAmount: number,
    mwuAmount: number,
    password: string,
    shaBankDetails?: any,
    mwuBankDetails?: any
  ): Promise<{
    shaTransfer: { success: boolean; transactionId?: string; message: string };
    mwuTransfer: { success: boolean; transactionId?: string; message: string };
  }> {
    try {
      logger.info("Processing settlement transfers", {
        settlementId,
        shaAmount,
        mwuAmount,
      });

      // Process both transfers in parallel
      const [shaResult, mwuResult] = await Promise.all([
        this.processShaTransfer(
          settlementId,
          shaAmount,
          password,
          shaBankDetails
        ),
        this.processMwuTransfer(
          settlementId,
          mwuAmount,
          password,
          mwuBankDetails
        ),
      ]);

      return {
        shaTransfer: shaResult,
        mwuTransfer: mwuResult,
      };
    } catch (error: any) {
      logger.error("Error processing settlement transfers:", error);
      throw error;
    }
  }
}
