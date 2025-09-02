import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rateLimiter";
import PaymentController from "../controllers/PaymentController";

const router = Router();

// Rate limiters for different operations
const paymentRateLimit = rateLimitMiddleware("payment", 5, 15 * 60); // 5 payments per 15 minutes
const queryRateLimit = rateLimitMiddleware("query", 60, 60); // 60 queries per minute (1 per second for polling)
const statusRateLimit = rateLimitMiddleware("status", 120, 60); // 120 status checks per minute (2 per second)
const callbackRateLimit = rateLimitMiddleware("callback", 100, 60); // 100 callbacks per minute

// Payment initiation - requires authentication
router.post(
  "/initiate",
  authenticate,
  paymentRateLimit,
  PaymentController.initiatePayment
);

// Get payment status - requires authentication
router.get(
  "/:paymentId/status",
  authenticate,
  statusRateLimit,
  PaymentController.getPaymentStatus
);

// Query M-Pesa transaction status - requires authentication
router.get(
  "/mpesa/:checkoutRequestId/status",
  authenticate,
  queryRateLimit,
  PaymentController.queryMpesaStatus
);

// Get payment history - requires authentication
router.get("/history", authenticate, PaymentController.getPaymentHistory);

// Get payment coverage - requires authentication
router.get(
  "/coverage/:subscriptionId",
  authenticate,
  PaymentController.getPaymentCoverage
);

// Manual payment verification - requires authentication
router.post(
  "/verify",
  authenticate,
  paymentRateLimit,
  PaymentController.verifyPayment
);

// M-Pesa callback endpoint - no authentication (called by M-Pesa)
router.post(
  "/mpesa/callback",
  callbackRateLimit,
  PaymentController.handleMpesaCallback
);

// Test M-Pesa connection - admin only
router.get(
  "/mpesa/test",
  authenticate,
  requireAdmin,
  PaymentController.testMpesaConnection
);

export default router;
