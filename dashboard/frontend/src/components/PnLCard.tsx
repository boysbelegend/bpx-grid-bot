import type { PnLData } from '../types';

interface PnLCardProps {
  pnl: PnLData;
}

export function PnLCard({ pnl }: PnLCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Profit & Loss</h3>
      </div>

      <div className={`card-value ${pnl.totalPnl >= 0 ? 'positive' : 'negative'}`}>
        {formatCurrency(pnl.totalPnl)}
      </div>

      <div className={`card-label ${pnl.returnPct >= 0 ? 'positive' : 'negative'}`}>
        {formatPercent(pnl.returnPct)}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="stat-row">
          <span className="stat-label">Realized</span>
          <span className={`stat-value ${pnl.realizedPnl >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(pnl.realizedPnl)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Unrealized</span>
          <span className={`stat-value ${pnl.unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(pnl.unrealizedPnl)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Fees</span>
          <span className="stat-value negative">
            {formatCurrency(pnl.totalFees)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Net PnL</span>
          <span className={`stat-value ${pnl.netPnl >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(pnl.netPnl)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Daily PnL</span>
          <span className={`stat-value ${pnl.dailyPnl >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(pnl.dailyPnl)} ({formatPercent(pnl.dailyReturnPct)})
          </span>
        </div>
      </div>
    </div>
  );
}
