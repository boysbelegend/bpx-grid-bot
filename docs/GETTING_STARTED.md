# Getting Started with BPX Grid Bot

Complete guide to get your grid trading bot up and running on Backpack Exchange.

## Prerequisites

- **Node.js** >= 18.0.0
- **Yarn** package manager
- **Backpack Exchange Account** with API credentials
- Basic understanding of grid trading strategies

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/boysbelegend/bpx-grid-bot.git
cd bpx-grid-bot

# Install dependencies
yarn install

# Build the project
yarn build
```

### 2. Configure API Credentials

Create a `.env` file in the root directory:

```bash
# Backpack Exchange API
BPX_API_KEY=your_api_key_here
BPX_API_SECRET=your_secret_key_here
BPX_WINDOW=5000

# Trading Configuration
SYMBOL=SOL_USDC
MARKET_TYPE=spot  # or 'futures'
DRY_RUN=true     # Set to false for live trading

# Risk Management
MAX_DRAWDOWN_PERCENT=10
DAILY_LOSS_LIMIT=500
```

### 3. Choose a Strategy

The bot comes with pre-configured strategy templates:

```bash
# Conservative (lower risk, lower returns)
yarn start:btc

# Balanced (moderate risk/reward)
yarn start config/strategies/sol-amm-grid.json

# Aggressive (higher risk, higher returns)
yarn start config/strategies/aggressive-grid.json
```

### 4. Start Trading

**Dry Run Mode** (Recommended for first-time users):
```bash
# Test without real money
DRY_RUN=true yarn start
```

**Live Trading**:
```bash
# Real trading (be careful!)
DRY_RUN=false yarn start
```

## Strategy Configuration

### Basic Strategy File

Create a strategy file in `config/strategies/`:

```json
{
  "symbol": "SOL_USDC",
  "type": "spot",
  "grid": {
    "levels": 20,
    "spacing": {
      "type": "percentage",
      "value": 0.5
    },
    "mode": "mean-reversion",
    "priceRange": {
      "min": 90,
      "max": 110
    }
  },
  "order": {
    "quantityPerLevel": 0.1,
    "orderType": "limit"
  },
  "capital": {
    "allocation": 10000,
    "maxPositionSize": 5000
  },
  "risk": {
    "maxDrawdownPercent": 10,
    "stopLossPercent": 5,
    "dailyLossLimit": 500
  }
}
```

## Dashboard

### Web Dashboard

```bash
# Start backend server
cd dashboard/backend
yarn install
yarn dev

# Start frontend (in another terminal)
cd dashboard/frontend
yarn install
yarn dev
```

Access at: `http://localhost:5173`

### Mobile App

```bash
cd mobile
yarn install

# For iOS
yarn ios

# For Android
yarn android
```

## Features

### ✅ Spot & Futures Trading
- AMM-style grid strategy
- Mean-reversion mode
- Trend-following mode

### ✅ Advanced Risk Management
- Dynamic position sizing
- Volatility-based grid adjustment
- Auto stop-loss/take-profit
- Drawdown protection

### ✅ Analytics & Reporting
- Real-time PnL tracking
- Performance metrics (Sharpe ratio, profit factor)
- Trade history and analysis
- Email notifications

### ✅ Backtesting
- Historical data testing
- Strategy optimization
- Parameter tuning
- Performance analysis

## Common Scenarios

### Scenario 1: Conservative SOL Trading

```json
{
  "symbol": "SOL_USDC",
  "type": "spot",
  "grid": {
    "levels": 15,
    "spacing": { "type": "percentage", "value": 1.0 },
    "mode": "mean-reversion"
  },
  "capital": { "allocation": 5000 },
  "risk": {
    "maxDrawdownPercent": 5,
    "stopLossPercent": 3
  }
}
```

### Scenario 2: Aggressive BTC Futures

```json
{
  "symbol": "BTC_USDC",
  "type": "futures",
  "grid": {
    "levels": 30,
    "spacing": { "type": "percentage", "value": 0.3 },
    "mode": "trend-following"
  },
  "capital": { "allocation": 20000 },
  "risk": {
    "maxDrawdownPercent": 15,
    "stopLossPercent": 10
  },
  "futures": {
    "maxLeverage": 3,
    "marginType": "cross"
  }
}
```

## Monitoring

### Real-time Monitoring

```bash
# View logs
yarn logs

# Check status
curl http://localhost:3001/api/state
```

### Email Notifications

Configure email in `config/email.json`:

```json
{
  "enabled": true,
  "host": "smtp.gmail.com",
  "port": 587,
  "auth": {
    "user": "your-email@gmail.com",
    "pass": "your-app-password"
  },
  "to": ["your-email@gmail.com"]
}
```

## Troubleshooting

### Bot Not Starting

1. Check API credentials in `.env`
2. Verify API permissions on Backpack Exchange
3. Ensure sufficient balance for trading
4. Check logs: `yarn logs`

### No Orders Being Placed

1. Verify price is within configured grid range
2. Check minimum order size requirements
3. Review risk limits (may be blocking orders)
4. Inspect logs for errors

### High Drawdown

1. Reduce position size in strategy config
2. Widen grid spacing
3. Enable stop-loss protection
4. Lower leverage (for futures)

## Best Practices

### 1. Start Small
- Begin with dry run mode
- Use small capital allocation
- Test strategy thoroughly

### 2. Risk Management
- Never risk more than you can afford to lose
- Set appropriate stop-loss levels
- Monitor drawdown regularly
- Use conservative leverage

### 3. Strategy Selection
- Match strategy to market conditions
- Use mean-reversion in ranging markets
- Use trend-following in trending markets
- Adjust grid spacing based on volatility

### 4. Monitoring
- Check dashboard regularly
- Review performance metrics
- Adjust parameters as needed
- Keep email notifications enabled

## Next Steps

- Read [Advanced Features](./ADVANCED_FEATURES.md)
- Learn about [Parameter Optimization](./PARAMETER_OPTIMIZATION.md)
- Explore [Email Notifications](./EMAIL_NOTIFICATIONS.md)
- Understand [Database & Analytics](./DATABASE_AND_ANALYTICS.md)
- Review [API Documentation](./API_DOCUMENTATION.md)

## Support

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Community**: Discord/Telegram (links in README)

## Safety Warnings

⚠️ **IMPORTANT**:
- Cryptocurrency trading carries significant risk
- Past performance does not guarantee future results
- Start with small amounts and dry run mode
- Never trade with money you can't afford to lose
- Understand the strategy before using real money
- Monitor your bot regularly

## License

MIT License - See LICENSE file for details
