/**
 * Email Notification Service
 * Sends email notifications for important trading events
 */

import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string[];
}

export interface TradeNotification {
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  value: number;
  fee: number;
  realizedPnl?: number;
  timestamp: string;
}

export interface RiskAlert {
  type: 'drawdown' | 'daily_loss' | 'position_limit' | 'liquidation_risk';
  severity: 'warning' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  symbol: string;
  timestamp: string;
}

export interface PerformanceReport {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  totalPnl: number;
  netPnl: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  roi: number;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig;
  private rateLimitMap: Map<string, number> = new Map();
  private readonly RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes

  constructor(config: EmailConfig) {
    this.config = config;
    if (config.enabled) {
      this.initialize();
    }
  }

  private initialize(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
      });

      logger.info('Email service initialized');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Check rate limiting for specific notification type
   */
  private isRateLimited(notificationType: string): boolean {
    const lastSent = this.rateLimitMap.get(notificationType);
    if (!lastSent) return false;

    const timeSinceLastSent = Date.now() - lastSent;
    return timeSinceLastSent < this.RATE_LIMIT_WINDOW;
  }

  /**
   * Update rate limit timestamp
   */
  private updateRateLimit(notificationType: string): void {
    this.rateLimitMap.set(notificationType, Date.now());
  }

  /**
   * Send trade execution notification
   */
  public async sendTradeNotification(trade: TradeNotification): Promise<void> {
    if (!this.config.enabled || !this.transporter) return;

    // Rate limit trade notifications (max 1 per 5 minutes)
    if (this.isRateLimited('trade')) {
      logger.debug('Trade notification rate limited');
      return;
    }

    try {
      const subject = `🔔 Trade Executed: ${trade.side.toUpperCase()} ${trade.symbol}`;

      const html = `
        <h2>Trade Execution Notification</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Symbol:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${trade.symbol}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Side:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; color: ${trade.side === 'buy' ? 'green' : 'red'}">${trade.side.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Price:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">$${trade.price.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Quantity:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${trade.quantity.toFixed(4)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Value:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">$${trade.value.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Fee:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">$${trade.fee.toFixed(2)}</td>
          </tr>
          ${trade.realizedPnl !== undefined ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Realized PnL:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; color: ${trade.realizedPnl >= 0 ? 'green' : 'red'}">
              ${trade.realizedPnl >= 0 ? '+' : ''}$${trade.realizedPnl.toFixed(2)}
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(trade.timestamp).toLocaleString()}</td>
          </tr>
        </table>
      `;

      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to,
        subject,
        html,
      });

      this.updateRateLimit('trade');
      logger.info(`Trade notification email sent for ${trade.symbol}`);
    } catch (error) {
      logger.error('Failed to send trade notification email:', error);
    }
  }

  /**
   * Send risk alert notification
   */
  public async sendRiskAlert(alert: RiskAlert): Promise<void> {
    if (!this.config.enabled || !this.transporter) return;

    // Don't rate limit critical alerts
    if (alert.severity !== 'critical' && this.isRateLimited(`risk_${alert.type}`)) {
      logger.debug(`Risk alert ${alert.type} rate limited`);
      return;
    }

    try {
      const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
      const subject = `${emoji} Risk Alert: ${alert.type.replace('_', ' ').toUpperCase()}`;

      const html = `
        <h2 style="color: ${alert.severity === 'critical' ? 'red' : 'orange'}">
          ${emoji} Risk Alert - ${alert.severity.toUpperCase()}
        </h2>
        <p><strong>Message:</strong> ${alert.message}</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Type:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${alert.type.replace('_', ' ').toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Symbol:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${alert.symbol}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Current Value:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; color: red;">${alert.currentValue.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Threshold:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${alert.threshold.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(alert.timestamp).toLocaleString()}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">
          <strong>Recommended Action:</strong>
          ${alert.severity === 'critical'
            ? 'Immediate attention required. Consider stopping the trading engine.'
            : 'Monitor the situation closely.'}
        </p>
      `;

      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to,
        subject,
        html,
        priority: alert.severity === 'critical' ? 'high' : 'normal',
      });

      if (alert.severity !== 'critical') {
        this.updateRateLimit(`risk_${alert.type}`);
      }

      logger.info(`Risk alert email sent: ${alert.type} (${alert.severity})`);
    } catch (error) {
      logger.error('Failed to send risk alert email:', error);
    }
  }

  /**
   * Send engine status change notification
   */
  public async sendEngineStatusChange(
    status: 'started' | 'stopped' | 'paused' | 'resumed',
    symbol: string,
    message?: string
  ): Promise<void> {
    if (!this.config.enabled || !this.transporter) return;

    try {
      const statusEmojis = {
        started: '▶️',
        stopped: '⏹️',
        paused: '⏸️',
        resumed: '▶️',
      };

      const subject = `${statusEmojis[status]} Engine ${status.toUpperCase()}: ${symbol}`;

      const html = `
        <h2>Trading Engine Status Change</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${status.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Symbol:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${symbol}</td>
          </tr>
          ${message ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Message:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${message}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      `;

      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to,
        subject,
        html,
      });

      logger.info(`Engine status change email sent: ${status}`);
    } catch (error) {
      logger.error('Failed to send engine status change email:', error);
    }
  }

  /**
   * Send performance report
   */
  public async sendPerformanceReport(report: PerformanceReport): Promise<void> {
    if (!this.config.enabled || !this.transporter) return;

    try {
      const subject = `📊 ${report.period.toUpperCase()} Performance Report`;

      const pnlColor = report.netPnl >= 0 ? 'green' : 'red';
      const pnlSign = report.netPnl >= 0 ? '+' : '';

      const html = `
        <h2>Performance Report - ${report.period.toUpperCase()}</h2>
        <p><strong>Period:</strong> ${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}</p>

        <h3>Summary</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total PnL:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; color: ${pnlColor}; font-size: 18px; font-weight: bold;">
              ${pnlSign}$${report.totalPnl.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Net PnL (after fees):</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; color: ${pnlColor}; font-weight: bold;">
              ${pnlSign}$${report.netPnl.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>ROI:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${pnlSign}${report.roi.toFixed(2)}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Trades:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${report.totalTrades}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Win Rate:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${report.winRate.toFixed(2)}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Profit Factor:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${report.profitFactor.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Sharpe Ratio:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${report.sharpeRatio.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Max Drawdown:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; color: red;">${report.maxDrawdown.toFixed(2)}%</td>
          </tr>
        </table>
      `;

      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to,
        subject,
        html,
      });

      logger.info(`Performance report email sent: ${report.period}`);
    } catch (error) {
      logger.error('Failed to send performance report email:', error);
    }
  }

  /**
   * Test email configuration
   */
  public async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      logger.error('Email transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

export default EmailService;
