# Email Notification System

Automated email notifications for important trading events and performance reports.

## Overview

The email notification system sends real-time alerts and scheduled reports to keep you informed about your trading bot's performance and critical events.

## Features

- **Trade Execution Notifications**: Get notified when trades are executed
- **Risk Alerts**: Immediate alerts for risk thresholds (drawdown, daily loss, etc.)
- **Engine Status Changes**: Notifications when the bot starts, stops, or pauses
- **Scheduled Performance Reports**: Daily, weekly, and monthly performance summaries
- **Rate Limiting**: Prevents email spam with intelligent rate limiting
- **Priority Handling**: Critical alerts bypass rate limits

## Setup

### 1. Configure Email Settings

Copy the example configuration:

```bash
cp config/email.example.json config/email.json
```

### 2. Update Configuration

Edit `config/email.json` with your email provider settings:

```json
{
  "enabled": true,
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "your-email@gmail.com",
    "pass": "your-app-password"
  },
  "from": "BPX Grid Bot <your-email@gmail.com>",
  "to": [
    "recipient@example.com"
  ]
}
```

### Gmail Setup

For Gmail, you need to create an **App Password**:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate a new app password for "Mail"
5. Use this password in the `auth.pass` field

### Other Providers

**Outlook/Hotmail:**
```json
{
  "host": "smtp-mail.outlook.com",
  "port": 587,
  "secure": false
}
```

**Yahoo:**
```json
{
  "host": "smtp.mail.yahoo.com",
  "port": 587,
  "secure": false
}
```

**SendGrid:**
```json
{
  "host": "smtp.sendgrid.net",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "apikey",
    "pass": "your-sendgrid-api-key"
  }
}
```

## Notification Types

### 1. Trade Execution Notifications

Sent when a trade is executed (buy or sell).

**Rate Limit:** 1 email per 5 minutes

**Includes:**
- Symbol
- Side (BUY/SELL)
- Price
- Quantity
- Value
- Fee
- Realized PnL (if applicable)
- Timestamp

**Example:**
```
Subject: 🔔 Trade Executed: BUY SOL_USDC

Symbol: SOL_USDC
Side: BUY
Price: $142.50
Quantity: 0.0500
Value: $7.13
Fee: $0.01
Realized PnL: +$2.50
Time: 11/23/2025, 2:30:45 PM
```

### 2. Risk Alerts

Sent when risk thresholds are breached.

**Types:**
- Drawdown alerts (warning/critical)
- Daily loss limits
- Position size limits
- Liquidation risk (futures)

**Rate Limit:**
- Warning: 1 per 5 minutes
- Critical: No limit (sent immediately)

**Severity Levels:**
- **Warning (⚠️)**: Monitor the situation
- **Critical (🚨)**: Immediate action required

**Example:**
```
Subject: 🚨 Risk Alert: MAX DRAWDOWN

Message: Maximum drawdown exceeded critical threshold

Type: MAX DRAWDOWN
Symbol: SOL_USDC
Current Value: 15.50%
Threshold: 15.00%
Time: 11/23/2025, 2:35:00 PM

Recommended Action: Immediate attention required. Consider stopping the trading engine.
```

### 3. Engine Status Changes

Sent when the trading engine status changes.

**Events:**
- Engine started
- Engine stopped
- Engine paused
- Engine resumed

**Rate Limit:** None

**Example:**
```
Subject: ▶️ Engine STARTED: SOL_USDC

Status: STARTED
Symbol: SOL_USDC
Time: 11/23/2025, 9:00:00 AM
```

### 4. Performance Reports

Scheduled reports with comprehensive trading statistics.

**Frequencies:**
- Daily (default: 9:00 AM)
- Weekly (default: Monday 9:00 AM)
- Monthly (default: 1st of month, 9:00 AM)

**Includes:**
- Total PnL and Net PnL
- ROI (Return on Investment)
- Total Trades
- Win Rate
- Profit Factor
- Sharpe Ratio
- Max Drawdown

**Example:**
```
Subject: 📊 DAILY Performance Report

Period: 11/22/2025 - 11/23/2025

Total PnL: +$125.50
Net PnL (after fees): +$118.25
ROI: +1.18%
Total Trades: 45
Win Rate: 62.22%
Profit Factor: 1.85
Sharpe Ratio: 2.15
Max Drawdown: 3.50%
```

## Configuration Options

### Notification Settings

```json
{
  "notifications": {
    "trades": {
      "enabled": true,
      "rateLimit": 300000
    },
    "riskAlerts": {
      "enabled": true,
      "warningLevel": true,
      "criticalLevel": true
    },
    "engineStatus": {
      "enabled": true,
      "onStart": true,
      "onStop": true,
      "onPause": false,
      "onResume": false
    },
    "performanceReports": {
      "enabled": true,
      "daily": true,
      "weekly": true,
      "monthly": true,
      "schedule": "0 9 * * *"
    }
  }
}
```

### Schedule Configuration

