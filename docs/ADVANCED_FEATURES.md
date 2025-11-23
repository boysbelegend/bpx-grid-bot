# Advanced Trading Features (Phase 3)

This document describes the advanced trading features implemented in Phase 3.

**Implementation Date:** 2025-11-23  
**Features:** Multi-Pair Trading (C1), Arbitrage Detection (C3), Smart Rebalancing (C2)

---

## 📊 Overview

Phase 3 introduces sophisticated multi-pair trading capabilities:

1. **Portfolio Optimization** - Intelligent capital allocation across pairs
2. **Correlation Analysis** - Diversification management
3. **Arbitrage Detection** - Automated opportunity discovery
4. **Smart Rebalancing** - ML-based position adjustment

---

## C1: Multi-Pair Trading & Portfolio Optimization

### Portfolio Optimizer

**File:** `src/portfolio/PortfolioOptimizer.ts`

Optimizes capital allocation using multiple methods:

#### Allocation Methods

1. **Equal-Weight**
   - Simple 1/N allocation
   - Good baseline strategy

2. **Risk-Parity**
   - Each pair contributes equal risk
   - Weight inversely proportional to volatility

3. **Max-Sharpe**
   - Maximizes risk-adjusted returns
   - Weight proportional to Sharpe ratio

4. **Min-Variance**
   - Minimizes portfolio volatility
   - Conservative approach

#### Usage Example

```typescript
import { PortfolioOptimizer } from './portfolio/PortfolioOptimizer';

const optimizer = new PortfolioOptimizer({
  method: 'max-sharpe',
  constraints: {
    minWeight: 0.05,  // 5% minimum per pair
    maxWeight: 0.40,  // 40% maximum per pair
    maxCorrelation: 0.85,
  },
  riskFreeRate: 0.02, // 2% annual
});

const pairs: PairMetrics[] = [
  {
    symbol: 'SOL_USDC',
    expectedReturn: 0.002,  // 0.2% daily
    volatility: 0.03,
    sharpeRatio: 1.5,
    correlation: new Map([['BTC_USDC', 0.6]]),
    currentWeight: 0.33,
  },
  // ... more pairs
];

const result = optimizer.optimize(pairs);

console.log('Target Weights:', result.targetWeights);
console.log('Expected Return:', result.expectedReturn);
console.log('Expected Sharpe:', result.expectedSharpe);
console.log('Diversification Ratio:', result.diversificationRatio);
```

#### Metrics Calculated

- **Expected Return**: Portfolio-weighted daily return
- **Expected Volatility**: Portfolio risk
- **Expected Sharpe**: Risk-adjusted return
- **Diversification Ratio**: How well-diversified (>1 is good)

---

### Correlation Analyzer

**File:** `src/portfolio/CorrelationAnalyzer.ts`

Monitors price correlations to manage diversification.

#### Features

- Rolling correlation calculation
- Correlation matrix generation
- High correlation alerts
- Diversification scoring (0-100)

#### Usage Example

```typescript
import { CorrelationAnalyzer } from './portfolio/CorrelationAnalyzer';

const analyzer = new CorrelationAnalyzer({
  maxHistoryLength: 100,
  updateIntervalMs: 60000,
});

// Add price data
analyzer.addPriceData('SOL_USDC', 145.32);
analyzer.addPriceData('BTC_USDC', 43250.00);

// Check correlation
const correlation = analyzer.calculatePairCorrelation('SOL_USDC', 'BTC_USDC');
console.log(`Correlation: ${(correlation * 100).toFixed(1)}%`);

// Get highly correlated pairs
const alerts = analyzer.getHighlyCorrelatedPairs(0.7); // 70% threshold
alerts.forEach(alert => {
  console.log(`${alert.pair1} <-> ${alert.pair2}: ${(alert.correlation * 100).toFixed(1)}%`);
});

// Diversification score
const score = analyzer.getDiversificationScore();
console.log(`Diversification: ${score}/100`);
```

#### Correlation Interpretation

| Correlation | Interpretation |
|-------------|----------------|
| > 0.9 | Very high - reduce exposure |
| 0.7 - 0.9 | High - monitor closely |
| 0.3 - 0.7 | Moderate - acceptable |
| < 0.3 | Low - good diversification |

