/**
 * Auto Stop-Loss/Take-Profit Adjuster
 * Dynamically adjusts stop-loss and take-profit levels based on market conditions
 */

import { logger } from '../utils/logger';

export interface StopLossTakeProfitConfig {
  // Stop Loss settings
  baseStopLoss: number; // Base SL distance as %
  minStopLoss: number; // Minimum SL distance as %
  maxStopLoss: number; // Maximum SL distance as %

  // Take Profit settings
  baseTakeProfit: number; // Base TP distance as %
  minTakeProfit: number; // Minimum TP distance as %
  maxTakeProfit: number; // Maximum TP distance as %

  // Dynamic adjustment
  useATR: boolean; // Use Average True Range for adjustment
  atrMultiplierSL: number; // ATR multiplier for stop loss
  atrMultiplierTP: number; // ATR multiplier for take profit
  volatilityAdjustment: boolean; // Adjust based on volatility
  trendAdjustment: boolean; // Adjust based on trend
}

export interface StopLossTakeProfitLevels {
  stopLoss: {
    price: number;
    distance: number; // %
    reason: string;
  };
  takeProfit: {
    price: number;
    distance: number; // %
    reason: string;
  };
  trailingStop?: {
    price: number;
    distance: number; // %
  };
}

export class AutoStopLossTakeProfit {
  private config: StopLossTakeProfitConfig;
  private priceHistory: number[] = [];

  constructor(config: StopLossTakeProfitConfig) {
    this.config = config;
  }

  /**
   * Calculate stop-loss and take-profit levels
   */
  public calculateLevels(
    entryPrice: number,
    side: 'buy' | 'sell',
    volatility?: number,
    trend?: number
  ): StopLossTakeProfitLevels {
    let stopLossDistance = this.config.baseStopLoss;
    let takeProfitDistance = this.config.baseTakeProfit;
    let reason = 'base';

    // Adjust based on ATR if enabled
    if (this.config.useATR) {
      const atr = this.calculateATR();
      if (atr > 0) {
        const atrPercent = (atr / entryPrice) * 100;
        stopLossDistance = atrPercent * this.config.atrMultiplierSL;
        takeProfitDistance = atrPercent * this.config.atrMultiplierTP;
        reason = 'ATR';
      }
    }

    // Adjust based on volatility
    if (this.config.volatilityAdjustment && volatility) {
      const volAdjustment = volatility / 20; // Normalize to ~20% target vol
      stopLossDistance *= volAdjustment;
      takeProfitDistance *= volAdjustment;
      reason += volAdjustment > 1 ? '+vol' : '-vol';
    }

    // Adjust based on trend
    if (this.config.trendAdjustment && trend !== undefined) {
      // Wider TP in trending markets, tighter SL
      if ((side === 'buy' && trend > 0) || (side === 'sell' && trend < 0)) {
        takeProfitDistance *= 1 + Math.abs(trend) * 0.5; // Up to 50% wider TP
        stopLossDistance *= 1 - Math.abs(trend) * 0.2; // Up to 20% tighter SL
        reason += '+trend';
      }
    }

    // Clamp to min/max
    stopLossDistance = Math.max(
      this.config.minStopLoss,
      Math.min(this.config.maxStopLoss, stopLossDistance)
    );

    takeProfitDistance = Math.max(
      this.config.minTakeProfit,
      Math.min(this.config.maxTakeProfit, takeProfitDistance)
    );

    // Calculate prices
    const stopLossPrice =
      side === 'buy'
        ? entryPrice * (1 - stopLossDistance / 100)
        : entryPrice * (1 + stopLossDistance / 100);

    const takeProfitPrice =
      side === 'buy'
        ? entryPrice * (1 + takeProfitDistance / 100)
        : entryPrice * (1 - takeProfitDistance / 100);

    logger.debug('[SL/TP Adjuster] Calculated levels', {
      entryPrice,
      side,
      stopLoss: stopLossDistance.toFixed(2) + '%',
      takeProfit: takeProfitDistance.toFixed(2) + '%',
      reason,
    });

    return {
      stopLoss: {
        price: stopLossPrice,
        distance: stopLossDistance,
        reason,
      },
      takeProfit: {
        price: takeProfitPrice,
        distance: takeProfitDistance,
        reason,
      },
    };
  }

