/**
 * Trading Engine
 * Main execution engine that coordinates all components
 */

import { IExchangeClient } from '../core/interfaces/IExchangeClient';
import { IStrategy } from '../core/interfaces/IStrategy';
import {
  StrategyConfig,
  EngineState,
  OrderUpdate,
  Ticker,
  PnLSnapshot,
} from '../core/interfaces/types';
import { PositionManager } from '../core/PositionManager';
import { RiskManager } from '../core/RiskManager';
import { OrderManager } from '../core/OrderManager';
import { logger, log, sleep } from '../utils';

export interface TradingEngineConfig {
  client: IExchangeClient;
  strategy: IStrategy;
  strategyConfig: StrategyConfig;
  updateIntervalMs?: number;
  statusIntervalMs?: number;
}

export class TradingEngine {
  private client: IExchangeClient;
  private strategy: IStrategy;
  private config: StrategyConfig;

  private positionManager: PositionManager;
  private riskManager: RiskManager;
  private orderManager: OrderManager;

  private state: EngineState;
  private updateIntervalMs: number;
  private statusIntervalMs: number;

  private updateLoopHandle?: NodeJS.Timeout;
  private statusLoopHandle?: NodeJS.Timeout;

  private lastRebalancePrice: number = 0;
  private lastRebalanceTime: number = 0;

  constructor(engineConfig: TradingEngineConfig) {
    this.client = engineConfig.client;
    this.strategy = engineConfig.strategy;
    this.config = engineConfig.strategyConfig;

    this.updateIntervalMs = engineConfig.updateIntervalMs || 30000; // 30 seconds
    this.statusIntervalMs = engineConfig.statusIntervalMs || 60000; // 60 seconds

    // Initialize managers
    this.positionManager = new PositionManager({
      symbol: this.config.symbol,
      baseAsset: this.config.baseAsset,
      quoteAsset: this.config.quoteAsset,
      type: this.config.type,
    });

    this.riskManager = new RiskManager(
      this.config.risk,
      this.config.futures
    );

    this.orderManager = new OrderManager(this.client, this.config.symbol);

    this.state = {
      status: 'initializing',
    };

    logger.info(`[ENGINE] Trading engine created for ${this.config.symbol}`, {
      strategy: this.strategy.name,
      type: this.config.type,
      dryRun: this.config.dryRun,
    });
  }

  /**
   * Start the trading engine
   */
  async start(): Promise<void> {
    try {
      this.state.status = 'initializing';
      logger.info(`[ENGINE] Starting trading engine...`);

      // Step 1: Initialize order manager
      await this.orderManager.initialize();

      // Step 2: Get current market price
      const ticker = await this.client.getTicker(this.config.symbol);
      const currentPrice = ticker.lastPrice;
      logger.info(`[ENGINE] Current price: ${currentPrice}`);

      // Step 3: Get balances and initialize position manager
      const balances = await this.client.getBalances();
      this.positionManager.updateInventoryFromBalances(balances);

      const inventory = this.positionManager.getInventory();
      logger.info(`[ENGINE] Initial inventory:`, {
        baseAsset: `${inventory.baseAsset.total} ${inventory.baseAsset.symbol}`,
        quoteAsset: `${inventory.quoteAsset.total} ${inventory.quoteAsset.symbol}`,
        netValue: inventory.netValue.toFixed(2),
      });

      // Step 4: Initialize risk manager
      this.riskManager.initialize(inventory.netValue);

      // Step 5: Cancel existing orders if configured
      if (this.config.cancelOrdersOnStart) {
        logger.info(`[ENGINE] Cancelling existing orders...`);
        await this.orderManager.cancelAllOrders();
        await sleep(2000);
      }

      // Step 6: Initialize strategy
      await this.strategy.initialize(currentPrice, inventory);

      // Step 7: Place initial grid orders
      await this.placeInitialGrid(currentPrice);

      // Step 8: Subscribe to order updates
      this.orderManager.onOrderUpdate((update) => {
        this.handleOrderUpdate(update);
      });

      // Step 9: Subscribe to market data
      await this.client.subscribeMarketData(this.config.symbol, (data) => {
        this.handleMarketUpdate(data.data);
      });

      // Step 10: Start update loops
      this.startUpdateLoop();
      this.startStatusLoop();

      this.state.status = 'running';
      this.state.startTime = Date.now();

      logger.info(`[ENGINE] Trading engine started successfully`);

    } catch (error) {
      this.state.status = 'error';
      this.state.errorMessage = (error as Error).message;
      logger.error(error as Error, 'Failed to start trading engine');
      throw error;
    }
  }