---

## C3: Arbitrage Detection

**File:** `src/arbitrage/ArbitrageDetector.ts`

Detects arbitrage opportunities across trading pairs.

### Types of Arbitrage

1. **Triangular Arbitrage** (3-leg)
   - Example: BTC -> ETH -> SOL -> BTC
   - Exploits price discrepancies in currency cycles

2. **Two-Leg Arbitrage**
   - Example: Implied SOL/BTC vs actual SOL/BTC
   - Simpler, faster execution

### Usage Example

```typescript
import { ArbitrageDetector } from './arbitrage/ArbitrageDetector';

const detector = new ArbitrageDetector({
  minProfitPercent: 0.5,      // 0.5% minimum
  maxExecutionTime: 1000,     // 1 second max
  tradingFee: 0.001,          // 0.1% per trade
  slippageTolerance: 0.002,   // 0.2% slippage
  minVolume: 100,             // $100 minimum
});

// Update prices
detector.updatePrice({
  symbol: 'BTC_USDC',
  bidPrice: 43200,
  askPrice: 43210,
  bidSize: 10,
  askSize: 10,
  timestamp: Date.now(),
});

// Detect opportunities
const opportunities = detector.detectOpportunities();

opportunities.forEach(opp => {
  console.log(`${opp.type} arbitrage:`);
  console.log(`  Path: ${opp.path.join(' -> ')}`);
  console.log(`  Profit: ${opp.profitPercent.toFixed(2)}%`);
  console.log(`  Volume: $${opp.volume.toFixed(2)}`);
  console.log(`  Risk: ${opp.riskLevel}`);
});
```

### Arbitrage Workflow

```
1. Update Prices
   ↓
2. Detect Opportunities
   ↓
3. Calculate Profit (including fees & slippage)
   ↓
4. Filter by minimum profit
   ↓
5. Sort by profitability
   ↓
6. Execute (manual or automated)
```

### Risk Levels

- **Low**: > 2% profit, ≤ 2 legs
- **Medium**: > 1% profit, ≤ 3 legs
- **High**: < 1% profit or complex execution

---

## C2: Smart Rebalancing

**File:** `src/portfolio/SmartRebalancer.ts`

Intelligent rebalancing based on technical analysis.

### Technical Indicators Used

1. **SMA (Simple Moving Average)**
   - Short: 20 periods
   - Long: 50 periods
   - Bullish: SMA20 > SMA50
   - Bearish: SMA20 < SMA50

2. **RSI (Relative Strength Index)**
   - Period: 14
   - Overbought: > 70
   - Oversold: < 30

3. **Momentum**
   - Period: 10
   - Positive: > 5% change
   - Negative: < -5% change

4. **Volatility**
   - Period: 20
   - High: > 3% std dev
   - Low: < 1% std dev

### Decision Logic

```typescript
Score Calculation (0-100):
- SMA analysis: 40% weight
- RSI analysis: 30% weight
- Momentum: 20% weight
- Volatility: 10% weight (defensive)

Actions:
- score > 60: INCREASE weight
- score < -60: DECREASE weight
- else: HOLD
```

### Usage Example

```typescript
import { SmartRebalancingEngine } from './portfolio/SmartRebalancer';

const rebalancer = new SmartRebalancingEngine({
  smaShortPeriod: 20,
  smaLongPeriod: 50,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  minConfidence: 60,
});

// Feed price data
for (const price of historicalPrices) {
  rebalancer.addPrice('SOL_USDC', price);
}

// Generate signal
const signal = rebalancer.generateRebalanceSignal('SOL_USDC', 0.33);

if (signal) {
  console.log(`Action: ${signal.action}`);
  console.log(`Confidence: ${signal.confidence}%`);
  console.log(`Reason: ${signal.reason}`);
  console.log(`Target Weight: ${(signal.targetWeight * 100).toFixed(1)}%`);
  console.log(`Current Weight: ${(signal.currentWeight * 100).toFixed(1)}%`);
}
```

### Signal Interpretation

| Confidence | Action |
|------------|--------|
| > 80% | Strong signal - execute immediately |
| 60-80% | Good signal - execute with caution |
| 40-60% | Weak signal - hold or wait |
| < 40% | No clear signal - hold |

---

