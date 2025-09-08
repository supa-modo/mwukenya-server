import logger from "../utils/logger";
import { ApiError } from "../utils/apiError";
import { Transaction } from "sequelize";

interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

interface RecoveryAction {
  id: string;
  type: "retry" | "rollback" | "manual_intervention" | "skip";
  description: string;
  handler: () => Promise<boolean>;
  priority: "high" | "medium" | "low";
}

class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private recoveryActions: Map<string, RecoveryAction[]> = new Map();
  private retryConfigs: Map<string, RetryConfig> = new Map();

  private constructor() {
    this.initializeDefaultConfigs();
    this.registerRecoveryActions();
  }

  public static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  private initializeDefaultConfigs(): void {
    // Settlement generation retry config
    this.retryConfigs.set("settlement_generation", {
      maxAttempts: 3,
      delayMs: 5000,
      backoffMultiplier: 2,
      maxDelayMs: 30000,
    });

    // M-Pesa B2C payout retry config
    this.retryConfigs.set("mpesa_b2c_payout", {
      maxAttempts: 5,
      delayMs: 10000,
      backoffMultiplier: 1.5,
      maxDelayMs: 60000,
    });

    // Database transaction retry config
    this.retryConfigs.set("database_transaction", {
      maxAttempts: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
    });

    // Report generation retry config
    this.retryConfigs.set("report_generation", {
      maxAttempts: 2,
      delayMs: 5000,
      backoffMultiplier: 1.5,
      maxDelayMs: 15000,
    });
  }

  private registerRecoveryActions(): void {
    // Settlement generation recovery actions
    this.recoveryActions.set("settlement_generation_failed", [
      {
        id: "retry_settlement_generation",
        type: "retry",
        description: "Retry settlement generation with exponential backoff",
        handler: async () => {
          // This will be called by the settlement service
          return true;
        },
        priority: "high",
      },
      {
        id: "manual_settlement_review",
        type: "manual_intervention",
        description: "Flag for manual review and intervention",
        handler: async () => {
          logger.error("Settlement generation requires manual intervention");
          // Could send notification to admins
          return false;
        },
        priority: "high",
      },
    ]);

    // M-Pesa payout recovery actions
    this.recoveryActions.set("mpesa_payout_failed", [
      {
        id: "retry_mpesa_payout",
        type: "retry",
        description: "Retry M-Pesa B2C payout with backoff",
        handler: async () => {
          return true;
        },
        priority: "high",
      },
      {
        id: "mark_for_manual_payout",
        type: "manual_intervention",
        description: "Mark payout for manual processing",
        handler: async () => {
          logger.warn("M-Pesa payout marked for manual processing");
          return false;
        },
        priority: "medium",
      },
    ]);

    // Database recovery actions
    this.recoveryActions.set("database_error", [
      {
        id: "retry_database_operation",
        type: "retry",
        description: "Retry database operation",
        handler: async () => {
          return true;
        },
        priority: "high",
      },
      {
        id: "rollback_transaction",
        type: "rollback",
        description: "Rollback current transaction",
        handler: async () => {
          logger.info("Transaction rolled back due to error");
          return true;
        },
        priority: "high",
      },
    ]);
  }

  /**
   * Execute an operation with retry logic and error recovery
   */
  public async executeWithRecovery<T>(
    operationType: string,
    operation: () => Promise<T>,
    context: any = {},
    transaction?: Transaction
  ): Promise<T> {
    const config = this.retryConfigs.get(operationType) || {
      maxAttempts: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
    };

    let lastError: Error | null = null;
    let currentDelay = config.delayMs;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        logger.info(
          `Executing ${operationType}, attempt ${attempt}/${config.maxAttempts}`,
          {
            context,
            attempt,
          }
        );

        const result = await operation();

        if (attempt > 1) {
          logger.info(`${operationType} succeeded after ${attempt} attempts`, {
            context,
            totalAttempts: attempt,
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        logger.warn(
          `${operationType} failed, attempt ${attempt}/${config.maxAttempts}`,
          {
            error: lastError.message,
            context,
            attempt,
          }
        );

        // If this is the last attempt, don't wait
        if (attempt === config.maxAttempts) {
          break;
        }

        // Wait before retrying
        await this.delay(currentDelay);
        currentDelay = Math.min(
          currentDelay * config.backoffMultiplier,
          config.maxDelayMs
        );
      }
    }

    // All attempts failed, trigger recovery actions
    logger.error(`${operationType} failed after all retry attempts`, {
      error: lastError?.message,
      context,
      totalAttempts: config.maxAttempts,
    });

    await this.triggerRecoveryActions(
      operationType,
      lastError!,
      context,
      transaction
    );

    throw new ApiError(
      `${operationType} failed after ${config.maxAttempts} attempts: ${lastError?.message}`,
      "OPERATION_FAILED_WITH_RECOVERY",
      500
    );
  }

  /**
   * Trigger recovery actions for a failed operation
   */
  private async triggerRecoveryActions(
    operationType: string,
    error: Error,
    context: any,
    transaction?: Transaction
  ): Promise<void> {
    const errorKey = `${operationType}_failed`;
    const actions = this.recoveryActions.get(errorKey) || [];

    logger.info(`Triggering recovery actions for ${operationType}`, {
      errorKey,
      actionsCount: actions.length,
      context,
    });

    // Sort actions by priority
    const sortedActions = actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const action of sortedActions) {
      try {
        logger.info(`Executing recovery action: ${action.id}`, {
          type: action.type,
          description: action.description,
          priority: action.priority,
        });

        const success = await action.handler();

        if (success && action.type === "retry") {
          logger.info(`Recovery action ${action.id} completed successfully`);
          return; // Recovery successful, stop here
        }

        if (action.type === "rollback" && transaction) {
          await transaction.rollback();
          logger.info("Transaction rolled back successfully");
        }
      } catch (recoveryError) {
        logger.error(`Recovery action ${action.id} failed`, {
          error: (recoveryError as Error).message,
          originalError: error.message,
        });
      }
    }
  }

  /**
   * Handle critical settlement errors
   */
  public async handleSettlementError(
    error: Error,
    settlementId?: string,
    context: any = {}
  ): Promise<void> {
    logger.error("Critical settlement error detected", {
      error: error.message,
      settlementId,
      context,
      stack: error.stack,
    });

    // Dynamic import to avoid circular dependencies
    const { default: AuditTrailService } = await import("./AuditTrailService");

    await AuditTrailService.logAction({
      action: "settlement_error",
      resourceType: "settlement",
      resourceId: settlementId,
      details: {
        error: error.message,
        stack: error.stack,
        context,
      },
      severity: "critical",
    });

    // Could trigger notifications, alerts, etc.
    await this.notifyAdministrators("settlement_error", {
      error: error.message,
      settlementId,
      context,
    });
  }

  /**
   * Handle M-Pesa payout errors
   */
  public async handlePayoutError(
    error: Error,
    payoutId: string,
    settlementId: string,
    context: any = {}
  ): Promise<void> {
    logger.error("M-Pesa payout error detected", {
      error: error.message,
      payoutId,
      settlementId,
      context,
    });

    // Dynamic import to avoid circular dependencies
    const { default: AuditTrailService } = await import("./AuditTrailService");

    await AuditTrailService.logAction({
      action: "payout_error",
      resourceType: "commission_payout",
      resourceId: payoutId,
      details: {
        error: error.message,
        settlementId,
        context,
      },
      severity: "critical",
    });

    // Mark payout for manual review by an admin
    try {
      const CommissionPayout = (await import("../models/CommissionPayout"))
        .default;
      await CommissionPayout.update(
        {
          status: "failed",
          failureReason: error.message,
          updatedAt: new Date(),
        },
        {
          where: { id: payoutId },
        }
      );
    } catch (updateError) {
      logger.error("Failed to update payout status after error", {
        error: (updateError as Error).message,
        payoutId,
      });
    }
  }

  /**
   * Validate system health before critical operations
   */
  public async validateSystemHealth(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check database connectivity
      const sequelize = (await import("../config/database")).default;
      await sequelize.authenticate();
    } catch (error) {
      issues.push("Database connectivity issue");
      logger.error("Database health check failed", {
        error: (error as Error).message,
      });
    }

    try {
      // Check if uploads directory exists and is writable
      const fs = await import("fs");
      const path = await import("path");
      const uploadsDir = path.join(process.cwd(), "uploads", "reports");

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Test write permissions
      const testFile = path.join(uploadsDir, ".health_check");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
    } catch (error) {
      issues.push("File system access issue");
      logger.error("File system health check failed", {
        error: (error as Error).message,
      });
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Graceful shutdown handling
   */
  public async handleGracefulShutdown(): Promise<void> {
    logger.info("Initiating graceful shutdown of ErrorRecoveryService");

    // Stop any ongoing retry operations
    // Clear recovery actions
    this.recoveryActions.clear();
    this.retryConfigs.clear();

    logger.info("ErrorRecoveryService shutdown completed");
  }

  /**
   * Notify administrators of critical issues
   */
  private async notifyAdministrators(
    type: string,
    details: any
  ): Promise<void> {
    // Placeholder for notification system
    // Could integrate with email, SMS, Slack, etc.
    logger.info("Administrator notification triggered", {
      type,
      details,
    });

    // Future implementation could include:
    // - Email notifications
    // - SMS alerts
    // - Slack/Teams messages
    // - Dashboard alerts
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default ErrorRecoveryService.getInstance();
