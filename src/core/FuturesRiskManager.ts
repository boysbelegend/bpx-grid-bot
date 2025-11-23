/**
 * Futures Risk Manager
 * Manages leverage, liquidation risk, funding fees, and position limits for futures trading
 */

import type {
  RiskConfig,
  FuturesConfig,
  RiskStatus,
  FuturesPosition,
  LiquidationRisk,
  FundingRate,
  Inventory,
} from './interfaces';
import { logger } from '../utils/logger';

export class FuturesRiskManager {
  private config: RiskConfig;
  private futuresConfig: FuturesConfig;

  private initialCapital: number = 0;
  private dailyStartingCapital: number = 0;
  private dailyResetTime: number = 0;

  private maxDrawdown: number = 0;
  private peakEquity: number = 0;

  private fundingFeeWarningThreshold: number = 0.0005; // 0.05% per 8h

  constructor(config: RiskConfig, futuresConfig: FuturesConfig) {
    this.config = config;
    this.futuresConfig = futuresConfig;

    logger.info({ config, futuresConfig }, 'FuturesRiskManager initialized');
  }

  /**
   * Initialize with starting capital
   */
  initialize(capital: number): void {
    this.initialCapital = capital;
    this.dailyStartingCapital = capital;
    this.peakEquity = capital;
    this.dailyResetTime = this.getNextDayStart();

    logger.info({ capital }, 'FuturesRiskManager initialized with capital');
  }

  /**
   * Check comprehensive risk limits for futures
   */
  checkRiskLimits(
    inventory: Inventory,
    currentPrice: number,
    activeOrderCount: number,
    position: FuturesPosition | null,
    fundingRate?: FundingRate
  ): RiskStatus {
    const violations: string[] = [];
    const warnings: string[] = [];

    const currentEquity = inventory.netValue;

    // Reset daily PnL if new day
    if (Date.now() >= this.dailyResetTime) {
      this.dailyStartingCapital = currentEquity;
      this.dailyResetTime = this.getNextDayStart();
      logger.info('Daily PnL reset');
    }

    // 1. Check position size limits
    const currentPositionSize = position ? position.size : 0;
    const positionValue = currentPositionSize * currentPrice;

    if (currentPositionSize > this.config.maxPositionSize) {
      violations.push(
        `Position size (${currentPositionSize.toFixed(4)}) exceeds limit (${this.config.maxPositionSize})`
      );
    }

    if (positionValue > this.config.maxPositionValue) {
      violations.push(
        `Position value ($${positionValue.toFixed(2)}) exceeds limit ($${this.config.maxPositionValue})`
      );
    }

    // Position size warning at 80%
    if (currentPositionSize > this.config.maxPositionSize * 0.8) {
      warnings.push(`Position size at ${((currentPositionSize / this.config.maxPositionSize) * 100).toFixed(1)}% of limit`);
    }

    // 2. Check leverage limits
    let leverageUsed = 1;
    if (position) {
      leverageUsed = position.leverage;

      if (leverageUsed > this.futuresConfig.leverage) {
        violations.push(
          `Leverage (${leverageUsed}x) exceeds configured limit (${this.futuresConfig.leverage}x)`
        );
      }

      if (leverageUsed > this.futuresConfig.leverage * 0.9) {
        warnings.push(`Leverage at ${((leverageUsed / this.futuresConfig.leverage) * 100).toFixed(1)}% of limit`);
      }
    }

    // 3. Check liquidation risk
    let distanceToLiquidation = 100; // Default 100% if no position
    if (position) {
      const liquidationRisk = this.calculateLiquidationRisk(position);

      distanceToLiquidation = liquidationRisk.distancePercent;

      if (liquidationRisk.isHighRisk) {
        violations.push(
          `Liquidation risk too high: ${liquidationRisk.distancePercent.toFixed(2)}% from liquidation price`
        );
      }

      if (liquidationRisk.distancePercent < this.futuresConfig.liquidationBuffer * 2) {
        warnings.push(
          `Approaching liquidation buffer: ${liquidationRisk.distancePercent.toFixed(2)}% distance`
        );
      }
    }

    // 4. Check margin ratio
    if (position && position.marginRatio > 0.8) {
      violations.push(`Margin ratio too high: ${(position.marginRatio * 100).toFixed(2)}%`);
    }

    if (position && position.marginRatio > 0.6) {
      warnings.push(`Margin ratio elevated: ${(position.marginRatio * 100).toFixed(2)}%`);
    }

    // 5. Check daily loss limit
    const dailyPnl = currentEquity - this.dailyStartingCapital;

    if (dailyPnl < -this.config.maxDailyLoss) {
      violations.push(
        `Daily loss ($${Math.abs(dailyPnl).toFixed(2)}) exceeds limit ($${this.config.maxDailyLoss})`
      );
    }

    if (dailyPnl < -this.config.maxDailyLoss * 0.8) {
      warnings.push(`Daily loss at ${((Math.abs(dailyPnl) / this.config.maxDailyLoss) * 100).toFixed(1)}% of limit`);
    }

    // 6. Check emergency stop-loss
    if (this.config.emergencyStopLoss) {
      const drawdown = ((this.peakEquity - currentEquity) / this.peakEquity) * 100;

      if (drawdown > this.config.emergencyStopLoss) {
        violations.push(
          `Emergency stop-loss triggered: ${drawdown.toFixed(2)}% drawdown`
        );
      }
    }

    // Update peak equity
    if (currentEquity > this.peakEquity) {
      this.peakEquity = currentEquity;
    }

    // 7. Check funding rate (warning only)
    if (fundingRate && Math.abs(fundingRate.fundingRate) > this.fundingFeeWarningThreshold) {
      warnings.push(
        `High funding rate: ${(fundingRate.fundingRate * 100).toFixed(4)}% (${fundingRate.fundingRate > 0 ? 'Longs pay shorts' : 'Shorts pay longs'})`
      );
    }

    // 8. Check order count
    if (activeOrderCount > this.config.maxOrderCount) {
      violations.push(
        `Active order count (${activeOrderCount}) exceeds limit (${this.config.maxOrderCount})`
      );
    }

    const metrics = {
      currentPositionSize,
      currentPositionValue: positionValue,
      dailyPnl,
      activeOrderCount,
      leverageUsed,
      distanceToLiquidation,
    };

    const isHealthy = violations.length === 0;

    if (!isHealthy) {
      logger.warn({ violations, warnings, metrics }, 'Risk violations detected');
    } else if (warnings.length > 0) {
      logger.warn({ warnings, metrics }, 'Risk warnings detected');
    }

    return {
      isHealthy,
      violations,
      warnings,
      metrics,
    };
  }

