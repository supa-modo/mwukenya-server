import { Transaction, Op } from "sequelize";
import sequelize from "../config/database";
import logger from "../utils/logger";
import {
  AuditLogAttributes,
  AuditLogCreationAttributes,
} from "../models/types";

// Create AuditLog model if it doesn't exist
let AuditLog: any;

try {
  AuditLog = sequelize.models.AuditLog;
} catch (error) {
  // If AuditLog model doesn't exist, create a simple logging mechanism
  console.warn("AuditLog model not found, using logger for audit trail");
}

export interface AuditLogEntry {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export class AuditTrailService {
  /**
   * Log an audit event
   */
  public async logEvent(
    entry: AuditLogEntry,
    transaction?: Transaction
  ): Promise<void> {
    try {
      const auditEntry = {
        ...entry,
        timestamp: new Date(),
      };

      // If AuditLog model exists, use it
      if (AuditLog) {
        // Map AuditLogEntry fields to AuditLog model fields
        const modelEntry = {
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.entityType, // Map entityType to resourceType
          resourceId: entry.entityId, // Map entityId to resourceId
          details: {
            oldValues: entry.oldValues,
            newValues: entry.newValues,
            metadata: entry.metadata,
            sessionId: entry.sessionId,
            requestId: entry.requestId,
            correlationId: entry.correlationId,
          },
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          severity: "info" as const,
        };

        await AuditLog.create(modelEntry, transaction ? { transaction } : {});
      }

      // Always log to application logger as backup
      logger.info("Audit Event:", {
        ...auditEntry,
        level: "audit",
      });
    } catch (error: any) {
      // Audit logging should never fail the main operation
      logger.error("Failed to log audit event:", {
        error: error.message,
        auditEntry: entry,
      });
    }
  }

