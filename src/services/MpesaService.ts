import axios from "axios";
import { config } from "../config";
import logger from "../utils/logger";
import { ApiError } from "../utils/apiError";
import Payment from "../models/Payment";
import { PaymentStatus } from "../models/types";

interface MpesaAuthResponse {
  access_token: string;
  expires_in: string;
}

interface StkPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: string;
  Amount: string;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface StkPushCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

interface TransactionStatusResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

export class MpesaService {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private paybillNumber: string;
  private passkey: string;
  private callbackUrl: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor() {
    this.baseUrl =
      config.external.mpesa.environment === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

    this.consumerKey = config.external.mpesa.consumerKey;
    this.consumerSecret = config.external.mpesa.consumerSecret;
    this.paybillNumber = config.external.mpesa.paybillNumber;
    this.passkey = config.external.mpesa.passkey;
    this.callbackUrl =
      config.external.mpesa.callbackUrl ||
      `${config.apiUrl}/api/${config.apiVersion}/payments/mpesa/callback`;

    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error("M-Pesa credentials not configured");
    }
  }

  /**
   * Get OAuth access token from M-Pesa API
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${this.consumerKey}:${this.consumerSecret}`
      ).toString("base64");

      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
          timeout: 30000,
        }
      );

      const data = response.data as MpesaAuthResponse;
      this.accessToken = data.access_token;
      // Set expiry to 55 minutes (tokens expire in 1 hour)
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

      logger.info("M-Pesa access token obtained successfully");
      return this.accessToken;
    } catch (error: any) {
      logger.error(
        "Failed to get M-Pesa access token:",
        error.response?.data || error.message
      );
      throw new ApiError(
        "Failed to authenticate with M-Pesa",
        "MPESA_AUTH_ERROR",
        500
      );
    }
  }

  /**
   * Generate M-Pesa password for STK Push
   */
  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3);

    const password = Buffer.from(
      `${this.paybillNumber}${this.passkey}${timestamp}`
    ).toString("base64");

    return { password, timestamp };
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    let formatted = phoneNumber.replace(/\D/g, "");

    if (formatted.startsWith("0")) {
      formatted = "254" + formatted.slice(1);
    } else if (formatted.startsWith("254")) {
      // Already in correct format
    } else if (formatted.startsWith("+254")) {
      formatted = formatted.slice(1);
    } else {
      throw new ApiError(
        "Invalid phone number format. Please use Kenyan phone number.",
        "INVALID_PHONE_FORMAT",
        400
      );
    }

    if (formatted.length !== 12 || !formatted.startsWith("254")) {
      throw new ApiError(
        "Invalid phone number. Please enter a valid Kenyan phone number.",
        "INVALID_PHONE_NUMBER",
        400
      );
    }

    return formatted;
  }

  /**
   * Generate unique account reference for transaction
   */
  private generateAccountReference(
    userId: string,
    subscriptionId: string
  ): string {
    const timestamp = Date.now().toString().slice(-6);
    return `MWU${userId.slice(-4)}${subscriptionId.slice(-4)}${timestamp}`;
  }

  /**
   * Initiate STK Push payment
   */
  public async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    userId: string,
    subscriptionId: string,
    description: string = "MWU Kenya Premium Payment"
  ): Promise<{
    success: boolean;
    checkoutRequestId: string;
    merchantRequestId: string;
    customerMessage: string;
    transactionReference: string;
  }> {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new ApiError(
          "Invalid amount. Please enter a valid amount greater than 0.",
          "INVALID_AMOUNT",
          400
        );
      }

      // M-Pesa requires amount to be at least 1 KES
      if (amount < 1) {
        throw new ApiError(
          "Amount must be at least 1 KES.",
          "AMOUNT_TOO_SMALL",
          400
        );
      }

      const accessToken = await this.getAccessToken();
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const { password, timestamp } = this.generatePassword();
      const accountReference = this.generateAccountReference(
        userId,
        subscriptionId
      );

      const stkPushData: StkPushRequest = {
        BusinessShortCode: this.paybillNumber,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        // Use 1 KES for testing in production, actual amount for live
        Amount: amount.toString(),
        PartyA: formattedPhone,
        PartyB: this.paybillNumber,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: description,
      };

      logger.info("Initiating M-Pesa STK Push:", {
        phone: formattedPhone,
        originalAmount: amount,
        actualAmount: config.external.mpesa.testMode ? 1 : amount,
        testMode: config.external.mpesa.testMode,
        environment: config.external.mpesa.environment,
        accountReference,
      });

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const data = response.data as StkPushResponse;

      if (data.ResponseCode !== "0") {
        logger.error("M-Pesa STK Push failed:", data);
        throw new ApiError(
          data.ResponseDescription || "STK Push failed",
          "MPESA_STK_PUSH_FAILED",
          400
        );
      }

      logger.info("M-Pesa STK Push initiated successfully:", {
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
      });

      return {
        success: true,
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
        customerMessage: data.CustomerMessage,
        transactionReference: accountReference,
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error(
        "M-Pesa STK Push error:",
        error.response?.data || error.message
      );

      // Handle specific M-Pesa error codes
      const errorData = error.response?.data;
      if (errorData?.errorCode) {
        const errorMessage = this.getMpesaErrorMessage(errorData.errorCode);
        throw new ApiError(errorMessage, "MPESA_ERROR", 400);
      }

      // Handle amount validation errors specifically
      if (
        error.response?.status === 400 &&
        errorData?.message?.includes("amount")
      ) {
        throw new ApiError(
          "Invalid amount. Please enter a valid amount greater than 0.",
          "INVALID_AMOUNT",
          400
        );
      }

      throw new ApiError(
        "Failed to initiate M-Pesa payment. Please try again.",
        "MPESA_STK_PUSH_ERROR",
        500
      );
    }
  }

  /**
   * Process M-Pesa callback
   */
  public async processCallback(callbackData: StkPushCallback): Promise<void> {
    try {
      const { stkCallback } = callbackData.Body;
      const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
        stkCallback;

      logger.info("Processing M-Pesa callback:", {
        checkoutRequestId: CheckoutRequestID,
        resultCode: ResultCode,
        resultDesc: ResultDesc,
      });

      // Find the payment record
      const payment = await Payment.findByMpesaCheckoutRequestId(
        CheckoutRequestID
      );
      if (!payment) {
        logger.error(
          "Payment not found for checkout request ID:",
          CheckoutRequestID
        );
        return;
      }

      // Update payment with callback data
      payment.callbackReceived = true;
      payment.callbackReceivedAt = new Date();
      payment.mpesaResultCode = ResultCode;
      payment.mpesaResultDescription = ResultDesc;

      if (ResultCode === 0) {
        // Payment successful
        if (CallbackMetadata?.Item) {
          const metadata = this.parseCallbackMetadata(CallbackMetadata.Item);

          payment.mpesaReceiptNumber = metadata.mpesaReceiptNumber;
          payment.mpesaTransactionId = metadata.transactionId;
          payment.amount = parseFloat(metadata.amount);
          payment.mpesaPhoneNumber = metadata.phoneNumber;
        }

        payment.paymentStatus = PaymentStatus.COMPLETED;
        payment.processedAt = new Date();

        // Calculate commissions
        await payment.calculateCommissions();

        logger.info("Payment completed successfully:", {
          paymentId: payment.id,
          receiptNumber: payment.mpesaReceiptNumber,
          amount: payment.amount,
        });
      } else {
        // Payment failed
        payment.paymentStatus = PaymentStatus.FAILED;

        logger.warn("Payment failed:", {
          paymentId: payment.id,
          resultCode: ResultCode,
          resultDesc: ResultDesc,
        });
      }

      await payment.save();

      // TODO: Send notification to user about payment status
      // TODO: Update payment coverage records
      // TODO: Trigger commission calculations
    } catch (error: any) {
      logger.error("Error processing M-Pesa callback:", error);
      // Don't throw error - callback processing should be resilient
    }
  }

  /**
   * Query transaction status
   */
  public async queryTransactionStatus(checkoutRequestId: string): Promise<{
    resultCode: string;
    resultDesc: string;
    isComplete: boolean;
    isSuccessful: boolean;
  }> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const queryData = {
        BusinessShortCode: this.paybillNumber,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        queryData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const data = response.data as TransactionStatusResponse;
      const isComplete = data.ResultCode !== undefined;
      const isSuccessful = data.ResultCode === "0";

      return {
        resultCode: data.ResultCode,
        resultDesc: data.ResultDesc,
        isComplete,
        isSuccessful,
      };
    } catch (error: any) {
      logger.error(
        "Error querying M-Pesa transaction status:",
        error.response?.data || error.message
      );
      throw new ApiError(
        "Failed to query transaction status",
        "MPESA_QUERY_ERROR",
        500
      );
    }
  }

  /**
   * Parse callback metadata
   */
  private parseCallbackMetadata(
    items: Array<{ Name: string; Value: string | number }>
  ) {
    const metadata: any = {};

    items.forEach((item) => {
      switch (item.Name) {
        case "Amount":
          metadata.amount = item.Value.toString();
          break;
        case "MpesaReceiptNumber":
          metadata.mpesaReceiptNumber = item.Value.toString();
          break;
        case "TransactionDate":
          metadata.transactionDate = item.Value.toString();
          break;
        case "PhoneNumber":
          metadata.phoneNumber = item.Value.toString();
          break;
        case "TransID":
          metadata.transactionId = item.Value.toString();
          break;
      }
    });

    return metadata;
  }

  /**
   * Get user-friendly error message for M-Pesa error codes
   */
  private getMpesaErrorMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      "404.001.03": "Invalid phone number. Please check and try again.",
      "500.001.1001": "Unable to lock subscriber. Please try again later.",
      "500.001.1019":
        "Transaction failed. Insufficient funds in your M-Pesa account.",
      "500.001.1032": "Transaction cancelled by user.",
      "500.001.1037": "Transaction timeout. Please try again.",
      "500.001.1025": "Unable to process request. Please try again later.",
      "400.002.02": "Invalid amount. Please enter a valid amount.",
      "400.008.03": "Invalid phone number format.",
    };

    return errorMessages[errorCode] || "Transaction failed. Please try again.";
  }

  /**
   * Validate M-Pesa configuration
   */
  public validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.consumerKey) {
      errors.push("M-Pesa consumer key not configured");
    }
    if (!this.consumerSecret) {
      errors.push("M-Pesa consumer secret not configured");
    }
    if (!this.paybillNumber) {
      errors.push("M-Pesa paybill number not configured");
    }
    if (!this.passkey) {
      errors.push("M-Pesa passkey not configured");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test M-Pesa connectivity
   */
  public async testConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.getAccessToken();
      return {
        success: true,
        message: "M-Pesa connection successful",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "M-Pesa connection failed",
      };
    }
  }
}

export default new MpesaService();
