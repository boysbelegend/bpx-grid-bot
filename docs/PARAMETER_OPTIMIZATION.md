
# ML-Based Parameter Optimization

Automated parameter optimization using Bayesian optimization to find optimal grid trading strategy parameters.

## Overview

The parameter optimization system uses machine learning techniques to automatically discover the best trading parameters for your strategy based on historical data. It employs a Bayesian optimization approach that balances exploration (trying new parameter combinations) with exploitation (refining known good parameters).

## Features

- **Bayesian Optimization**: Intelligent parameter space exploration
- **Multiple Objectives**: Optimize for Sharpe ratio, profit factor, ROI, or custom metrics
- **Parallel Evaluation**: Run multiple backtest iterations concurrently
- **Progress Tracking**: Real-time optimization progress with ETA
- **Parameter Importance Analysis**: Understand which parameters matter most
- **Result Persistence**: Save and compare optimization runs
- **Email Notifications**: Get notified when optimization completes
- **CLI Tool**: Easy-to-use command-line interface

## How It Works

### 1. Bayesian Optimization

The system uses Bayesian optimization to efficiently search the parameter space:

1. **Initial Exploration**: Start with random parameter combinations
2. **Evaluation**: Run backtests for each parameter set
3. **Learning**: Build a model of parameter → performance relationship
4. **Exploitation**: Generate new parameters near known good regions
5. **Exploration**: Occasionally try completely new regions
6. **Iteration**: Repeat until convergence or iteration limit

### 2. Optimization Objectives

You can optimize for different goals:

- **Sharpe Ratio**: Risk-adjusted returns (recommended)
- **Profit Factor**: Ratio of gross profits to gross losses
- **ROI**: Return on investment percentage
- **Custom**: Weighted combination of multiple metrics

### 3. Parameter Space

The system optimizes these grid trading parameters:

| Parameter | Description | Typical Range |
|-----------|-------------|---------------|
| Grid Levels | Number of price levels in the grid | 5 - 50 |
| Grid Spacing | Distance between grid levels (%) | 0.1% - 5% |
| Position Size | Size of each trade (% of capital) | 1% - 10% |
| Take Profit | Distance to take profit (%) | 0.5% - 10% |
| Stop Loss | Distance to stop loss (%) | 2% - 20% |

## Usage

### Command Line Interface

```bash
# Build the project first
yarn build

# Run optimization
node dist/src/scripts/optimize.js \
  --symbol SOL_USDC \
  --start-date 2024-01-01 \
  --end-date 2024-11-23 \
  --iterations 100 \
  --save

# Full options
node dist/src/scripts/optimize.js \
  --symbol SOL_USDC \
  --start-date 2024-01-01 \
  --end-date 2024-11-23 \
  --capital 10000 \
  --iterations 100 \
  --objective sharpe \
  --exploration 0.2 \
  --save \
  --email
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--symbol` | Trading pair symbol | (required) |
| `--start-date` | Backtest start date (YYYY-MM-DD) | (required) |
| `--end-date` | Backtest end date (YYYY-MM-DD) | (required) |
| `--capital` | Initial capital amount | 10000 |
| `--iterations` | Number of optimization iterations | 50 |
| `--objective` | Optimization objective (sharpe, profit_factor, roi, custom) | sharpe |
| `--exploration` | Exploration rate 0-1 (higher = more exploration) | 0.2 |
| `--save` | Save results to file | false |
| `--email` | Send email notifications | false |

### Programmatic Usage

```typescript
import { OptimizationRunner } from './optimization/OptimizationRunner';

const config = {
  symbol: 'SOL_USDC',
  startDate: '2024-01-01',
  endDate: '2024-11-23',
  initialCapital: 10000,
  parameterSpace: {
    gridLevels: { min: 10, max: 30 },
    gridSpacing: { min: 0.5, max: 2.0 },
    positionSize: { min: 2, max: 5 },
    takeProfitDistance: { min: 1.0, max: 5.0 },
    stopLossDistance: { min: 5.0, max: 15.0 },
  },
  objective: 'sharpe' as const,
  iterations: 100,
  explorationRate: 0.2,
  saveResults: true,
};

const runner = new OptimizationRunner(config);

// Track progress
runner.onProgress((progress) => {
  console.log(`Progress: ${progress.completedRuns}/${progress.totalIterations}`);
  console.log(`Best Score: ${progress.bestScore.toFixed(4)}`);
  console.log(`ETA: ${progress.estimatedTimeRemaining}s`);
});

// Run optimization
const result = await runner.run();

if (result) {
  console.log('Best Parameters:', result.parameters);
  console.log('Performance:', {
    roi: `${result.roi.toFixed(2)}%`,
    sharpe: result.sharpeRatio.toFixed(2),
    profitFactor: result.profitFactor.toFixed(2),
  });
}
```