**Daily Report:**
```json
{
  "daily": {
    "enabled": true,
    "time": "09:00"
  }
}
```

**Weekly Report:**
```json
{
  "weekly": {
    "enabled": true,
    "day": 1,
    "time": "09:00"
  }
}
```
- `day`: 0 = Sunday, 1 = Monday, ..., 6 = Saturday

**Monthly Report:**
```json
{
  "monthly": {
    "enabled": true,
    "day": 1,
    "time": "09:00"
  }
}
```
- `day`: 1-31 (day of month)

### Cron Expression Support

You can also use cron expressions for advanced scheduling:

```json
{
  "daily": {
    "enabled": true,
    "time": "0 9 * * *"
  }
}
```

**Common Cron Patterns:**
- `0 9 * * *` - Daily at 9:00 AM
- `0 9 * * 1` - Every Monday at 9:00 AM
- `0 9 1 * *` - 1st of every month at 9:00 AM
- `0 */4 * * *` - Every 4 hours
- `0 9,17 * * *` - Daily at 9:00 AM and 5:00 PM

## Usage

### In Trading Engine

```typescript
import EmailService from './services/EmailService';
import ReportScheduler from './services/ReportScheduler';

// Load configuration
const emailConfig = require('../config/email.json');
const reportConfig = {
  daily: { enabled: true, time: '09:00' },
  weekly: { enabled: true, day: 1, time: '09:00' },
  monthly: { enabled: true, day: 1, time: '09:00' }
};

// Initialize email service
const emailService = new EmailService(emailConfig);

// Test connection (optional)
await emailService.testConnection();

// Initialize report scheduler
const reportScheduler = new ReportScheduler(emailService, reportConfig);
reportScheduler.start();

// Send notifications
await emailService.sendTradeNotification({
  symbol: 'SOL_USDC',
  side: 'buy',
  price: 142.50,
  quantity: 0.05,
  value: 7.125,
  fee: 0.007,
  realizedPnl: 2.50,
  timestamp: new Date().toISOString()
});

await emailService.sendRiskAlert({
  type: 'drawdown',
  severity: 'critical',
  message: 'Maximum drawdown exceeded',
  currentValue: 15.5,
  threshold: 15.0,
  symbol: 'SOL_USDC',
  timestamp: new Date().toISOString()
});

await emailService.sendEngineStatusChange('started', 'SOL_USDC');

// Manually trigger report
await reportScheduler.triggerReport('daily');
```

## Rate Limiting

The email service includes intelligent rate limiting to prevent spam:

- **Trade Notifications**: 1 per 5 minutes
- **Warning Risk Alerts**: 1 per type per 5 minutes
- **Critical Risk Alerts**: No limit (sent immediately)
- **Engine Status**: No limit
- **Scheduled Reports**: As configured

Rate limiting is per notification type, so you can receive:
- 1 trade notification
- Multiple risk alert types
- Unlimited critical alerts
- All in the same 5-minute window

## Testing

### Test Email Configuration

```typescript
const emailService = new EmailService(emailConfig);
const isConnected = await emailService.testConnection();

if (isConnected) {
  console.log('✓ Email service configured correctly');
} else {
  console.error('✗ Email service connection failed');
}
```

### Send Test Notification

```typescript
await emailService.sendTradeNotification({
  symbol: 'TEST_PAIR',
  side: 'buy',
  price: 100,
  quantity: 1,
  value: 100,
  fee: 0.1,
  timestamp: new Date().toISOString()
});
```

## Troubleshooting

### Connection Failed

**Problem:** Email service connection verification fails

**Solutions:**
1. Check your email provider settings (host, port, secure)
2. Verify your username and password
3. For Gmail, ensure you're using an App Password (not your account password)
4. Check firewall/network settings allowing SMTP traffic

### Emails Not Sending

**Problem:** Emails are not being received

**Solutions:**
1. Check spam/junk folder
2. Verify the `to` addresses in configuration
3. Check email service logs for errors
4. Ensure `enabled: true` in configuration
5. Verify notification type is enabled

### Rate Limited

**Problem:** Some notifications are not being sent

**Solution:** This is expected behavior. Check rate limit settings if you want more frequent notifications.

### Gmail "Less Secure App" Error

**Problem:** Gmail blocks login attempts

**Solution:** Use App Passwords instead of your regular password. See Gmail Setup section above.

## Security Best Practices

1. **Never commit** `config/email.json` to version control
2. Use **App Passwords** for Gmail (never use your main password)
3. Use **environment variables** for sensitive data:

```typescript
const emailConfig = {
  enabled: process.env.EMAIL_ENABLED === 'true',
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: process.env.EMAIL_FROM,
  to: process.env.EMAIL_TO?.split(',') || [],
};
```

4. **Restrict** email recipients to trusted addresses only
5. **Use TLS/SSL** when available (secure: true for port 465)

## Dependencies

```json
{
  "nodemailer": "^6.9.8",
  "node-cron": "^3.0.3"
}
```

## License

Same as main project (MIT)
