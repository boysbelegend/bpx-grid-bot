import type { TradingMetrics } from '../types';

interface MetricsCardProps {
  metrics: TradingMetrics;
}

export function MetricsCard({ metrics }: MetricsCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Trading Metrics</h3>
      </div>

      <div className={`card-value ${metrics.winRate >= 60 ? 'positive' : metrics.winRate >= 50 ? 'neutral' : 'negative'}`}>
        {metrics.winRate.toFixed(1)}%
      </div>

      <div className="card-label">Win Rate</div>

      <div style={{ marginTop: '1rem' }}>
        <div className="stat-row">
          <span className="stat-label">Total Trades</span>
          <span className="stat-value">
            {metrics.totalTrades}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Winning / Losing</span>
          <span className="stat-value">
            <span className="positive">{metrics.winningTrades}</span> / <span className="negative">{metrics.losingTrades}</span>
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Avg Profit</span>
          <span className="stat-value positive">
            {formatCurrency(metrics.averageProfit)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Avg Loss</span>
          <span className="stat-value negative">
            {formatCurrency(metrics.averageLoss)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Profit Factor</span>
          <span className={`stat-value ${metrics.profitFactor >= 2 ? 'positive' : metrics.profitFactor >= 1 ? 'neutral' : 'negative'}`}>
            {metrics.profitFactor.toFixed(2)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Largest Win</span>
          <span className="stat-value positive">
            {formatCurrency(metrics.largestWin)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Largest Loss</span>
          <span className="stat-value negative">
            {formatCurrency(metrics.largestLoss)}
          </span>
        </div>
      </div>
    </div>
  );
}
