import type { RiskData } from '../types';

interface RiskCardProps {
  risk: RiskData;
}

export function RiskCard({ risk }: RiskCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getUtilizationClass = (pct: number) => {
    if (pct < 50) return '';
    if (pct < 80) return 'warning';
    return 'danger';
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Risk Metrics</h3>
      </div>

      <div className={`card-value ${risk.isHealthy ? 'positive' : 'negative'}`}>
        {risk.isHealthy ? 'HEALTHY' : 'VIOLATIONS'}
      </div>

      {!risk.isHealthy && risk.violations.length > 0 && (
        <div className="error" style={{ marginTop: '0.5rem' }}>
          {risk.violations.map((v, i) => (
            <div key={i}>• {v}</div>
          ))}
        </div>
      )}

      {risk.warnings.length > 0 && (
        <div style={{ marginTop: '0.5rem', color: 'var(--yellow)' }}>
          {risk.warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <div className="stat-row">
          <span className="stat-label">Position Size</span>
          <span className="stat-value">
            {risk.currentPositionSize.toFixed(2)} / {risk.maxPositionSize.toFixed(2)}
          </span>
        </div>

        <div className="progress-bar">
          <div
            className={`progress-fill ${getUtilizationClass((risk.currentPositionSize / risk.maxPositionSize) * 100)}`}
            style={{ width: `${Math.min((risk.currentPositionSize / risk.maxPositionSize) * 100, 100)}%` }}
          />
        </div>

        <div className="stat-row" style={{ marginTop: '1rem' }}>
          <span className="stat-label">Daily Loss</span>
          <span className="stat-value">
            {formatCurrency(Math.abs(risk.currentDailyLoss))} / {formatCurrency(risk.maxDailyLoss)}
          </span>
        </div>

        <div className="progress-bar">
          <div
            className={`progress-fill ${getUtilizationClass((Math.abs(risk.currentDailyLoss) / risk.maxDailyLoss) * 100)}`}
            style={{ width: `${Math.min((Math.abs(risk.currentDailyLoss) / risk.maxDailyLoss) * 100, 100)}%` }}
          />
        </div>

        <div className="stat-row" style={{ marginTop: '1rem' }}>
          <span className="stat-label">Utilization</span>
          <span className={`stat-value ${risk.utilizationPct > 80 ? 'negative' : risk.utilizationPct > 50 ? 'neutral' : 'positive'}`}>
            {risk.utilizationPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
