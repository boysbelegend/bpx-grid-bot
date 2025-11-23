# Database & Analytics System

Complete database integration and advanced analytics for the BPX Grid Bot.

## Overview

The system now includes:
- **SQLite Database**: Persistent storage for all trading data
- **Trade History**: Complete record of all executed trades
- **Performance Metrics**: Aggregated daily/monthly performance analytics
- **Advanced Analytics**: Sharpe ratio, profit factor, win rate, and more
- **Report Generation**: Daily, weekly, and monthly performance reports
- **Data Export**: CSV export functionality

## Database Schema

### Tables

#### 1. `sessions`
Trading session records
- `session_id`: Unique session identifier
- `symbol`: Trading pair
- `market_type`: 'spot' or 'futures'
- `status`: 'running', 'paused', or 'stopped'
- `initial_capital`: Starting capital
- `leverage`: Leverage used (1 for spot)

#### 2. `trades`
Individual trade executions
- `trade_id`: Unique trade identifier
- `session_id`: Associated session
- `side`: 'buy' or 'sell'
- `price`, `quantity`, `value`
- `fee`: Trading fee
- `realized_pnl`: Profit/loss from this trade
- `grid_level`: Grid level number

#### 3. `position_snapshots`
Periodic position state snapshots
- `base_balance`, `quote_balance`
- `total_value`: Current position value
- `inventory_ratio`: Asset allocation ratio

#### 4. `pnl_snapshots`
Periodic PnL snapshots
- `realized_pnl`, `unrealized_pnl`, `total_pnl`
- `roi`: Return on investment
- `win_rate`: Percentage of winning trades

#### 5. `risk_snapshots`
Risk metrics over time
- `max_drawdown`: Maximum drawdown percentage
- `current_drawdown`: Current drawdown
- `daily_loss`: Loss for current day
- `liquidation_price`: Liquidation price (futures)

#### 6. `performance_metrics`
Aggregated performance data (daily/monthly)
- `total_trades`, `winning_trades`, `losing_trades`
- `win_rate`: Win percentage
- `total_pnl`, `net_pnl`: Profit/loss metrics
- `sharpe_ratio`: Risk-adjusted returns
- `profit_factor`: Ratio of wins to losses
- `avg_win`, `avg_loss`: Average trade performance

## Repository Pattern

### SessionRepository
```typescript
const repo = new SessionRepository(db);

// Create new session
const sessionId = await repo.create({
  symbol: 'SOL_USDC',
  market_type: 'spot',
  status: 'running',
  dry_run: false,
  initial_capital: 10000
});

// Get active session
const session = await repo.getActive();

// Update status
await repo.updateStatus(sessionId, 'stopped');
```

### TradeRepository
```typescript
const repo = new TradeRepository(db);

// Record trade
await repo.create({
  session_id: sessionId,
  symbol: 'SOL_USDC',
  side: 'buy',
  type: 'limit',
  price: 142.50,
  quantity: 0.05,
  value: 7.125,
  fee: 0.007125,
  realized_pnl: 2.50,
  grid_level: 5
});

// Get trades with filters
const trades = await repo.findWithFilters({
  session_id: sessionId,
  side: 'buy',
  start_date: '2024-01-01',
  min_pnl: 0
}, 100, 0);

// Get statistics
const stats = await repo.getStats(sessionId);
```

### PerformanceMetricsRepository
```typescript
const repo = new PerformanceMetricsRepository(db);

// Calculate daily metrics
await repo.calculateDaily(sessionId, '2024-01-15');

// Get monthly aggregates
const monthly = await repo.getMonthlyAggregates(sessionId);

// Get best performing days
const bestDays = await repo.getBestDays(sessionId, 10);
```

## Analytics Service

### Performance Report
```typescript
const analytics = new AnalyticsService(db);

const report = await analytics.generatePerformanceReport(sessionId);
// Returns:
// - overview: Overall performance metrics
// - daily: Daily performance breakdown
// - monthly: Monthly aggregations
// - bestTrades: Top 10 winning trades
// - worstTrades: Top 10 losing trades
```

### Trade Distribution
```typescript
const distribution = await analytics.getTradeDistribution(sessionId);
// Returns:
// - byHour: Trades by hour of day
// - byDayOfWeek: Trades by day of week
// - bySide: Breakdown by buy/sell
// - byPnlRange: Distribution across PnL ranges
```

### Risk Metrics
```typescript
// Calculate Value at Risk
const var95 = await analytics.calculateVaR(sessionId, 0.95);

// Get trading streaks
const streaks = await analytics.getTradingStreaks(sessionId);
// Returns current streak, longest win/loss streaks
```

### Export to CSV
```typescript
const csv = await analytics.exportToCSV(sessionId);
// Returns CSV string with all trades
```

## API Endpoints

### Trade History
```
GET /api/history/trades
Query params:
  - sessionId: Session ID
  - limit: Results per page (default: 100)
  - offset: Pagination offset
  - side: 'buy' or 'sell' filter
  - startDate, endDate: Date range filter
```

### Performance Report
```
GET /api/analytics/performance
Query params:
  - sessionId: Session ID

Returns: Complete performance report with overview, daily, monthly data
```

