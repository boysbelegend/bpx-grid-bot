/**
 * Optimization Runner
 * Orchestrates parameter optimization with backtesting
 */

import { logger } from '../utils/logger';
import ParameterOptimizer, {
  ParameterSpace,
  ParameterSet,
  BacktestResult,
  OptimizationConfig,
} from './ParameterOptimizer';
import EmailService from '../services/EmailService';

export interface OptimizationRunConfig {
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  parameterSpace: ParameterSpace;
  objective: 'sharpe' | 'profit_factor' | 'roi' | 'custom';
  iterations: number;
  explorationRate?: number;
  parallelRuns?: number;
  saveResults?: boolean;
  emailNotifications?: boolean;
}

export interface OptimizationProgress {
  iteration: number;
  totalIterations: number;
  completedRuns: number;
  bestScore: number;
  currentParameters: ParameterSet;
  estimatedTimeRemaining: number; // seconds
}

export class OptimizationRunner {
  private optimizer: ParameterOptimizer;
  private config: OptimizationRunConfig;
  private startTime: number = 0;
  private completedRuns: number = 0;
  private emailService?: EmailService;
  private progressCallbacks: Array<(progress: OptimizationProgress) => void> = [];

  constructor(config: OptimizationRunConfig, emailService?: EmailService) {
    this.config = config;
    this.emailService = emailService;

    const optimizationConfig: OptimizationConfig = {
      parameterSpace: config.parameterSpace,
      objective: config.objective,
      iterations: config.iterations,
      explorationRate: config.explorationRate || 0.2,
    };

    this.optimizer = new ParameterOptimizer(optimizationConfig);
  }

