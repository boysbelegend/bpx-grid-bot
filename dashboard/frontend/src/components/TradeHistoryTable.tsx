/**
 * Trade History Table Component
 * Displays paginated trade history with filtering
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Trade {
  id: number;
  timestamp: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price: number;
  quantity: number;
  value: number;
  fee: number;
  realized_pnl: number;
  order_id?: string;
  grid_level?: number;
}

interface TradeHistoryTableProps {
  sessionId: string;
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ sessionId }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [sideFilter, setSideFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '1d' | '7d' | '30d'>('all');

  useEffect(() => {
    loadTrades();
  }, [sessionId, page, sideFilter, dateFilter]);

  const loadTrades = async () => {
    try {
      setLoading(true);
      const params: any = {
        sessionId,
        limit: pageSize,
        offset: page * pageSize,
      };

      if (sideFilter !== 'all') {
        params.side = sideFilter;
      }

      if (dateFilter !== 'all') {
        const days = parseInt(dateFilter.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        params.startDate = startDate.toISOString();
      }

      const response = await axios.get('http://localhost:3001/api/history/trades', { params });
      setTrades(response.data.data.trades || []);
    } catch (error) {
      console.error('Failed to load trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const exportToCSV = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/analytics/export/csv?sessionId=${sessionId}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trades-${sessionId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  if (loading && trades.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">거래 히스토리</h3>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="card-title">거래 히스토리</h3>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Filters */}
          <select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value as any)}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="all">전체</option>
            <option value="buy">매수</option>
            <option value="sell">매도</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="all">전체 기간</option>
            <option value="1d">최근 1일</option>
            <option value="7d">최근 7일</option>
            <option value="30d">최근 30일</option>
          </select>

          <button
            onClick={exportToCSV}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              background: 'var(--accent-color)',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            CSV 내보내기
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {trades.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            거래 기록이 없습니다
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>시간</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>심볼</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>구분</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>가격</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>수량</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>금액</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>수수료</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>실현 손익</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>그리드</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                    {formatDateTime(trade.timestamp)}
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{trade.symbol}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: trade.side === 'buy' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        color: trade.side === 'buy' ? '#4CAF50' : '#F44336',
                      }}
                    >
                      {trade.side === 'buy' ? '매수' : '매도'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{formatCurrency(trade.price)}</td>
                  <td style={{ padding: '0.75rem' }}>{trade.quantity.toFixed(4)}</td>
                  <td style={{ padding: '0.75rem' }}>{formatCurrency(trade.value)}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                    {formatCurrency(trade.fee)}
                  </td>
                  <td
                    style={{
                      padding: '0.75rem',
                      fontWeight: 600,
                      color: trade.realized_pnl >= 0 ? '#4CAF50' : '#F44336',
                    }}
                  >
                    {trade.realized_pnl >= 0 ? '+' : ''}
                    {formatCurrency(trade.realized_pnl)}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                    {trade.grid_level !== undefined ? `#${trade.grid_level}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {trades.length > 0 && (
        <div
          style={{
            padding: '1rem',
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: page === 0 ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
              color: page === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            이전
          </button>
          <span style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>
            페이지 {page + 1}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={trades.length < pageSize}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: trades.length < pageSize ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
              color: trades.length < pageSize ? 'var(--text-secondary)' : 'var(--text-primary)',
              cursor: trades.length < pageSize ? 'not-allowed' : 'pointer',
            }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};
