/**
 * Portfolio Optimizer
 * Optimizes capital allocation across multiple trading pairs
 */

import { logger } from '../utils';

export interface PairMetrics {
  symbol: string;
  expectedReturn: number;      // Expected daily return
  volatility: number;           // Daily volatility
  sharpeRatio: number;          // Risk-adjusted return
  correlation: Map<string, number>; // Correlation with other pairs
  currentWeight: number;        // Current portfolio weight
}

export interface OptimizationResult {
  targetWeights: Map<string, number>;
  expectedReturn: number;
  expectedVolatility: number;
  expectedSharpe: number;
  diversificationRatio: number;
}

export interface OptimizationConfig {
  method: 'equal-weight' | 'risk-parity' | 'max-sharpe' | 'min-variance';
  constraints?: {
    minWeight?: number;       // Minimum weight per pair (e.g., 0.05 = 5%)
    maxWeight?: number;       // Maximum weight per pair (e.g., 0.4 = 40%)
    maxCorrelation?: number;  // Maximum allowed correlation
  };
  riskFreeRate?: number;      // Annual risk-free rate (for Sharpe)
}

/**
 * Portfolio Optimizer
 * Calculates optimal capital allocation across trading pairs
 */
export class PortfolioOptimizer {
  private config: OptimizationConfig;

  constructor(config: OptimizationConfig) {
    this.config = config;
  }

  /**
   * Optimize portfolio allocation
   */
  public optimize(pairs: PairMetrics[]): OptimizationResult {
    logger.info({ method: this.config.method, pairCount: pairs.length }, 'Optimizing portfolio allocation');

    let targetWeights: Map<string, number>;

    switch (this.config.method) {
      case 'equal-weight':
        targetWeights = this.equalWeight(pairs);
        break;
      case 'risk-parity':
        targetWeights = this.riskParity(pairs);
        break;
      case 'max-sharpe':
        targetWeights = this.maxSharpe(pairs);
        break;
      case 'min-variance':
        targetWeights = this.minVariance(pairs);
        break;
      default:
        throw new Error(`Unknown optimization method: ${this.config.method}`);
    }

    // Apply constraints
    targetWeights = this.applyConstraints(targetWeights, pairs);

    // Calculate portfolio metrics
    const portfolioMetrics = this.calculatePortfolioMetrics(targetWeights, pairs);

    return {
      targetWeights,
      ...portfolioMetrics,
    };
  }

  /**
   * Equal-weight allocation
   * Simple but effective baseline
   */
  private equalWeight(pairs: PairMetrics[]): Map<string, number> {
    const weight = 1 / pairs.length;
    const weights = new Map<string, number>();

    pairs.forEach(pair => {
      weights.set(pair.symbol, weight);
    });

    logger.debug({ weight }, 'Equal-weight allocation calculated');
    return weights;
  }

  /**
   * Risk-parity allocation
   * Each pair contributes equal risk to the portfolio
   */
  private riskParity(pairs: PairMetrics[]): Map<string, number> {
    const weights = new Map<string, number>();

    // Weight inversely proportional to volatility
    const totalInverseVol = pairs.reduce((sum, pair) => sum + (1 / pair.volatility), 0);

    pairs.forEach(pair => {
      const weight = (1 / pair.volatility) / totalInverseVol;
      weights.set(pair.symbol, weight);
    });

    logger.debug('Risk-parity allocation calculated');
    return weights;
  }

  /**
   * Maximum Sharpe ratio allocation
   * Maximize risk-adjusted returns
   */
  private maxSharpe(pairs: PairMetrics[]): Map<string, number> {
    const weights = new Map<string, number>();
    const riskFreeRate = (this.config.riskFreeRate || 0.02) / 365; // Daily risk-free rate

    // Weight proportional to Sharpe ratio
    const totalSharpe = pairs.reduce((sum, pair) => {
      const excessReturn = pair.expectedReturn - riskFreeRate;
      const sharpe = pair.volatility > 0 ? excessReturn / pair.volatility : 0;
      return sum + Math.max(0, sharpe); // Only positive Sharpe ratios
    }, 0);

    if (totalSharpe === 0) {
      logger.warn('All pairs have non-positive Sharpe ratios, falling back to equal weight');
      return this.equalWeight(pairs);
    }

    pairs.forEach(pair => {
      const excessReturn = pair.expectedReturn - riskFreeRate;
      const sharpe = pair.volatility > 0 ? excessReturn / pair.volatility : 0;
      const weight = Math.max(0, sharpe) / totalSharpe;
      weights.set(pair.symbol, weight);
    });

    logger.debug('Max-Sharpe allocation calculated');
    return weights;
  }

  /**
   * Minimum variance allocation
   * Minimize portfolio volatility
   */
  private minVariance(pairs: PairMetrics[]): Map<string, number> {
    const weights = new Map<string, number>();
    const n = pairs.length;

    // Simplified minimum variance (diagonal covariance matrix)
    // For full implementation, would need to solve quadratic programming problem
    const totalInverseVar = pairs.reduce((sum, pair) => sum + (1 / (pair.volatility ** 2)), 0);

    pairs.forEach(pair => {
      const weight = (1 / (pair.volatility ** 2)) / totalInverseVar;
      weights.set(pair.symbol, weight);
    });

    logger.debug('Minimum variance allocation calculated');
    return weights;
  }

