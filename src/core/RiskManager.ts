/**
 * Risk Manager
 * Monitors and enforces risk limits
 */

import {
  RiskConfig,
  RiskStatus,
  Inventory,
  Position,
  FuturesConfig,
} from './interfaces/types';
import { calculateLiquidationPrice, percentChange } from '../utils';
import { logger, log } from '../utils/logger';

export class RiskManager {
  private config: RiskConfig;
  private futuresConfig?: FuturesConfig;
  private sessionStartValue: number = 0;
  private sessionStartTime: number = Date.now();
  private highestValue: number = 0;
  private dailyStartValue: number = 0;
  private lastDailyReset: number = Date.now();

  constructor(config: RiskConfig, futuresConfig?: FuturesConfig) {
    this.config = config;
    this.futuresConfig = futuresConfig;
  }

  /**
   * Initialize risk manager with starting values
   */
  initialize(initialValue: number): void {
    this.sessionStartValue = initialValue;
    this.dailyStartValue = initialValue;
    this.highestValue = initialValue;
    this.sessionStartTime = Date.now();
    this.lastDailyReset = Date.now();

    logger.info('[RISK] Risk manager initialized', {
      initialValue: initialValue.toFixed(2),
      maxDailyLoss: this.config.maxDailyLoss,
      maxPositionSize: this.config.maxPositionSize,
    });
  }

  /**
   * Check all risk limits
   */
  checkRiskLimits(
    inventory: Inventory,
    currentPrice: number,
    activeOrderCount: number,
    positions?: Position[]
  ): RiskStatus {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Reset daily if needed
    this.checkDailyReset();

    // Calculate current metrics
    const currentPositionSize = inventory.baseAsset.total;
    const currentPositionValue = currentPositionSize * currentPrice;
    const dailyPnl = inventory.netValue - this.dailyStartValue;
    const sessionPnl = inventory.netValue - this.sessionStartValue;

    // Check position size limit
    if (currentPositionSize > this.config.maxPositionSize) {
      violations.push(
        `Position size ${currentPositionSize.toFixed(4)} exceeds limit ${this.config.maxPositionSize}`
      );
    }

    // Check position value limit
    if (currentPositionValue > this.config.maxPositionValue) {
      violations.push(
        `Position value ${currentPositionValue.toFixed(2)} exceeds limit ${this.config.maxPositionValue}`
      );
    }

    // Check daily loss limit
    if (dailyPnl < -this.config.maxDailyLoss) {
      violations.push(
        `Daily loss ${Math.abs(dailyPnl).toFixed(2)} exceeds limit ${this.config.maxDailyLoss}`
      );
    }

    // Warning if approaching daily loss limit (80%)
    if (dailyPnl < -this.config.maxDailyLoss * 0.8) {
      warnings.push(
        `Approaching daily loss limit: ${Math.abs(dailyPnl).toFixed(2)} / ${this.config.maxDailyLoss}`
      );
    }

    // Check order count limit
    if (activeOrderCount > this.config.maxOrderCount) {
      violations.push(
        `Active order count ${activeOrderCount} exceeds limit ${this.config.maxOrderCount}`
      );
    }

    // Check emergency stop loss if configured
    if (this.config.emergencyStopLoss) {
      const lossPct = (sessionPnl / this.sessionStartValue) * 100;
      if (lossPct < -this.config.emergencyStopLoss) {
        violations.push(
          `Emergency stop loss triggered: ${lossPct.toFixed(2)}% loss`
        );
      }
    }

    // Futures-specific checks
    if (this.futuresConfig && positions && positions.length > 0) {
      const futuresChecks = this.checkFuturesRisk(positions, currentPrice);
      violations.push(...futuresChecks.violations);
      warnings.push(...futuresChecks.warnings);
    }

    // Update highest value for drawdown tracking
    if (inventory.netValue > this.highestValue) {
      this.highestValue = inventory.netValue;
    }

    const status: RiskStatus = {
      isHealthy: violations.length === 0,
      violations,
      warnings,
      metrics: {
        currentPositionSize,
        currentPositionValue,
        dailyPnl,
        activeOrderCount,
      },
    };

    // Log violations and warnings
    if (violations.length > 0) {
      log.risk('violation', 'Risk limits violated', { violations });
    }

    if (warnings.length > 0) {
      log.risk('warning', 'Risk warnings', { warnings });
    }

    return status;
  }

  /**
   * Check if new order is allowed
   */
  canPlaceOrder(
    side: 'Bid' | 'Ask',
    quantity: number,
    price: number,
    inventory: Inventory,
    activeOrderCount: number
  ): { allowed: boolean; reason?: string } {
    // Check order count
    if (activeOrderCount >= this.config.maxOrderCount) {
      return {
        allowed: false,
        reason: `Order count limit reached: ${activeOrderCount}/${this.config.maxOrderCount}`,
      };
    }

    // Check if buy order would exceed position size
    if (side === 'Bid') {
      const newPositionSize = inventory.baseAsset.total + quantity;
      if (newPositionSize > this.config.maxPositionSize) {
        return {
          allowed: false,
          reason: `Would exceed position size limit: ${newPositionSize.toFixed(4)} > ${this.config.maxPositionSize}`,
        };
      }

      const newPositionValue = newPositionSize * price;
      if (newPositionValue > this.config.maxPositionValue) {
        return {
          allowed: false,
          reason: `Would exceed position value limit: ${newPositionValue.toFixed(2)} > ${this.config.maxPositionValue}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if rebalancing is allowed
   */
  canRebalance(currentPrice: number, lastRebalancePrice: number): boolean {
    const priceChange = Math.abs(percentChange(lastRebalancePrice, currentPrice));
    return priceChange >= this.config.rebalanceThreshold;
  }

  /**
   * Get current drawdown percentage
   */
  getCurrentDrawdown(currentValue: number): number {
    if (this.highestValue === 0) return 0;
    return ((this.highestValue - currentValue) / this.highestValue) * 100;
  }

  /**
   * Reset daily counters
   */
  private checkDailyReset(): void {
    const now = Date.now();
    const hoursSinceReset = (now - this.lastDailyReset) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      this.dailyStartValue = 0; // Will be reset on next check
      this.lastDailyReset = now;
      logger.info('[RISK] Daily counters reset');
    }
  }

  /**
   * Check futures-specific risks
   */
  private checkFuturesRisk(
    positions: Position[],
    currentPrice: number
  ): { violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];

    if (!this.futuresConfig) return { violations, warnings };

    for (const position of positions) {
      // Check leverage
      const effectiveLeverage = position.leverage || 1;
      if (effectiveLeverage > this.futuresConfig.leverage) {
        violations.push(
          `Position leverage ${effectiveLeverage}x exceeds limit ${this.futuresConfig.leverage}x`
        );
      }

      // Check distance to liquidation
      if (position.liquidationPrice) {
        const distanceToLiq = Math.abs(
          percentChange(currentPrice, position.liquidationPrice)
        );

        if (distanceToLiq < this.futuresConfig.liquidationBuffer) {
          violations.push(
            `Too close to liquidation: ${distanceToLiq.toFixed(2)}% (buffer: ${this.futuresConfig.liquidationBuffer}%)`
          );
        } else if (distanceToLiq < this.futuresConfig.liquidationBuffer * 1.5) {
          warnings.push(
            `Approaching liquidation buffer: ${distanceToLiq.toFixed(2)}%`
          );
        }
      }
    }

    return { violations, warnings };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('[RISK] Risk config updated', config);
  }

  /**
   * Get current configuration
   */
  getConfig(): RiskConfig {
    return { ...this.config };
  }
}
