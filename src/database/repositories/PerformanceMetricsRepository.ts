/**
 * Performance Metrics Repository
 * Advanced analytics and aggregated performance data
 */

import { Database } from '../Database';

export interface PerformanceMetrics {
  id?: number;
  session_id: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  total_fees: number;
  net_pnl: number;
  roi: number;
  max_drawdown: number;
  sharpe_ratio?: number;
  profit_factor?: number;
  avg_win?: number;
  avg_loss?: number;
  largest_win?: number;
  largest_loss?: number;
  avg_hold_time?: number;
  total_volume: number;
}

export class PerformanceMetricsRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Create or update performance metrics
   */
  public async upsert(metrics: Omit<PerformanceMetrics, 'id'>): Promise<void> {
    // Check if exists
    const existing = await this.db.queryOne(
      `SELECT id FROM performance_metrics
       WHERE session_id = ? AND period_type = ? AND period_start = ?`,
      [metrics.session_id, metrics.period_type, metrics.period_start]
    );

    if (existing) {
      // Update
      await this.db.execute(
        `UPDATE performance_metrics SET
          period_end = ?, total_trades = ?, winning_trades = ?, losing_trades = ?,
          win_rate = ?, total_pnl = ?, total_fees = ?, net_pnl = ?, roi = ?,
          max_drawdown = ?, sharpe_ratio = ?, profit_factor = ?, avg_win = ?,
          avg_loss = ?, largest_win = ?, largest_loss = ?, avg_hold_time = ?,
          total_volume = ?
         WHERE id = ?`,
        [
          metrics.period_end,
          metrics.total_trades,
          metrics.winning_trades,
          metrics.losing_trades,
          metrics.win_rate,
          metrics.total_pnl,
          metrics.total_fees,
          metrics.net_pnl,
          metrics.roi,
          metrics.max_drawdown,
          metrics.sharpe_ratio || null,
          metrics.profit_factor || null,
          metrics.avg_win || null,
          metrics.avg_loss || null,
          metrics.largest_win || null,
          metrics.largest_loss || null,
          metrics.avg_hold_time || null,
          metrics.total_volume,
          existing.id,
        ]
      );
    } else {
      // Insert
      await this.db.execute(
        `INSERT INTO performance_metrics (
          session_id, period_type, period_start, period_end, total_trades,
          winning_trades, losing_trades, win_rate, total_pnl, total_fees,
          net_pnl, roi, max_drawdown, sharpe_ratio, profit_factor, avg_win,
          avg_loss, largest_win, largest_loss, avg_hold_time, total_volume
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metrics.session_id,
          metrics.period_type,
          metrics.period_start,
          metrics.period_end,
          metrics.total_trades,
          metrics.winning_trades,
          metrics.losing_trades,
          metrics.win_rate,
          metrics.total_pnl,
          metrics.total_fees,
          metrics.net_pnl,
          metrics.roi,
          metrics.max_drawdown,
          metrics.sharpe_ratio || null,
          metrics.profit_factor || null,
          metrics.avg_win || null,
          metrics.avg_loss || null,
          metrics.largest_win || null,
          metrics.largest_loss || null,
          metrics.avg_hold_time || null,
          metrics.total_volume,
        ]
      );
    }
  }

  /**
   * Get metrics by period
   */
  public async getByPeriod(
    sessionId: string,
    periodType: 'daily' | 'weekly' | 'monthly',
    limit: number = 30
  ): Promise<PerformanceMetrics[]> {
    return this.db.query<PerformanceMetrics>(
      `SELECT * FROM performance_metrics
       WHERE session_id = ? AND period_type = ?
       ORDER BY period_start DESC
       LIMIT ?`,
      [sessionId, periodType, limit]
    );
  }

  /**
   * Get metrics for date range
   */
  public async getByDateRange(
    sessionId: string,
    startDate: string,
    endDate: string
  ): Promise<PerformanceMetrics[]> {
    return this.db.query<PerformanceMetrics>(
      `SELECT * FROM performance_metrics
       WHERE session_id = ? AND period_start >= ? AND period_end <= ?
       ORDER BY period_start ASC`,
      [sessionId, startDate, endDate]
    );
  }

  /**
   * Calculate and save daily metrics
   */
  public async calculateDaily(sessionId: string, date: string): Promise<void> {
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;

    // Get trades for the day
    const stats = await this.db.queryOne<any>(
      `SELECT
        COUNT(*) as total_trades,
        SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        SUM(realized_pnl) as total_pnl,
        SUM(fee) as total_fees,
        SUM(value) as total_volume,
        AVG(CASE WHEN realized_pnl > 0 THEN realized_pnl END) as avg_win,
        AVG(CASE WHEN realized_pnl < 0 THEN realized_pnl END) as avg_loss,
        MAX(realized_pnl) as largest_win,
        MIN(realized_pnl) as largest_loss
       FROM trades
       WHERE session_id = ? AND timestamp >= ? AND timestamp <= ?`,
      [sessionId, startOfDay, endOfDay]
    );

    if (!stats || stats.total_trades === 0) {
      return; // No trades for this day
    }

    const winRate = stats.total_trades > 0
      ? (stats.winning_trades / stats.total_trades) * 100
      : 0;

    const netPnl = stats.total_pnl - stats.total_fees;

    // Calculate profit factor
    const totalWins = stats.avg_win ? stats.avg_win * stats.winning_trades : 0;
    const totalLosses = stats.avg_loss ? Math.abs(stats.avg_loss * stats.losing_trades) : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : undefined;

    // Get initial capital from session
    const session = await this.db.queryOne<any>(
      'SELECT initial_capital FROM sessions WHERE session_id = ?',
      [sessionId]
    );

    const roi = session?.initial_capital && session.initial_capital > 0
      ? (netPnl / session.initial_capital) * 100
      : 0;

    await this.upsert({
      session_id: sessionId,
      period_type: 'daily',
      period_start: startOfDay,
      period_end: endOfDay,
      total_trades: stats.total_trades,
      winning_trades: stats.winning_trades,
      losing_trades: stats.losing_trades,
      win_rate: winRate,
      total_pnl: stats.total_pnl,
      total_fees: stats.total_fees,
      net_pnl: netPnl,
      roi: roi,
      max_drawdown: 0, // Would need position snapshots to calculate
      profit_factor: profitFactor,
      avg_win: stats.avg_win,
      avg_loss: stats.avg_loss,
      largest_win: stats.largest_win,
      largest_loss: stats.largest_loss,
      total_volume: stats.total_volume,
    });
  }

  /**
   * Calculate monthly summary
   */
  public async getMonthlyAggregates(sessionId: string): Promise<any[]> {
    return this.db.query(
      `SELECT
        strftime('%Y-%m', period_start) as month,
        SUM(total_trades) as total_trades,
        SUM(winning_trades) as winning_trades,
        SUM(losing_trades) as losing_trades,
        AVG(win_rate) as avg_win_rate,
        SUM(total_pnl) as total_pnl,
        SUM(total_fees) as total_fees,
        SUM(net_pnl) as net_pnl,
        AVG(roi) as avg_roi,
        MAX(max_drawdown) as max_drawdown,
        SUM(total_volume) as total_volume
       FROM performance_metrics
       WHERE session_id = ? AND period_type = 'daily'
       GROUP BY strftime('%Y-%m', period_start)
       ORDER BY month DESC`,
      [sessionId]
    );
  }

  /**
   * Get best performing days
   */
  public async getBestDays(sessionId: string, limit: number = 10): Promise<PerformanceMetrics[]> {
    return this.db.query<PerformanceMetrics>(
      `SELECT * FROM performance_metrics
       WHERE session_id = ? AND period_type = 'daily'
       ORDER BY net_pnl DESC
       LIMIT ?`,
      [sessionId, limit]
    );
  }

  /**
   * Get worst performing days
   */
  public async getWorstDays(sessionId: string, limit: number = 10): Promise<PerformanceMetrics[]> {
    return this.db.query<PerformanceMetrics>(
      `SELECT * FROM performance_metrics
       WHERE session_id = ? AND period_type = 'daily'
       ORDER BY net_pnl ASC
       LIMIT ?`,
      [sessionId, limit]
    );
  }

  /**
   * Get overall statistics
   */
  public async getOverallStats(sessionId: string): Promise<any> {
    return this.db.queryOne(
      `SELECT
        COUNT(DISTINCT DATE(period_start)) as trading_days,
        SUM(total_trades) as total_trades,
        SUM(winning_trades) as total_wins,
        SUM(losing_trades) as total_losses,
        AVG(win_rate) as avg_win_rate,
        SUM(total_pnl) as cumulative_pnl,
        SUM(total_fees) as cumulative_fees,
        SUM(net_pnl) as cumulative_net_pnl,
        MAX(max_drawdown) as max_drawdown,
        SUM(total_volume) as cumulative_volume,
        AVG(net_pnl) as avg_daily_pnl,
        MAX(net_pnl) as best_day_pnl,
        MIN(net_pnl) as worst_day_pnl
       FROM performance_metrics
       WHERE session_id = ? AND period_type = 'daily'`,
      [sessionId]
    );
  }
}
