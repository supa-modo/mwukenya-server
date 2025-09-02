import { Request, Response } from "express";
import Joi from "joi";
import { ApiError } from "../utils/apiError";
import logger from "../utils/logger";
import PaymentService from "../services/PaymentService";
import MpesaService from "../services/MpesaService";
import Payment from "../models/Payment";
import { PaymentStatus } from "../models/types";

export class PaymentController {
  /**
   * Initiate a new payment
   */
  public static async initiatePayment(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const schema = Joi.object({
        subscriptionId: Joi.string().uuid().required(),
        amount: Joi.number().min(1).max(100000).required(),
        phoneNumber: Joi.string().pattern(/^(\+?254|0)?[17]\d{8}$/).required(),
        paymentMethod: Joi.string().valid("mpesa").default("mpesa"),
        daysCovered: Joi.number().integer().min(1).max(365).optional(),
        description: Joi.string().max(255).optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        throw new ApiError(
          error.details[0].message,
          "VALIDATION_ERROR",
          400
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError("User not authenticated", "UNAUTHORIZED", 401);
      }

      const paymentRequest = {
        userId,
        ...value,
      };

      const result = await PaymentService.initiatePayment(paymentRequest);

      res.status(201).json({
        success: true,
        data: result,
        message: "Payment initiated successfully",
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error("Error initiating payment:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "PAYMENT_INITIATION_ERROR",
            message: "Failed to initiate payment",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get payment status
   */
  public static async getPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        throw new ApiError("Payment ID is required", "MISSING_PAYMENT_ID", 400);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError("User not authenticated", "UNAUTHORIZED", 401);
      }

      const payment = await PaymentService.getPaymentStatus(paymentId);

      // Ensure user can only access their own payments
      if (payment.userId !== userId && req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        throw new ApiError("Access denied", "FORBIDDEN", 403);
      }

      res.status(200).json({
        success: true,
        data: payment,
        message: "Payment status retrieved successfully",
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error("Error getting payment status:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "PAYMENT_STATUS_ERROR",
            message: "Failed to get payment status",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Query M-Pesa transaction status
   */
  public static async queryMpesaStatus(req: Request, res: Response): Promise<void> {
    try {
      const { checkoutRequestId } = req.params;

      if (!checkoutRequestId) {
        throw new ApiError("Checkout Request ID is required", "MISSING_CHECKOUT_REQUEST_ID", 400);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError("User not authenticated", "UNAUTHORIZED", 401);
      }

      // Find payment to verify ownership
      const payment = await Payment.findByMpesaCheckoutRequestId(checkoutRequestId);
      if (!payment) {
        throw new ApiError("Payment not found", "PAYMENT_NOT_FOUND", 404);
      }

      if (payment.userId !== userId && req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        throw new ApiError("Access denied", "FORBIDDEN", 403);
      }

      const status = await PaymentService.queryMpesaStatus(checkoutRequestId);

      res.status(200).json({
        success: true,
        data: {
          checkoutRequestId,
          ...status,
          paymentId: payment.id,
        },
        message: "M-Pesa status retrieved successfully",
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error("Error querying M-Pesa status:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "MPESA_QUERY_ERROR",
            message: "Failed to query M-Pesa status",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get user payment history
   */
  public static async getPaymentHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError("User not authenticated", "UNAUTHORIZED", 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (page < 1 || limit < 1 || limit > 100) {
        throw new ApiError("Invalid pagination parameters", "INVALID_PAGINATION", 400);
      }

      const result = await PaymentService.getUserPaymentHistory(userId, page, limit);

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
        message: "Payment history retrieved successfully",
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error("Error getting payment history:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "PAYMENT_HISTORY_ERROR",
            message: "Failed to get payment history",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get payment coverage status
   */
  public static async getPaymentCoverage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError("User not authenticated", "UNAUTHORIZED", 401);
      }

      const { subscriptionId } = req.params;
      if (!subscriptionId) {
        throw new ApiError("Subscription ID is required", "MISSING_SUBSCRIPTION_ID", 400);
      }

      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : undefined;

      const coverage = await PaymentService.getPaymentCoverageStatus(
        userId,
        subscriptionId,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data: coverage,
        message: "Payment coverage retrieved successfully",
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error("Error getting payment coverage:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "PAYMENT_COVERAGE_ERROR",
            message: "Failed to get payment coverage",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Handle M-Pesa callback
   */
  public static async handleMpesaCallback(req: Request, res: Response): Promise<void> {
    try {
      logger.info("Received M-Pesa callback:", JSON.stringify(req.body, null, 2));

      // Validate callback structure
      if (!req.body?.Body?.stkCallback) {
        logger.error("Invalid M-Pesa callback structure");
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CALLBACK",
            message: "Invalid callback structure",
          },
        });
        return;
      }

      // Process callback asynchronously
      MpesaService.processCallback(req.body)
        .catch((error) => {
          logger.error("Error in callback processing:", error);
        });

      // Always respond with success to M-Pesa
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback received successfully",
      });

    } catch (error: any) {
      logger.error("Error handling M-Pesa callback:", error);
      
      // Always respond with success to avoid retries
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback received",
      });
    }
  }

  /**
   * Manual payment verification (for failed callbacks)
   */
  public static async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const schema = Joi.object({
        transactionReference: Joi.string().required(),
        mpesaReceiptNumber: Joi.string().required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        throw new ApiError(
          error.details[0].message,
          "VALIDATION_ERROR",
          400
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError("User not authenticated", "UNAUTHORIZED", 401);
      }

      const { transactionReference, mpesaReceiptNumber } = value;

      // Find payment
      const payment = await Payment.findByTransactionReference(transactionReference);
      if (!payment) {
        throw new ApiError("Payment not found", "PAYMENT_NOT_FOUND", 404);
      }

      // Verify ownership
      if (payment.userId !== userId && req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        throw new ApiError("Access denied", "FORBIDDEN", 403);
      }

      // Check if already completed
      if (payment.paymentStatus === PaymentStatus.COMPLETED) {
        throw new ApiError("Payment already completed", "PAYMENT_ALREADY_COMPLETED", 400);
      }

      // Complete payment
      await PaymentService.completePayment(payment.id, mpesaReceiptNumber);

      res.status(200).json({
        success: true,
        data: {
          paymentId: payment.id,
          status: PaymentStatus.COMPLETED,
          mpesaReceiptNumber,
        },
        message: "Payment verified successfully",
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error("Error verifying payment:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "PAYMENT_VERIFICATION_ERROR",
            message: "Failed to verify payment",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Test M-Pesa connection (Admin only)
   */
  public static async testMpesaConnection(req: Request, res: Response): Promise<void> {
    try {
      // Check admin access
      if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
        throw new ApiError("Access denied", "FORBIDDEN", 403);
      }

      const result = await MpesaService.testConnection();

      res.status(200).json({
        success: true,
        data: result,
        message: "M-Pesa connection test completed",
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error("Error testing M-Pesa connection:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "MPESA_TEST_ERROR",
          message: "Failed to test M-Pesa connection",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export default PaymentController;