  /**
   * Calculate liquidation risk for a position
   */
  calculateLiquidationRisk(position: FuturesPosition): LiquidationRisk {
    const distancePercent = Math.abs(
      ((position.markPrice - position.liquidationPrice) / position.markPrice) * 100
    );

    const isHighRisk = distancePercent < this.futuresConfig.liquidationBuffer;

    return {
      symbol: position.symbol,
      currentPrice: position.markPrice,
      liquidationPrice: position.liquidationPrice,
      distancePercent,
      buffer: this.futuresConfig.liquidationBuffer,
      isHighRisk,
    };
  }

  /**
   * Check if safe to increase position
   */
  canIncreasePosition(
    currentSize: number,
    additionalSize: number,
    currentPrice: number
  ): { allowed: boolean; reason?: string } {
    const newSize = currentSize + additionalSize;
    const newValue = newSize * currentPrice;

    if (newSize > this.config.maxPositionSize) {
      return {
        allowed: false,
        reason: `New position size (${newSize.toFixed(4)}) would exceed limit (${this.config.maxPositionSize})`,
      };
    }

    if (newValue > this.config.maxPositionValue) {
      return {
        allowed: false,
        reason: `New position value ($${newValue.toFixed(2)}) would exceed limit ($${this.config.maxPositionValue})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Calculate safe position size given current risk
   */
  calculateSafePositionSize(
    currentPrice: number,
    leverage: number,
    equity: number
  ): number {
    // Conservative: use 80% of max limits
    const safetyFactor = 0.8;

    const sizeFromLimit = this.config.maxPositionSize * safetyFactor;
    const sizeFromValue = (this.config.maxPositionValue * safetyFactor) / currentPrice;
    const sizeFromEquity = ((equity * leverage) / currentPrice) * safetyFactor;

    // Return the most conservative
    return Math.min(sizeFromLimit, sizeFromValue, sizeFromEquity);
  }

  /**
   * Check if funding rate is favorable
   */
  isFundingRateFavorable(fundingRate: FundingRate, positionSide: 'Long' | 'Short'): boolean {
    // If long and funding rate is negative (shorts pay longs), it's favorable
    // If short and funding rate is positive (longs pay shorts), it's favorable

    if (positionSide === 'Long') {
      return fundingRate.fundingRate < 0;
    } else {
      return fundingRate.fundingRate > 0;
    }
  }

  /**
   * Estimate daily funding cost
   */
  estimateDailyFundingCost(
    positionValue: number,
    fundingRate: FundingRate
  ): number {
    // Funding happens every 8 hours, so 3 times per day
    return Math.abs(positionValue * fundingRate.fundingRate * 3);
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
   * Get risk summary
   */
  getSummary(): any {
    return {
      initialCapital: this.initialCapital,
      peakEquity: this.peakEquity,
      maxDrawdown: this.maxDrawdown,
      config: {
        maxPositionSize: this.config.maxPositionSize,
        maxPositionValue: this.config.maxPositionValue,
        maxDailyLoss: this.config.maxDailyLoss,
        leverage: this.futuresConfig.leverage,
        marginMode: this.futuresConfig.marginMode,
        liquidationBuffer: this.futuresConfig.liquidationBuffer,
      },
    };
  }

  /**
   * Reset daily metrics
   */
  resetDaily(currentCapital: number): void {
    this.dailyStartingCapital = currentCapital;
    this.dailyResetTime = this.getNextDayStart();

    logger.info({ currentCapital }, 'Daily metrics reset');
  }
}