## Example Output

```
============================================================
BPX Grid Bot - Parameter Optimization
============================================================

Starting parameter optimization...
Symbol: SOL_USDC
Period: 2024-01-01 to 2024-11-23
Iterations: 100

[10.0%] Iteration 10/100 | Best Score: 1.8542 | ETA: 180s
[20.0%] Iteration 20/100 | Best Score: 2.1234 | ETA: 144s
[30.0%] Iteration 30/100 | Best Score: 2.3456 | ETA: 126s
...
[100.0%] Iteration 100/100 | Best Score: 2.8901 | ETA: 0s

============================================================
OPTIMIZATION RESULTS
============================================================

Best Parameters Found:
  Grid Levels:         20
  Grid Spacing:        1.25%
  Position Size:       3.50%
  Take Profit:         2.75%
  Stop Loss:           8.50%

Performance Metrics:
  ROI:                 15.75%
  Net PnL:             $1,575.00
  Sharpe Ratio:        2.89
  Profit Factor:       2.15
  Win Rate:            62.50%
  Max Drawdown:        8.25%
  Total Trades:        245
  Optimization Score:  2.8901

============================================================

Top 5 Parameter Sets:

1. Score: 2.8901 | ROI: 15.75% | Sharpe: 2.89
2. Score: 2.7654 | ROI: 14.25% | Sharpe: 2.76
3. Score: 2.6543 | ROI: 13.80% | Sharpe: 2.65
4. Score: 2.5432 | ROI: 13.20% | Sharpe: 2.54
5. Score: 2.4321 | ROI: 12.75% | Sharpe: 2.43

Parameter Importance (Correlation with Score):
  gridSpacing          : 0.7521
  takeProfitDistance   : 0.6834
  gridLevels           : 0.5421
  positionSize         : 0.4521
  stopLossDistance     : 0.3215
```

## Optimization Strategies

### Quick Optimization (50 iterations)

Good for rapid iteration and initial exploration:

```bash
node dist/src/scripts/optimize.js \
  --symbol SOL_USDC \
  --start-date 2024-01-01 \
  --end-date 2024-11-23 \
  --iterations 50 \
  --exploration 0.3
```

### Deep Optimization (200+ iterations)

For finding the absolute best parameters:

```bash
node dist/src/scripts/optimize.js \
  --symbol SOL_USDC \
  --start-date 2024-01-01 \
  --end-date 2024-11-23 \
  --iterations 200 \
  --exploration 0.15 \
  --save
```

### Conservative Exploration

Focus on refining known good regions:

```bash
node dist/src/scripts/optimize.js \
  --symbol SOL_USDC \
  --start-date 2024-01-01 \
  --end-date 2024-11-23 \
  --iterations 100 \
  --exploration 0.1
```

### Aggressive Exploration

Explore more of the parameter space:

```bash
node dist/src/scripts/optimize.js \
  --symbol SOL_USDC \
  --start-date 2024-01-01 \
  --end-date 2024-11-23 \
  --iterations 100 \
  --exploration 0.4
```

## Custom Objective Function

For advanced users, you can define custom weighted objectives:

```typescript
const config = {
  // ... other config
  objective: 'custom' as const,
  customWeights: {
    sharpe: 0.3,        // 30% weight on Sharpe ratio
    profitFactor: 0.2,  // 20% weight on profit factor
    roi: 0.2,           // 20% weight on ROI
    maxDrawdown: -0.2,  // 20% penalty for drawdown
    winRate: 0.1,       // 10% weight on win rate
  },
};
```

## Parameter Space Customization

Narrow down the search space for faster convergence:

```typescript
const config = {
  // ... other config
  parameterSpace: {
    gridLevels: { min: 15, max: 25 },      // Focused range
    gridSpacing: { min: 0.8, max: 1.5 },   // Tight spacing
    positionSize: { min: 3, max: 4 },      // Fixed size range
    takeProfitDistance: { min: 2, max: 4 }, // Moderate TP
    stopLossDistance: { min: 8, max: 12 }, // Tight SL range
  },
};
```

## Results Storage

When using `--save`, results are stored in:

```
results/optimization/optimization_SYMBOL_TIMESTAMP.json
```

Example file structure:

