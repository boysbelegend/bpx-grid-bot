/**
 * Futures AMM Grid Strategy
 * AMM-style grid trading for futures with leverage, funding rate optimization,
 * and liquidation protection
 */

import { BaseStrategy } from './BaseStrategy';
import type {
  IExchangeClient,
  StrategyConfig,
  GridOrder,
  GridLevel,
  Inventory,
  Order,
  FuturesPosition,
  FundingRate,
  LiquidationRisk,
  OrderSide,
} from '../core/interfaces';
import { BackpackFuturesClient } from '../exchanges/BackpackFuturesClient';
import { logger } from '../utils/logger';

export class FuturesAMMGrid extends BaseStrategy {
  private futuresClient: BackpackFuturesClient;
  private currentPosition: FuturesPosition | null = null;
  private currentFundingRate: FundingRate | null = null;
  private liquidationRisk: LiquidationRisk | null = null;

  private leverage: number;
  private marginMode: 'cross' | 'isolated';
  private liquidationBuffer: number;

  private fundingRateCheckInterval: NodeJS.Timeout | null = null;
  private positionCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: StrategyConfig, client: IExchangeClient) {
    super(config, client);

    if (config.type !== 'futures') {
      throw new Error('FuturesAMMGrid requires type="futures" in config');
    }

    if (!config.futures) {
      throw new Error('FuturesAMMGrid requires futures configuration');
    }

    this.futuresClient = client as BackpackFuturesClient;
    this.leverage = config.futures.leverage;
    this.marginMode = config.futures.marginMode;
    this.liquidationBuffer = config.futures.liquidationBuffer;

    logger.info(
      {
        leverage: this.leverage,
        marginMode: this.marginMode,
        liquidationBuffer: this.liquidationBuffer,
      },
      'FuturesAMMGrid strategy initialized'
    );
  }

  /**
   * Initialize futures-specific settings
   */
  async initialize(): Promise<void> {
    await super.initialize();

    // Set leverage and margin mode
    try {
      await this.futuresClient.setLeverage(this.config.symbol, this.leverage);
      await this.futuresClient.setMarginMode(this.config.symbol, this.marginMode);

      logger.info(
        { symbol: this.config.symbol, leverage: this.leverage, marginMode: this.marginMode },
        'Futures settings configured'
      );
    } catch (error: any) {
      logger.error({ error }, 'Failed to configure futures settings');
      throw error;
    }

    // Start background monitoring
    this.startFundingRateMonitoring();
    this.startPositionMonitoring();
  }

  /**
   * Calculate grid orders with futures-specific adjustments
   */
  calculateGridOrders(currentPrice: number, inventory: Inventory): GridOrder[] {
    const gridOrders = super.calculateGridOrders(currentPrice, inventory);

    // Adjust orders based on liquidation risk
    if (this.liquidationRisk && this.liquidationRisk.isHighRisk) {
      return this.adjustOrdersForLiquidationRisk(gridOrders);
    }

    // Adjust orders based on funding rate
    if (this.currentFundingRate) {
      return this.adjustOrdersForFundingRate(gridOrders);
    }

    return gridOrders;
  }

  /**
   * Adjust orders to avoid liquidation
   */
  private adjustOrdersForLiquidationRisk(orders: GridOrder[]): GridOrder[] {
    if (!this.currentPosition || !this.liquidationRisk) {
      return orders;
    }

    logger.warn(
      { liquidationRisk: this.liquidationRisk },
      'High liquidation risk detected, adjusting orders'
    );

    // Filter out orders that would increase position in dangerous direction
    return orders.filter((order) => {
      if (this.currentPosition!.side === 'Long') {
        // Long position: avoid more buy orders if close to liquidation
        return order.side !== 'Bid';
      } else {
        // Short position: avoid more sell orders if close to liquidation
        return order.side !== 'Ask';
      }
    });
  }

  /**
   * Adjust orders based on funding rate
   */
  private adjustOrdersForFundingRate(orders: GridOrder[]): GridOrder[] {
    if (!this.currentFundingRate) {
      return orders;
    }

    const fundingRate = this.currentFundingRate.fundingRate;

    // If funding rate is high and positive (longs pay shorts)
    // Favor short positions by increasing sell order sizes
    // If funding rate is high and negative (shorts pay longs)
    // Favor long positions by increasing buy order sizes

    const adjustmentFactor = Math.min(Math.abs(fundingRate) * 1000, 0.2); // Max 20% adjustment

    return orders.map((order) => {
      let quantity = order.quantity;

      if (fundingRate > 0.0003) {
        // High positive funding rate: favor shorts
        if (order.side === 'Ask') {
          quantity *= 1 + adjustmentFactor;
        } else {
          quantity *= 1 - adjustmentFactor;
        }
      } else if (fundingRate < -0.0003) {
        // High negative funding rate: favor longs
        if (order.side === 'Bid') {
          quantity *= 1 + adjustmentFactor;
        } else {
          quantity *= 1 - adjustmentFactor;
        }
      }

      return {
        ...order,
        quantity: this.roundQuantity(quantity),
      };
    });
  }

  /**
   * Check if grid rebalance is needed with futures-specific conditions
   */
  shouldRebalance(currentPrice: number): boolean {
    const baseRebalance = super.shouldRebalance(currentPrice);

    // Force rebalance if liquidation risk is high
    if (this.liquidationRisk && this.liquidationRisk.isHighRisk) {
      logger.warn('Forcing rebalance due to high liquidation risk');
      return true;
    }

    // Force rebalance if position needs to be reduced
    if (this.currentPosition && this.shouldReducePosition()) {
      logger.warn('Forcing rebalance to reduce position size');
      return true;
    }

    return baseRebalance;
  }

  /**
   * Check if position should be reduced for safety
   */
  private shouldReducePosition(): boolean {
    if (!this.currentPosition) {
      return false;
    }

    // Reduce if margin ratio is too high
    if (this.currentPosition.marginRatio > 0.7) {
      return true;
    }

    // Reduce if ADL quantile is high (risk of auto-deleveraging)
    if (this.currentPosition.adlQuantile && this.currentPosition.adlQuantile >= 4) {
      return true;
    }

    return false;
  }

  /**
   * Start monitoring funding rates
   */
  private startFundingRateMonitoring(): void {
    // Check funding rate every 5 minutes
    this.fundingRateCheckInterval = setInterval(async () => {
      try {
        this.currentFundingRate = await this.futuresClient.getFundingRate(this.config.symbol);

        if (Math.abs(this.currentFundingRate.fundingRate) > 0.001) {
          logger.warn(
            { fundingRate: this.currentFundingRate },
            'High funding rate detected'
          );
        }
      } catch (error: any) {
        logger.error({ error }, 'Failed to fetch funding rate');
      }
    }, 5 * 60 * 1000);

    logger.info('Funding rate monitoring started');
  }

  /**
   * Start monitoring position and liquidation risk
   */
  private startPositionMonitoring(): void {
    // Check position every 30 seconds
    this.positionCheckInterval = setInterval(async () => {
      try {
        this.currentPosition = await this.futuresClient.getPosition(this.config.symbol);

        if (this.currentPosition) {
          this.liquidationRisk = this.futuresClient.calculateLiquidationRisk(
            this.currentPosition,
            this.liquidationBuffer
          );

          if (this.liquidationRisk.isHighRisk) {
            logger.error(
              { liquidationRisk: this.liquidationRisk },
              'CRITICAL: High liquidation risk!'
            );
            this.emit('risk:critical', this.liquidationRisk);

            // Take emergency action if very close to liquidation
            if (this.liquidationRisk.distancePercent < this.liquidationBuffer / 2) {
              await this.emergencyReducePosition();
            }
          }
        }
      } catch (error: any) {
        logger.error({ error }, 'Failed to check position');
      }
    }, 30 * 1000);

    logger.info('Position monitoring started');
  }

  /**
   * Emergency position reduction to avoid liquidation
   */
  private async emergencyReducePosition(): Promise<void> {
    if (!this.currentPosition) {
      return;
    }

    logger.error('EMERGENCY: Reducing position to avoid liquidation!');

    try {
      // Cancel all existing orders first
      await this.client.cancelAllOrders(this.config.symbol);

      // Place market order to reduce position by 50%
      const reduceQuantity = this.currentPosition.size * 0.5;
      const reduceSide: OrderSide = this.currentPosition.side === 'Long' ? 'Ask' : 'Bid';

      await this.futuresClient.placeOrder({
        symbol: this.config.symbol,
        side: reduceSide,
        orderType: 'Market',
        quantity: reduceQuantity,
        reduceOnly: true,
      });

      logger.info({ reduceQuantity }, 'Emergency position reduction executed');
    } catch (error: any) {
      logger.error({ error }, 'Failed to execute emergency position reduction');
    }
  }

  /**
   * Get strategy-specific status
   */
  getStatus(): any {
    return {
      ...super.getStatus(),
      futures: {
        leverage: this.leverage,
        marginMode: this.marginMode,
        position: this.currentPosition,
        fundingRate: this.currentFundingRate,
        liquidationRisk: this.liquidationRisk,
      },
    };
  }

  /**
   * Cleanup futures-specific resources
   */
  async cleanup(): Promise<void> {
    if (this.fundingRateCheckInterval) {
      clearInterval(this.fundingRateCheckInterval);
    }

    if (this.positionCheckInterval) {
      clearInterval(this.positionCheckInterval);
    }

    await super.cleanup();

    logger.info('FuturesAMMGrid strategy cleaned up');
  }
}
