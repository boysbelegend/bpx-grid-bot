/**
 * Trading Engine Manager
 * Manages the lifecycle of the trading engine instance
 */

import { EventEmitter } from 'events';
import path from 'path';
import logger from './logger';
import {
  EngineStatus,
  PositionData,
  PnLData,
  OrderData,
  GridData,
  RiskData,
  TradingMetrics,
  MarketData,
  DashboardState,
} from './types';

export class EngineManager extends EventEmitter {
  private engineInstance: any = null;
  private engineStatus: EngineStatus = { status: 'stopped' };
  private currentState: Partial<DashboardState> = {};
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(private botRootPath: string) {
    super();
    this.setupUpdateLoop();
  }

  /**
   * Start the trading engine with specified strategy
   */
  async start(strategyPath: string, dryRun: boolean = true): Promise<void> {
    if (this.engineInstance) {
      throw new Error('Engine is already running');
    }

    try {
      logger.info({ strategyPath, dryRun }, 'Starting trading engine');
      this.engineStatus = { status: 'initializing' };
      this.emit('statusChange', this.engineStatus);

      // Import required modules from main bot
      const { TradingEngine } = await import(
        path.join(this.botRootPath, 'dist/engine/TradingEngine')
      );
      const { loadStrategyConfig } = await import(
        path.join(this.botRootPath, 'dist/config/ConfigManager')
      );
      const { BackpackClient } = await import(
        path.join(this.botRootPath, 'dist/exchanges/BackpackClient')
      );
      const { MockExchange } = await import(
        path.join(this.botRootPath, 'dist/exchanges/MockExchange')
      );

      // Load strategy configuration
      const fullStrategyPath = path.join(this.botRootPath, strategyPath);
      const strategyConfig = loadStrategyConfig(fullStrategyPath);

      // Override dryRun if specified
      if (dryRun !== undefined) {
        strategyConfig.dryRun = dryRun;
      }

      // Create exchange client
      const client = strategyConfig.dryRun
        ? new MockExchange()
        : new BackpackClient(
            process.env.BACKPACK_API_KEY!,
            process.env.BACKPACK_API_SECRET!,
            process.env.BACKPACK_API_WINDOW
          );

      // Initialize trading engine
      this.engineInstance = new TradingEngine(strategyConfig, client);

      // Subscribe to engine events
      this.subscribeToEngineEvents();

      // Start the engine
      await this.engineInstance.start();

      this.engineStatus = {
        status: 'running',
        strategyName: strategyConfig.name,
        symbol: strategyConfig.symbol,
        startTime: Date.now(),
      };

      logger.info('Trading engine started successfully');
      this.emit('statusChange', this.engineStatus);
    } catch (error: any) {
      this.engineStatus = {
        status: 'error',
        errorMessage: error.message,
      };
      logger.error({ error }, 'Failed to start trading engine');
      this.emit('statusChange', this.engineStatus);
      throw error;
    }
  }

  /**
   * Stop the trading engine
   */
  async stop(force: boolean = false): Promise<void> {
    if (!this.engineInstance) {
      throw new Error('Engine is not running');
    }

    try {
      logger.info({ force }, 'Stopping trading engine');
      await this.engineInstance.stop(force);
      this.engineInstance = null;

      this.engineStatus = { status: 'stopped' };
      this.emit('statusChange', this.engineStatus);
      logger.info('Trading engine stopped');
    } catch (error: any) {
      logger.error({ error }, 'Failed to stop trading engine');
      throw error;
    }
  }

  /**
   * Pause the trading engine
   */
  async pause(): Promise<void> {
    if (!this.engineInstance) {
      throw new Error('Engine is not running');
    }

    try {
      logger.info('Pausing trading engine');
      await this.engineInstance.pause();
      this.engineStatus.status = 'paused';
      this.emit('statusChange', this.engineStatus);
    } catch (error: any) {
      logger.error({ error }, 'Failed to pause trading engine');
      throw error;
    }
  }

  /**
   * Resume the trading engine
   */
  async resume(): Promise<void> {
    if (!this.engineInstance) {
      throw new Error('Engine is not running');
    }

    try {
      logger.info('Resuming trading engine');
      await this.engineInstance.resume();
      this.engineStatus.status = 'running';
      this.emit('statusChange', this.engineStatus);
    } catch (error: any) {
      logger.error({ error }, 'Failed to resume trading engine');
      throw error;
    }
  }

  /**
   * Get current engine status
   */
  getStatus(): EngineStatus {
    if (this.engineStatus.status === 'running' && this.engineStatus.startTime) {
      return {
        ...this.engineStatus,
        uptime: Date.now() - this.engineStatus.startTime,
      };
    }
    return this.engineStatus;
  }

  /**
   * Get current dashboard state
   */
  getCurrentState(): Partial<DashboardState> {
    return {
      ...this.currentState,
      engine: this.getStatus(),
      lastUpdate: Date.now(),
    };
  }