```json
{
  "config": {
    "symbol": "SOL_USDC",
    "iterations": 100,
    "objective": "sharpe"
  },
  "bestResult": {
    "parameters": {
      "gridLevels": 20,
      "gridSpacing": 1.25,
      "positionSize": 3.5,
      "takeProfitDistance": 2.75,
      "stopLossDistance": 8.5
    },
    "roi": 15.75,
    "sharpeRatio": 2.89,
    "profitFactor": 2.15,
    "winRate": 62.5,
    "maxDrawdown": 8.25,
    "totalTrades": 245,
    "score": 2.8901
  },
  "topResults": [...],
  "progress": {...}
}
```

## Best Practices

### 1. Use Sufficient Data

- Minimum: 3 months of historical data
- Recommended: 6-12 months
- More data = more reliable results

### 2. Start Broad, Then Narrow

```bash
# Step 1: Broad exploration (50 iterations)
node dist/src/scripts/optimize.js --iterations 50 --exploration 0.3

# Step 2: Focused optimization (100 iterations)
# Use narrower parameter space based on Step 1 results
node dist/src/scripts/optimize.js --iterations 100 --exploration 0.15
```

### 3. Validate on Unseen Data

Always validate optimized parameters on a different time period:

```bash
# Optimize on Jan-Oct
node dist/src/scripts/optimize.js \
  --start-date 2024-01-01 \
  --end-date 2024-10-31

# Validate on Nov-Dec
# Use the optimized parameters in a backtest on this period
```

### 4. Consider Market Conditions

Optimize separately for different market regimes:

- **Bull Market**: Optimize on uptrending periods
- **Bear Market**: Optimize on downtrending periods
- **Sideways**: Optimize on range-bound periods

### 5. Balance Exploration and Exploitation

| Scenario | Exploration Rate | Description |
|----------|-----------------|-------------|
| Initial run | 0.3 - 0.4 | Explore broadly |
| Refinement | 0.15 - 0.2 | Balance exploration/exploitation |
| Fine-tuning | 0.05 - 0.1 | Exploit known good regions |

## Common Issues

### Optimization Converges Too Quickly

**Problem**: Best parameters found in first 10-20 iterations, then no improvement

**Solutions**:
- Increase exploration rate: `--exploration 0.3`
- Widen parameter space
- Increase iterations to allow more exploration

### No Clear Winner

**Problem**: All parameter sets perform similarly

**Solutions**:
- The strategy may not be sensitive to these parameters
- Try different objective function
- Check if parameter space is too narrow

### Inconsistent Results

**Problem**: Different optimization runs produce very different results

**Solutions**:
- Increase iterations (100+)
- Use more historical data
- Lower exploration rate for stability

### Long Runtime

**Problem**: Optimization takes too long to complete

**Solutions**:
- Reduce iterations
- Narrow parameter space
- Use faster objective (ROI instead of Sharpe)
- Run overnight with `--email` to get notified

## Parameter Importance

The system calculates parameter importance by measuring correlation between each parameter and the optimization score. Higher values mean the parameter has more impact on performance:

```
gridSpacing          : 0.7521  (Most important)
takeProfitDistance   : 0.6834
gridLevels           : 0.5421
positionSize         : 0.4521
stopLossDistance     : 0.3215  (Least important)
```

Use this information to:
1. Focus tuning efforts on important parameters
2. Fix less important parameters to reduce search space
3. Understand strategy behavior

## Integration with Backtesting

The optimizer integrates with the backtesting engine to evaluate each parameter set. To connect your backtest engine:

```typescript
// In OptimizationRunner.ts, update the runBacktest method:
private async runBacktest(parameters: ParameterSet): Promise<Omit<BacktestResult, 'score'>> {
  // Create strategy config from parameters
  const strategyConfig = {
    gridLevels: Math.round(parameters.gridLevels),
    gridSpacing: parameters.gridSpacing / 100,
    positionSizePercent: parameters.positionSize,
    // ... other config
  };

  // Run your backtesting engine
  const backtest = new Backtester(strategyConfig);
  const results = await backtest.run(
    this.config.symbol,
    this.config.startDate,
    this.config.endDate,
    this.config.initialCapital
  );

  // Return results in expected format
  return {
    parameters,
    totalPnl: results.totalPnL,
    netPnl: results.netPnL,
    roi: results.roi,
    winRate: results.winRate,
    profitFactor: results.profitFactor,
    sharpeRatio: results.sharpeRatio,
    maxDrawdown: results.maxDrawdown,
    totalTrades: results.totalTrades,
  };
}
```

## License

Same as main project (MIT)
