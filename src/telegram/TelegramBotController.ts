/**
 * Telegram Bot Command Handler
 * Handles interactive bot commands for remote control
 */

import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../utils/logger';
import { TradingEngine } from '../engine/TradingEngine';
import { MultiPairManager } from '../engine/MultiPairManager';

export interface TelegramBotConfig {
  enabled: boolean;
  botToken: string;
  allowedChatIds: number[]; // Only these chat IDs can control the bot
  commands: {
    status: boolean;
    pnl: boolean;
    position: boolean;
    orders: boolean;
    risk: boolean;
    start: boolean;
    stop: boolean;
    pause: boolean;
    resume: boolean;
    help: boolean;
  };
}

export class TelegramBotController {
  private bot: TelegramBot | null = null;
  private config: TelegramBotConfig;
  private engine: TradingEngine | null = null;
  private multiPairManager: MultiPairManager | null = null;

  constructor(config: TelegramBotConfig) {
    this.config = config;

    if (this.config.enabled) {
      this.initializeBot();
    } else {
      logger.info('Telegram bot controller disabled');
    }
  }

  /**
   * Initialize Telegram bot
   */
  private initializeBot(): void {
    try {
      this.bot = new TelegramBot(this.config.botToken, { polling: true });

      // Register command handlers
      this.registerCommands();

      logger.info('Telegram bot controller initialized');
    } catch (error: any) {
      logger.error({ error }, 'Failed to initialize Telegram bot');
    }
  }

  /**
   * Register command handlers
   */
  private registerCommands(): void {
    if (!this.bot) return;

    // Help command
    if (this.config.commands.help) {
      this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
      this.bot.onText(/\/start/, (msg) => this.handleHelp(msg));
    }

    // Status command
    if (this.config.commands.status) {
      this.bot.onText(/\/status/, (msg) => this.handleStatus(msg));
    }

    // PnL command
    if (this.config.commands.pnl) {
      this.bot.onText(/\/pnl/, (msg) => this.handlePnL(msg));
    }

    // Position command
    if (this.config.commands.position) {
      this.bot.onText(/\/position/, (msg) => this.handlePosition(msg));
    }

    // Orders command
    if (this.config.commands.orders) {
      this.bot.onText(/\/orders/, (msg) => this.handleOrders(msg));
    }

    // Risk command
    if (this.config.commands.risk) {
      this.bot.onText(/\/risk/, (msg) => this.handleRisk(msg));
    }

    // Control commands
    if (this.config.commands.stop) {
      this.bot.onText(/\/stop/, (msg) => this.handleStop(msg));
    }

    if (this.config.commands.pause) {
      this.bot.onText(/\/pause/, (msg) => this.handlePause(msg));
    }

    if (this.config.commands.resume) {
      this.bot.onText(/\/resume/, (msg) => this.handleResume(msg));
    }

    logger.info('Telegram bot commands registered');
  }

  /**
   * Set trading engine reference
   */
  setEngine(engine: TradingEngine): void {
    this.engine = engine;
    logger.info('Trading engine set for Telegram bot');
  }

  /**
   * Set multi-pair manager reference
   */
  setMultiPairManager(manager: MultiPairManager): void {
    this.multiPairManager = manager;
    logger.info('Multi-pair manager set for Telegram bot');
  }

  /**
   * Check if user is authorized
   */
  private isAuthorized(chatId: number): boolean {
    return this.config.allowedChatIds.includes(chatId);
  }

  /**
   * Send message to chat
   */
  private async sendMessage(chatId: number, text: string): Promise<void> {
    if (!this.bot) return;

    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (error: any) {
      logger.error({ error, chatId }, 'Failed to send Telegram message');
    }
  }

  /**
   * Handle /help command
   */
  private async handleHelp(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isAuthorized(chatId)) {
      await this.sendMessage(chatId, '❌ Unauthorized');
      return;
    }

