/**
 * Analytics Dashboard Component
 * Comprehensive performance analytics and reports
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PerformanceOverview {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  totalFees: number;
  netPnL: number;
  roi: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  totalVolume: number;
  avgTradeSize: number;
}

interface DailyMetrics {
  date: string;
  trades: number;
  pnl: number;
  fees: number;
  netPnl: number;
  winRate: number;
}

interface MonthlyMetrics {
  month: string;
  trades: number;
  pnl: number;
  fees: number;
  netPnl: number;
  avgWinRate: number;
}

interface AnalyticsDashboardProps {
  sessionId: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ sessionId }) => {
  const [overview, setOverview] = useState<PerformanceOverview | null>(null);
  const [daily, setDaily] = useState<DailyMetrics[]>([]);
  const [monthly, setMonthly] = useState<MonthlyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'monthly'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [sessionId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/analytics/performance', {
        params: { sessionId },
      });

      const data = response.data.data;
      setOverview(data.overview || null);
      setDaily(data.daily || []);
      setMonthly(data.monthly || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">성능 분석</h3>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          로딩 중...
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">성능 분석</h3>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          데이터를 불러올 수 없습니다
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'overview' ? 'var(--accent-color)' : 'var(--bg-secondary)',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          종합
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'daily' ? 'var(--accent-color)' : 'var(--bg-secondary)',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          일별 분석
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'monthly' ? 'var(--accent-color)' : 'var(--bg-secondary)',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          월별 분석
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Key Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div className="card">
              <div className="card-header">
                <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  총 손익 (Net PnL)
                </h4>
              </div>
              <div style={{ padding: '1rem' }}>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: overview.netPnL >= 0 ? '#4CAF50' : '#F44336',
                  }}
                >
                  {overview.netPnL >= 0 ? '+' : ''}
                  {formatCurrency(overview.netPnL)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  ROI: {formatPercentage(overview.roi)}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  승률 (Win Rate)
                </h4>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {formatPercentage(overview.winRate)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  {overview.winningTrades}승 / {overview.losingTrades}패
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  수익 비율 (Profit Factor)
                </h4>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {overview.profitFactor.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  {overview.profitFactor > 1 ? '수익' : '손실'}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  총 거래
                </h4>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {overview.totalTrades}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  평균 크기: {formatCurrency(overview.avgTradeSize)}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">상세 통계</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '2rem',
                }}
              >
                {/* Wins/Losses */}
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    승패 분석
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>평균 수익:</span>
                      <span style={{ fontWeight: 600, color: '#4CAF50' }}>
                        +{formatCurrency(overview.avgWin)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>평균 손실:</span>
                      <span style={{ fontWeight: 600, color: '#F44336' }}>
                        {formatCurrency(overview.avgLoss)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>최대 수익:</span>
                      <span style={{ fontWeight: 600, color: '#4CAF50' }}>
                        +{formatCurrency(overview.largestWin)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>최대 손실:</span>
                      <span style={{ fontWeight: 600, color: '#F44336' }}>
                        {formatCurrency(overview.largestLoss)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fees & Volume */}
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    수수료 & 거래량
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>총 손익 (Gross):</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(overview.totalPnL)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>총 수수료:</span>
                      <span style={{ fontWeight: 600, color: '#F44336' }}>
                        -{formatCurrency(overview.totalFees)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>순 손익 (Net):</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: overview.netPnL >= 0 ? '#4CAF50' : '#F44336',
                        }}
                      >
                        {overview.netPnL >= 0 ? '+' : ''}
                        {formatCurrency(overview.netPnL)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>총 거래량:</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(overview.totalVolume)}</span>
                    </div>
                  </div>
                </div>

                {/* Risk Metrics */}
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    리스크 지표
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>ROI:</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: overview.roi >= 0 ? '#4CAF50' : '#F44336',
                        }}
                      >
                        {overview.roi >= 0 ? '+' : ''}
                        {formatPercentage(overview.roi)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>최대 낙폭:</span>
                      <span style={{ fontWeight: 600 }}>{formatPercentage(overview.maxDrawdown)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>샤프 비율:</span>
                      <span style={{ fontWeight: 600 }}>
                        {overview.sharpeRatio !== undefined ? overview.sharpeRatio.toFixed(2) : 'N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>수익 비율:</span>
                      <span style={{ fontWeight: 600 }}>{overview.profitFactor.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Tab */}
      {activeTab === 'daily' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">일별 성과</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {daily.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                일별 데이터가 없습니다
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      날짜
                    </th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      거래 수
                    </th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      총 손익
                    </th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      수수료
                    </th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      순 손익
                    </th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      승률
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((day, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>{day.date}</td>
                      <td style={{ padding: '0.75rem' }}>{day.trades}</td>
                      <td
                        style={{
                          padding: '0.75rem',
                          color: day.pnl >= 0 ? '#4CAF50' : '#F44336',
                          fontWeight: 600,
                        }}
                      >
                        {day.pnl >= 0 ? '+' : ''}
                        {formatCurrency(day.pnl)}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                        -{formatCurrency(day.fees)}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem',
                          color: day.netPnl >= 0 ? '#4CAF50' : '#F44336',
                          fontWeight: 600,
                        }}
                      >
                        {day.netPnl >= 0 ? '+' : ''}
                        {formatCurrency(day.netPnl)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{formatPercentage(day.winRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Monthly Tab */}
      {activeTab === 'monthly' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">월별 성과</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {monthly.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                월별 데이터가 없습니다
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      월
                    </th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      거래 수
                    </th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      총 손익
                    </th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      수수료
                    </th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      순 손익
                    </th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      평균 승률
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((month, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{month.month}</td>
                      <td style={{ padding: '0.75rem' }}>{month.trades}</td>
                      <td
                        style={{
                          padding: '0.75rem',
                          color: month.pnl >= 0 ? '#4CAF50' : '#F44336',
                          fontWeight: 600,
                        }}
                      >
                        {month.pnl >= 0 ? '+' : ''}
                        {formatCurrency(month.pnl)}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                        -{formatCurrency(month.fees)}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem',
                          color: month.netPnl >= 0 ? '#4CAF50' : '#F44336',
                          fontWeight: 600,
                        }}
                      >
                        {month.netPnl >= 0 ? '+' : ''}
                        {formatCurrency(month.netPnl)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{formatPercentage(month.avgWinRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
