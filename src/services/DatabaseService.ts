/**
 * Database Service for Trading Engine
 * High-level interface for storing trading data
 */

import Database from '../database/Database';
import { SessionRepository } from '../database/repositories/SessionRepository';
import { TradeRepository } from '../database/repositories/TradeRepository';
import { PerformanceMetricsRepository } from '../database/repositories/PerformanceMetricsRepository';
import { logger } from '../utils/logger';

export interface TradeData {
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  fee: number;
  orderId?: string;
  gridLevel?: number;
  realizedPnl?: number;
}

export interface PositionSnapshot {
  baseBalance: number;
  quoteBalance: number;
  totalValue: number;
  marketPrice: number;
  inventoryRatio: number;
}

export interface PnLSnapshot {
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  roi: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface RiskSnapshot {
  maxDrawdown: number;
  currentDrawdown: number;
  dailyLoss: number;
  exposure: number;
}

export class DatabaseService {
  private db: Database;
  private sessionRepo: SessionRepository;
  private tradeRepo: TradeRepository;
  private metricsRepo: PerformanceMetricsRepository;

  private currentSessionId: string | null = null;
  private lastSnapshotTime: number = 0;
  private snapshotInterval: number = 3600000; // 1 hour

  constructor() {
    this.db = Database;
    this.sessionRepo = new SessionRepository(this.db);
    this.tradeRepo = new TradeRepository(this.db);
    this.metricsRepo = new PerformanceMetricsRepository(this.db);
  }

  /**
   * Initialize database connection
   */
  public async initialize(dbPath?: string): Promise<void> {
    try {
      await this.db.initialize(dbPath);
      logger.info('DatabaseService initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize DatabaseService');
      throw error;
    }
  }

  /**
   * Start a new trading session
   */
  public async startSession(params: {
    symbol: string;
    marketType: 'spot' | 'futures';
    strategyName?: string;
    dryRun: boolean;
    initialCapital?: number;
    leverage?: number;
  }): Promise<string> {
    try {
      this.currentSessionId = await this.sessionRepo.create({
        symbol: params.symbol,
        market_type: params.marketType,
        strategy_name: params.strategyName,
        status: 'running',
        dry_run: params.dryRun,
        initial_capital: params.initialCapital,
        leverage: params.leverage || 1,
      });

      logger.info({ sessionId: this.currentSessionId }, 'Session started');
      return this.currentSessionId;
    } catch (error) {
      logger.error({ error }, 'Failed to start session');
      throw error;
    }
  }

  /**
   * Update session status
   */
  public async updateSessionStatus(status: 'running' | 'paused' | 'stopped'): Promise<void> {
    if (!this.currentSessionId) {
      logger.warn('No active session to update');
      return;
    }

    try {
      await this.sessionRepo.updateStatus(this.currentSessionId, status);
      logger.info({ sessionId: this.currentSessionId, status }, 'Session status updated');

      // Generate daily metrics when session stops
      if (status === 'stopped') {
        await this.generateDailyMetrics();
      }
    } catch (error) {
      logger.error({ error }, 'Failed to update session status');
      throw error;
    }
  }

  /**
   * Record a trade
   */
  public async recordTrade(trade: TradeData): Promise<void> {
    if (!this.currentSessionId) {
      logger.warn('No active session - trade not recorded');
      return;
    }

    try {
      const value = trade.price * trade.quantity;

      await this.tradeRepo.create({
        session_id: this.currentSessionId,
        symbol: trade.symbol,
        side: trade.side,
        type: 'limit', // Most grid trades are limit orders
        price: trade.price,
        quantity: trade.quantity,
        value,
        fee: trade.fee,
        order_id: trade.orderId,
        grid_level: trade.gridLevel,
        realized_pnl: trade.realizedPnl || 0,
      });

      logger.info({
        sessionId: this.currentSessionId,
        side: trade.side,
        price: trade.price,
        quantity: trade.quantity,
        pnl: trade.realizedPnl,
      }, 'Trade recorded');
    } catch (error) {
      logger.error({ error, trade }, 'Failed to record trade');
      // Don't throw - we don't want to crash the engine if DB fails
    }
  }