## 🔧 Complete Multi-Pair Trading Example

```typescript
import { MultiPairManager } from './engine/MultiPairManager';
import { PortfolioOptimizer } from './portfolio/PortfolioOptimizer';
import { CorrelationAnalyzer } from './portfolio/CorrelationAnalyzer';
import { ArbitrageDetector } from './arbitrage/ArbitrageDetector';
import { SmartRebalancingEngine } from './portfolio/SmartRebalancer';

// 1. Setup multi-pair manager
const manager = new MultiPairManager({
  pairs: {
    'SOL_USDC': {
      strategyPath: './config/sol-grid.json',
      enabled: true,
      weight: 0.4,
    },
    'BTC_USDC': {
      strategyPath: './config/btc-grid.json',
      enabled: true,
      weight: 0.3,
    },
    'ETH_USDC': {
      strategyPath: './config/eth-grid.json',
      enabled: true,
      weight: 0.3,
    },
  },
  global: {
    maxTotalPositionValue: 100000,
    maxDailyLoss: 5000,
    rebalanceInterval: 60, // minutes
    correlationCheck: true,
  },
});

// 2. Setup portfolio optimizer
const optimizer = new PortfolioOptimizer({
  method: 'risk-parity',
  constraints: {
    minWeight: 0.10,
    maxWeight: 0.50,
    maxCorrelation: 0.85,
  },
});

// 3. Setup correlation analyzer
const correlationAnalyzer = new CorrelationAnalyzer();

// 4. Setup arbitrage detector
const arbDetector = new ArbitrageDetector({
  minProfitPercent: 0.5,
  tradingFee: 0.001,
  slippageTolerance: 0.002,
  minVolume: 100,
});

// 5. Setup smart rebalancer
const smartRebalancer = new SmartRebalancingEngine();

// 6. Start trading
await manager.startAll();

// 7. Monitor and optimize
setInterval(async () => {
  // Get current portfolio status
  const summary = manager.getPortfolioSummary();
  
  // Check for arbitrage opportunities
  const arbOpps = arbDetector.detectOpportunities();
  if (arbOpps.length > 0) {
    console.log(`Found ${arbOpps.length} arbitrage opportunities`);
  }
  
  // Check correlations
  const diversification = correlationAnalyzer.getDiversificationScore();
  console.log(`Diversification Score: ${diversification}/100`);
  
  // Generate rebalancing signals
  for (const [symbol, weight] of Object.entries(summary.pairBreakdown)) {
    const signal = smartRebalancer.generateRebalanceSignal(symbol, weight.weight);
    if (signal && signal.confidence > 70) {
      console.log(`${symbol}: ${signal.action} (${signal.confidence}% confidence)`);
    }
  }
}, 60000); // Every minute
```

---

## 📊 Performance Considerations

### CPU Usage
- Correlation analysis: O(n²) where n = number of pairs
- Arbitrage detection: O(n³) for triangular
- Optimization: ~100ms for 10 pairs

### Memory Usage
- Price history: ~2KB per symbol per 100 data points
- Correlation matrix: ~n² * 8 bytes

### Recommendations
- Limit to 10-20 pairs for optimal performance
- Use 100-200 price points for indicators
- Update correlations every 5-10 minutes
- Run arbitrage detection every 1-5 seconds

---

## ⚠️ Risk Warnings

1. **Arbitrage Execution Risk**
   - Prices may move before execution
   - Slippage can eliminate profits
   - Always use limit orders

2. **Correlation Changes**
   - Correlations are not stable
   - Recalculate regularly
   - Don't over-rely on historical data

3. **Over-Optimization**
   - Don't overtrade based on signals
   - Respect minimum confidence thresholds
   - Consider transaction costs

4. **Capital Allocation**
   - Never allocate > 50% to single pair
   - Maintain emergency reserves
   - Respect max position limits

---

## 📚 References

- [Modern Portfolio Theory](https://en.wikipedia.org/wiki/Modern_portfolio_theory)
- [Triangular Arbitrage](https://www.investopedia.com/terms/t/triangulararbitrage.asp)
- [Technical Indicators](https://www.investopedia.com/technical-analysis-4689657)
- [Risk Parity](https://www.investopedia.com/terms/r/risk-parity.asp)

