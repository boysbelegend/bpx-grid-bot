/**
 * Multi-Pair Manager
 * Manages multiple trading pairs simultaneously with unified monitoring
 */

import { TradingEngine } from './TradingEngine';
import { logger } from '../utils/logger';
import type { StrategyConfig } from '../core/interfaces';

export interface MultiPairConfig {
  pairs: {
    [symbol: string]: {
      strategyPath: string;
      enabled: boolean;
      weight?: number; // Portfolio weight (0-1)
    };
  };
  global: {
    maxTotalPositionValue: number; // Maximum total portfolio value
    maxDailyLoss: number; // Maximum daily loss across all pairs
    rebalanceInterval?: number; // Minutes between portfolio rebalance
    correlationCheck?: boolean; // Check correlation between pairs
  };
}

export interface PairStatus {
  symbol: string;
  engine: TradingEngine;
  status: 'running' | 'stopped' | 'paused' | 'error';
  uptime: number;
  startTime: number;
  config: StrategyConfig;
  pnl: number;
  positionValue: number;
  lastUpdate: number;
}

export class MultiPairManager {
  private config: MultiPairConfig;
  private pairs: Map<string, PairStatus> = new Map();
  private dailyStartingValue: number = 0;
  private dailyResetTime: number = 0;

  private monitoringInterval: NodeJS.Timeout | null = null;
  private rebalanceInterval: NodeJS.Timeout | null = null;

  constructor(config: MultiPairConfig) {
    this.config = config;
    this.dailyResetTime = this.getNextDayStart();

    logger.info({ pairCount: Object.keys(config.pairs).length }, 'MultiPairManager initialized');
  }

  /**
   * Start all enabled pairs
   */
  async startAll(): Promise<void> {
    logger.info('Starting all enabled trading pairs');

    const enabledPairs = Object.entries(this.config.pairs).filter(([_, cfg]) => cfg.enabled);

    for (const [symbol, pairConfig] of enabledPairs) {
      try {
        await this.startPair(symbol, pairConfig.strategyPath);
      } catch (error: any) {
        logger.error({ symbol, error }, 'Failed to start pair');
      }
    }

    // Start global monitoring
    this.startMonitoring();

    // Start rebalancing if configured
    if (this.config.global.rebalanceInterval) {
      this.startRebalancing();
    }

    logger.info({ activePairs: this.pairs.size }, 'All pairs started');
  }

  /**
   * Start a single pair
   */
  async startPair(symbol: string, strategyPath: string): Promise<void> {
    if (this.pairs.has(symbol)) {
      throw new Error(`Pair ${symbol} is already running`);
    }

    logger.info({ symbol, strategyPath }, 'Starting trading pair');

    // Load strategy config
    const fs = await import('fs/promises');
    const configData = await fs.readFile(strategyPath, 'utf-8');
    const config: StrategyConfig = JSON.parse(configData);

    // Create and start engine
    const engine = new TradingEngine(config);
    await engine.start();

    // Register pair
    const pairStatus: PairStatus = {
      symbol,
      engine,
      status: 'running',
      uptime: 0,
      startTime: Date.now(),
      config,
      pnl: 0,
      positionValue: 0,
      lastUpdate: Date.now(),
    };

    this.pairs.set(symbol, pairStatus);

    logger.info({ symbol }, 'Trading pair started successfully');
  }

  /**
   * Stop a single pair
   */
  async stopPair(symbol: string): Promise<void> {
    const pair = this.pairs.get(symbol);
    if (!pair) {
      throw new Error(`Pair ${symbol} is not running`);
    }

    logger.info({ symbol }, 'Stopping trading pair');

    await pair.engine.stop();
    pair.status = 'stopped';

    logger.info({ symbol }, 'Trading pair stopped');
  }

