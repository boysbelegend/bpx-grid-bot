# Developer Guide

Complete guide for developers contributing to or extending the BPX Grid Bot.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   BPX Grid Bot System                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Trading    │      │  Dashboard   │                │
│  │   Engine     │◄────►│   Backend    │                │
│  └──────────────┘      └──────────────┘                │
│         │                      │                        │
│         ▼                      ▼                        │
│  ┌──────────────┐      ┌──────────────┐                │
│  │  Strategies  │      │   Database   │                │
│  │  (AMM Grid)  │      │   (SQLite)   │                │
│  └──────────────┘      └──────────────┘                │
│         │                      │                        │
│         ▼                      ▼                        │
│  ┌──────────────┐      ┌──────────────┐                │
│  │     Risk     │      │  Analytics   │                │
│  │  Management  │      │   Service    │                │
│  └──────────────┘      └──────────────┘                │
│         │                      │                        │
│         ▼                      ▼                        │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Backpack   │      │   Frontend   │                │
│  │     API      │      │   (React)    │                │
│  └──────────────┘      └──────────────┘                │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
bpx-grid-bot/
├── src/                    # Core trading engine
│   ├── engine/            # Trading engine
│   ├── strategies/        # Trading strategies
│   ├── risk/             # Risk management
│   ├── database/         # Database layer
│   ├── analytics/        # Analytics service
│   ├── optimization/     # Parameter optimization
│   ├── services/         # Support services
│   ├── cache/           # Caching layer
│   └── utils/           # Utilities
├── dashboard/           # Web dashboard
│   ├── backend/        # Express API server
│   └── frontend/       # React frontend
├── mobile/             # React Native app
├── backtest/          # Backtesting engine (Python)
├── tests/             # Test suite
├── config/            # Configuration files
└── docs/              # Documentation
```

## Core Components

### 1. Trading Engine (`src/engine/TradingEngine.ts`)

**Responsibilities**:
- Order placement and management
- Position tracking
- PnL calculation
- Risk monitoring
- Database integration

**Key Methods**:
```typescript
class TradingEngine {
  async start(): Promise<void>
  async stop(): Promise<void>
  async pause(): Promise<void>
  async resume(): Promise<void>
  private async handleOrderUpdate(fill: OrderFill): Promise<void>
  private async performUpdate(): Promise<void>
}
```

### 2. Strategies (`src/strategies/`)

**Base Strategy Interface**:
```typescript
interface BaseStrategy {
  initialize(currentPrice: number, inventory: Inventory): Promise<void>
  calculateGridOrders(price: number, inventory: Inventory): GridOrder[]
  handleOrderFill(fill: OrderFill): void
  shouldRebalance(price: number): boolean
}
```

**Implementing a New Strategy**:
```typescript
export class MyCustomStrategy extends BaseStrategy {
  constructor(config: StrategyConfig) {
    super(config);
  }

  async initialize(currentPrice: number, inventory: Inventory) {
    // Initialize strategy state
  }

  calculateGridOrders(currentPrice: number, inventory: Inventory): GridOrder[] {
    // Generate grid orders
    return orders;
  }
}
```

### 3. Risk Management (`src/risk/`)

**Dynamic Position Sizer**:
- Volatility-based sizing
- Kelly Criterion
- Risk Parity
- Drawdown adjustment

**Volatility Grid Adjuster**:
- Auto spacing adjustment
- Rebalance detection
- Smooth transitions

**Auto Stop-Loss/Take-Profit**:
- ATR-based levels
- Trailing stops
- Dynamic adjustment

### 4. Database Layer (`src/database/`)

**Repository Pattern**:
```typescript
class SessionRepository {
  async create(session: SessionData): Promise<string>
  async findById(id: string): Promise<Session | null>
  async getActive(): Promise<Session | null>
  async updateStatus(id: string, status: string): Promise<void>
}
```

**Schema**:
- `sessions`: Trading sessions
- `trades`: Trade history
- `position_snapshots`: Position history
- `pnl_snapshots`: PnL history
- `performance_metrics`: Aggregated metrics

### 5. Analytics Service (`src/analytics/`)

**Performance Metrics**:
- Sharpe Ratio
- Profit Factor
- Win Rate
- Max Drawdown
- ROI

**Trade Distribution**:
- By hour
- By day of week
- By side (buy/sell)
- By PnL range

## Development Workflow

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/boysbelegend/bpx-grid-bot.git
cd bpx-grid-bot

# Install dependencies
yarn install

# Build project
yarn build

# Run tests
yarn test

# Run tests with coverage
yarn test:coverage

# Start in development mode
yarn dev
```

### Testing

**Unit Tests**:
```bash
# Run unit tests
yarn test tests/unit

# Run specific test file
yarn test tests/unit/strategies/AMMGridStrategy.test.ts
```

**Integration Tests**:
```bash
# Run integration tests
yarn test tests/integration

# Run API tests
yarn test tests/integration/api
```

**Test Coverage**:
```bash
yarn test:coverage
```

Target coverage: 70% (branches, functions, lines, statements)

### Code Style

**TypeScript**:
- Use strict mode
- Explicit return types
- Interface over type for objects
- Descriptive variable names

**Example**:
```typescript
// Good
export interface TradeData {
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
}

export async function executeTrade(data: TradeData): Promise<void> {
  // Implementation
}

// Bad
export type Trade = {
  s: string;
  side: string;
  p: number;
  q: number;
}

export function trade(t: Trade) {
  // Implementation
}
```

### Git Workflow

**Branch Naming**:
- `feature/feature-name`
- `bugfix/bug-name`
- `hotfix/critical-fix`

