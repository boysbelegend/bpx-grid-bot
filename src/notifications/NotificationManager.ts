/**
 * Notification Manager
 * Unified notification system supporting multiple channels
 */

import { logger } from '../utils';

export type NotificationLevel = 'info' | 'warning' | 'error' | 'critical';

export interface NotificationMessage {
  title: string;
  message: string;
  level: NotificationLevel;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface NotificationChannel {
  name: string;
  enabled: boolean;
  send(message: NotificationMessage): Promise<boolean>;
}

export interface NotificationConfig {
  enabledChannels: string[];
  minLevel?: NotificationLevel;
  rateLimit?: {
    maxPerHour?: number;
    maxPerDay?: number;
  };
  quietHours?: {
    start: number;
    end: number;
    timezone?: string;
  };
}

export class NotificationManager {
  private channels: Map<string, NotificationChannel> = new Map();
  private config: NotificationConfig;
  private sentCount: { hourly: number; daily: number } = { hourly: 0, daily: 0 };
  private lastResetTime: { hour: number; day: number };

  private readonly LEVEL_PRIORITY: Record<NotificationLevel, number> = {
    info: 0,
    warning: 1,
    error: 2,
    critical: 3,
  };

  constructor(config: NotificationConfig) {
    this.config = config;
    const now = Date.now();
    this.lastResetTime = { hour: now, day: now };
  }

  public registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.name, channel);
    logger.info(\`Notification channel registered: \${channel.name}\`);
  }

  public async notify(
    title: string,
    message: string,
    level: NotificationLevel = 'info',
    metadata?: Record<string, any>
  ): Promise<void> {
    const notification: NotificationMessage = {
      title,
      message,
      level,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.shouldSendNotification(notification)) {
      logger.debug(\`Notification skipped: \${title}\`, { level, reason: 'filtered' });
      return;
    }

    this.updateRateLimitCounters();
    this.sentCount.hourly++;
    this.sentCount.daily++;

    const enabledChannels = Array.from(this.channels.values()).filter(
      (channel) => channel.enabled && this.config.enabledChannels.includes(channel.name)
    );

    if (enabledChannels.length === 0) {
      logger.warn('No enabled notification channels');
      return;
    }

    await Promise.allSettled(
      enabledChannels.map((channel) => channel.send(notification))
    );
  }

  public async info(title: string, message: string, metadata?: Record<string, any>): Promise<void> {
    await this.notify(title, message, 'info', metadata);
  }

  public async warning(title: string, message: string, metadata?: Record<string, any>): Promise<void> {
    await this.notify(title, message, 'warning', metadata);
  }

  public async error(title: string, message: string, metadata?: Record<string, any>): Promise<void> {
    await this.notify(title, message, 'error', metadata);
  }

  public async critical(title: string, message: string, metadata?: Record<string, any>): Promise<void> {
    await this.notify(title, message, 'critical', metadata);
  }

  public getStats(): { hourly: number; daily: number; channels: string[] } {
    this.updateRateLimitCounters();
    return {
      hourly: this.sentCount.hourly,
      daily: this.sentCount.daily,
      channels: Array.from(this.channels.keys()),
    };
  }

  private shouldSendNotification(notification: NotificationMessage): boolean {
    const minLevel = this.config.minLevel || 'info';
    if (this.LEVEL_PRIORITY[notification.level] < this.LEVEL_PRIORITY[minLevel]) {
      return false;
    }

    if (notification.level !== 'critical') {
      this.updateRateLimitCounters();

      if (this.config.rateLimit?.maxPerHour && this.sentCount.hourly >= this.config.rateLimit.maxPerHour) {
        return false;
      }

      if (this.config.rateLimit?.maxPerDay && this.sentCount.daily >= this.config.rateLimit.maxPerDay) {
        return false;
      }
    }

    return true;
  }

  private updateRateLimitCounters(): void {
    const now = Date.now();
    const HOUR_MS = 60 * 60 * 1000;
    const DAY_MS = 24 * HOUR_MS;

    if (now - this.lastResetTime.hour >= HOUR_MS) {
      this.sentCount.hourly = 0;
      this.lastResetTime.hour = now;
    }

    if (now - this.lastResetTime.day >= DAY_MS) {
      this.sentCount.daily = 0;
      this.lastResetTime.day = now;
    }
  }
}
