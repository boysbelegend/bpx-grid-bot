#!/usr/bin/env node
/**
 * Parameter Optimization CLI
 * Run ML-based parameter optimization for grid trading strategies
 */

import { OptimizationRunner, OptimizationRunConfig } from '../optimization/OptimizationRunner';
import { ParameterSpace } from '../optimization/ParameterOptimizer';
import { logger } from '../utils/logger';

// Parse command line arguments
const args = process.argv.slice(2);

function printUsage(): void {
  console.log(`
Usage: node dist/src/scripts/optimize.js [options]

Options:
  --symbol <SYMBOL>          Trading pair symbol (e.g., SOL_USDC)
  --start-date <DATE>        Start date for backtest (YYYY-MM-DD)
  --end-date <DATE>          End date for backtest (YYYY-MM-DD)
  --capital <AMOUNT>         Initial capital (default: 10000)
  --iterations <COUNT>       Number of optimization iterations (default: 50)
  --objective <TYPE>         Optimization objective: sharpe, profit_factor, roi, custom (default: sharpe)
  --exploration <RATE>       Exploration rate 0-1 (default: 0.2)
  --save                     Save results to file
  --email                    Send email notifications

Example:
  node dist/src/scripts/optimize.js --symbol SOL_USDC --start-date 2024-01-01 --end-date 2024-11-23 --iterations 100 --save
  `);
}

function parseArgs(): OptimizationRunConfig | null {
  const config: Partial<OptimizationRunConfig> = {
    initialCapital: 10000,
    iterations: 50,
    objective: 'sharpe',
    explorationRate: 0.2,
    saveResults: false,
    emailNotifications: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
      case '-h':
        printUsage();
        return null;

      case '--symbol':
        config.symbol = args[++i];
        break;

      case '--start-date':
        config.startDate = args[++i];
        break;

      case '--end-date':
        config.endDate = args[++i];
        break;

      case '--capital':
        config.initialCapital = parseFloat(args[++i]);
        break;

      case '--iterations':
        config.iterations = parseInt(args[++i]);
        break;

      case '--objective':
        const obj = args[++i];
        if (['sharpe', 'profit_factor', 'roi', 'custom'].includes(obj)) {
          config.objective = obj as any;
        } else {
          console.error(`Invalid objective: ${obj}`);
          return null;
        }
        break;

      case '--exploration':
        config.explorationRate = parseFloat(args[++i]);
        break;

      case '--save':
        config.saveResults = true;
        break;

      case '--email':
        config.emailNotifications = true;
        break;

      default:
        console.error(`Unknown option: ${args[i]}`);
        return null;
    }
  }

  // Validate required parameters
  if (!config.symbol || !config.startDate || !config.endDate) {
    console.error('Missing required parameters: --symbol, --start-date, --end-date');
    printUsage();
    return null;
  }

  // Define parameter space
  config.parameterSpace = {
    gridLevels: { min: 5, max: 50 },
    gridSpacing: { min: 0.1, max: 5.0 }, // 0.1% to 5%
    positionSize: { min: 1, max: 10 }, // 1% to 10% of capital
    takeProfitDistance: { min: 0.5, max: 10.0 }, // 0.5% to 10%
    stopLossDistance: { min: 2.0, max: 20.0 }, // 2% to 20%
  };

  return config as OptimizationRunConfig;
}

async function main(): Promise<void> {
  const config = parseArgs();

  if (!config) {
    process.exit(1);
  }

  logger.info('='.repeat(60));
  logger.info('BPX Grid Bot - Parameter Optimization');
  logger.info('='.repeat(60));
  logger.info('');

  const runner = new OptimizationRunner(config);

  // Register progress callback
  runner.onProgress((progress) => {
    const pct = ((progress.completedRuns / progress.totalIterations) * 100).toFixed(1);
    const timeRemaining = Math.ceil(progress.estimatedTimeRemaining);

    logger.info(
      `[${pct}%] Iteration ${progress.iteration}/${progress.totalIterations} | ` +
        `Best Score: ${progress.bestScore.toFixed(4)} | ` +
        `ETA: ${timeRemaining}s`
    );
  });

  try {
    const result = await runner.run();

    if (result) {
      logger.info('');
      logger.info('='.repeat(60));
      logger.info('OPTIMIZATION RESULTS');
      logger.info('='.repeat(60));
      logger.info('');
      logger.info('Best Parameters Found:');
      logger.info(`  Grid Levels:         ${result.parameters.gridLevels.toFixed(0)}`);
      logger.info(`  Grid Spacing:        ${result.parameters.gridSpacing.toFixed(2)}%`);
      logger.info(`  Position Size:       ${result.parameters.positionSize.toFixed(2)}%`);
      logger.info(`  Take Profit:         ${result.parameters.takeProfitDistance.toFixed(2)}%`);
      logger.info(`  Stop Loss:           ${result.parameters.stopLossDistance.toFixed(2)}%`);
      logger.info('');
      logger.info('Performance Metrics:');
      logger.info(`  ROI:                 ${result.roi.toFixed(2)}%`);
      logger.info(`  Net PnL:             $${result.netPnl.toFixed(2)}`);
      logger.info(`  Sharpe Ratio:        ${result.sharpeRatio.toFixed(2)}`);
      logger.info(`  Profit Factor:       ${result.profitFactor.toFixed(2)}`);
      logger.info(`  Win Rate:            ${result.winRate.toFixed(2)}%`);
      logger.info(`  Max Drawdown:        ${result.maxDrawdown.toFixed(2)}%`);
      logger.info(`  Total Trades:        ${result.totalTrades}`);
      logger.info(`  Optimization Score:  ${result.score.toFixed(4)}`);
      logger.info('');
      logger.info('='.repeat(60));

      // Get top 5 results
      logger.info('');
      logger.info('Top 5 Parameter Sets:');
      const topResults = runner.getTopResults(5);
      topResults.forEach((r, i) => {
        logger.info(`\n${i + 1}. Score: ${r.score.toFixed(4)} | ROI: ${r.roi.toFixed(2)}% | Sharpe: ${r.sharpeRatio.toFixed(2)}`);
      });

      // Parameter importance
      const status = runner.getStatus();
      if (status.progress.completedIterations >= 10) {
        logger.info('');
        logger.info('Parameter Importance (Correlation with Score):');
        Object.entries(status.parameterImportance).forEach(([param, importance]) => {
          logger.info(`  ${param.padEnd(20)}: ${importance.toFixed(4)}`);
        });
      }

      process.exit(0);
    } else {
      logger.error('Optimization failed to produce results');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Optimization error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}
