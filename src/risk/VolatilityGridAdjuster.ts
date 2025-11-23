/**
 * Volatility-Based Grid Adjuster
 * Dynamically adjusts grid spacing based on market volatility
 */

import { logger } from '../utils/logger';

export interface GridAdjustmentConfig {
  baseSpacing: number; // Base grid spacing as %
  minSpacing: number; // Minimum spacing as %
  maxSpacing: number; // Maximum spacing as %
  volatilityWindow: number; // Periods for volatility calc
  targetVolatility: number; // Target volatility level
  adjustmentSpeed: number; // How quickly to adjust (0-1)
  rebalanceThreshold: number; // % change to trigger rebalance
}

export interface GridMetrics {
  currentSpacing: number;
  recommendedSpacing: number;
  volatility: number;
  priceRange: { min: number; max: number };
  shouldRebalance: boolean;
}

export class VolatilityGridAdjuster {
  private config: GridAdjustmentConfig;
  private priceHistory: number[] = [];
  private lastSpacing: number;
  private lastRebalanceTime: number = 0;

  constructor(config: GridAdjustmentConfig) {
    this.config = config;
    this.lastSpacing = config.baseSpacing;
  }

  /**
   * Calculate optimal grid spacing based on current volatility
   */
  public calculateOptimalSpacing(currentPrice: number): GridMetrics {
    // Calculate current volatility
    const volatility = this.calculateVolatility();

    // Calculate recommended spacing
    let recommendedSpacing: number;

    if (volatility === 0) {
      recommendedSpacing = this.config.baseSpacing;
    } else {
      // Higher volatility = wider spacing
      const volatilityRatio = volatility / this.config.targetVolatility;
      recommendedSpacing = this.config.baseSpacing * volatilityRatio;
    }

    // Apply adjustment speed (smooth transitions)
    const adjustedSpacing =
      this.lastSpacing +
      (recommendedSpacing - this.lastSpacing) * this.config.adjustmentSpeed;

    // Clamp to min/max
    const finalSpacing = Math.max(
      this.config.minSpacing,
      Math.min(this.config.maxSpacing, adjustedSpacing)
    );

    // Check if rebalance is needed
    const spacingChange = Math.abs((finalSpacing - this.lastSpacing) / this.lastSpacing);
    const shouldRebalance = spacingChange >= this.config.rebalanceThreshold;

    // Calculate price range based on spacing
    const priceRange = this.calculatePriceRange(currentPrice, finalSpacing);

    const metrics: GridMetrics = {
      currentSpacing: this.lastSpacing,
      recommendedSpacing: finalSpacing,
      volatility,
      priceRange,
      shouldRebalance,
    };

    logger.debug('[Grid Adjuster] Calculated spacing', {
      volatility: volatility.toFixed(2) + '%',
      currentSpacing: this.lastSpacing.toFixed(2) + '%',
      recommendedSpacing: finalSpacing.toFixed(2) + '%',
      shouldRebalance,
    });

    return metrics;
  }

  /**
   * Apply grid adjustment
   */
  public applyAdjustment(metrics: GridMetrics): void {
    if (metrics.shouldRebalance) {
      this.lastSpacing = metrics.recommendedSpacing;
      this.lastRebalanceTime = Date.now();

      logger.info('[Grid Adjuster] Grid rebalanced', {
        newSpacing: metrics.recommendedSpacing.toFixed(2) + '%',
        volatility: metrics.volatility.toFixed(2) + '%',
      });
    }
  }

  /**
   * Calculate historical volatility
   */
  private calculateVolatility(): number {
    if (this.priceHistory.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < this.priceHistory.length; i++) {
      const ret = (this.priceHistory[i] - this.priceHistory[i - 1]) / this.priceHistory[i - 1];
      returns.push(ret);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Annualize and convert to percentage
    return stdDev * Math.sqrt(365) * 100;
  }

  /**
   * Calculate price range for grid based on spacing
   */
  private calculatePriceRange(
    currentPrice: number,
    spacing: number
  ): { min: number; max: number } {
    // Assume grid covers +/- 20 levels
    const levels = 20;
    const range = (spacing / 100) * currentPrice * levels;

    return {
      min: currentPrice - range,
      max: currentPrice + range,
    };
  }

  /**
   * Update price history
   */
  public updatePriceHistory(price: number): void {
    this.priceHistory.push(price);

    if (this.priceHistory.length > this.config.volatilityWindow) {
      this.priceHistory.shift();
    }
  }

  /**
   * Get current grid spacing
   */
  public getCurrentSpacing(): number {
    return this.lastSpacing;
  }

  /**
   * Check if grid needs rebalancing
   */
  public needsRebalance(currentPrice: number, minTimeBetweenRebalance: number = 3600000): boolean {
    // Don't rebalance too frequently
    if (Date.now() - this.lastRebalanceTime < minTimeBetweenRebalance) {
      return false;
    }

    const metrics = this.calculateOptimalSpacing(currentPrice);
    return metrics.shouldRebalance;
  }

  /**
   * Get time since last rebalance
   */
  public getTimeSinceLastRebalance(): number {
    return Date.now() - this.lastRebalanceTime;
  }

  /**
   * Reset grid adjuster
   */
  public reset(): void {
    this.priceHistory = [];
    this.lastSpacing = this.config.baseSpacing;
    this.lastRebalanceTime = 0;
  }
}

export default VolatilityGridAdjuster;
