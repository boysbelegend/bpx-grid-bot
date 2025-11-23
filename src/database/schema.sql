-- BPX Grid Bot Database Schema
-- SQLite3 compatible

-- Trading sessions/runs
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    symbol TEXT NOT NULL,
    market_type TEXT NOT NULL, -- 'spot' or 'futures'
    strategy_name TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT NOT NULL, -- 'running', 'paused', 'stopped'
    dry_run BOOLEAN DEFAULT 0,
    initial_capital REAL,
    leverage INTEGER DEFAULT 1
);

-- Trade executions
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    trade_id TEXT UNIQUE NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL, -- 'buy' or 'sell'
    type TEXT NOT NULL, -- 'market', 'limit'
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    value REAL NOT NULL, -- price * quantity
    fee REAL DEFAULT 0,
    fee_currency TEXT,
    order_id TEXT,
    grid_level INTEGER,
    realized_pnl REAL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Position snapshots (hourly or on significant changes)
CREATE TABLE IF NOT EXISTS position_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    base_balance REAL NOT NULL,
    quote_balance REAL NOT NULL,
    base_locked REAL DEFAULT 0,
    quote_locked REAL DEFAULT 0,
    total_value REAL NOT NULL,
    market_price REAL NOT NULL,
    inventory_ratio REAL,
    inventory_skew REAL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- PnL snapshots (periodic tracking)
CREATE TABLE IF NOT EXISTS pnl_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    realized_pnl REAL DEFAULT 0,
    unrealized_pnl REAL DEFAULT 0,
    total_pnl REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    daily_pnl REAL DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate REAL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Risk metrics snapshots
CREATE TABLE IF NOT EXISTS risk_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    max_drawdown REAL DEFAULT 0,
    current_drawdown REAL DEFAULT 0,
    daily_loss REAL DEFAULT 0,
    exposure REAL DEFAULT 0,
    position_size REAL DEFAULT 0,
    leverage_used REAL DEFAULT 1,
    liquidation_price REAL,
    distance_to_liquidation REAL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Grid state snapshots
CREATE TABLE IF NOT EXISTS grid_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_levels INTEGER NOT NULL,
    active_levels INTEGER NOT NULL,
    min_price REAL NOT NULL,
    max_price REAL NOT NULL,
    spacing REAL NOT NULL,
    filled_buy_levels INTEGER DEFAULT 0,
    filled_sell_levels INTEGER DEFAULT 0,
    grid_config TEXT, -- JSON
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- System events/logs
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL, -- 'trade', 'order', 'risk_warning', 'error', 'info'
    severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    message TEXT NOT NULL,
    details TEXT, -- JSON
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Performance metrics (daily/monthly aggregations)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate REAL DEFAULT 0,
    total_pnl REAL DEFAULT 0,
    total_fees REAL DEFAULT 0,
    net_pnl REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    max_drawdown REAL DEFAULT 0,
    sharpe_ratio REAL,
    profit_factor REAL,
    avg_win REAL,
    avg_loss REAL,
    largest_win REAL,
    largest_loss REAL,
    avg_hold_time REAL, -- seconds
    total_volume REAL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_session ON trades(session_id);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_position_session ON position_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_pnl_session ON pnl_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_risk_session ON risk_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_grid_session ON grid_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_metrics_session ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_period ON performance_metrics(period_type, period_start);