  /**
   * Subscribe to engine events
   */
  private subscribeToEngineEvents(): void {
    if (!this.engineInstance) return;

    // Position updates
    this.engineInstance.on('positionUpdate', (position: any) => {
      this.currentState.position = this.formatPositionData(position);
      this.emit('update', { position: this.currentState.position });
    });

    // PnL updates
    this.engineInstance.on('pnlUpdate', (pnl: any) => {
      this.currentState.pnl = this.formatPnLData(pnl);
      this.emit('update', { pnl: this.currentState.pnl });
    });

    // Order updates
    this.engineInstance.on('orderUpdate', (orders: any) => {
      this.currentState.orders = this.formatOrdersData(orders);
      this.emit('update', { orders: this.currentState.orders });
    });

    // Grid updates
    this.engineInstance.on('gridUpdate', (grid: any) => {
      this.currentState.grid = this.formatGridData(grid);
      this.emit('update', { grid: this.currentState.grid });
    });

    // Risk updates
    this.engineInstance.on('riskUpdate', (risk: any) => {
      this.currentState.risk = this.formatRiskData(risk);
      this.emit('update', { risk: this.currentState.risk });
    });

    // Error events
    this.engineInstance.on('error', (error: Error) => {
      this.engineStatus = {
        ...this.engineStatus,
        status: 'error',
        errorMessage: error.message,
      };
      this.emit('statusChange', this.engineStatus);
    });
  }

  /**
   * Setup periodic update loop
   */
  private setupUpdateLoop(): void {
    this.updateInterval = setInterval(() => {
      if (this.engineInstance) {
        this.fetchEngineState();
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Fetch current engine state
   */
  private async fetchEngineState(): Promise<void> {
    if (!this.engineInstance) return;

    try {
      // Get all current data from engine
      const state = await this.engineInstance.getState();

      this.currentState = {
        position: this.formatPositionData(state.position),
        pnl: this.formatPnLData(state.pnl),
        orders: this.formatOrdersData(state.orders),
        grid: this.formatGridData(state.grid),
        risk: this.formatRiskData(state.risk),
        metrics: this.formatMetricsData(state.metrics),
        market: this.formatMarketData(state.market),
      };

      this.emit('update', this.currentState);
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch engine state');
    }
  }

  // Format helper methods
  private formatPositionData(position: any): PositionData {
    return {
      baseAsset: position?.baseAsset || '',
      quoteAsset: position?.quoteAsset || '',
      baseBalance: position?.baseBalance || 0,
      quoteBalance: position?.quoteBalance || 0,
      baseValue: position?.baseValue || 0,
      totalValue: position?.totalValue || 0,
      inventorySkew: position?.inventorySkew || 0,
      averageBuyPrice: position?.averageBuyPrice || 0,
      averageSellPrice: position?.averageSellPrice || 0,
    };
  }

  private formatPnLData(pnl: any): PnLData {
    return {
      realizedPnl: pnl?.realizedPnl || 0,
      unrealizedPnl: pnl?.unrealizedPnl || 0,
      totalPnl: pnl?.totalPnl || 0,
      totalFees: pnl?.totalFees || 0,
      netPnl: pnl?.netPnl || 0,
      returnPct: pnl?.returnPct || 0,
      dailyPnl: pnl?.dailyPnl || 0,
      dailyReturnPct: pnl?.dailyReturnPct || 0,
    };
  }

  private formatOrdersData(orders: any): OrderData[] {
    if (!Array.isArray(orders)) return [];
    return orders.map((order: any) => ({
      orderId: order.orderId || '',
      clientId: order.clientId || '',
      side: order.side || 'Bid',
      price: order.price || 0,
      quantity: order.quantity || 0,
      filled: order.filled || 0,
      status: order.status || 'pending',
      createdAt: order.createdAt || Date.now(),
    }));
  }

  private formatGridData(grid: any): GridData {
    return {
      centerPrice: grid?.centerPrice || 0,
      levels: grid?.levels || 0,
      spacing: grid?.spacing || 0,
      activeOrders: grid?.activeOrders || 0,
      totalLevels: grid?.totalLevels || 0,
      buyLevels: grid?.buyLevels || 0,
      sellLevels: grid?.sellLevels || 0,
    };
  }

  private formatRiskData(risk: any): RiskData {
    return {
      isHealthy: risk?.isHealthy ?? true,
      violations: risk?.violations || [],
      warnings: risk?.warnings || [],
      maxPositionSize: risk?.maxPositionSize || 0,
      currentPositionSize: risk?.currentPositionSize || 0,
      maxDailyLoss: risk?.maxDailyLoss || 0,
      currentDailyLoss: risk?.currentDailyLoss || 0,
      utilizationPct: risk?.utilizationPct || 0,
    };
  }

  private formatMetricsData(metrics: any): TradingMetrics {
    return {
      totalTrades: metrics?.totalTrades || 0,
      winningTrades: metrics?.winningTrades || 0,
      losingTrades: metrics?.losingTrades || 0,
      winRate: metrics?.winRate || 0,
      averageProfit: metrics?.averageProfit || 0,
      averageLoss: metrics?.averageLoss || 0,
      profitFactor: metrics?.profitFactor || 0,
      largestWin: metrics?.largestWin || 0,
      largestLoss: metrics?.largestLoss || 0,
    };
  }

  private formatMarketData(market: any): MarketData {
    return {
      symbol: market?.symbol || '',
      lastPrice: market?.lastPrice || 0,
      bid: market?.bid || 0,
      ask: market?.ask || 0,
      spread: market?.spread || 0,
      volume24h: market?.volume24h || 0,
      priceChange24h: market?.priceChange24h || 0,
      priceChangePct24h: market?.priceChangePct24h || 0,
      high24h: market?.high24h || 0,
      low24h: market?.low24h || 0,
      timestamp: market?.timestamp || Date.now(),
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.engineInstance) {
      this.engineInstance.stop(true).catch((err: any) => {
        logger.error({ err }, 'Error stopping engine during cleanup');
      });
    }
  }
}