### Trade Distribution
```
GET /api/analytics/distribution
Query params:
  - sessionId: Session ID

Returns: Trade distribution by hour, day, side, PnL range
```

### Export CSV
```
GET /api/analytics/export/csv
Query params:
  - sessionId: Session ID

Returns: CSV file download
```

### Sessions
```
GET /api/history/sessions
Query params:
  - limit: Results per page (default: 10)
  - offset: Pagination offset

Returns: List of trading sessions
```

## UI Components

### TradeHistoryTable
Displays paginated trade history with filtering

Features:
- Filter by side (buy/sell)
- Filter by date range (1d/7d/30d/all)
- Pagination
- CSV export
- Color-coded buy/sell trades
- PnL highlighting (green/red)

Usage:
```tsx
<TradeHistoryTable sessionId="current" />
```

### AnalyticsDashboard
Comprehensive performance analytics dashboard

Features:
- Overview tab: Key metrics (PnL, ROI, Win Rate, Profit Factor)
- Daily tab: Day-by-day performance
- Monthly tab: Monthly aggregations
- Detailed statistics breakdown
- Risk metrics (Sharpe ratio, max drawdown)

Usage:
```tsx
<AnalyticsDashboard sessionId="current" />
```

## Performance Metrics

### Key Metrics Tracked

**Profitability:**
- Total PnL (Gross)
- Total Fees
- Net PnL
- ROI (Return on Investment)
- Average Win
- Average Loss
- Largest Win/Loss

**Win Rate:**
- Total Trades
- Winning Trades
- Losing Trades
- Win Rate Percentage

**Risk-Adjusted:**
- Sharpe Ratio
- Profit Factor
- Max Drawdown
- Value at Risk (VaR)

**Trading Activity:**
- Total Volume
- Average Trade Size
- Trades per Day
- Trading Streaks

## Database Initialization

```typescript
import Database from './database/Database';

// Initialize database
await Database.initialize('./data/bpx-grid-bot.db');

// Use repositories
const sessionRepo = new SessionRepository(Database);
const tradeRepo = new TradeRepository(Database);
const metricsRepo = new PerformanceMetricsRepository(Database);

// Close when done
await Database.close();
```

## Data Retention

By default, all data is retained indefinitely. To clean up old data:

```typescript
// Delete session and all related data
await sessionRepo.delete(sessionId);
```

## Performance Considerations

1. **Indexes**: All frequently queried columns have indexes
2. **Transactions**: Batch operations use transactions for speed
3. **Snapshots**: Position/PnL snapshots taken hourly to reduce query load
4. **Aggregations**: Daily/monthly metrics pre-calculated and cached

## Example Workflow

```typescript
import Database from './database/Database';
import { SessionRepository } from './database/repositories/SessionRepository';
import { TradeRepository } from './database/repositories/TradeRepository';
import { PerformanceMetricsRepository } from './database/repositories/PerformanceMetricsRepository';
import { AnalyticsService } from './analytics/AnalyticsService';

// Initialize
await Database.initialize();

// Create session
const sessionRepo = new SessionRepository(Database);
const sessionId = await sessionRepo.create({
  symbol: 'SOL_USDC',
  market_type: 'spot',
  status: 'running',
  dry_run: false,
  initial_capital: 10000
});

// Record trades
const tradeRepo = new TradeRepository(Database);
await tradeRepo.create({
  session_id: sessionId,
  symbol: 'SOL_USDC',
  side: 'buy',
  type: 'limit',
  price: 142.50,
  quantity: 0.05,
  value: 7.125,
  fee: 0.007125,
  realized_pnl: 0
});

// Calculate daily metrics
const metricsRepo = new PerformanceMetricsRepository(Database);
await metricsRepo.calculateDaily(sessionId, '2024-01-15');

// Generate report
const analytics = new AnalyticsService(Database);
const report = await analytics.generatePerformanceReport(sessionId);

console.log(`Total PnL: $${report.overview.netPnL}`);
console.log(`Win Rate: ${report.overview.winRate}%`);
console.log(`Profit Factor: ${report.overview.profitFactor}`);

// Export to CSV
const csv = await analytics.exportToCSV(sessionId);
```

## Future Enhancements

- [ ] Real-time database integration with trading engine
- [ ] WebSocket updates for live analytics
- [ ] Advanced charting (equity curve, drawdown chart)
- [ ] Multi-session comparison
- [ ] Backtest result storage
- [ ] Parameter optimization history
- [ ] Trade journaling with notes
- [ ] Portfolio analytics across multiple strategies
- [ ] Risk alerts based on historical patterns
- [ ] Machine learning-based performance prediction

## Dependencies

```json
{
  "sqlite": "^5.1.1",
  "sqlite3": "^5.1.7",
  "uuid": "^9.0.1"
}
```

## Database File Location

Default: `./data/bpx-grid-bot.db`

The database file is portable and can be backed up or moved between systems.

## Troubleshooting

**Database locked:**
- Ensure only one process accesses the database at a time
- Use transactions for batch operations

**Performance slow:**
- Check indexes are created (run schema.sql)
- Consider periodic cleanup of old data
- Reduce snapshot frequency if needed

**Out of memory:**
- Use pagination when querying large datasets
- Don't load all trades at once
- Use aggregated metrics tables instead of raw data

## License

Same as main project (MIT)
