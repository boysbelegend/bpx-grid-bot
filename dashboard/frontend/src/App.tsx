import { useState, useMemo } from 'react';
import { useDashboard, useEngineControl, useStrategies } from './hooks/useDashboard';
import { StatusCard } from './components/StatusCard';
import { PnLCard } from './components/PnLCard';
import { PositionCard } from './components/PositionCard';
import { RiskCard } from './components/RiskCard';
import { GridCard } from './components/GridCard';
import { MetricsCard } from './components/MetricsCard';
import { ScenarioManager } from './components/ScenarioManager';
import { PriceChart } from './components/PriceChart';
import { TradeHistoryTable } from './components/TradeHistoryTable';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import './App.css';

type TabType = 'dashboard' | 'scenarios' | 'analytics';

function App() {
  const { state, isLoading, error, wsConnected } = useDashboard();
  const control = useEngineControl();
  const { data: strategies } = useStrategies();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedStrategy, setSelectedStrategy] = useState('config/strategies/sol-amm-grid.json');
  const [dryRun, setDryRun] = useState(true);

  const handleStart = () => {
    control.start({ strategyPath: selectedStrategy, dryRun });
  };

  const handleStop = () => {
    if (window.confirm('Are you sure you want to stop the trading engine?')) {
      control.stop(false);
    }
  };

  const handlePause = () => {
    control.pause();
  };

  const handleResume = () => {
    control.resume();
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">
          <div>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="main">
          <div className="error">
            <strong>Error:</strong> {(error as Error).message}
          </div>
        </div>
      </div>
    );
  }

  const isRunning = state?.engine?.status === 'running';
  const isPaused = state?.engine?.status === 'paused';
  const isStopped = state?.engine?.status === 'stopped' || !state?.engine;

  const handleScenarioReady = (config: any) => {
    // When scenario config is ready, use it
    console.log('Scenario config ready:', config);
    // Could automatically start the engine or save the config
    setActiveTab('dashboard');
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!state?.market || !state?.grid) return null;

    // Generate sample candles (in production, fetch from API)
    const now = Date.now();
    const candles = Array.from({ length: 50 }, (_, i) => {
      const time = Math.floor((now - (49 - i) * 60000) / 1000); // 1min candles
      const basePrice = state.market.lastPrice;
      const variation = (Math.random() - 0.5) * basePrice * 0.02;

      return {
        time,
        open: basePrice + variation,
        high: basePrice + variation + Math.random() * basePrice * 0.01,
        low: basePrice + variation - Math.random() * basePrice * 0.01,
        close: basePrice + variation * 0.9,
      };
    });

    // Map grid levels
    const gridLevels = state.grid.levels.map((level: any) => ({
      price: level.price,
      side: level.side === 'buy' ? 'buy' as const : 'sell' as const,
      hasOrder: level.hasOrder || false,
    }));

    return {
      symbol: state.market.symbol,
      candles,
      gridLevels,
      currentPrice: state.market.lastPrice,
    };
  }, [state?.market, state?.grid]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <h1>🤖 BPX Grid Bot Dashboard</h1>
        </div>

        <div className="header-status">
          {state?.engine && (
            <div className={`status-badge ${state.engine.status}`}>
              <span className="status-dot" />
              {state.engine.status.toUpperCase()}
            </div>
          )}

          <div className={`ws-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            {wsConnected ? 'Live' : 'Disconnected'}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tabs" style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '1rem 2rem 0',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={activeTab === 'dashboard' ? 'tab-active' : 'tab-inactive'}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'dashboard' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: activeTab === 'dashboard' ? 600 : 400,
            transition: 'all 0.2s',
          }}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          className={activeTab === 'scenarios' ? 'tab-active' : 'tab-inactive'}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'scenarios' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'scenarios' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: activeTab === 'scenarios' ? 600 : 400,
            transition: 'all 0.2s',
          }}
        >
          🎯 Scenarios
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={activeTab === 'analytics' ? 'tab-active' : 'tab-inactive'}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'analytics' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: activeTab === 'analytics' ? 600 : 400,
            transition: 'all 0.2s',
          }}
        >
          📈 Analytics
        </button>
      </nav>

      <main className="main">{activeTab === 'dashboard' && (
        <>
        <div className="controls">
          {isStopped && (
            <>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="btn btn-secondary"
                disabled={control.isStarting}
              >
                <option value="config/strategies/sol-amm-grid.json">SOL AMM Grid</option>
                {strategies?.map((s: any) => (
                  <option key={s.path} value={s.path}>
                    {s.name}
                  </option>
                ))}
              </select>

              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                Dry Run Mode
              </label>

              <button
                onClick={handleStart}
                disabled={control.isStarting}
                className="btn btn-primary"
              >
                {control.isStarting ? 'Starting...' : '▶ Start Engine'}
              </button>
            </>
          )}

          {isRunning && (
            <>
              <button
                onClick={handlePause}
                disabled={control.isPausing}
                className="btn btn-secondary"
              >
                {control.isPausing ? 'Pausing...' : '⏸ Pause'}
              </button>

              <button
                onClick={handleStop}
                disabled={control.isStopping}
                className="btn btn-danger"
              >
                {control.isStopping ? 'Stopping...' : '⏹ Stop Engine'}
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                onClick={handleResume}
                disabled={control.isResuming}
                className="btn btn-primary"
              >
                {control.isResuming ? 'Resuming...' : '▶ Resume'}
              </button>

              <button
                onClick={handleStop}
                disabled={control.isStopping}
                className="btn btn-danger"
              >
                {control.isStopping ? 'Stopping...' : '⏹ Stop Engine'}
              </button>
            </>
          )}
        </div>

        <div className="dashboard-grid">
          {state?.engine && <StatusCard status={state.engine} />}
          {state?.pnl && <PnLCard pnl={state.pnl} />}
          {state?.position && <PositionCard position={state.position} />}
          {state?.risk && <RiskCard risk={state.risk} />}
          {state?.grid && <GridCard grid={state.grid} />}
          {state?.metrics && <MetricsCard metrics={state.metrics} />}
        </div>

        {/* Price Chart with Grid Levels */}
        {chartData && (
          <div style={{ marginTop: '1.5rem' }}>
            <PriceChart
              symbol={chartData.symbol}
              candles={chartData.candles}
              gridLevels={chartData.gridLevels}
              currentPrice={chartData.currentPrice}
              height={400}
            />
          </div>
        )}

        {state?.market && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Market Data - {state.market.symbol}</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div className="stat-label">Last Price</div>
                <div className="card-value" style={{ fontSize: '1.5rem' }}>
                  ${state.market.lastPrice.toFixed(2)}
                </div>
                <div className={state.market.priceChangePct24h >= 0 ? 'positive' : 'negative'}>
                  {state.market.priceChangePct24h >= 0 ? '+' : ''}{state.market.priceChangePct24h.toFixed(2)}%
                </div>
              </div>

              <div>
                <div className="stat-label">Bid / Ask</div>
                <div className="stat-value">
                  ${state.market.bid.toFixed(2)} / ${state.market.ask.toFixed(2)}
                </div>
                <div className="stat-label">Spread: ${state.market.spread.toFixed(2)}</div>
              </div>

              <div>
                <div className="stat-label">24h Range</div>
                <div className="stat-value">
                  ${state.market.low24h.toFixed(2)} - ${state.market.high24h.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="stat-label">24h Volume</div>
                <div className="stat-value">
                  ${(state.market.volume24h / 1000000).toFixed(2)}M
                </div>
              </div>
            </div>
          </div>
        )}

        {state?.orders && state.orders.length > 0 && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Active Orders ({state.orders.length})</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Side</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Price</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Quantity</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Value</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {state.orders.map((order: any) => (
                    <tr key={order.orderId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={order.side === 'Bid' ? 'positive' : 'negative'}>
                          {order.side === 'Bid' ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>${order.price.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem' }}>{order.quantity.toFixed(4)}</td>
                      <td style={{ padding: '0.75rem' }}>${(order.price * order.quantity).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)'
                        }}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
      )}

      {activeTab === 'scenarios' && (
        <div style={{ padding: '2rem' }}>
          <ScenarioManager onScenarioReady={handleScenarioReady} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>거래 히스토리</h2>
            <TradeHistoryTable sessionId={state?.engine?.sessionId || 'current'} />
          </div>

          <div>
            <h2 style={{ marginBottom: '1rem' }}>성능 분석</h2>
            <AnalyticsDashboard sessionId={state?.engine?.sessionId || 'current'} />
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default App;
