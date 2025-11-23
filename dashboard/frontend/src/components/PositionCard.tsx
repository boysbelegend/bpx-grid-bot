import type { PositionData } from '../types';

interface PositionCardProps {
  position: PositionData;
}

export function PositionCard({ position }: PositionCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 4) => {
    return value.toFixed(decimals);
  };

  const getSkewColor = (skew: number) => {
    if (Math.abs(skew) < 0.2) return 'positive';
    if (Math.abs(skew) < 0.5) return 'neutral';
    return 'negative';
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Position</h3>
      </div>

      <div className="card-value">
        {formatCurrency(position.totalValue)}
      </div>

      <div className="card-label">Total Value</div>

      <div style={{ marginTop: '1rem' }}>
        <div className="stat-row">
          <span className="stat-label">{position.baseAsset}</span>
          <span className="stat-value">
            {formatNumber(position.baseBalance)} ({formatCurrency(position.baseValue)})
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">{position.quoteAsset}</span>
          <span className="stat-value">
            {formatCurrency(position.quoteBalance)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Inventory Skew</span>
          <span className={`stat-value ${getSkewColor(position.inventorySkew)}`}>
            {formatNumber(position.inventorySkew * 100, 1)}%
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Avg Buy Price</span>
          <span className="stat-value">
            {formatCurrency(position.averageBuyPrice)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Avg Sell Price</span>
          <span className="stat-value">
            {formatCurrency(position.averageSellPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
