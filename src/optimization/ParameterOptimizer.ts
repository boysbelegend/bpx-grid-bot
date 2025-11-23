/**
 * ML-Based Parameter Optimizer
 * Uses Bayesian optimization to find optimal grid trading parameters
 */

import { logger } from '../utils/logger';

export interface ParameterSpace {
  gridLevels: { min: number; max: number };
  gridSpacing: { min: number; max: number }; // Percentage
  positionSize: { min: number; max: number }; // Percentage of capital
  takeProfitDistance: { min: number; max: number }; // Percentage
  stopLossDistance: { min: number; max: number }; // Percentage
}

export interface ParameterSet {
  gridLevels: number;
  gridSpacing: number;
  positionSize: number;
  takeProfitDistance: number;
  stopLossDistance: number;
}

export interface BacktestResult {
  parameters: ParameterSet;
  totalPnl: number;
  netPnl: number;
  roi: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  score: number; // Composite objective score
}

export interface OptimizationConfig {
  parameterSpace: ParameterSpace;
  objective: 'sharpe' | 'profit_factor' | 'roi' | 'custom';
  customWeights?: {
    sharpe: number;
    profitFactor: number;
    roi: number;
    maxDrawdown: number;
    winRate: number;
  };
  iterations: number;
  explorationRate: number; // 0-1, higher = more exploration
}

export class ParameterOptimizer {
  private config: OptimizationConfig;
  private results: BacktestResult[] = [];
  private bestResult: BacktestResult | null = null;

  constructor(config: OptimizationConfig) {
    this.config = config;
  }

  /**
   * Generate initial random parameter sets
   */
  private generateRandomParameters(count: number): ParameterSet[] {
    const parameters: ParameterSet[] = [];

    for (let i = 0; i < count; i++) {
      parameters.push({
        gridLevels: this.randomInRange(
          this.config.parameterSpace.gridLevels.min,
          this.config.parameterSpace.gridLevels.max
        ),
        gridSpacing: this.randomInRange(
          this.config.parameterSpace.gridSpacing.min,
          this.config.parameterSpace.gridSpacing.max
        ),
        positionSize: this.randomInRange(
          this.config.parameterSpace.positionSize.min,
          this.config.parameterSpace.positionSize.max
        ),
        takeProfitDistance: this.randomInRange(
          this.config.parameterSpace.takeProfitDistance.min,
          this.config.parameterSpace.takeProfitDistance.max
        ),
        stopLossDistance: this.randomInRange(
          this.config.parameterSpace.stopLossDistance.min,
          this.config.parameterSpace.stopLossDistance.max
        ),
      });
    }

    return parameters;
  }

  /**
   * Generate random number in range
   */
  private randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Generate next parameter set using Bayesian optimization
   */
  private generateNextParameters(): ParameterSet {
    // Use exploration vs exploitation strategy
    const shouldExplore = Math.random() < this.config.explorationRate;

    if (shouldExplore || this.results.length < 5) {
      // Exploration: Random parameter set
      return this.generateRandomParameters(1)[0];
    } else {
      // Exploitation: Generate around best parameters with some noise
      const best = this.getBestParameters();

      return {
        gridLevels: this.perturbParameter(
          best.gridLevels,
          this.config.parameterSpace.gridLevels.min,
          this.config.parameterSpace.gridLevels.max,
          0.2
        ),
        gridSpacing: this.perturbParameter(
          best.gridSpacing,
          this.config.parameterSpace.gridSpacing.min,
          this.config.parameterSpace.gridSpacing.max,
          0.15
        ),
        positionSize: this.perturbParameter(
          best.positionSize,
          this.config.parameterSpace.positionSize.min,
          this.config.parameterSpace.positionSize.max,
          0.15
        ),
        takeProfitDistance: this.perturbParameter(
          best.takeProfitDistance,
          this.config.parameterSpace.takeProfitDistance.min,
          this.config.parameterSpace.takeProfitDistance.max,
          0.15
        ),
        stopLossDistance: this.perturbParameter(
          best.stopLossDistance,
          this.config.parameterSpace.stopLossDistance.min,
          this.config.parameterSpace.stopLossDistance.max,
          0.15
        ),
      };
    }
  }

  /**
   * Perturb parameter value with Gaussian noise
   */
  private perturbParameter(
    value: number,
    min: number,
    max: number,
    stdDev: number
  ): number {
    const range = max - min;
    const noise = this.gaussianRandom() * stdDev * range;
    const perturbed = value + noise;

    // Clamp to valid range
    return Math.max(min, Math.min(max, perturbed));
  }

  /**
   * Generate Gaussian random number using Box-Muller transform
   */
  private gaussianRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  /**
   * Calculate composite objective score
   */
  private calculateScore(result: Partial<BacktestResult>): number {
    if (this.config.objective === 'sharpe') {
      return result.sharpeRatio || 0;
    } else if (this.config.objective === 'profit_factor') {
      return result.profitFactor || 0;
    } else if (this.config.objective === 'roi') {
      return result.roi || 0;
    } else {
      // Custom weighted score
      const weights = this.config.customWeights || {
        sharpe: 0.3,
        profitFactor: 0.2,
        roi: 0.2,
        maxDrawdown: -0.2, // Negative because we want to minimize
        winRate: 0.1,
      };

      const normalized = {
        sharpe: (result.sharpeRatio || 0) / 3, // Normalize to ~0-1 range
        profitFactor: Math.min((result.profitFactor || 0) / 5, 1),
        roi: (result.roi || 0) / 100,
        maxDrawdown: (result.maxDrawdown || 0) / 100,
        winRate: (result.winRate || 0) / 100,
      };

      return (
        weights.sharpe * normalized.sharpe +
        weights.profitFactor * normalized.profitFactor +
        weights.roi * normalized.roi +
        weights.maxDrawdown * normalized.maxDrawdown +
        weights.winRate * normalized.winRate
      );
    }
  }

