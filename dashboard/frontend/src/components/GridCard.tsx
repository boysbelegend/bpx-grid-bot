import type { GridData } from '../types';

interface GridCardProps {
  grid: GridData;
}

export function GridCard({ grid }: GridCardProps) {
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
        <h3 className="card-title">Grid Status</h3>
      </div>

      <div className="card-value">
        {grid.activeOrders} / {grid.totalLevels}
      </div>

      <div className="card-label">Active Orders</div>

      <div style={{ marginTop: '1rem' }}>
        <div className="stat-row">
          <span className="stat-label">Center Price</span>
          <span className="stat-value">
            {formatCurrency(grid.centerPrice)}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Levels</span>
          <span className="stat-value">
            {grid.levels}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Spacing</span>
          <span className="stat-value">
            {grid.spacing.toFixed(2)}%
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Buy Levels</span>
          <span className="stat-value positive">
            {grid.buyLevels}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Sell Levels</span>
          <span className="stat-value negative">
            {grid.sellLevels}
          </span>
        </div>
      </div>

      <div className="progress-bar" style={{ marginTop: '1rem' }}>
        <div
          className="progress-fill positive"
          style={{ width: `${(grid.activeOrders / grid.totalLevels) * 100}%` }}
        />
      </div>
    </div>
  );
}