  /**
   * Stop the trading engine
   */
  async stop(cancelOrders: boolean = true): Promise<void> {
    try {
      logger.info(`[ENGINE] Stopping trading engine...`);
      this.state.status = 'stopping';

      // Stop update loops
      if (this.updateLoopHandle) {
        clearInterval(this.updateLoopHandle);
      }
      if (this.statusLoopHandle) {
        clearInterval(this.statusLoopHandle);
      }

      // Cancel all orders if requested
      if (cancelOrders) {
        logger.info(`[ENGINE] Cancelling all orders...`);
        await this.orderManager.cancelAllOrders();
      }

      // Disconnect from exchange
      await this.client.disconnect();

      this.state.status = 'stopped';
      this.state.endTime = Date.now();

      // Print final summary
      await this.printFinalSummary();

      logger.info(`[ENGINE] Trading engine stopped`);

    } catch (error) {
      logger.error(error as Error, 'Error stopping trading engine');
      throw error;
    }
  }

  /**
   * Pause the trading engine
   */
  pause(): void {
    if (this.state.status === 'running') {
      this.state.status = 'paused';
      logger.info(`[ENGINE] Trading engine paused`);
    }
  }

  /**
   * Resume the trading engine
   */
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
      logger.info(`[ENGINE] Trading engine resumed`);
    }
  }

  /**
   * Get engine state
   */
  getState(): EngineState {
    return { ...this.state };
  }

  /**
   * Get current PnL snapshot
   */
  async getCurrentPnL(): Promise<PnLSnapshot> {
    const ticker = await this.client.getTicker(this.config.symbol);
    return this.positionManager.getPnLSnapshot(ticker.lastPrice);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Place initial grid orders
   */
  private async placeInitialGrid(currentPrice: number): Promise<void> {
    logger.info(`[ENGINE] Placing initial grid orders...`);

    const inventory = this.positionManager.getInventory();
    const gridOrders = this.strategy.calculateGridOrders(currentPrice, inventory);

    logger.info(`[ENGINE] Calculated ${gridOrders.length} grid orders`);

    const orderRequests = gridOrders.map((gridOrder) => ({
      clientId: gridOrder.clientId,
      symbol: this.config.symbol,
      side: gridOrder.side,
      orderType: this.config.order.orderType,
      price: gridOrder.price,
      quantity: gridOrder.quantity,
      timeInForce: this.config.order.timeInForce,
    }));

    await this.orderManager.placeOrders(orderRequests);

    this.lastRebalancePrice = currentPrice;
    this.lastRebalanceTime = Date.now();

    logger.info(`[ENGINE] Initial grid placed successfully`);
  }

  /**
   * Handle order update
   */
  private async handleOrderUpdate(update: OrderUpdate): Promise<void> {
    if (update.event === 'orderFill' && update.fill) {
      const { fill } = update;

      log.trade('Order Filled', {
        side: fill.side,
        price: fill.price,
        quantity: fill.quantity,
        fee: fill.fee,
      });

      // Update position manager
      const ticker = await this.client.getTicker(this.config.symbol);
      this.positionManager.updateFromFill(fill, ticker.lastPrice);

      // Notify strategy
      const inventory = this.positionManager.getInventory();
      this.strategy.onOrderFill(fill, inventory);

      // Check if we need to rebalance
      if (this.strategy.shouldRebalance(ticker.lastPrice, this.lastRebalancePrice)) {
        logger.info(`[ENGINE] Rebalance triggered by price movement`);
        await this.rebalanceGrid(ticker.lastPrice);
      }
    }
  }

  /**
   * Handle market data update
   */
  private handleMarketUpdate(ticker: Ticker): void {
    this.strategy.onMarketUpdate(ticker);
  }

  /**
   * Rebalance grid
   */
  private async rebalanceGrid(currentPrice: number): Promise<void> {
    try {
      logger.info(`[ENGINE] Rebalancing grid at price ${currentPrice}`);

      // Get current inventory
      const inventory = this.positionManager.getInventory();

      // Calculate new grid orders
      const targetOrders = this.strategy.calculateGridOrders(currentPrice, inventory);
      const existingOrders = this.orderManager.getActiveOrders();

      // Calculate diff
      const diff = this.strategy.diffOrders(targetOrders, existingOrders);

      // Execute diff
      await this.orderManager.executeDiff(diff);

      this.lastRebalancePrice = currentPrice;
      this.lastRebalanceTime = Date.now();

      logger.info(`[ENGINE] Grid rebalanced successfully`);

    } catch (error) {
      logger.error(error as Error, 'Failed to rebalance grid');
    }
  }

  /**
   * Update loop - runs periodically
   */
  private startUpdateLoop(): void {
    this.updateLoopHandle = setInterval(async () => {
      if (this.state.status !== 'running') return;

      try {
        await this.performUpdate();
      } catch (error) {
        logger.error(error as Error, 'Error in update loop');
      }
    }, this.updateIntervalMs);
  }

  /**
   * Perform periodic update
   */
  private async performUpdate(): Promise<void> {
    // Sync orders
    await this.orderManager.syncOrders();

    // Update balances
    const balances = await this.client.getBalances();
    this.positionManager.updateInventoryFromBalances(balances);

    // Get current price
    const ticker = await this.client.getTicker(this.config.symbol);
    const currentPrice = ticker.lastPrice;

    // Check risk limits
    const inventory = this.positionManager.getInventory();
    const activeOrderCount = this.orderManager.getActiveOrderCount();
    const riskStatus = this.riskManager.checkRiskLimits(
      inventory,
      currentPrice,
      activeOrderCount
    );

    // Handle risk violations
    if (!riskStatus.isHealthy) {
      logger.error(`[ENGINE] Risk violations detected - stopping engine`);
      await this.stop(true);
      return;
    }

    // Check if rebalance is needed
    if (this.riskManager.canRebalance(currentPrice, this.lastRebalancePrice)) {
      if (this.strategy.shouldRebalance(currentPrice, this.lastRebalancePrice)) {
        await this.rebalanceGrid(currentPrice);
      }
    }

    this.state.lastUpdateTime = Date.now();
  }

  /**
   * Status loop - prints status periodically
   */
  private startStatusLoop(): void {
    this.statusLoopHandle = setInterval(async () => {
      if (this.state.status !== 'running') return;

      try {
        await this.printStatus();
      } catch (error) {
        logger.error(error as Error, 'Error in status loop');
      }
    }, this.statusIntervalMs);
  }

  /**
   * Print current status
   */
  private async printStatus(): Promise<void> {
    const ticker = await this.client.getTicker(this.config.symbol);
    const inventory = this.positionManager.getInventory();
    const pnl = this.positionManager.getPnLSnapshot(ticker.lastPrice);
    const activeOrders = this.orderManager.getActiveOrderCount();

    log.metrics({
      symbol: this.config.symbol,
      price: ticker.lastPrice,
      baseAsset: `${inventory.baseAsset.total.toFixed(4)} ${inventory.baseAsset.symbol}`,
      quoteAsset: `${inventory.quoteAsset.total.toFixed(2)} ${inventory.quoteAsset.symbol}`,
      inventorySkew: inventory.skew.toFixed(3),
      activeOrders,
      realizedPnL: pnl.realizedPnl.toFixed(2),
      unrealizedPnL: pnl.unrealizedPnl.toFixed(2),
      totalPnL: pnl.totalPnl.toFixed(2),
      fees: pnl.fees.toFixed(4),
      trades: pnl.trades,
      winRate: pnl.winRate.toFixed(1) + '%',
    });
  }

  /**
   * Print final summary
   */
  private async printFinalSummary(): Promise<void> {
    const ticker = await this.client.getTicker(this.config.symbol);
    const metrics = this.positionManager.getTradingMetrics(ticker.lastPrice);
    const duration = (Date.now() - (this.state.startTime || Date.now())) / 1000 / 60; // minutes

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`TRADING SESSION SUMMARY - ${this.config.symbol}`);
    logger.info(`${'='.repeat(60)}`);
    logger.info(`Strategy: ${this.strategy.name}`);
    logger.info(`Duration: ${duration.toFixed(0)} minutes`);
    logger.info(`Total Trades: ${metrics.totalTrades}`);
    logger.info(`Winning Trades: ${metrics.winningTrades}`);
    logger.info(`Losing Trades: ${metrics.losingTrades}`);
    logger.info(`Win Rate: ${((metrics.winningTrades / metrics.totalTrades) * 100).toFixed(1)}%`);
    logger.info(`Total Volume: ${metrics.totalVolume.toFixed(2)} ${this.config.quoteAsset}`);
    logger.info(`Total Fees: ${metrics.totalFees.toFixed(4)} ${this.config.quoteAsset}`);
    logger.info(`Realized PnL: ${metrics.realizedPnl.toFixed(2)} ${this.config.quoteAsset}`);
    logger.info(`Unrealized PnL: ${metrics.unrealizedPnl.toFixed(2)} ${this.config.quoteAsset}`);
    logger.info(`Total PnL: ${(metrics.realizedPnl + metrics.unrealizedPnl).toFixed(2)} ${this.config.quoteAsset}`);
    logger.info(`${'='.repeat(60)}\n`);
  }
}