  /**
   * Calculate trailing stop level
   */
  public calculateTrailingStop(
    entryPrice: number,
    currentPrice: number,
    side: 'buy' | 'sell',
    trailingPercent: number = 2.0
  ): number {
    if (side === 'buy') {
      // For long positions, trail below current price
      const profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

      if (profitPercent > trailingPercent) {
        // Activate trailing stop
        return currentPrice * (1 - trailingPercent / 100);
      }
    } else {
      // For short positions, trail above current price
      const profitPercent = ((entryPrice - currentPrice) / entryPrice) * 100;

      if (profitPercent > trailingPercent) {
        // Activate trailing stop
        return currentPrice * (1 + trailingPercent / 100);
      }
    }

    // Trailing stop not activated yet
    return 0;
  }

  /**
   * Check if stop-loss or take-profit is hit
   */
  public checkLevels(
    currentPrice: number,
    levels: StopLossTakeProfitLevels,
    side: 'buy' | 'sell'
  ): { stopLossHit: boolean; takeProfitHit: boolean; trailingStopHit: boolean } {
    let stopLossHit = false;
    let takeProfitHit = false;
    let trailingStopHit = false;

    if (side === 'buy') {
      stopLossHit = currentPrice <= levels.stopLoss.price;
      takeProfitHit = currentPrice >= levels.takeProfit.price;

      if (levels.trailingStop) {
        trailingStopHit = currentPrice <= levels.trailingStop.price;
      }
    } else {
      stopLossHit = currentPrice >= levels.stopLoss.price;
      takeProfitHit = currentPrice <= levels.takeProfit.price;

      if (levels.trailingStop) {
        trailingStopHit = currentPrice >= levels.trailingStop.price;
      }
    }

    return { stopLossHit, takeProfitHit, trailingStopHit };
  }

  /**
   * Calculate Average True Range (ATR)
   */
  private calculateATR(period: number = 14): number {
    if (this.priceHistory.length < period + 1) return 0;

    const trueRanges: number[] = [];

    for (let i = 1; i < this.priceHistory.length; i++) {
      const high = this.priceHistory[i];
      const low = this.priceHistory[i];
      const prevClose = this.priceHistory[i - 1];

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      trueRanges.push(tr);
    }

    // Calculate average of last 'period' true ranges
    const recentTR = trueRanges.slice(-period);
    const atr = recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length;

    return atr;
  }

  /**
   * Update price history
   */
  public updatePriceHistory(price: number): void {
    this.priceHistory.push(price);

    // Keep last 100 prices
    if (this.priceHistory.length > 100) {
      this.priceHistory.shift();
    }
  }

  /**
   * Update stop-loss and take-profit levels dynamically
   */
  public updateLevels(
    currentLevels: StopLossTakeProfitLevels,
    currentPrice: number,
    side: 'buy' | 'sell',
    volatility?: number
  ): StopLossTakeProfitLevels {
    // Recalculate with current market conditions
    const newLevels = this.calculateLevels(currentPrice, side, volatility);

    // Only tighten stop-loss, never widen
    if (side === 'buy') {
      newLevels.stopLoss.price = Math.max(
        currentLevels.stopLoss.price,
        newLevels.stopLoss.price
      );
    } else {
      newLevels.stopLoss.price = Math.min(
        currentLevels.stopLoss.price,
        newLevels.stopLoss.price
      );
    }

    return newLevels;
  }

  /**
   * Get break-even price (entry + fees)
   */
  public getBreakEvenPrice(entryPrice: number, feeRate: number, side: 'buy' | 'sell'): number {
    const totalFeePercent = feeRate * 2; // Entry + exit fees

    if (side === 'buy') {
      return entryPrice * (1 + totalFeePercent / 100);
    } else {
      return entryPrice * (1 - totalFeePercent / 100);
    }
  }
}

export default AutoStopLossTakeProfit;