**Commit Messages**:
```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `chore`: Maintenance

**Example**:
```
feat(strategy): add momentum-based grid strategy

Implemented new strategy that adjusts grid based on momentum indicators:
- RSI integration
- MACD confirmation
- Dynamic spacing

Closes #123
```

## Adding New Features

### 1. New Trading Strategy

```typescript
// 1. Create strategy file
// src/strategies/MomentumGrid.ts

import { BaseStrategy } from './BaseStrategy';

export class MomentumGrid extends BaseStrategy {
  private rsi: number = 50;

  calculateGridOrders(price: number, inventory: Inventory): GridOrder[] {
    // Calculate RSI
    this.rsi = this.calculateRSI(price);

    // Adjust grid based on momentum
    const orders = this.generateOrders(price, this.rsi);

    return orders;
  }

  private calculateRSI(price: number): number {
    // RSI calculation
    return 50;
  }
}

// 2. Register strategy
// src/strategies/index.ts
export { MomentumGrid } from './MomentumGrid';

// 3. Add tests
// tests/unit/strategies/MomentumGrid.test.ts
describe('MomentumGrid', () => {
  test('should adjust grid based on RSI', () => {
    // Test implementation
  });
});

// 4. Add documentation
// Update README.md and strategy guide
```

### 2. New Risk Management Feature

```typescript
// 1. Create feature file
// src/risk/CorrelationManager.ts

export class CorrelationManager {
  public calculateCorrelation(asset1: string, asset2: string): number {
    // Implementation
    return 0.5;
  }

  public adjustForCorrelation(positions: Position[]): Position[] {
    // Adjust position sizes based on correlation
    return positions;
  }
}

// 2. Integrate with trading engine
// src/engine/TradingEngine.ts
import { CorrelationManager } from '../risk/CorrelationManager';

class TradingEngine {
  private correlationManager: CorrelationManager;

  constructor() {
    this.correlationManager = new CorrelationManager();
  }
}

// 3. Add tests
// 4. Update documentation
```

### 3. New API Endpoint

```typescript
// 1. Add route handler
// dashboard/backend/src/routes.ts

router.get('/api/custom/endpoint', async (req, res) => {
  try {
    const data = await customService.getData();

    res.json(success(data));
  } catch (error) {
    res.status(500).json(error('Failed to fetch data'));
  }
});

// 2. Add frontend integration
// dashboard/frontend/src/services/api.ts

export const fetchCustomData = async () => {
  const response = await fetch('/api/custom/endpoint');
  return response.json();
};

// 3. Add tests
// tests/integration/api/custom.test.ts

describe('Custom Endpoint', () => {
  test('should return custom data', async () => {
    const response = await request(app).get('/api/custom/endpoint');
    expect(response.status).toBe(200);
  });
});
```

## Performance Optimization

### 1. Database Optimization

**Indexes**:
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_trades_session_id ON trades(session_id);
CREATE INDEX idx_trades_timestamp ON trades(timestamp);
CREATE INDEX idx_trades_side ON trades(side);
```

**Query Optimization**:
```typescript
// Bad - N+1 queries
for (const session of sessions) {
  const trades = await tradeRepo.findBySession(session.id);
}

// Good - Single query with JOIN
const sessionsWithTrades = await db.query(`
  SELECT s.*, t.*
  FROM sessions s
  LEFT JOIN trades t ON t.session_id = s.id
`);
```

### 2. Caching

```typescript
import { cache } from '../cache/CacheManager';

// Cache expensive calculations
export async function getPerformanceReport(sessionId: string) {
  return cache.getOrSet(
    `performance:${sessionId}`,
    async () => {
      // Expensive calculation
      return calculatePerformance(sessionId);
    },
    60000 // 1 minute TTL
  );
}
```

### 3. Rate Limiting

```typescript
class RateLimiter {
  private lastRequest: number = 0;
  private minInterval: number = 100; // ms

  async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;

    if (elapsed < this.minInterval) {
      await sleep(this.minInterval - elapsed);
    }

    this.lastRequest = Date.now();
  }
}
```

## Debugging

### Logging

```typescript
import { logger } from './utils/logger';

// Different log levels
logger.debug('Detailed debug information', { data });
logger.info('General information', { event });
logger.warn('Warning message', { issue });
logger.error('Error occurred', { error });
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug yarn start

# Enable specific component logging
DEBUG=engine,strategy yarn start
```

### Common Issues

**Issue: Orders not being placed**
```typescript
// Add debug logging
logger.debug('Calculating grid orders', {
  currentPrice,
  gridLevels: this.gridLevels.length,
  inventory,
});

// Check each step
logger.debug('Generated orders', { orders: orders.length });
logger.debug('Filtered orders', { filtered: filtered.length });
```

## Contributing

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Implement changes with tests
4. Run tests: `yarn test`
5. Run linter: `yarn lint`
6. Commit changes: `git commit -m "feat: add feature"`
7. Push branch: `git push origin feature/my-feature`
8. Create Pull Request

### PR Checklist

- [ ] Tests pass (`yarn test`)
- [ ] Code coverage >= 70%
- [ ] TypeScript types are correct
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No console.log statements
- [ ] Code is formatted (Prettier)

### Code Review

Reviews focus on:
- **Correctness**: Does it work as intended?
- **Performance**: Is it efficient?
- **Security**: Are there vulnerabilities?
- **Maintainability**: Is it readable and documented?
- **Tests**: Are edge cases covered?

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Documentation](https://react.dev/)
- [Backpack Exchange API](https://docs.backpack.exchange/)

## Support

- GitHub Issues: Bug reports and feature requests
- Discussions: Questions and general discussion
- Discord/Telegram: Community support

## License

MIT License - See LICENSE file
