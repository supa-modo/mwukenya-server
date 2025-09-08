import { Router } from "express";
import SettlementController from "../controllers/SettlementController";
import { authenticate, authorize } from "../middleware/auth";
import { validateRequest, commonValidations } from "../middleware/validation";
import { UserRole } from "../types";

const router = Router();

// Validation schemas
const generateSettlementValidation = validateRequest({
  body: [{ field: "date", required: true, type: "date" }],
});

const processSettlementValidation = validateRequest({
  params: [commonValidations.uuid("settlementId")],
});

const payoutValidation = validateRequest({
  params: [commonValidations.uuid("payoutId")],
});

const markPayoutProcessedValidation = validateRequest({
  params: [commonValidations.uuid("payoutId")],
  body: [
    {
      field: "transactionReference",
      required: true,
      type: "string",
      minLength: 5,
      maxLength: 100,
    },
    {
      field: "paymentMethod",
      required: false,
      type: "string",
      custom: (value) =>
        !value ||
        ["mpesa", "bank_transfer", "cash"].includes(value) ||
        "Payment method must be mpesa, bank_transfer, or cash",
    },
  ],
});

const markPayoutFailedValidation = validateRequest({
  params: [commonValidations.uuid("payoutId")],
  body: [
    {
      field: "failureReason",
      required: true,
      type: "string",
      minLength: 10,
      maxLength: 500,
    },
  ],
});

const dateRangeValidation = validateRequest({
  query: [
    { field: "startDate", required: false, type: "date" },
    { field: "endDate", required: false, type: "date" },
    { field: "days", required: false, type: "number", min: 1, max: 365 },
  ],
});

// Admin-only routes
router.post(
  "/generate",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  generateSettlementValidation,
  SettlementController.generateDailySettlement
);

router.post(
  "/auto-generate",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  SettlementController.autoGenerateSettlements
);

router.post(
  "/:settlementId/process",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  processSettlementValidation,
  SettlementController.processSettlement
);

router.get(
  "/pending",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  SettlementController.getPendingSettlements
);

router.get(
  "/summary",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR]),
  dateRangeValidation,
  SettlementController.getSettlementSummary
);

router.get(
  "/:settlementId",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR]),
  processSettlementValidation,
  SettlementController.getSettlementById
);

router.get(
  "/:settlementId/breakdown",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR]),
  processSettlementValidation,
  SettlementController.getCommissionBreakdown
);

router.get(
  "/stats/overall",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR]),
  validateRequest({
    query: [
      { field: "days", required: false, type: "number", min: 1, max: 365 },
    ],
  }),
  SettlementController.getOverallStats
);

// Commission payout management (admin only)
router.get(
  "/payouts/pending",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  SettlementController.getPendingPayouts
);

router.post(
  "/payouts/:payoutId/process",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  markPayoutProcessedValidation,
  SettlementController.markPayoutAsProcessed
);

router.post(
  "/payouts/:payoutId/fail",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  markPayoutFailedValidation,
  SettlementController.markPayoutAsFailed
);

// Enhanced settlement processing routes
router.post(
  "/:settlementId/initiate-payouts",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  processSettlementValidation,
  SettlementController.initiateSettlementPayouts
);

router.post(
  "/:settlementId/retry-payouts",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  processSettlementValidation,
  SettlementController.retryFailedPayouts
);

router.get(
  "/:settlementId/payout-statistics",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR]),
  processSettlementValidation,
  SettlementController.getPayoutStatistics
);

// Granular payment processing routes
router.post(
  "/validate-password",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validateRequest({
    body: [
      {
        field: "password",
        required: true,
        type: "string",
        minLength: 1,
        maxLength: 100,
      },
    ],
  }),
  SettlementController.validatePaymentPassword
);

router.get(
  "/bank-details",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  SettlementController.getBankDetails
);

router.post(
  "/:settlementId/process-commissions",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validateRequest({
    params: [commonValidations.uuid("settlementId")],
    body: [
      {
        field: "password",
        required: true,
        type: "string",
        minLength: 1,
        maxLength: 100,
      },
    ],
  }),
  SettlementController.processCommissionPayouts
);

router.post(
  "/:settlementId/process-sha",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validateRequest({
    params: [commonValidations.uuid("settlementId")],
    body: [
      {
        field: "password",
        required: true,
        type: "string",
        minLength: 1,
        maxLength: 100,
      },
      {
        field: "amount",
        required: true,
        type: "number",
        min: 0.01,
      },
    ],
  }),
  SettlementController.processShaTransfer
);

router.post(
  "/:settlementId/process-mwu",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validateRequest({
    params: [commonValidations.uuid("settlementId")],
    body: [
      {
        field: "password",
        required: true,
        type: "string",
        minLength: 1,
        maxLength: 100,
      },
      {
        field: "amount",
        required: true,
        type: "number",
        min: 0.01,
      },
    ],
  }),
  SettlementController.processMwuTransfer
);

// Report generation routes
router.get(
  "/:settlementId/report/daily",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR]),
  processSettlementValidation,
  SettlementController.generateDailyReport
);

router.get(
  "/report/monthly/:year/:month",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR]),
  validateRequest({
    params: [
      { field: "year", required: true, type: "number", min: 2020, max: 2100 },
      { field: "month", required: true, type: "number", min: 1, max: 12 },
    ],
  }),
  SettlementController.generateMonthlyReport
);

router.get(
  "/report/payout",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR]),
  validateRequest({
    query: [
      { field: "startDate", required: true, type: "date" },
      { field: "endDate", required: true, type: "date" },
      {
        field: "recipientType",
        required: false,
        type: "string",
        custom: (value) =>
          !value ||
          ["delegate", "coordinator"].includes(value) ||
          "Recipient type must be delegate or coordinator",
      },
    ],
  }),
  SettlementController.generatePayoutReport
);

router.get(
  "/reports",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR]),
  SettlementController.listReports
);

router.get(
  "/reports/download/:fileName",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR]),
  validateRequest({
    params: [
      {
        field: "fileName",
        required: true,
        type: "string",
        pattern: /^[\w\-. ]+\.xlsx$/,
      },
    ],
  }),
  SettlementController.downloadReport
);

// User-specific routes (delegates and coordinators can view their own commissions)
router.get(
  "/my/payouts",
  authenticate,
  authorize([
    UserRole.DELEGATE,
    UserRole.COORDINATOR,
    UserRole.ADMIN,
    UserRole.SUPERADMIN,
  ]),
  validateRequest({
    query: [commonValidations.paginationLimit()],
  }),
  SettlementController.getMyCommissionPayouts
);

router.get(
  "/my/summary",
  authenticate,
  authorize([
    UserRole.DELEGATE,
    UserRole.COORDINATOR,
    UserRole.ADMIN,
    UserRole.SUPERADMIN,
  ]),
  dateRangeValidation,
  SettlementController.getMyCommissionSummary
);

export default router;