  /**
   * Log payment creation
   */
  public async logPaymentCreated(
    userId: string,
    paymentId: string,
    paymentData: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: "PAYMENT_CREATED",
      entityType: "Payment",
      entityId: paymentId,
      newValues: paymentData,
      metadata: {
        ...metadata,
        settlementDate: paymentData.settlementDate,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
      },
    });
  }

  /**
   * Log payment completion
   */
  public async logPaymentCompleted(
    userId: string,
    paymentId: string,
    oldStatus: string,
    newStatus: string,
    mpesaData?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: "PAYMENT_COMPLETED",
      entityType: "Payment",
      entityId: paymentId,
      oldValues: { paymentStatus: oldStatus },
      newValues: {
        paymentStatus: newStatus,
        processedAt: new Date(),
        ...mpesaData,
      },
      metadata,
    });
  }

  /**
   * Log payment failure
   */
  public async logPaymentFailed(
    userId: string,
    paymentId: string,
    oldStatus: string,
    failureReason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: "PAYMENT_FAILED",
      entityType: "Payment",
      entityId: paymentId,
      oldValues: { paymentStatus: oldStatus },
      newValues: {
        paymentStatus: "failed",
        failureReason,
      },
      metadata,
    });
  }

  /**
   * Log subscription creation
   */
  public async logSubscriptionCreated(
    userId: string,
    subscriptionId: string,
    subscriptionData: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: "SUBSCRIPTION_CREATED",
      entityType: "MemberSubscription",
      entityId: subscriptionId,
      newValues: subscriptionData,
      metadata: {
        ...metadata,
        schemeId: subscriptionData.schemeId,
        effectiveDate: subscriptionData.effectiveDate,
      },
    });
  }

  /**
   * Log settlement generation
   */
  public async logSettlementGenerated(
    userId: string,
    settlementId: string,
    settlementData: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: "SETTLEMENT_GENERATED",
      entityType: "DailySettlement",
      entityId: settlementId,
      newValues: settlementData,
      metadata: {
        ...metadata,
        settlementDate: settlementData.settlementDate,
        totalCollected: settlementData.totalCollected,
        totalPayments: settlementData.totalPayments,
        uniqueMembers: settlementData.uniqueMembers,
      },
    });
  }

  /**
   * Log settlement processing
   */
  public async logSettlementProcessed(
    userId: string,
    settlementId: string,
    oldStatus: string,
    newStatus: string,
    payoutResults?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: "SETTLEMENT_PROCESSED",
      entityType: "DailySettlement",
      entityId: settlementId,
      oldValues: { status: oldStatus },
      newValues: {
        status: newStatus,
        processedAt: new Date(),
        processedBy: userId,
      },
      metadata: {
        ...metadata,
        payoutResults,
      },
    });
  }

  /**
   * Log commission payout creation
   */
  public async logCommissionPayoutCreated(
    settlementId: string,
    payouts: Array<{
      payoutId: string;
      recipientId: string;
      recipientType: string;
      amount: number;
    }>,
    metadata?: Record<string, any>
  ): Promise<void> {
    for (const payout of payouts) {
      await this.logEvent({
        action: "COMMISSION_PAYOUT_CREATED",
        entityType: "CommissionPayout",
        entityId: payout.payoutId,
        newValues: {
          settlementId,
          recipientId: payout.recipientId,
          recipientType: payout.recipientType,
          amount: payout.amount,
          status: "pending",
        },
        metadata: {
          ...metadata,
          settlementId,
        },
      });
    }
  }

  /**
   * Log commission payout initiation (M-Pesa B2C)
   */
  public async logCommissionPayoutInitiated(
    userId: string,
    payoutId: string,
    recipientId: string,
    amount: number,
    conversationId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: "COMMISSION_PAYOUT_INITIATED",
      entityType: "CommissionPayout",
      entityId: payoutId,
      oldValues: { status: "pending" },
      newValues: {
        conversationId,
        paymentMethod: "mpesa",
        status: "processing",
      },
      metadata: {
        ...metadata,
        recipientId,
        amount,
        conversationId,
      },
    });
  }

  /**
   * Log commission payout completion
   */
  public async logCommissionPayoutCompleted(
    payoutId: string,
    recipientId: string,
    amount: number,
    transactionId: string,
    transactionReceipt: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action: "COMMISSION_PAYOUT_COMPLETED",
      entityType: "CommissionPayout",
      entityId: payoutId,
      oldValues: { status: "processing" },
      newValues: {
        status: "processed",
        processedAt: new Date(),
        transactionReference: transactionReceipt,
      },
      metadata: {
        ...metadata,
        recipientId,
        amount,
        transactionId,
        transactionReceipt,
      },
    });
  }

  /**
   * Log commission payout failure
   */
  public async logCommissionPayoutFailed(
    payoutId: string,
    recipientId: string,
    amount: number,
    failureReason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action: "COMMISSION_PAYOUT_FAILED",
      entityType: "CommissionPayout",
      entityId: payoutId,
      oldValues: { status: "processing" },
      newValues: {
        status: "failed",
        failureReason,
      },
      metadata: {
        ...metadata,
        recipientId,
        amount,
        failureReason,
      },
    });
  }

  /**
   * Log system event
   */
  public async logSystemEvent(
    action: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action,
      entityType: "System",
      metadata: {
        ...metadata,
        description,
      },
    });
  }

  /**
   * Log user authentication
   */
  public async logUserAuthentication(
    userId: string,
    action: "LOGIN" | "LOGOUT" | "LOGIN_FAILED",
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: `USER_${action}`,
      entityType: "User",
      entityId: userId,
      ipAddress,
      userAgent,
      metadata,
    });
  }

  /**
   * Log admin action
   */
  public async logAdminAction(
    adminUserId: string,
    action: string,
    targetEntityType: string,
    targetEntityId: string,
    changes?: {
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
    },
    ipAddress?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId: adminUserId,
      action: `ADMIN_${action}`,
      entityType: targetEntityType,
      entityId: targetEntityId,
      oldValues: changes?.oldValues,
      newValues: changes?.newValues,
      ipAddress,
      metadata,
    });
  }

  /**
   * Get audit trail for an entity
   */
  public async getAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      if (AuditLog) {
        const logs = await AuditLog.findAll({
          where: {
            entityType,
            entityId,
          },
          order: [["timestamp", "DESC"]],
          limit,
        });

        return logs.map((log: any) => ({
          userId: log.userId,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          oldValues: log.oldValues,
          newValues: log.newValues,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          timestamp: log.timestamp,
          metadata: log.metadata,
        }));
      }

      // If no database model, return empty array
      return [];
    } catch (error: any) {
      logger.error("Failed to get audit trail:", error);
      return [];
    }
  }

  /**
   * Get audit trail for a user
   */
  public async getUserAuditTrail(
    userId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      if (AuditLog) {
        const logs = await AuditLog.findAll({
          where: {
            userId,
          },
          order: [["timestamp", "DESC"]],
          limit,
        });

        return logs.map((log: any) => ({
          userId: log.userId,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          oldValues: log.oldValues,
          newValues: log.newValues,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          timestamp: log.timestamp,
          metadata: log.metadata,
        }));
      }

      return [];
    } catch (error: any) {
      logger.error("Failed to get user audit trail:", error);
      return [];
    }
  }

  /**
   * Generate audit report for a date range
   */
  public async generateAuditReport(
    startDate: Date,
    endDate: Date,
    entityType?: string,
    actions?: string[]
  ): Promise<{
    totalEvents: number;
    events: AuditLogEntry[];
    summary: Record<string, number>;
  }> {
    try {
      if (!AuditLog) {
        return {
          totalEvents: 0,
          events: [],
          summary: {},
        };
      }

      const whereClause: any = {
        timestamp: {
          [Op.between]: [startDate, endDate],
        },
      };

      if (entityType) {
        whereClause.entityType = entityType;
      }

      if (actions && actions.length > 0) {
        whereClause.action = {
          [Op.in]: actions,
        };
      }

      const logs = await AuditLog.findAll({
        where: whereClause,
        order: [["timestamp", "DESC"]],
      });

      const events = logs.map((log: any) => ({
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        metadata: log.metadata,
      }));

      // Generate summary
      const summary: Record<string, number> = {};
      events.forEach((event: AuditLogEntry) => {
        summary[event.action] = (summary[event.action] || 0) + 1;
      });

      return {
        totalEvents: events.length,
        events,
        summary,
      };
    } catch (error: any) {
      logger.error("Failed to generate audit report:", error);
      return {
        totalEvents: 0,
        events: [],
        summary: {},
      };
    }
  }

  /**
   * Generic log action method for compatibility
   */
  public async logAction(params: {
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: any;
    severity?: "info" | "warning" | "error" | "critical";
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.logEvent({
      userId: params.userId,
      action: params.action,
      entityType: params.resourceType,
      entityId: params.resourceId,
      metadata: {
        details: params.details,
        severity: params.severity || "info",
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }
}

export default new AuditTrailService();
