import * as cron from "node-cron";
import { format, subDays } from "date-fns";
import logger from "../utils/logger";
import ErrorRecoveryService from "./ErrorRecoveryService";
import SettlementService from "./SettlementService";

export class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all scheduled jobs
   */
  public initializeScheduledJobs(): void {
    try {
      // Schedule daily settlement generation at 11:55 PM
      this.scheduleDailySettlementGeneration();

      // Schedule daily report generation at 12:30 AM (after settlement processing)
      this.scheduleDailyReportGeneration();

      // Schedule weekly report cleanup at 2:00 AM on Sundays
      this.scheduleReportCleanup();

      logger.info("All scheduled jobs initialized successfully");
    } catch (error: any) {
      logger.error("Failed to initialize scheduled jobs:", error);
    }
  }

  /**
   * Schedule daily settlement generation at 11:55 PM
   */
  private scheduleDailySettlementGeneration(): void {
    const jobName = "dailySettlementGeneration";

    // Run at 11:55 PM every day
    const task = cron.schedule(
      "55 23 * * *",
      async () => {
        const today = new Date();
        const settlementDate = format(today, "yyyy-MM-dd");

        logger.info("Starting scheduled daily settlement generation", {
          settlementDate,
          scheduledAt: new Date().toISOString(),
        });

        try {
          const settlement = await ErrorRecoveryService.executeWithRecovery(
            "settlement_generation",
            async () => {
              return await SettlementService.generateDailySettlement(today);
            },
            { settlementDate, scheduledExecution: true }
          );

          logger.info("Scheduled daily settlement generated successfully", {
            settlementId: settlement.id,
            settlementDate: settlement.settlementDate,
            totalCollected: settlement.totalCollected,
            totalPayments: settlement.totalPayments,
          });

          // Auto-process the settlement if configured to do so
          // This could be made configurable via environment variables
          if (process.env.AUTO_PROCESS_SETTLEMENTS === "true") {
            try {
              const result = await SettlementService.processSettlement(
                settlement.id,
                "system", // system user ID for automated processing
                true // initiate payouts
              );

              logger.info("Settlement auto-processed successfully", {
                settlementId: settlement.id,
                result,
              });
            } catch (processError: any) {
              logger.error("Failed to auto-process settlement:", {
                settlementId: settlement.id,
                error: processError.message,
              });
            }
          }
        } catch (error: any) {
          logger.error("Failed to generate scheduled daily settlement:", {
            settlementDate,
            error: error.message,
            stack: error.stack,
          });
        }
      },
      {
        scheduled: false, // Don't start immediately
        timezone: process.env.TZ || "Africa/Nairobi", // Kenya timezone
      }
    );

    this.jobs.set(jobName, task);
    task.start();

    logger.info("Daily settlement generation job scheduled", {
      jobName,
      schedule: "55 23 * * *", // 11:55 PM daily
      timezone: process.env.TZ || "Africa/Nairobi",
    });
  }

  /**
   * Schedule daily report generation at 12:30 AM
   */
  private scheduleDailyReportGeneration(): void {
    const jobName = "dailyReportGeneration";

    // Run at 12:30 AM every day (after settlement processing)
    const task = cron.schedule(
      "30 0 * * *",
      async () => {
        const yesterday = subDays(new Date(), 1);
        const reportDate = format(yesterday, "yyyy-MM-dd");

        logger.info("Starting scheduled daily report generation", {
          reportDate,
          scheduledAt: new Date().toISOString(),
        });

        try {
          const { default: ReportGenerationService } = await import(
            "./ReportGenerationService"
          );
          await ReportGenerationService.generateAutomatedDailyReport(yesterday);

          logger.info("Scheduled daily report generated successfully", {
            reportDate,
          });
        } catch (error: any) {
          logger.error("Failed to generate scheduled daily report:", {
            reportDate,
            error: error.message,
            stack: error.stack,
          });
        }
      },
      {
        scheduled: false,
        timezone: process.env.TZ || "Africa/Nairobi",
      }
    );

    this.jobs.set(jobName, task);
    task.start();

    logger.info("Daily report generation job scheduled", {
      jobName,
      schedule: "30 0 * * *", // 12:30 AM daily
      timezone: process.env.TZ || "Africa/Nairobi",
    });
  }

  /**
   * Schedule weekly report cleanup at 2:00 AM on Sundays
   */
  private scheduleReportCleanup(): void {
    const jobName = "weeklyReportCleanup";

    // Run at 2:00 AM every Sunday
    const task = cron.schedule(
      "0 2 * * 0",
      async () => {
        logger.info("Starting scheduled report cleanup", {
          scheduledAt: new Date().toISOString(),
        });

        try {
          const { default: ReportGenerationService } = await import(
            "./ReportGenerationService"
          );
          const daysToKeep = parseInt(
            process.env.REPORT_RETENTION_DAYS || "30"
          );

          ReportGenerationService.cleanupOldReports(daysToKeep);

          logger.info("Scheduled report cleanup completed successfully", {
            daysToKeep,
          });
        } catch (error: any) {
          logger.error("Failed to perform scheduled report cleanup:", {
            error: error.message,
            stack: error.stack,
          });
        }
      },
      {
        scheduled: false,
        timezone: process.env.TZ || "Africa/Nairobi",
      }
    );

    this.jobs.set(jobName, task);
    task.start();

    logger.info("Weekly report cleanup job scheduled", {
      jobName,
      schedule: "0 2 * * 0", // 2:00 AM every Sunday
      timezone: process.env.TZ || "Africa/Nairobi",
    });
  }

  /**
   * Schedule monthly settlement summary report generation
   */
  public scheduleMonthlyReportGeneration(): void {
    const jobName = "monthlyReportGeneration";

    // Run at 3:00 AM on the 1st of every month
    const task = cron.schedule(
      "0 3 1 * *",
      async () => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = lastMonth.getFullYear();
        const month = lastMonth.getMonth() + 1;

        logger.info("Starting scheduled monthly report generation", {
          year,
          month,
          scheduledAt: new Date().toISOString(),
        });

        try {
          const { default: ReportGenerationService } = await import(
            "./ReportGenerationService"
          );
          const result =
            await ReportGenerationService.generateMonthlySettlementReport(
              year,
              month
            );

          if (result.success) {
            logger.info("Scheduled monthly report generated successfully", {
              year,
              month,
              fileName: result.fileName,
            });
          } else {
            logger.warn("Failed to generate scheduled monthly report:", {
              year,
              month,
              error: result.error,
            });
          }
        } catch (error: any) {
          logger.error("Failed to generate scheduled monthly report:", {
            year,
            month,
            error: error.message,
            stack: error.stack,
          });
        }
      },
      {
        scheduled: false,
        timezone: process.env.TZ || "Africa/Nairobi",
      }
    );

    this.jobs.set(jobName, task);
    task.start();

    logger.info("Monthly report generation job scheduled", {
      jobName,
      schedule: "0 3 1 * *", // 3:00 AM on 1st of every month
      timezone: process.env.TZ || "Africa/Nairobi",
    });
  }

  /**
   * Start a specific job by name
   */
  public startJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      logger.info(`Job started: ${jobName}`);
      return true;
    }
    logger.warn(`Job not found: ${jobName}`);
    return false;
  }

  /**
   * Stop a specific job by name
   */
  public stopJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      logger.info(`Job stopped: ${jobName}`);
      return true;
    }
    logger.warn(`Job not found: ${jobName}`);
    return false;
  }

  /**
   * Get status of all scheduled jobs
   */
  public getJobStatus(): Array<{
    name: string;
    running: boolean;
    schedule?: string;
  }> {
    const status: Array<{ name: string; running: boolean; schedule?: string }> =
      [];

    const jobSchedules = {
      dailySettlementGeneration: "55 23 * * *",
      dailyReportGeneration: "30 0 * * *",
      weeklyReportCleanup: "0 2 * * 0",
      monthlyReportGeneration: "0 3 1 * *",
    };

    this.jobs.forEach((job, name) => {
      // Note: node-cron doesn't expose getStatus method, so we track running state manually
      status.push({
        name,
        running: true, // Assume running if job exists in map
        schedule: jobSchedules[name as keyof typeof jobSchedules],
      });
    });

    return status;
  }

  /**
   * Stop all scheduled jobs
   */
  public stopAllJobs(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Job stopped: ${name}`);
    });
    logger.info("All scheduled jobs stopped");
  }

  /**
   * Start all scheduled jobs
   */
  public startAllJobs(): void {
    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`Job started: ${name}`);
    });
    logger.info("All scheduled jobs started");
  }

  /**
   * Destroy all jobs and clear the jobs map
   */
  public destroy(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Job stopped and removed: ${name}`);
    });
    this.jobs.clear();
    logger.info("Scheduler service destroyed");
  }

  /**
   * Trigger a manual settlement generation (for testing/admin use)
   */
  public async triggerManualSettlement(date?: Date): Promise<void> {
    const settlementDate = date || new Date();

    logger.info("Manual settlement generation triggered", {
      settlementDate: format(settlementDate, "yyyy-MM-dd"),
      triggeredAt: new Date().toISOString(),
    });

    try {
      const settlement = await ErrorRecoveryService.executeWithRecovery(
        "settlement_generation",
        async () => {
          return await SettlementService.generateDailySettlement(
            settlementDate
          );
        },
        {
          settlementDate: format(settlementDate, "yyyy-MM-dd"),
          manualExecution: true,
        }
      );

      logger.info("Manual settlement generated successfully", {
        settlementId: settlement.id,
        settlementDate: settlement.settlementDate,
        totalCollected: settlement.totalCollected,
        totalPayments: settlement.totalPayments,
      });
    } catch (error: any) {
      logger.error("Failed to generate manual settlement:", {
        settlementDate: format(settlementDate, "yyyy-MM-dd"),
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Trigger manual report generation (for testing/admin use)
   */
  public async triggerManualReport(date?: Date): Promise<void> {
    const reportDate = date || subDays(new Date(), 1);

    logger.info("Manual report generation triggered", {
      reportDate: format(reportDate, "yyyy-MM-dd"),
      triggeredAt: new Date().toISOString(),
    });

    try {
      const { default: ReportGenerationService } = await import(
        "./ReportGenerationService"
      );
      await ReportGenerationService.generateAutomatedDailyReport(reportDate);

      logger.info("Manual report generated successfully", {
        reportDate: format(reportDate, "yyyy-MM-dd"),
      });
    } catch (error: any) {
      logger.error("Failed to generate manual report:", {
        reportDate: format(reportDate, "yyyy-MM-dd"),
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

export default new SchedulerService();
