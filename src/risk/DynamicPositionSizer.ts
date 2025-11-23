/**
 * Dynamic Position Sizer
 * Adjusts position sizes based on volatility, portfolio risk, and market conditions
 */

import { logger } from '../utils/logger';

export interface PositionSizingConfig {
  baseSize: number; // Base position size as % of capital
  minSize: number; // Minimum position size as % of capital
  maxSize: number; // Maximum position size as % of capital
  riskPerTrade: number; // Maximum risk per trade as % of capital
  volatilityWindow: number; // Number of periods for volatility calculation
  volatilityTarget: number; // Target volatility (annualized)
  method: 'fixed' | 'volatility' | 'kelly' | 'risk-parity';
}

export interface MarketConditions {
  volatility: number; // Current volatility (annualized)
  trend: number; // Trend strength (-1 to 1)
  recentPnL: number; // Recent PnL
  drawdown: number; // Current drawdown %
  winRate: number; // Recent win rate (0-1)
}

export class DynamicPositionSizer {
  private config: PositionSizingConfig;
  private priceHistory: number[] = [];

  constructor(config: PositionSizingConfig) {
    this.config = config;
  }

  /**
   * Calculate position size based on current market conditions
   */
  public calculatePositionSize(
    capital: number,
    marketConditions: MarketConditions
  ): number {
    let sizePercent: number;

    switch (this.config.method) {
      case 'volatility':
        sizePercent = this.calculateVolatilityBasedSize(marketConditions);
        break;

      case 'kelly':
        sizePercent = this.calculateKellySize(marketConditions);
        break;

      case 'risk-parity':
        sizePercent = this.calculateRiskParitySize(marketConditions);
        break;

      case 'fixed':
      default:
        sizePercent = this.config.baseSize;
    }

    // Apply drawdown adjustment
    sizePercent = this.applyDrawdownAdjustment(sizePercent, marketConditions.drawdown);

    // Clamp to min/max
    sizePercent = Math.max(
      this.config.minSize,
      Math.min(this.config.maxSize, sizePercent)
    );

    const positionSize = (capital * sizePercent) / 100;

    logger.debug('[Position Sizer] Calculated size', {
      method: this.config.method,
      sizePercent: sizePercent.toFixed(2) + '%',
      positionSize: positionSize.toFixed(2),
      volatility: marketConditions.volatility.toFixed(2),
      drawdown: marketConditions.drawdown.toFixed(2),
    });

    return positionSize;
  }

  /**
   * Volatility-based position sizing
   * Inverse relationship: Higher volatility = smaller position
   */
  private calculateVolatilityBasedSize(conditions: MarketConditions): number {
    const { volatility, volatilityTarget } = { ...conditions, ...this.config };

    if (volatility === 0) return this.config.baseSize;

    // Inverse volatility scaling
    const volatilityRatio = volatilityTarget / volatility;
    const adjustedSize = this.config.baseSize * volatilityRatio;

    return adjustedSize;
  }

  /**
   * Kelly Criterion position sizing
   * Optimal position size based on edge and win rate
   */
  private calculateKellySize(conditions: MarketConditions): number {
    const { winRate, recentPnL } = conditions;

    if (winRate === 0 || winRate === 1) return this.config.baseSize;

    // Simplified Kelly: f = (bp - q) / b
    // where b = odds, p = win probability, q = loss probability
    const avgWin = recentPnL > 0 ? recentPnL : 1;
    const avgLoss = recentPnL < 0 ? Math.abs(recentPnL) : 1;
    const b = avgWin / avgLoss; // Odds
    const p = winRate;
    const q = 1 - winRate;

    const kelly = (b * p - q) / b;

    // Use fractional Kelly (25%) for safety
    const fractionalKelly = kelly * 0.25;

    // Convert to position size percentage
    const sizePercent = this.config.baseSize * (1 + fractionalKelly);

    return Math.max(0, sizePercent);
  }

  /**
   * Risk Parity position sizing
   * Equal risk allocation across positions
   */
  private calculateRiskParitySize(conditions: MarketConditions): number {
    const { volatility } = conditions;

    if (volatility === 0) return this.config.baseSize;

    // Target risk per position
    const targetRisk = this.config.riskPerTrade;

    // Position size = target risk / volatility
    const sizePercent = (targetRisk / volatility) * 100;

    return sizePercent;
  }

  /**
   * Apply drawdown adjustment
   * Reduce position size during drawdowns
   */
  private applyDrawdownAdjustment(size: number, drawdown: number): number {
    if (drawdown <= 0) return size;

    // Reduce size by drawdown percentage
    // Max 50% reduction at 20% drawdown
    const reductionFactor = Math.min(drawdown / 20, 0.5);
    const adjustedSize = size * (1 - reductionFactor);

    return adjustedSize;
  }

  /**
   * Calculate realized volatility from price history
   */
  public calculateVolatility(prices: number[], annualize: boolean = true): number {
    if (prices.length < 2) return 0;

    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(ret);
    }

    // Calculate standard deviation
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Annualize (assuming daily prices)
    if (annualize) {
      return stdDev * Math.sqrt(365) * 100; // Convert to percentage
    }

    return stdDev * 100;
  }

  /**
   * Update price history for volatility calculation
   */
  public updatePriceHistory(price: number): void {
    this.priceHistory.push(price);

    // Keep only the window we need
    if (this.priceHistory.length > this.config.volatilityWindow) {
      this.priceHistory.shift();
    }
  }

  /**
   * Get current calculated volatility
   */
  public getCurrentVolatility(): number {
    return this.calculateVolatility(this.priceHistory);
  }

  /**
   * Calculate position size for grid level
   */
  public calculateGridLevelSize(
    capital: number,
    gridLevel: number,
    totalLevels: number,
    marketConditions: MarketConditions
  ): number {
    // Base size from dynamic calculation
    const baseSize = this.calculatePositionSize(capital, marketConditions);

    // Distribute across grid levels
    const levelSize = baseSize / totalLevels;

    // Adjust based on distance from center
    // Closer levels get slightly larger sizes
    const centerDistance = Math.abs(gridLevel - totalLevels / 2) / (totalLevels / 2);
    const distanceAdjustment = 1 - centerDistance * 0.3; // Up to 30% reduction for far levels

    return levelSize * distanceAdjustment;
  }
}

export default DynamicPositionSizer;
