/**
 * Discord Notification Channel
 * Sends notifications via Discord webhook
 */

import { NotificationChannel, NotificationMessage } from './NotificationManager';
import axios from 'axios';
import { logger } from '../utils';

export interface DiscordConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

export class DiscordChannel implements NotificationChannel {
  public name = 'discord';
  public enabled: boolean;
  private config: DiscordConfig;

  constructor(config: DiscordConfig, enabled: boolean = true) {
    this.config = config;
    this.enabled = enabled;
  }

  public async send(message: NotificationMessage): Promise<boolean> {
    try {
      const embed = this.formatDiscordEmbed(message);

      await axios.post(this.config.webhookUrl, {
        username: this.config.username || 'BPX Grid Bot',
        avatar_url: this.config.avatarUrl,
        embeds: [embed],
      });

      logger.debug(\`Discord notification sent: \${message.title}\`);
      return true;
    } catch (error) {
      logger.error('Failed to send Discord notification:', error);
      return false;
    }
  }

  private formatDiscordEmbed(message: NotificationMessage): any {
    const levelColor = {
      info: 0x3498db,      // Blue
      warning: 0xf39c12,   // Orange
      error: 0xe74c3c,     // Red
      critical: 0xc0392b,  // Dark red
    }[message.level];

    const levelEmoji = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      critical: ':rotating_light:',
    }[message.level];

    const embed: any = {
      title: \`\${levelEmoji} \${message.title}\`,
      description: message.message,
      color: levelColor,
      timestamp: new Date(message.timestamp).toISOString(),
      footer: {
        text: \`BPX Grid Bot • \${message.level.toUpperCase()}\`,
      },
    };

    // Add metadata as fields
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      embed.fields = Object.entries(message.metadata)
        .slice(0, 10) // Discord limit: 25 fields max, we'll use 10 for safety
        .map(([key, value]) => ({
          name: key,
          value: String(value),
          inline: true,
        }));
    }

    return embed;
  }
}
