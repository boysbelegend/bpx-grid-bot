/**
 * Email Notification Channel
 * Sends notifications via email using nodemailer
 */

import { NotificationChannel, NotificationMessage } from './NotificationManager';
import nodemailer from 'nodemailer';
import { logger } from '../utils';

export interface EmailConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string[];
}

export class EmailChannel implements NotificationChannel {
  public name = 'email';
  public enabled: boolean;
  private config: EmailConfig;
  private transporter: any;

  constructor(config: EmailConfig, enabled: boolean = true) {
    this.config = config;
    this.enabled = enabled;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || false,
      auth: config.auth,
    });
  }

  public async send(message: NotificationMessage): Promise<boolean> {
    try {
      const subject = \`[\${message.level.toUpperCase()}] \${message.title}\`;
      const html = this.formatHtmlEmail(message);

      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to.join(', '),
        subject,
        html,
      });

      logger.debug(\`Email sent: \${message.title}\`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  private formatHtmlEmail(message: NotificationMessage): string {
    const levelColor = {
      info: '#3498db',
      warning: '#f39c12',
      error: '#e74c3c',
      critical: '#c0392b',
    }[message.level];

    const levelEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    }[message.level];

    let html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: \${levelColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
          <h2 style="margin: 0;">\${levelEmoji} \${message.title}</h2>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
          <p style="font-size: 16px; line-height: 1.6;">\${message.message}</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            <strong>Time:</strong> \${new Date(message.timestamp).toLocaleString()}<br>
            <strong>Level:</strong> \${message.level}
          </p>
    \`;

    if (message.metadata && Object.keys(message.metadata).length > 0) {
      html += \`
          <p style="font-size: 12px; color: #666;">
            <strong>Details:</strong><br>
            <pre style="background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 3px; overflow-x: auto;">\${JSON.stringify(message.metadata, null, 2)}</pre>
          </p>
      \`;
    }

    html += \`
        </div>
      </div>
    \`;

    return html;
  }
}
