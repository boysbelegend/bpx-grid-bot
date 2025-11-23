import { useState } from 'react';
import { useDashboard, useEngineControl, useStrategies } from './hooks/useDashboard';
import { StatusCard } from './components/StatusCard';
import { PnLCard } from './components/PnLCard';
import { PositionCard } from './components/PositionCard';
import { RiskCard } from './components/RiskCard';
import { GridCard } from './components/GridCard';
import { MetricsCard } from './components/MetricsCard';
import './App.css';

function App() {
  const { state, isLoading, error, wsConnected } = useDashboard();
  const control = useEngineControl();
  const { data: strategies } = useStrategies();

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

      <main className="main">
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
      </main>
    </div>
  );
}

export default App;
