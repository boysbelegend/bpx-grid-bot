import type { EngineStatus } from '../types';

interface StatusCardProps {
  status: EngineStatus;
}

export function StatusCard({ status }: StatusCardProps) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'running': return 'positive';
      case 'stopped': return 'neutral';
      case 'paused': return 'yellow';
      case 'error': return 'negative';
      default: return 'neutral';
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Engine Status</h3>
      </div>

      <div className={`card-value ${getStatusColor(status.status)}`}>
        {status.status.toUpperCase()}
      </div>

      {status.strategyName && (
        <div className="card-label">Strategy: {status.strategyName}</div>
      )}

      {status.symbol && (
        <div className="card-label">Symbol: {status.symbol}</div>
      )}

      {status.uptime && (
        <div className="card-label">Uptime: {formatUptime(status.uptime)}</div>
      )}

      {status.errorMessage && (
        <div className="error" style={{ marginTop: '1rem' }}>
          {status.errorMessage}
        </div>
      )}
    </div>
  );
}
