/**
 * Push Notification Service
 * Handles local and remote notifications
 */

import notifee, {AndroidImportance} from '@notifee/react-native';

export class NotificationService {
  private static channelId: string = 'trading-alerts';

  public static async initialize() {
    // Request permissions
    await notifee.requestPermission();

    // Create notification channel (Android)
    await notifee.createChannel({
      id: this.channelId,
      name: 'Trading Alerts',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  public static async showTradeNotification(data: {
    side: string;
    price: number;
    quantity: number;
    symbol: string;
    pnl?: number;
  }) {
    const emoji = data.side === 'buy' ? '🟢' : '🔴';
    const pnlText = data.pnl
      ? `\nPnL: ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}`
      : '';

    await notifee.displayNotification({
      title: `${emoji} ${data.side.toUpperCase()} ${data.symbol}`,
      body: `Price: $${data.price.toFixed(2)}\nQty: ${data.quantity.toFixed(4)}${pnlText}`,
      android: {
        channelId: this.channelId,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_notification',
        color: data.side === 'buy' ? '#4CAF50' : '#F44336',
      },
      ios: {
        sound: 'default',
      },
    });
  }

  public static async showRiskAlert(data: {
    type: string;
    message: string;
    severity: 'warning' | 'critical';
  }) {
    const emoji = data.severity === 'critical' ? '🚨' : '⚠️';

    await notifee.displayNotification({
      title: `${emoji} Risk Alert`,
      body: `${data.type}\n${data.message}`,
      android: {
        channelId: this.channelId,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_notification',
        color: data.severity === 'critical' ? '#F44336' : '#FF9800',
      },
      ios: {
        sound: 'default',
        critical: data.severity === 'critical',
      },
    });
  }

  public static async showPnLUpdate(data: {
    totalPnl: number;
    dailyPnl: number;
    roi: number;
  }) {
    const emoji = data.totalPnl >= 0 ? '📈' : '📉';

    await notifee.displayNotification({
      title: `${emoji} PnL Update`,
      body: `Total: $${data.totalPnl.toFixed(2)} (${data.roi.toFixed(2)}%)\nDaily: $${data.dailyPnl.toFixed(2)}`,
      android: {
        channelId: this.channelId,
        importance: AndroidImportance.DEFAULT,
        smallIcon: 'ic_notification',
        color: data.totalPnl >= 0 ? '#4CAF50' : '#F44336',
      },
    });
  }

  public static async showEngineStatusChange(data: {
    status: string;
    symbol?: string;
  }) {
    const statusEmoji: Record<string, string> = {
      running: '▶️',
      paused: '⏸️',
      stopped: '⏹️',
    };

    await notifee.displayNotification({
      title: `${statusEmoji[data.status] || '🤖'} Engine ${data.status}`,
      body: data.symbol ? `Trading ${data.symbol}` : 'Status changed',
      android: {
        channelId: this.channelId,
        importance: AndroidImportance.DEFAULT,
        smallIcon: 'ic_notification',
      },
    });
  }
}