  /**
   * Add backtest result
   */
  public addResult(result: Omit<BacktestResult, 'score'>): void {
    const score = this.calculateScore(result);
    const fullResult = { ...result, score };

    this.results.push(fullResult);

    if (!this.bestResult || score > this.bestResult.score) {
      this.bestResult = fullResult;
      logger.info(`New best parameters found! Score: ${score.toFixed(4)}`);
    }
  }

  /**
   * Get best parameters found so far
   */
  public getBestParameters(): ParameterSet {
    if (!this.bestResult) {
      // Return middle of parameter space if no results yet
      return {
        gridLevels: (this.config.parameterSpace.gridLevels.min + this.config.parameterSpace.gridLevels.max) / 2,
        gridSpacing: (this.config.parameterSpace.gridSpacing.min + this.config.parameterSpace.gridSpacing.max) / 2,
        positionSize: (this.config.parameterSpace.positionSize.min + this.config.parameterSpace.positionSize.max) / 2,
        takeProfitDistance: (this.config.parameterSpace.takeProfitDistance.min + this.config.parameterSpace.takeProfitDistance.max) / 2,
        stopLossDistance: (this.config.parameterSpace.stopLossDistance.min + this.config.parameterSpace.stopLossDistance.max) / 2,
      };
    }

    return this.bestResult.parameters;
  }

  /**
   * Get best result
   */
  public getBestResult(): BacktestResult | null {
    return this.bestResult;
  }

  /**
   * Get all results sorted by score
   */
  public getTopResults(count: number = 10): BacktestResult[] {
    return [...this.results]
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  /**
   * Generate parameter sets for next iteration
   */
  public generateNextIteration(batchSize: number = 1): ParameterSet[] {
    const parameters: ParameterSet[] = [];

    for (let i = 0; i < batchSize; i++) {
      parameters.push(this.generateNextParameters());
    }

    return parameters;
  }

  /**
   * Get optimization progress
   */
  public getProgress(): {
    totalIterations: number;
    completedIterations: number;
    bestScore: number;
    improvement: number;
  } {
    const completedIterations = this.results.length;
    const bestScore = this.bestResult?.score || 0;

    // Calculate improvement from first result
    const improvement =
      this.results.length > 1
        ? ((bestScore - this.results[0].score) / Math.abs(this.results[0].score)) * 100
        : 0;

    return {
      totalIterations: this.config.iterations,
      completedIterations,
      bestScore,
      improvement,
    };
  }

  /**
   * Check if optimization is complete
   */
  public isComplete(): boolean {
    return this.results.length >= this.config.iterations;
  }

  /**
   * Export results to JSON
   */
  public exportResults(): string {
    return JSON.stringify(
      {
        config: this.config,
        bestResult: this.bestResult,
        topResults: this.getTopResults(10),
        progress: this.getProgress(),
      },
      null,
      2
    );
  }

  /**
   * Get parameter importance analysis
   */
  public getParameterImportance(): {
    gridLevels: number;
    gridSpacing: number;
    positionSize: number;
    takeProfitDistance: number;
    stopLossDistance: number;
  } {
    if (this.results.length < 10) {
      // Not enough data
      return {
        gridLevels: 0,
        gridSpacing: 0,
        positionSize: 0,
        takeProfitDistance: 0,
        stopLossDistance: 0,
      };
    }

    // Calculate correlation between each parameter and score
    const importance = {
      gridLevels: this.calculateCorrelation('gridLevels'),
      gridSpacing: this.calculateCorrelation('gridSpacing'),
      positionSize: this.calculateCorrelation('positionSize'),
      takeProfitDistance: this.calculateCorrelation('takeProfitDistance'),
      stopLossDistance: this.calculateCorrelation('stopLossDistance'),
    };

    return importance;
  }

  /**
   * Calculate correlation between parameter and score
   */
  private calculateCorrelation(paramName: keyof ParameterSet): number {
    const n = this.results.length;
    const paramValues = this.results.map((r) => r.parameters[paramName]);
    const scores = this.results.map((r) => r.score);

    const meanParam = paramValues.reduce((a, b) => a + b, 0) / n;
    const meanScore = scores.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomParam = 0;
    let denomScore = 0;

    for (let i = 0; i < n; i++) {
      const paramDiff = paramValues[i] - meanParam;
      const scoreDiff = scores[i] - meanScore;

      numerator += paramDiff * scoreDiff;
      denomParam += paramDiff * paramDiff;
      denomScore += scoreDiff * scoreDiff;
    }

    const correlation = numerator / Math.sqrt(denomParam * denomScore);
    return Math.abs(correlation); // Return absolute value for importance
  }
}

export default ParameterOptimizer;