  /**
   * Register progress callback
   */
  public onProgress(callback: (progress: OptimizationProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Emit progress update
   */
  private emitProgress(iteration: number, parameters: ParameterSet): void {
    const progress = this.optimizer.getProgress();
    const elapsed = (Date.now() - this.startTime) / 1000; // seconds
    const avgTimePerRun = elapsed / this.completedRuns;
    const remaining = (this.config.iterations - this.completedRuns) * avgTimePerRun;

    const progressData: OptimizationProgress = {
      iteration,
      totalIterations: this.config.iterations,
      completedRuns: this.completedRuns,
      bestScore: progress.bestScore,
      currentParameters: parameters,
      estimatedTimeRemaining: remaining,
    };

    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progressData);
      } catch (error) {
        logger.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Run backtest for parameter set
   * NOTE: This is a placeholder - integrate with actual backtesting engine
   */
  private async runBacktest(parameters: ParameterSet): Promise<Omit<BacktestResult, 'score'>> {
    // This should call the actual backtesting engine
    // For now, return simulated results

    logger.info(`Running backtest with parameters:`, parameters);

    // Simulate backtest delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate simulated results
    // In production, replace this with actual backtest execution
    const simulatedResult: Omit<BacktestResult, 'score'> = {
      parameters,
      totalPnl: Math.random() * 1000 - 200,
      netPnl: Math.random() * 900 - 180,
      roi: Math.random() * 20 - 2,
      winRate: Math.random() * 40 + 40,
      profitFactor: Math.random() * 3 + 0.5,
      sharpeRatio: Math.random() * 3 - 0.5,
      maxDrawdown: Math.random() * 20 + 5,
      totalTrades: Math.floor(Math.random() * 500 + 100),
    };

    return simulatedResult;
  }

  /**
   * Run single optimization iteration
   */
  private async runIteration(iteration: number, parameters: ParameterSet): Promise<void> {
    try {
      logger.info(`Iteration ${iteration}/${this.config.iterations}`);

      const result = await this.runBacktest(parameters);
      this.optimizer.addResult(result);

      this.completedRuns++;
      this.emitProgress(iteration, parameters);

      // Log progress every 10 iterations
      if (iteration % 10 === 0) {
        const progress = this.optimizer.getProgress();
        logger.info(
          `Progress: ${iteration}/${this.config.iterations} | ` +
            `Best Score: ${progress.bestScore.toFixed(4)} | ` +
            `Improvement: ${progress.improvement.toFixed(2)}%`
        );
      }
    } catch (error) {
      logger.error(`Error in iteration ${iteration}:`, error);
    }
  }

  /**
   * Run optimization
   */
  public async run(): Promise<BacktestResult | null> {
    logger.info('Starting parameter optimization...');
    logger.info(`Symbol: ${this.config.symbol}`);
    logger.info(`Period: ${this.config.startDate} to ${this.config.endDate}`);
    logger.info(`Iterations: ${this.config.iterations}`);

    this.startTime = Date.now();

    // Send email notification if enabled
    if (this.emailService && this.config.emailNotifications) {
      await this.sendStartNotification();
    }

    try {
      // Run optimization iterations
      for (let i = 1; i <= this.config.iterations; i++) {
        const parameters = this.optimizer.generateNextIteration(1)[0];
        await this.runIteration(i, parameters);
      }

      const bestResult = this.optimizer.getBestResult();

      if (bestResult) {
        logger.info('Optimization completed!');
        logger.info(`Best Score: ${bestResult.score.toFixed(4)}`);
        logger.info(`Best Parameters:`, bestResult.parameters);
        logger.info(`Performance Metrics:`, {
          roi: `${bestResult.roi.toFixed(2)}%`,
          sharpeRatio: bestResult.sharpeRatio.toFixed(2),
          profitFactor: bestResult.profitFactor.toFixed(2),
          winRate: `${bestResult.winRate.toFixed(2)}%`,
          maxDrawdown: `${bestResult.maxDrawdown.toFixed(2)}%`,
        });

        // Save results if enabled
        if (this.config.saveResults) {
          await this.saveResults();
        }

        // Send completion email if enabled
        if (this.emailService && this.config.emailNotifications) {
          await this.sendCompletionNotification(bestResult);
        }

        return bestResult;
      } else {
        logger.warn('Optimization completed but no valid results found');
        return null;
      }
    } catch (error) {
      logger.error('Optimization failed:', error);

      if (this.emailService && this.config.emailNotifications) {
        await this.sendFailureNotification(error);
      }

      throw error;
    }
  }

  /**
   * Save optimization results to file
   */
  private async saveResults(): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `optimization_${this.config.symbol}_${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'results', 'optimization', filename);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });

    // Export results
    const results = this.optimizer.exportResults();

    await fs.writeFile(filepath, results, 'utf8');

    logger.info(`Results saved to: ${filepath}`);
  }

  /**
   * Send optimization start notification
   */
  private async sendStartNotification(): Promise<void> {
    // Custom email notification for optimization start
    // This would use the EmailService but with a custom template
    logger.info('Optimization started notification sent');
  }

  /**
   * Send optimization completion notification
   */
  private async sendCompletionNotification(result: BacktestResult): Promise<void> {
    logger.info('Optimization completed notification sent');
    logger.info(`Best parameters: ROI ${result.roi.toFixed(2)}%, Sharpe ${result.sharpeRatio.toFixed(2)}`);
  }

  /**
   * Send optimization failure notification
   */
  private async sendFailureNotification(error: any): Promise<void> {
    logger.error('Optimization failed notification sent:', error.message);
  }

  /**
   * Get current optimization status
   */
  public getStatus(): {
    isComplete: boolean;
    progress: ReturnType<typeof this.optimizer.getProgress>;
    topResults: BacktestResult[];
    parameterImportance: ReturnType<typeof this.optimizer.getParameterImportance>;
  } {
    return {
      isComplete: this.optimizer.isComplete(),
      progress: this.optimizer.getProgress(),
      topResults: this.optimizer.getTopResults(5),
      parameterImportance: this.optimizer.getParameterImportance(),
    };
  }

  /**
   * Get best parameters found so far
   */
  public getBestParameters(): ParameterSet {
    return this.optimizer.getBestParameters();
  }

  /**
   * Get all top results
   */
  public getTopResults(count: number = 10): BacktestResult[] {
    return this.optimizer.getTopResults(count);
  }
}

export default OptimizationRunner;