    const helpText = `
🤖 *BPX Grid Bot Commands*

📊 *Information:*
/status - Engine status and uptime
/pnl - Profit & Loss summary
/position - Current position details
/orders - Active orders
/risk - Risk metrics and warnings

🎮 *Control:*
/pause - Pause trading
/resume - Resume trading
/stop - Stop engine (⚠️ requires confirmation)

ℹ️ /help - Show this help message
    `.trim();

    await this.sendMessage(chatId, helpText);
  }

  /**
   * Handle /status command
   */
  private async handleStatus(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isAuthorized(chatId)) {
      await this.sendMessage(chatId, '❌ Unauthorized');
      return;
    }

    if (this.multiPairManager) {
      // Multi-pair status
      const summary = this.multiPairManager.getPortfolioSummary();
      const allStatus = this.multiPairManager.getAllStatus();

      const statusEmoji = summary.activePairs > 0 ? '🟢' : '⚪';

      let text = `${statusEmoji} *Multi-Pair Status*\n\n`;
      text += `*Portfolio:*\n`;
      text += `• Active Pairs: ${summary.activePairs}/${summary.totalPairs}\n`;
      text += `• Total PnL: ${summary.totalPnl >= 0 ? '+' : ''}$${summary.totalPnl.toFixed(2)}\n`;
      text += `• Daily PnL: ${summary.dailyPnl >= 0 ? '+' : ''}$${summary.dailyPnl.toFixed(2)}\n\n`;

      text += `*Individual Pairs:*\n`;
      for (const pair of allStatus) {
        const emoji = pair.status === 'running' ? '🟢' : pair.status === 'paused' ? '⏸' : '⚪';
        const uptime = Math.floor(pair.uptime / 1000 / 60);
        text += `${emoji} ${pair.symbol}: ${pair.status} (${uptime}m)\n`;
      }

      await this.sendMessage(chatId, text);
    } else if (this.engine) {
      // Single engine status
      const status = this.engine.getStatus();
      const uptime = status.uptime ? Math.floor(status.uptime / 1000 / 60) : 0;

      const statusEmoji = status.status === 'running' ? '🟢' :
                         status.status === 'paused' ? '⏸' : '⚪';

      let text = `${statusEmoji} *Engine Status*\n\n`;
      text += `*Strategy:* ${status.strategyName || 'N/A'}\n`;
      text += `*Symbol:* ${status.symbol || 'N/A'}\n`;
      text += `*Status:* ${status.status.toUpperCase()}\n`;
      text += `*Uptime:* ${uptime} minutes\n`;

      if (status.performance) {
        text += `\n*Performance:*\n`;
        text += `• Net PnL: ${status.performance.netPnl >= 0 ? '+' : ''}$${status.performance.netPnl.toFixed(2)}\n`;
        text += `• Total Trades: ${status.performance.totalTrades}\n`;
      }

      await this.sendMessage(chatId, text);
    } else {
      await this.sendMessage(chatId, '❌ No engine running');
    }
  }

  /**
   * Handle /pnl command
   */
  private async handlePnL(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isAuthorized(chatId)) {
      await this.sendMessage(chatId, '❌ Unauthorized');
      return;
    }

    if (this.multiPairManager) {
      const summary = this.multiPairManager.getPortfolioSummary();

      const pnlEmoji = summary.totalPnl >= 0 ? '📈' : '📉';

      let text = `${pnlEmoji} *Portfolio PnL*\n\n`;
      text += `*Overall:*\n`;
      text += `• Total PnL: ${summary.totalPnl >= 0 ? '+' : ''}$${summary.totalPnl.toFixed(2)}\n`;
      text += `• Daily PnL: ${summary.dailyPnl >= 0 ? '+' : ''}$${summary.dailyPnl.toFixed(2)}\n`;
      text += `• Position Value: $${summary.totalPositionValue.toFixed(2)}\n\n`;

      text += `*By Pair:*\n`;
      for (const pair of summary.pairBreakdown) {
        const pairPnl = pair.pnl >= 0 ? '+' : '';
        text += `• ${pair.symbol}: ${pairPnl}$${pair.pnl.toFixed(2)} (${(pair.weight * 100).toFixed(1)}%)\n`;
      }

      await this.sendMessage(chatId, text);
    } else if (this.engine) {
      const status = this.engine.getStatus();

      if (!status.performance) {
        await this.sendMessage(chatId, '❌ No performance data available');
        return;
      }

      const pnlEmoji = status.performance.netPnl >= 0 ? '📈' : '📉';

      let text = `${pnlEmoji} *Profit & Loss*\n\n`;
      text += `• Realized PnL: ${status.performance.realizedPnl >= 0 ? '+' : ''}$${status.performance.realizedPnl.toFixed(2)}\n`;
      text += `• Unrealized PnL: ${status.performance.unrealizedPnl >= 0 ? '+' : ''}$${status.performance.unrealizedPnl.toFixed(2)}\n`;
      text += `• Total Fees: -$${status.performance.totalFees.toFixed(2)}\n`;
      text += `• Net PnL: ${status.performance.netPnl >= 0 ? '+' : ''}$${status.performance.netPnl.toFixed(2)}\n`;
      text += `• Return: ${status.performance.returnPct >= 0 ? '+' : ''}${status.performance.returnPct.toFixed(2)}%\n`;

      await this.sendMessage(chatId, text);
    } else {
      await this.sendMessage(chatId, '❌ No engine running');
    }
  }

  /**
   * Handle /position command
   */
  private async handlePosition(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isAuthorized(chatId)) {
      await this.sendMessage(chatId, '❌ Unauthorized');
      return;
    }

    if (!this.engine) {
      await this.sendMessage(chatId, '❌ No engine running');
      return;
    }

    const status = this.engine.getStatus();

    if (!status.inventory) {
      await this.sendMessage(chatId, '❌ No position data available');
      return;
    }

    let text = `📊 *Current Position*\n\n`;
    text += `*Assets:*\n`;
    text += `• Base (${status.inventory.baseAsset}): ${status.inventory.baseBalance.toFixed(4)}\n`;
    text += `• Quote (${status.inventory.quoteAsset}): $${status.inventory.quoteBalance.toFixed(2)}\n\n`;
    text += `*Value:*\n`;
    text += `• Base Value: $${status.inventory.baseValue.toFixed(2)}\n`;
    text += `• Total Value: $${status.inventory.totalValue.toFixed(2)}\n\n`;
    text += `*Balance:*\n`;
    text += `• Inventory Skew: ${(status.inventory.inventorySkew * 100).toFixed(1)}%\n`;

    await this.sendMessage(chatId, text);
  }

  /**
   * Handle /orders command
   */
  private async handleOrders(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isAuthorized(chatId)) {
      await this.sendMessage(chatId, '❌ Unauthorized');
      return;
    }

    if (!this.engine) {
      await this.sendMessage(chatId, '❌ No engine running');
      return;
    }

    const status = this.engine.getStatus();

    if (!status.activeOrders || status.activeOrders.length === 0) {
      await this.sendMessage(chatId, 'ℹ️ No active orders');
      return;
    }

    let text = `📋 *Active Orders* (${status.activeOrders.length})\n\n`;

    const buyOrders = status.activeOrders.filter((o: any) => o.side === 'Bid');
    const sellOrders = status.activeOrders.filter((o: any) => o.side === 'Ask');

    if (buyOrders.length > 0) {
      text += `*Buy Orders (${buyOrders.length}):*\n`;
      buyOrders.slice(0, 5).forEach((o: any) => {
        text += `• $${o.price.toFixed(2)} × ${o.quantity.toFixed(4)}\n`;
      });
      if (buyOrders.length > 5) {
        text += `  ... and ${buyOrders.length - 5} more\n`;
      }
      text += '\n';
    }

    if (sellOrders.length > 0) {
      text += `*Sell Orders (${sellOrders.length}):*\n`;
      sellOrders.slice(0, 5).forEach((o: any) => {
        text += `• $${o.price.toFixed(2)} × ${o.quantity.toFixed(4)}\n`;
      });
      if (sellOrders.length > 5) {
        text += `  ... and ${sellOrders.length - 5} more\n`;
      }
    }

    await this.sendMessage(chatId, text);
  }

  /**
   * Handle /risk command
   */
  private async handleRisk(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isAuthorized(chatId)) {
      await this.sendMessage(chatId, '❌ Unauthorized');
      return;
    }

    if (!this.engine) {
      await this.sendMessage(chatId, '❌ No engine running');
      return;
    }

    const status = this.engine.getStatus();

    if (!status.risk) {
      await this.sendMessage(chatId, '❌ No risk data available');
      return;
    }

    const riskEmoji = status.risk.isHealthy ? '✅' : '⚠️';

    let text = `${riskEmoji} *Risk Status*\n\n`;
    text += `*Health:* ${status.risk.isHealthy ? 'Healthy' : 'Warning'}\n\n`;

    if (status.risk.violations && status.risk.violations.length > 0) {
      text += `*⛔ Violations:*\n`;
      status.risk.violations.forEach((v: string) => {
        text += `• ${v}\n`;
      });
      text += '\n';
    }

    if (status.risk.warnings && status.risk.warnings.length > 0) {
      text += `*⚠️ Warnings:*\n`;
      status.risk.warnings.forEach((w: string) => {
        text += `• ${w}\n`;
      });
      text += '\n';
    }

    text += `*Limits:*\n`;
    text += `• Position: ${status.risk.currentPositionSize.toFixed(2)}/${status.risk.maxPositionSize.toFixed(2)}\n`;
    text += `• Daily Loss: $${status.risk.currentDailyLoss.toFixed(2)}/$${status.risk.maxDailyLoss.toFixed(2)}\n`;
    text += `• Utilization: ${status.risk.utilizationPct.toFixed(1)}%\n`;

    await this.sendMessage(chatId, text);
  }

  /**
   * Handle /stop command
   */
  private async handleStop(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isAuthorized(chatId)) {
      await this.sendMessage(chatId, '❌ Unauthorized');
      return;
    }

    if (!this.bot) return;

    // Send confirmation keyboard
    await this.bot.sendMessage(chatId, '⚠️ Are you sure you want to stop the engine?', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Yes, Stop', callback_data: 'confirm_stop' },
            { text: '❌ Cancel', callback_data: 'cancel_stop' },
          ],
        ],
      },
    });

    // Handle callback
    this.bot.once('callback_query', async (query) => {
      if (query.data === 'confirm_stop') {
        if (this.multiPairManager) {
          await this.multiPairManager.stopAll();
          await this.sendMessage(chatId, '⏹ All pairs stopped');
        } else if (this.engine) {
          await this.engine.stop();
          await this.sendMessage(chatId, '⏹ Engine stopped');
        }
      } else {
        await this.sendMessage(chatId, '↩️ Stop cancelled');
      }

      // Answer callback query
      await this.bot?.answerCallbackQuery(query.id);
    });
  }

  /**
   * Handle /pause command
   */
  private async handlePause(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isAuthorized(chatId)) {
      await this.sendMessage(chatId, '❌ Unauthorized');
      return;
    }

    try {
      if (this.engine) {
        await this.engine.pause();
        await this.sendMessage(chatId, '⏸ Engine paused');
      } else {
        await this.sendMessage(chatId, '❌ No engine running');
      }
    } catch (error: any) {
      await this.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  }

  /**
   * Handle /resume command
   */
  private async handleResume(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isAuthorized(chatId)) {
      await this.sendMessage(chatId, '❌ Unauthorized');
      return;
    }

    try {
      if (this.engine) {
        await this.engine.resume();
        await this.sendMessage(chatId, '▶️ Engine resumed');
      } else {
        await this.sendMessage(chatId, '❌ No engine running');
      }
    } catch (error: any) {
      await this.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  }

  /**
   * Destroy bot
   */
  destroy(): void {
    if (this.bot) {
      this.bot.stopPolling();
      this.bot = null;
      logger.info('Telegram bot controller destroyed');
    }
  }
}
