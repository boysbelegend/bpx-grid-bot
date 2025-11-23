/**
 * Portfolio Dashboard Component
 * Unified view for multi-pair trading
 */

import React from 'react';

interface PairPerformance {
  symbol: string;
  status: 'running' | 'paused' | 'stopped';
  pnl: number;
  positionValue: number;
  weight: number;
  uptime: number;
  totalTrades?: number;
  winRate?: number;
}

interface PortfolioSummary {
  totalPairs: number;
  activePairs: number;
  totalPnl: number;
  totalPositionValue: number;
  dailyPnl: number;
  pairBreakdown: PairPerformance[];
}

interface PortfolioDashboardProps {
  summary: PortfolioSummary;
  onPairSelect?: (symbol: string) => void;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  summary,
  onPairSelect,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'stopped':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatUptime = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Active Pairs</h3>
          </div>
          <div className="text-3xl font-bold">
            {summary.activePairs}/{summary.totalPairs}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {summary.activePairs === summary.totalPairs ? 'All running' : 'Some paused/stopped'}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Total PnL</h3>
          </div>
          <div
            className={`text-3xl font-bold ${
              summary.totalPnl >= 0 ? 'positive' : 'negative'
            }`}
          >
            {summary.totalPnl >= 0 ? '+' : ''}${summary.totalPnl.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            All-time profit/loss
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Daily PnL</h3>
          </div>
          <div
            className={`text-3xl font-bold ${
              summary.dailyPnl >= 0 ? 'positive' : 'negative'
            }`}
          >
            {summary.dailyPnl >= 0 ? '+' : ''}${summary.dailyPnl.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Today's performance
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Total Value</h3>
          </div>
          <div className="text-3xl font-bold">
            ${summary.totalPositionValue.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Combined portfolio value
          </div>
        </div>
      </div>

      {/* Portfolio Allocation Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Portfolio Allocation</h3>
        </div>

        <div className="space-y-4">
          {summary.pairBreakdown.map((pair) => (
            <div key={pair.symbol} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(pair.status)}`} />
                  <span className="font-medium">{pair.symbol}</span>
                  <span className="text-sm text-gray-500">{pair.status}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {(pair.weight * 100).toFixed(1)}%
                  </span>
                  <span
                    className={`font-medium ${
                      pair.pnl >= 0 ? 'positive' : 'negative'
                    }`}
                  >
                    {pair.pnl >= 0 ? '+' : ''}${pair.pnl.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Allocation Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    pair.status === 'running'
                      ? 'bg-blue-600'
                      : pair.status === 'paused'
                      ? 'bg-yellow-600'
                      : 'bg-gray-600'
                  }`}
                  style={{ width: `${pair.weight * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Pair Details */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Pair Details</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="py-3 px-4 text-sm font-medium text-gray-600">Symbol</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-600">PnL</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-600">Position Value</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-600">Weight</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-600">Uptime</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-600">Trades</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-600">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {summary.pairBreakdown.map((pair) => (
                <tr
                  key={pair.symbol}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onPairSelect?.(pair.symbol)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(pair.status)}`} />
                      <span className="font-medium">{pair.symbol}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        pair.status === 'running'
                          ? 'bg-green-100 text-green-800'
                          : pair.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {pair.status}
                    </span>
                  </td>
                  <td className={`py-3 px-4 font-medium ${pair.pnl >= 0 ? 'positive' : 'negative'}`}>
                    {pair.pnl >= 0 ? '+' : ''}${pair.pnl.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">${pair.positionValue.toFixed(2)}</td>
                  <td className="py-3 px-4">{(pair.weight * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatUptime(pair.uptime)}
                  </td>
                  <td className="py-3 px-4">{pair.totalTrades || '-'}</td>
                  <td className="py-3 px-4">
                    {pair.winRate !== undefined ? `${(pair.winRate * 100).toFixed(1)}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Charts (Placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">PnL by Pair</h3>
          </div>
          <div className="p-4">
            {summary.pairBreakdown.map((pair) => (
              <div key={pair.symbol} className="flex items-center justify-between mb-3">
                <span className="text-sm">{pair.symbol}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        pair.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.abs(pair.pnl / summary.totalPnl) * 100)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      pair.pnl >= 0 ? 'positive' : 'negative'
                    }`}
                  >
                    {pair.pnl >= 0 ? '+' : ''}${pair.pnl.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Weight Distribution</h3>
          </div>
          <div className="p-4">
            <div className="flex flex-col gap-3">
              {summary.pairBreakdown.map((pair, idx) => (
                <div key={pair.symbol} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{
                      backgroundColor: `hsl(${(idx * 360) / summary.pairBreakdown.length}, 70%, 50%)`,
                    }}
                  />
                  <span className="text-sm flex-1">{pair.symbol}</span>
                  <span className="text-sm font-medium">{(pair.weight * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioDashboard;