  /**
   * Stop all pairs
   */
  async stopAll(): Promise<void> {
    logger.info('Stopping all trading pairs');

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval);
      this.rebalanceInterval = null;
    }

    // Stop all engines
    for (const [symbol, pair] of this.pairs) {
      try {
        await this.stopPair(symbol);
      } catch (error: any) {
        logger.error({ symbol, error }, 'Failed to stop pair');
      }
    }

    this.pairs.clear();
    logger.info('All pairs stopped');
  }

  /**
   * Pause a single pair
   */
  async pausePair(symbol: string): Promise<void> {
    const pair = this.pairs.get(symbol);
    if (!pair) {
      throw new Error(`Pair ${symbol} is not running`);
    }

    await pair.engine.pause();
    pair.status = 'paused';
    logger.info({ symbol }, 'Trading pair paused');
  }

  /**
   * Resume a paused pair
   */
  async resumePair(symbol: string): Promise<void> {
    const pair = this.pairs.get(symbol);
    if (!pair) {
      throw new Error(`Pair ${symbol} is not running`);
    }

    await pair.engine.resume();
    pair.status = 'running';
    logger.info({ symbol }, 'Trading pair resumed');
  }

  /**
   * Get status of all pairs
   */
  getAllStatus(): PairStatus[] {
    return Array.from(this.pairs.values()).map(pair => ({
      ...pair,
      uptime: Date.now() - pair.startTime,
      pnl: this.getPairPnL(pair.symbol),
      positionValue: this.getPairPositionValue(pair.symbol),
      lastUpdate: Date.now(),
    }));
  }

  /**
   * Get status of a specific pair
   */
  getPairStatus(symbol: string): PairStatus | null {
    const pair = this.pairs.get(symbol);
    if (!pair) {
      return null;
    }

    return {
      ...pair,
      uptime: Date.now() - pair.startTime,
      pnl: this.getPairPnL(symbol),
      positionValue: this.getPairPositionValue(symbol),
      lastUpdate: Date.now(),
    };
  }

  /**
   * Get portfolio summary
   */
  getPortfolioSummary(): {
    totalPairs: number;
    activePairs: number;
    totalPnl: number;
    totalPositionValue: number;
    dailyPnl: number;
    pairBreakdown: { symbol: string; pnl: number; positionValue: number; weight: number }[];
  } {
    const activePairs = Array.from(this.pairs.values()).filter(p => p.status === 'running');
    const totalPnl = activePairs.reduce((sum, pair) => sum + this.getPairPnL(pair.symbol), 0);
    const totalPositionValue = activePairs.reduce(
      (sum, pair) => sum + this.getPairPositionValue(pair.symbol),
      0
    );

    const dailyPnl = totalPositionValue - this.dailyStartingValue;

    const pairBreakdown = activePairs.map(pair => ({
      symbol: pair.symbol,
      pnl: this.getPairPnL(pair.symbol),
      positionValue: this.getPairPositionValue(pair.symbol),
      weight: totalPositionValue > 0 ? this.getPairPositionValue(pair.symbol) / totalPositionValue : 0,
    }));

    return {
      totalPairs: this.pairs.size,
      activePairs: activePairs.length,
      totalPnl,
      totalPositionValue,
      dailyPnl,
      pairBreakdown,
    };
  }

  /**
   * Start monitoring all pairs
   */
  private startMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.checkGlobalRiskLimits();
      this.updateDailyMetrics();
    }, 30 * 1000);

    logger.info('Global monitoring started');
  }

  /**
   * Start portfolio rebalancing
   */
  private startRebalancing(): void {
    const intervalMinutes = this.config.global.rebalanceInterval || 60;

    this.rebalanceInterval = setInterval(async () => {
      await this.rebalancePortfolio();
    }, intervalMinutes * 60 * 1000);

    logger.info({ intervalMinutes }, 'Portfolio rebalancing started');
  }

  /**
   * Check global risk limits across all pairs
   */
  private async checkGlobalRiskLimits(): Promise<void> {
    const summary = this.getPortfolioSummary();

    // Check total position value
    if (summary.totalPositionValue > this.config.global.maxTotalPositionValue) {
      logger.error(
        {
          totalPositionValue: summary.totalPositionValue,
          limit: this.config.global.maxTotalPositionValue,
        },
        'CRITICAL: Total position value exceeds limit'
      );

      // Pause all pairs
      for (const pair of this.pairs.values()) {
        if (pair.status === 'running') {
          await this.pausePair(pair.symbol);
        }
      }
    }

    // Check daily loss
    if (summary.dailyPnl < -this.config.global.maxDailyLoss) {
      logger.error(
        {
          dailyPnl: summary.dailyPnl,
          limit: this.config.global.maxDailyLoss,
        },
        'CRITICAL: Daily loss limit exceeded'
      );

      // Stop all pairs
      await this.stopAll();
    }
  }

  /**
   * Rebalance portfolio to target weights
   */
  private async rebalancePortfolio(): Promise<void> {
    logger.info('Starting portfolio rebalance');

    const summary = this.getPortfolioSummary();

    // Calculate target values based on weights
    const pairsWithWeights = Object.entries(this.config.pairs)
      .filter(([symbol, cfg]) => cfg.weight !== undefined && this.pairs.has(symbol));

    if (pairsWithWeights.length === 0) {
      logger.debug('No pairs with weights configured, skipping rebalance');
      return;
    }

    const totalTargetWeight = pairsWithWeights.reduce((sum, [_, cfg]) => sum + (cfg.weight || 0), 0);

    for (const [symbol, cfg] of pairsWithWeights) {
      const targetWeight = (cfg.weight || 0) / totalTargetWeight;
      const targetValue = summary.totalPositionValue * targetWeight;
      const currentValue = this.getPairPositionValue(symbol);

      const deviation = Math.abs(currentValue - targetValue) / targetValue;

      // If deviation > 20%, trigger rebalance
      if (deviation > 0.2) {
        logger.info(
          {
            symbol,
            currentValue,
            targetValue,
            deviation: deviation * 100,
          },
          'Pair needs rebalancing'
        );

        // Rebalancing logic would go here
        // This is a placeholder - actual implementation would:
        // 1. Reduce overweight positions
        // 2. Increase underweight positions
        // 3. Respect risk limits
      }
    }

    logger.info('Portfolio rebalance completed');
  }

  /**
   * Update daily metrics
   */
  private updateDailyMetrics(): void {
    // Reset daily metrics if new day
    if (Date.now() >= this.dailyResetTime) {
      const summary = this.getPortfolioSummary();
      this.dailyStartingValue = summary.totalPositionValue;
      this.dailyResetTime = this.getNextDayStart();
      logger.info({ dailyStartingValue: this.dailyStartingValue }, 'Daily metrics reset');
    }
  }

  /**
   * Get PnL for a specific pair
   */
  private getPairPnL(symbol: string): number {
    const pair = this.pairs.get(symbol);
    if (!pair) {
      return 0;
    }

    const status = pair.engine.getStatus();
    return status.performance?.netPnl || 0;
  }

  /**
   * Get position value for a specific pair
   */
  private getPairPositionValue(symbol: string): number {
    const pair = this.pairs.get(symbol);
    if (!pair) {
      return 0;
    }

    const status = pair.engine.getStatus();
    return status.inventory?.netValue || 0;
  }

  /**
   * Get next day start timestamp
   */
  private getNextDayStart(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Cleanup and destroy all resources
   */
  async destroy(): Promise<void> {
    await this.stopAll();
    logger.info('MultiPairManager destroyed');
  }
}
