/**
 * Notification Manager
 * Sends trading alerts via Telegram, Discord, and other channels
 */

import axios from 'axios';
import { logger } from '../utils/logger';

export interface NotificationConfig {
  enabled: boolean;
  channels: {
    telegram?: {
      enabled: boolean;
      botToken: string;
      chatId: string;
    };
    discord?: {
      enabled: boolean;
      webhookUrl: string;
    };
  };
  events: {
    trade: boolean;
    risk: boolean;
    error: boolean;
    dailyReport: boolean;
    positionChange: boolean;
    liquidationWarning: boolean;
  };
}

export enum NotificationLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface NotificationMessage {
  level: NotificationLevel;
  title: string;
  message: string;
  timestamp: number;
  data?: any;
}

export class NotificationManager {
  private config: NotificationConfig;
  private enabled: boolean;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.enabled = config.enabled;

    if (this.enabled) {
      this.validateConfig();
      logger.info('NotificationManager initialized');
    } else {
      logger.info('NotificationManager disabled');
    }
  }

  /**
   * Validate notification configuration
   */
  private validateConfig(): void {
    if (this.config.channels.telegram?.enabled) {
      if (!this.config.channels.telegram.botToken || !this.config.channels.telegram.chatId) {
        logger.warn('Telegram enabled but missing botToken or chatId');
        this.config.channels.telegram.enabled = false;
      }
    }

    if (this.config.channels.discord?.enabled) {
      if (!this.config.channels.discord.webhookUrl) {
        logger.warn('Discord enabled but missing webhookUrl');
        this.config.channels.discord.enabled = false;
      }
    }
  }

  /**
   * Send notification to all enabled channels
   */
  async send(notification: NotificationMessage): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const promises: Promise<void>[] = [];

    if (this.config.channels.telegram?.enabled) {
      promises.push(this.sendTelegram(notification));
    }

    if (this.config.channels.discord?.enabled) {
      promises.push(this.sendDiscord(notification));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send trade notification
   */
  async notifyTrade(data: {
    side: 'Buy' | 'Sell';
    price: number;
    quantity: number;
    symbol: string;
    pnl?: number;
  }): Promise<void> {
    if (!this.config.events.trade) {
      return;
    }

    const emoji = data.side === 'Buy' ? '🟢' : '🔴';
    const pnlText = data.pnl !== undefined ? `\n💰 PnL: ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}` : '';

    await this.send({
      level: NotificationLevel.INFO,
      title: `${emoji} ${data.side} Order Filled`,
      message: `Symbol: ${data.symbol}\nPrice: $${data.price.toFixed(2)}\nQuantity: ${data.quantity}${pnlText}`,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Send risk warning notification
   */
  async notifyRiskWarning(data: {
    type: string;
    message: string;
    violations?: string[];
    warnings?: string[];
  }): Promise<void> {
    if (!this.config.events.risk) {
      return;
    }

    const level = data.violations && data.violations.length > 0
      ? NotificationLevel.ERROR
      : NotificationLevel.WARNING;

    let message = data.message;
    if (data.violations && data.violations.length > 0) {
      message += '\n\n⛔ Violations:\n' + data.violations.map(v => `• ${v}`).join('\n');
    }
    if (data.warnings && data.warnings.length > 0) {
      message += '\n\n⚠️ Warnings:\n' + data.warnings.map(w => `• ${w}`).join('\n');
    }

    await this.send({
      level,
      title: '⚠️ Risk Warning',
      message,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Send liquidation warning (futures only)
   */
  async notifyLiquidationWarning(data: {
    symbol: string;
    currentPrice: number;
    liquidationPrice: number;
    distancePercent: number;
    action?: string;
  }): Promise<void> {
    if (!this.config.events.liquidationWarning) {
      return;
    }

    const level = data.distancePercent < 5 ? NotificationLevel.CRITICAL : NotificationLevel.WARNING;

    await this.send({
      level,
      title: '🚨 Liquidation Warning',
      message: `Symbol: ${data.symbol}\nCurrent: $${data.currentPrice.toFixed(2)}\nLiquidation: $${data.liquidationPrice.toFixed(2)}\nDistance: ${data.distancePercent.toFixed(2)}%${data.action ? `\n\n⚡ Action: ${data.action}` : ''}`,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Send error notification
   */
  async notifyError(error: Error, context?: string): Promise<void> {
    if (!this.config.events.error) {
      return;
    }

    await this.send({
      level: NotificationLevel.ERROR,
      title: '❌ Error Occurred',
      message: `${context ? `Context: ${context}\n` : ''}Error: ${error.message}\n\nStack:\n${error.stack?.substring(0, 500)}`,
      timestamp: Date.now(),
      data: { error: error.message, context },
    });
  }

  /**
   * Send daily report
   */
  async notifyDailyReport(data: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalPnl: number;
    winRate: number;
    bestTrade: number;
    worstTrade: number;
  }): Promise<void> {
    if (!this.config.events.dailyReport) {
      return;
    }

    const pnlEmoji = data.totalPnl >= 0 ? '📈' : '📉';
    const pnlSign = data.totalPnl >= 0 ? '+' : '';

    await this.send({
      level: NotificationLevel.INFO,
      title: `${pnlEmoji} Daily Report`,
      message: `Trades: ${data.totalTrades} (${data.winningTrades}W / ${data.losingTrades}L)\nWin Rate: ${(data.winRate * 100).toFixed(1)}%\nTotal PnL: ${pnlSign}$${data.totalPnl.toFixed(2)}\nBest: +$${data.bestTrade.toFixed(2)}\nWorst: -$${Math.abs(data.worstTrade).toFixed(2)}`,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Send position change notification
   */
  async notifyPositionChange(data: {
    symbol: string;
    oldPosition: number;
    newPosition: number;
    reason: string;
  }): Promise<void> {
    if (!this.config.events.positionChange) {
      return;
    }

    const change = newPosition - oldPosition;
    const changeEmoji = change > 0 ? '📊' : '📉';

    await this.send({
      level: NotificationLevel.INFO,
      title: `${changeEmoji} Position Changed`,
      message: `Symbol: ${data.symbol}\nOld: ${oldPosition.toFixed(4)}\nNew: ${newPosition.toFixed(4)}\nChange: ${change >= 0 ? '+' : ''}${change.toFixed(4)}\nReason: ${data.reason}`,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Send notification via Telegram
   */
  private async sendTelegram(notification: NotificationMessage): Promise<void> {
    if (!this.config.channels.telegram?.enabled) {
      return;
    }

    try {
      const { botToken, chatId } = this.config.channels.telegram;
      const levelEmoji = this.getLevelEmoji(notification.level);

      const text = `${levelEmoji} *${notification.title}*\n\n${notification.message}\n\n_${new Date(notification.timestamp).toLocaleString()}_`;

      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      });

      logger.debug({ title: notification.title }, 'Telegram notification sent');
    } catch (error: any) {
      logger.error({ error, notification }, 'Failed to send Telegram notification');
    }
  }

  /**
   * Send notification via Discord
   */
  private async sendDiscord(notification: NotificationMessage): Promise<void> {
    if (!this.config.channels.discord?.enabled) {
      return;
    }

    try {
      const { webhookUrl } = this.config.channels.discord;
      const color = this.getLevelColor(notification.level);

      await axios.post(webhookUrl, {
        embeds: [
          {
            title: notification.title,
            description: notification.message,
            color,
            timestamp: new Date(notification.timestamp).toISOString(),
            footer: {
              text: `BPX Grid Bot • ${notification.level}`,
            },
          },
        ],
      });

      logger.debug({ title: notification.title }, 'Discord notification sent');
    } catch (error: any) {
      logger.error({ error, notification }, 'Failed to send Discord notification');
    }
  }

  /**
   * Get emoji for notification level
   */
  private getLevelEmoji(level: NotificationLevel): string {
    switch (level) {
      case NotificationLevel.INFO:
        return 'ℹ️';
      case NotificationLevel.WARNING:
        return '⚠️';
      case NotificationLevel.ERROR:
        return '❌';
      case NotificationLevel.CRITICAL:
        return '🚨';
      default:
        return '📢';
    }
  }

  /**
   * Get color for Discord embed based on level
   */
  private getLevelColor(level: NotificationLevel): number {
    switch (level) {
      case NotificationLevel.INFO:
        return 0x3498db; // Blue
      case NotificationLevel.WARNING:
        return 0xf39c12; // Orange
      case NotificationLevel.ERROR:
        return 0xe74c3c; // Red
      case NotificationLevel.CRITICAL:
        return 0x992d22; // Dark Red
      default:
        return 0x95a5a6; // Gray
    }
  }

  /**
   * Enable or disable notifications
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info({ enabled }, 'Notifications toggled');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    this.validateConfig();
    logger.info('Notification config updated');
  }
}
