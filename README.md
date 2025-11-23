# BPX Grid Bot v2.0 - AMM-Style Spread Trading System

Professional-grade automated market making (AMM) style grid trading system for Backpack Exchange.

> **⚠️ Version 2.0**: Complete rewrite with TypeScript, Python backtesting, and web dashboard!

## Sponsor

[https://backpack.exchange/refer/b](https://backpack.exchange/refer/b)

I recommend getting Blue Chip NFT Madlads before you trade to get VIP1 tier fees discount.

## 🎯 Features

### Core Trading System (TypeScript)
- **AMM-Style Grid Trading**: Automated liquidity provision similar to Solana Meteora
- **Multi-Symbol Support**: SOL, BTC, ETH, and more
- **Dynamic Grid Rebalancing**: Automatically adjusts when price moves
- **Inventory Balancing**: Prevents one-sided asset accumulation
- **Mean-Reversion Strategy**: Optimized for ranging markets
- **Comprehensive Risk Management**: Position limits, daily loss limits, emergency stops
- **Dry-Run Mode**: Safe testing without real funds
- **Real-time Monitoring**: WebSocket-based order and position tracking

### Python Backtesting Engine
- **Historical Data Testing**: Download and test on real Backpack data
- **Performance Metrics**: Sharpe ratio, max drawdown, win rate, etc.
- **Parameter Optimization**: Grid search for optimal settings
- **Visualization**: 6-panel charts with equity curve, drawdown, returns
- **Multiple Timeframes**: 1m, 5m, 15m, 1h, 4h, 1d intervals

### Web Dashboard (NEW!)
- **Real-Time Monitoring**: Live position, PnL, orders, and risk metrics
- **REST API**: Full control via HTTP endpoints
- **WebSocket Updates**: Sub-second latency for live data
- **Remote Control**: Start/stop/pause trading from anywhere
- **Multi-Strategy Support**: Switch between different configurations

## 📋 Requirements

**Trading System:**
- Node.js 18.x or higher
- npm or yarn package manager
- Backpack exchange account with API keys
- Sufficient trading funds (see funding requirements)

**Backtesting Engine:**
- Python 3.8+
- pip package manager

**Web Dashboard:**
- Same as trading system
- Modern web browser

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/boysbelegend/bpx-grid-bot.git
cd bpx-grid-bot
```

### 2. Install Dependencies

**TypeScript Trading System:**
```bash
npm install
npm run build
```

**Python Backtesting:**
```bash
cd backtest
pip install -r requirements.txt
cd ..
```

**Web Dashboard Backend:**
```bash
cd dashboard/backend
npm install
cd ../..
```

### 3. Configure Environment

```bash
cp .env.copy .env
# Edit .env with your API keys
```

Required in `.env`:
```env
BACKPACK_API_KEY=your_api_key_here
BACKPACK_API_SECRET=your_api_secret_here
BACKPACK_API_WINDOW=5000
```

### 4. Configure Strategy

Edit `config/strategies/sol-amm-grid.json`:
```json
{
  "name": "SOL AMM Grid Strategy",
  "type": "spot",
  "symbol": "SOL_USDC",
  "grid": {
    "mode": "mean-reversion",
    "levels": 20,
    "spacing": { "type": "percentage", "value": 1.0 }
  },
  "order": {
    "quantityPerLevel": 0.05
  },
  "risk": {
    "maxPositionSize": 10.0,
    "maxDailyLoss": 100,
    "rebalanceThreshold": 3.0
  },
  "dryRun": true
}
```

### 5. Run Backtest (Recommended First!)

Test your strategy on historical data before going live:

```bash
cd backtest/examples
python run_backtest.py --symbol SOL_USDC --days 7
```

See comprehensive report and charts to verify your strategy works.

### 6. Start Trading (Dry Run)

```bash
npm start -- --strategy config/strategies/sol-amm-grid.json
```

Watch logs to ensure everything works correctly. Once confident, set `"dryRun": false` in config.

### 7. Launch Web Dashboard (Optional)

Monitor your bot from a web interface:

```bash
# Terminal 1: Start backend API
cd dashboard/backend
npm run dev

# Terminal 2: Start frontend (coming soon!)
# cd dashboard/frontend
# npm run dev
```

Visit `http://localhost:3001` for API docs and `http://localhost:5173` for dashboard UI.

## ⚙️ Configuration Guide

### Strategy Configuration (JSON)

All strategies are configured via JSON files in `config/strategies/`:

**Grid Parameters:**
- `levels`: Number of grid levels (10-50 recommended)
- `spacing`: Percentage between levels (0.5%-3.0% recommended)
- `mode`: Trading mode (`mean-reversion`, `trend-following`, or `neutral`)

**Order Parameters:**
- `quantityPerLevel`: Base asset amount per order (e.g., 0.05 SOL)
- `inventoryTarget`: Target inventory split (0.5 = 50/50)

**Risk Parameters:**
- `maxPositionSize`: Maximum base asset position
- `maxDailyLoss`: Maximum daily loss in quote asset
- `stopLossPercent`: Emergency stop-loss percentage
- `rebalanceThreshold`: Price movement % to trigger grid shift

**Example Configurations:**

**Conservative (Low Risk):**
```json
{
  "grid": { "levels": 15, "spacing": { "value": 2.0 } },
  "order": { "quantityPerLevel": 0.03 },
  "risk": { "maxPositionSize": 5.0, "maxDailyLoss": 50 }
}
```

**Moderate (Medium Risk):**
```json
{
  "grid": { "levels": 20, "spacing": { "value": 1.0 } },
  "order": { "quantityPerLevel": 0.05 },
  "risk": { "maxPositionSize": 10.0, "maxDailyLoss": 100 }
}
```

**Aggressive (High Risk):**
```json
{
  "grid": { "levels": 30, "spacing": { "value": 0.5 } },
  "order": { "quantityPerLevel": 0.08 },
  "risk": { "maxPositionSize": 20.0, "maxDailyLoss": 200 }
}
```

## 💰 Funding Requirements

AMM-style grid bots require balanced inventory. Calculate required funds:

**Formula:**
- Base Asset: `levels × quantityPerLevel`
- Quote Asset: `levels × quantityPerLevel × currentPrice`

**Example (SOL_USDC at $200):**
- Levels: 20
- Quantity: 0.05 SOL
- Base needed: 20 × 0.05 = **1.0 SOL**
- Quote needed: 20 × 0.05 × 200 = **$200 USDC**
- **Total: ~$400 USD equivalent**

**Recommendations:**
- Start with **2-3x** minimum requirements for safety
- Keep extra funds for rebalancing
- Monitor inventory skew and add funds as needed

## 📊 Backtesting (Highly Recommended!)

Before risking real funds, backtest your strategy:

```bash
cd backtest/examples

# Quick 7-day test
python run_backtest.py --symbol SOL_USDC --days 7

# Comprehensive 30-day test
python run_backtest.py --symbol SOL_USDC --days 30 --interval 5m

# Parameter optimization
python optimize_params.py --symbol SOL_USDC --days 14 --output results.csv
```

**What to look for:**
- **Sharpe Ratio > 1.0**: Good risk-adjusted returns
- **Max Drawdown < 10%**: Acceptable risk
- **Win Rate > 60%**: Strategy is working
- **Positive Total Return**: Strategy is profitable

See `backtest/README.md` for detailed guide.

## 🎮 Running the Trading Bot

### Dry Run Mode (Safe Testing)

```bash
npm start -- --strategy config/strategies/sol-amm-grid.json --dry-run
```

Simulates trading without real funds. Perfect for:
- Testing strategy logic
- Verifying API connectivity
- Learning how the bot works

### Live Trading

**⚠️ Only after successful backtesting and dry-run testing!**

1. Set `"dryRun": false` in your strategy config
2. Start the bot:
```bash
npm start -- --strategy config/strategies/sol-amm-grid.json
```

3. Monitor logs carefully for first few hours
4. Check positions and PnL regularly

### Production Deployment (PM2)

For 24/7 operation:

```bash
npm install -g pm2

# Start bot
pm2 start dist/index.js --name bpx-grid-bot -- --strategy config/strategies/sol-amm-grid.json

# Monitor
pm2 logs bpx-grid-bot
pm2 status

# Restart/Stop
pm2 restart bpx-grid-bot
pm2 stop bpx-grid-bot
```

## 🖥️ Web Dashboard

Monitor and control your bot from a web interface:

### Start Backend API

```bash
cd dashboard/backend
cp .env.example .env
npm install
npm run dev
```

API available at: `http://localhost:3001`

### API Endpoints

- `GET /api/status` - Engine status
- `GET /api/state` - Full dashboard state
- `GET /api/position` - Current position
- `GET /api/pnl` - Profit & Loss
- `GET /api/orders` - Active orders
- `POST /api/control/start` - Start trading
- `POST /api/control/stop` - Stop trading
- WebSocket: `ws://localhost:3001/ws` - Real-time updates

See `dashboard/backend/README.md` for full API documentation.

### Test WebSocket (Browser)

Open `dashboard/backend/examples/test-websocket.html` in your browser to see live updates.

## 📝 Important Notes

### Before First Run
1. ✅ Backtest strategy on historical data
2. ✅ Test in dry-run mode for 24+ hours
3. ✅ Verify sufficient funds (2-3x minimum)
4. ✅ Start with small position size
5. ✅ Monitor closely for first week

### During Operation
- Check PnL daily
- Monitor inventory skew (keep near 0.0)
- Watch for risk violations in logs
- Adjust strategy if market conditions change

### Safety Features
- **Dry-Run Mode**: Test without real funds
- **Position Limits**: Prevent oversized positions
- **Daily Loss Limits**: Auto-stop on large losses
- **Emergency Stop-Loss**: Circuit breaker at -X%
- **Inventory Balancing**: Prevent one-sided accumulation

## ⚠️ Risk Warning

**READ THIS BEFORE TRADING:**

### Market Risks
- Grid trading works best in **ranging/oscillating markets**
- **Strong trends** can cause significant losses
- **High volatility** may trigger stop-losses
- Past performance ≠ future results

### Strategy-Specific Risks
- **Inventory accumulation**: May end up with too much base or quote asset
- **Rebalancing costs**: Frequent trades = more fees
- **Slippage**: Real fills may differ from backtest
- **API failures**: Network issues, exchange downtime

### Best Practices
1. **Start small**: Use minimum viable position size
2. **Backtest thoroughly**: 30+ days, multiple market conditions
3. **Monitor actively**: Especially first week of live trading
4. **Use stop-losses**: Set `maxDailyLoss` conservatively
5. **Diversify**: Don't risk everything on one bot/strategy

### Recommended Limits
- **Max capital per bot**: 10-20% of total portfolio
- **Max daily loss**: 1-3% of bot capital
- **Position size**: Start with 25-50% of calculated minimum

**⚠️ WARNING: Cryptocurrency trading is highly risky. Only invest what you can afford to lose entirely.**

## 🏗️ Project Structure

```
bpx-grid-bot/
├── src/                          # TypeScript source code
│   ├── core/                     # Core interfaces and managers
│   │   ├── interfaces/           # Type definitions
│   │   ├── PositionManager.ts    # Position and PnL tracking
│   │   ├── RiskManager.ts        # Risk checks and limits
│   │   └── OrderManager.ts       # Order lifecycle management
│   ├── strategies/               # Trading strategies
│   │   ├── BaseStrategy.ts       # Abstract base class
│   │   └── AMMGridStrategy.ts    # AMM-style grid implementation
│   ├── exchanges/                # Exchange integrations
│   │   ├── BackpackClient.ts     # Live Backpack API client
│   │   └── MockExchange.ts       # Dry-run simulator
│   ├── engine/                   # Trading engine
│   │   └── TradingEngine.ts      # Main orchestrator
│   └── index.ts                  # Entry point
├── backtest/                     # Python backtesting engine
│   ├── data_loader.py            # Historical data downloader
│   ├── simulator.py              # Order fill simulator
│   ├── strategy_tester.py        # Strategy backtester
│   ├── reporter.py               # Performance reports
│   └── examples/                 # Example scripts
├── dashboard/                    # Web dashboard
│   └── backend/                  # Express.js API server
│       ├── src/
│       │   ├── server.ts         # Main server
│       │   ├── routes.ts         # REST endpoints
│       │   ├── websocketServer.ts # WebSocket server
│       │   └── engineManager.ts  # Engine lifecycle
│       └── examples/             # Test scripts
├── config/                       # Configuration files
│   └── strategies/               # Strategy JSON configs
├── dist/                         # Compiled JavaScript
└── README.md                     # This file
```

## License

MIT Source: https://github.com/pordria/backpack-grid-bot

## Backpack Exchange API

Source: https://github.com/backpack-exchange/bpx-openapi

### Introduction

The Backpack Exchange API is designed for programmatic trade execution. All endpoints requiring state mutation need requests to be signed with an ED25519 keypair for authentication.

- REST API Base URL: `https://api.backpack.exchange/`
- WebSocket API URL: `wss://ws.backpack.exchange/`

### Authentication

Signed requests require the following headers:
- `X-Timestamp`: Unix time in milliseconds.
- `X-Window`: Time window in milliseconds (default: 5000, max: 60000).
- `X-API-Key`: Base64 encoded verifying key of the ED25519 keypair.
- `X-Signature`: Base64 encoded signature.

### Available Endpoints

#### Public Endpoints

1. **Market Data**
   - Get Ticker: `GET /api/v1/ticker`.
   - Get Mark Price: `GET /api/v1/markPrice`.
   - Get Open Interest: `GET /api/v1/openInterest`.

2. **Assets & Markets**
   - Get Assets: `GET /api/v1/assets`.
   - Get Markets: `GET /api/v1/markets`.
   - Get Collateral: `GET /api/v1/collateral`.

3. **Borrow/Lend Markets**
   - Get Markets: `GET /api/v1/borrowLend/markets`.

#### Private Endpoints

1. **Account Management**
   - Get Account: `GET /api/v1/account`.
   - Get Position: `GET /api/v1/position`.
   - Get Collateral: `GET /api/v1/capital/collateral`.

2. **Order Management**
   - Place Order: `POST /api/v1/order`.
   - Get Open Orders: `GET /api/v1/orders`.
   - Cancel Order: `DELETE /api/v1/order`.
   - Cancel All Orders: `DELETE /api/v1/orders`.

3. **History**
   - Order History: `GET /wapi/v1/history/orders`.
   - Fill History: `GET /wapi/v1/history/fills`.
   - PnL History: `GET /wapi/v1/history/pnl`.
   - Funding History: `GET /wapi/v1/history/funding`.
   - Borrow History: `GET /wapi/v1/history/borrowLend`.
   - Interest History: `GET /wapi/v1/history/interest`.

4. **Capital Management**
   - Get Deposit Address: `GET /wapi/v1/capital/deposit/address`.
   - Get Deposits: `GET /wapi/v1/capital/deposits`.
   - Get Withdrawals: `GET /wapi/v1/capital/withdrawals`.
   - Request Withdrawal: `POST /wapi/v1/capital/withdrawals`.

### WebSocket Streams

Connect to `wss://ws.backpack.exchange` to access real-time data streams.

#### Public Streams
- Trade Stream: `trades.<symbol>`.
- Ticker Stream: `ticker.<symbol>`.
- Depth Stream: `depth.<symbol>`.
- Kline Stream: `kline.<interval>.<symbol>`.
- Mark Price Stream: `markPrice.<symbol>`.

#### Private Streams (Requires Authentication)
- Order Updates: `account.orderUpdate`.
- Position Updates: `account.positionUpdate`.
- Balance Updates: `account.balanceUpdate`.

### Recent Changes (as of 2024-12-03)
- Added order expiry reason to order update stream.
- Added `cumulativeInterest` to borrow lend position.
- Added borrow lend history per position endpoint.
- Added `timestamp` field to depth endpoint.
- Converted all error responses to JSON with error codes.