  /**
   * Apply constraints to weights
   */
  private applyConstraints(
    weights: Map<string, number>,
    pairs: PairMetrics[]
  ): Map<string, number> {
    const constraints = this.config.constraints || {};
    const minWeight = constraints.minWeight || 0.01; // 1% minimum
    const maxWeight = constraints.maxWeight || 0.50; // 50% maximum
    const maxCorrelation = constraints.maxCorrelation || 0.9;

    const constrainedWeights = new Map<string, number>();

    // Apply min/max constraints
    weights.forEach((weight, symbol) => {
      let constrainedWeight = Math.max(minWeight, Math.min(maxWeight, weight));
      constrainedWeights.set(symbol, constrainedWeight);
    });

    // Check correlation constraints
    if (maxCorrelation < 1.0) {
      pairs.forEach(pair1 => {
        pairs.forEach(pair2 => {
          if (pair1.symbol !== pair2.symbol) {
            const correlation = pair1.correlation.get(pair2.symbol) || 0;
            if (Math.abs(correlation) > maxCorrelation) {
              // Reduce weight of the pair with lower Sharpe ratio
              const weight1 = constrainedWeights.get(pair1.symbol) || 0;
              const weight2 = constrainedWeights.get(pair2.symbol) || 0;

              if (pair1.sharpeRatio < pair2.sharpeRatio && weight1 > minWeight) {
                constrainedWeights.set(pair1.symbol, weight1 * 0.8);
              } else if (weight2 > minWeight) {
                constrainedWeights.set(pair2.symbol, weight2 * 0.8);
              }

              logger.warn(
                { pair1: pair1.symbol, pair2: pair2.symbol, correlation },
                'High correlation detected, reducing weights'
              );
            }
          }
        });
      });
    }

    // Normalize weights to sum to 1
    const totalWeight = Array.from(constrainedWeights.values()).reduce((sum, w) => sum + w, 0);
    constrainedWeights.forEach((weight, symbol) => {
      constrainedWeights.set(symbol, weight / totalWeight);
    });

    return constrainedWeights;
  }

  /**
   * Calculate portfolio-level metrics
   */
  private calculatePortfolioMetrics(
    weights: Map<string, number>,
    pairs: PairMetrics[]
  ): {
    expectedReturn: number;
    expectedVolatility: number;
    expectedSharpe: number;
    diversificationRatio: number;
  } {
    // Expected return (weighted average)
    let expectedReturn = 0;
    pairs.forEach(pair => {
      const weight = weights.get(pair.symbol) || 0;
      expectedReturn += weight * pair.expectedReturn;
    });

    // Portfolio variance (simplified - assumes diagonal covariance)
    let portfolioVariance = 0;
    pairs.forEach(pair => {
      const weight = weights.get(pair.symbol) || 0;
      portfolioVariance += (weight ** 2) * (pair.volatility ** 2);
    });

    const expectedVolatility = Math.sqrt(portfolioVariance);

    // Sharpe ratio
    const riskFreeRate = (this.config.riskFreeRate || 0.02) / 365;
    const expectedSharpe = expectedVolatility > 0
      ? (expectedReturn - riskFreeRate) / expectedVolatility
      : 0;

    // Diversification ratio (weighted avg vol / portfolio vol)
    let weightedAvgVol = 0;
    pairs.forEach(pair => {
      const weight = weights.get(pair.symbol) || 0;
      weightedAvgVol += weight * pair.volatility;
    });
    const diversificationRatio = expectedVolatility > 0 ? weightedAvgVol / expectedVolatility : 1;

    return {
      expectedReturn,
      expectedVolatility,
      expectedSharpe,
      diversificationRatio,
    };
  }

  /**
   * Calculate rebalancing recommendations
   */
  public getRebalancingActions(
    current: Map<string, number>,
    target: Map<string, number>,
    threshold: number = 0.05 // 5% deviation threshold
  ): Array<{ symbol: string; action: 'increase' | 'decrease' | 'hold'; current: number; target: number; diff: number }> {
    const actions: Array<{ symbol: string; action: 'increase' | 'decrease' | 'hold'; current: number; target: number; diff: number }> = [];

    target.forEach((targetWeight, symbol) => {
      const currentWeight = current.get(symbol) || 0;
      const diff = targetWeight - currentWeight;
      const absDeviation = Math.abs(diff);

      let action: 'increase' | 'decrease' | 'hold' = 'hold';
      if (absDeviation > threshold) {
        action = diff > 0 ? 'increase' : 'decrease';
      }

      actions.push({
        symbol,
        action,
        current: currentWeight,
        target: targetWeight,
        diff,
      });
    });

    return actions.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }
}
