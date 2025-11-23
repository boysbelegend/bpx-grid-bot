/**
 * Report Scheduler Service
 * Schedules and sends automated performance reports via email
 */

import cron from 'node-cron';
import { logger } from '../utils/logger';
import EmailService, { PerformanceReport } from './EmailService';
import { AnalyticsService } from '../analytics/AnalyticsService';
import Database from '../database/Database';
import { SessionRepository } from '../database/repositories/SessionRepository';

export interface ReportScheduleConfig {
  daily: {
    enabled: boolean;
    time: string; // Cron expression or time like "09:00"
  };
  weekly: {
    enabled: boolean;
    day: number; // 0-6 (Sunday-Saturday)
    time: string;
  };
  monthly: {
    enabled: boolean;
    day: number; // 1-31
    time: string;
  };
}

export class ReportScheduler {
  private emailService: EmailService;
  private analyticsService: AnalyticsService;
  private sessionRepo: SessionRepository;
  private tasks: cron.ScheduledTask[] = [];
  private config: ReportScheduleConfig;

  constructor(emailService: EmailService, config: ReportScheduleConfig) {
    this.emailService = emailService;
    this.config = config;
    this.analyticsService = new AnalyticsService(Database);
    this.sessionRepo = new SessionRepository(Database);
  }

  /**
   * Initialize and start scheduled tasks
   */
  public start(): void {
    logger.info('Starting report scheduler...');

    if (this.config.daily.enabled) {
      this.scheduleDailyReport();
    }

    if (this.config.weekly.enabled) {
      this.scheduleWeeklyReport();
    }

    if (this.config.monthly.enabled) {
      this.scheduleMonthlyReport();
    }

    logger.info('Report scheduler started');
  }

  /**
   * Schedule daily performance report
   */
  private scheduleDailyReport(): void {
    const cronExpression = this.parseCronExpression(this.config.daily.time, 'daily');

    const task = cron.schedule(cronExpression, async () => {
      logger.info('Executing daily report...');
      await this.generateAndSendReport('daily');
    });

    this.tasks.push(task);
    logger.info(`Daily report scheduled: ${cronExpression}`);
  }

  /**
   * Schedule weekly performance report
   */
  private scheduleWeeklyReport(): void {
    const cronExpression = this.parseCronExpression(
      this.config.weekly.time,
      'weekly',
      this.config.weekly.day
    );

    const task = cron.schedule(cronExpression, async () => {
      logger.info('Executing weekly report...');
      await this.generateAndSendReport('weekly');
    });

    this.tasks.push(task);
    logger.info(`Weekly report scheduled: ${cronExpression}`);
  }

  /**
   * Schedule monthly performance report
   */
  private scheduleMonthlyReport(): void {
    const cronExpression = this.parseCronExpression(
      this.config.monthly.time,
      'monthly',
      undefined,
      this.config.monthly.day
    );

    const task = cron.schedule(cronExpression, async () => {
      logger.info('Executing monthly report...');
      await this.generateAndSendReport('monthly');
    });

    this.tasks.push(task);
    logger.info(`Monthly report scheduled: ${cronExpression}`);
  }

  /**
   * Parse cron expression from time string
   */
  private parseCronExpression(
    time: string,
    period: 'daily' | 'weekly' | 'monthly',
    dayOfWeek?: number,
    dayOfMonth?: number
  ): string {
    // If already a cron expression, return it
    if (time.split(' ').length >= 5) {
      return time;
    }

    // Parse time like "09:00" to cron expression
    const [hours, minutes] = time.split(':').map(Number);

    switch (period) {
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        return `${minutes} ${hours} * * ${dayOfWeek}`;
      case 'monthly':
        return `${minutes} ${hours} ${dayOfMonth} * *`;
      default:
        throw new Error(`Invalid period: ${period}`);
    }
  }

  /**
   * Generate and send performance report
   */
  private async generateAndSendReport(period: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    try {
      // Get active session
      const session = await this.sessionRepo.getActive();
      if (!session) {
        logger.warn('No active session found, skipping report');
        return;
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case 'daily':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Generate performance report
      const performanceData = await this.analyticsService.generatePerformanceReport(
        session.session_id
      );

      // Convert to email report format
      const report: PerformanceReport = {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalPnl: performanceData.overview.totalPnl,
        netPnl: performanceData.overview.netPnl,
        totalTrades: performanceData.overview.totalTrades,
        winRate: performanceData.overview.winRate,
        profitFactor: performanceData.overview.profitFactor,
        sharpeRatio: performanceData.overview.sharpeRatio,
        maxDrawdown: performanceData.overview.maxDrawdown,
        roi: performanceData.overview.roi,
      };

      // Send email report
      await this.emailService.sendPerformanceReport(report);

      logger.info(`${period} performance report sent successfully`);
    } catch (error) {
      logger.error(`Failed to generate ${period} report:`, error);
    }
  }

  /**
   * Manually trigger a report
   */
  public async triggerReport(period: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    logger.info(`Manually triggering ${period} report...`);
    await this.generateAndSendReport(period);
  }

  /**
   * Stop all scheduled tasks
   */
  public stop(): void {
    logger.info('Stopping report scheduler...');

    this.tasks.forEach((task) => {
      task.stop();
    });

    this.tasks = [];
    logger.info('Report scheduler stopped');
  }

  /**
   * Get active schedule information
   */
  public getScheduleInfo(): {
    daily: { enabled: boolean; nextRun?: Date };
    weekly: { enabled: boolean; nextRun?: Date };
    monthly: { enabled: boolean; nextRun?: Date };
  } {
    return {
      daily: {
        enabled: this.config.daily.enabled,
      },
      weekly: {
        enabled: this.config.weekly.enabled,
      },
      monthly: {
        enabled: this.config.monthly.enabled,
      },
    };
  }
}

export default ReportScheduler;