  /**
   * Save position snapshot
   */
  public async savePositionSnapshot(position: PositionSnapshot): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      await this.db.execute(
        `INSERT INTO position_snapshots (
          session_id, base_balance, quote_balance, total_value,
          market_price, inventory_ratio
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          this.currentSessionId,
          position.baseBalance,
          position.quoteBalance,
          position.totalValue,
          position.marketPrice,
          position.inventoryRatio,
        ]
      );

      logger.debug({ sessionId: this.currentSessionId }, 'Position snapshot saved');
    } catch (error) {
      logger.error({ error }, 'Failed to save position snapshot');
    }
  }

  /**
   * Save PnL snapshot
   */
  public async savePnLSnapshot(pnl: PnLSnapshot): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      const winRate = pnl.totalTrades > 0
        ? (pnl.winningTrades / pnl.totalTrades) * 100
        : 0;

      await this.db.execute(
        `INSERT INTO pnl_snapshots (
          session_id, realized_pnl, unrealized_pnl, total_pnl, roi,
          total_trades, winning_trades, losing_trades, win_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          this.currentSessionId,
          pnl.realizedPnl,
          pnl.unrealizedPnl,
          pnl.totalPnl,
          pnl.roi,
          pnl.totalTrades,
          pnl.winningTrades,
          pnl.losingTrades,
          winRate,
        ]
      );

      logger.debug({ sessionId: this.currentSessionId }, 'PnL snapshot saved');
    } catch (error) {
      logger.error({ error }, 'Failed to save PnL snapshot');
    }
  }

  /**
   * Save risk snapshot
   */
  public async saveRiskSnapshot(risk: RiskSnapshot): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      await this.db.execute(
        `INSERT INTO risk_snapshots (
          session_id, max_drawdown, current_drawdown, daily_loss, exposure
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          this.currentSessionId,
          risk.maxDrawdown,
          risk.currentDrawdown,
          risk.dailyLoss,
          risk.exposure,
        ]
      );

      logger.debug({ sessionId: this.currentSessionId }, 'Risk snapshot saved');
    } catch (error) {
      logger.error({ error }, 'Failed to save risk snapshot');
    }
  }

  /**
   * Check if snapshot should be saved
   */
  public shouldSaveSnapshot(): boolean {
    const now = Date.now();
    if (now - this.lastSnapshotTime >= this.snapshotInterval) {
      this.lastSnapshotTime = now;
      return true;
    }
    return false;
  }

  /**
   * Save all snapshots at once
   */
  public async saveAllSnapshots(data: {
    position: PositionSnapshot;
    pnl: PnLSnapshot;
    risk: RiskSnapshot;
  }): Promise<void> {
    if (!this.shouldSaveSnapshot()) return;

    await Promise.all([
      this.savePositionSnapshot(data.position),
      this.savePnLSnapshot(data.pnl),
      this.saveRiskSnapshot(data.risk),
    ]);
  }

  /**
   * Generate daily metrics
   */
  public async generateDailyMetrics(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      await this.metricsRepo.calculateDaily(this.currentSessionId, today);
      logger.info({ sessionId: this.currentSessionId, date: today }, 'Daily metrics generated');
    } catch (error) {
      logger.error({ error }, 'Failed to generate daily metrics');
    }
  }

  /**
   * Get current session ID
   */
  public getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Get session statistics
   */
  public async getSessionStats(): Promise<any> {
    if (!this.currentSessionId) return null;

    try {
      return await this.sessionRepo.getStats(this.currentSessionId);
    } catch (error) {
      logger.error({ error }, 'Failed to get session stats');
      return null;
    }
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    await this.db.close();
    logger.info('DatabaseService closed');
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
