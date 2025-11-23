/**
 * Analytics Service
 * Advanced performance analysis and reporting
 */

import { Database } from '../database/Database';
import { TradeRepository } from '../database/repositories/TradeRepository';
import { PerformanceMetricsRepository } from '../database/repositories/PerformanceMetricsRepository';

export interface PerformanceReport {
  overview: {
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
  };
  daily: {
    date: string;
    trades: number;
    pnl: number;
    fees: number;
    netPnl: number;
    winRate: number;
  }[];
  monthly: {
    month: string;
    trades: number;
    pnl: number;
    fees: number;
    netPnl: number;
    avgWinRate: number;
  }[];
  bestTrades: any[];
  worstTrades: any[];
  bestDays: any[];
  worstDays: any[];
}

export interface TradeDistribution {
  byHour: { hour: number; count: number; avgPnl: number }[];
  byDayOfWeek: { day: string; count: number; avgPnl: number }[];
  bySide: { side: string; count: number; totalPnl: number }[];
  byPnlRange: { range: string; count: number; percentage: number }[];
}

export interface RiskMetrics {
  maxDrawdown: number;
  maxDrawdownDuration: number;
  avgDrawdown: number;
  recoveryTime: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  valueAtRisk95: number;
  valueAtRisk99: number;
  expectedShortfall: number;
}

export class AnalyticsService {
  private db: Database;
  private tradeRepo: TradeRepository;
  private metricsRepo: PerformanceMetricsRepository;

  constructor(db: Database) {
    this.db = db;
    this.tradeRepo = new TradeRepository(db);
    this.metricsRepo = new PerformanceMetricsRepository(db);
  }

  /**
   * Generate comprehensive performance report
   */
  public async generatePerformanceReport(sessionId: string): Promise<PerformanceReport> {
    // Get trade statistics
    const tradeStats = await this.tradeRepo.getStats(sessionId);

    // Calculate profit factor
    const avgWin = tradeStats.avg_pnl > 0 ? tradeStats.avg_pnl : 0;
    const totalWins = avgWin * (tradeStats.winning_trades || 0);

    // Get avg loss (negative)
    const avgLossResult = await this.db.queryOne<{ avg_loss: number }>(
      `SELECT AVG(realized_pnl) as avg_loss
       FROM trades
       WHERE session_id = ? AND realized_pnl < 0`,
      [sessionId]
    );

    const avgLoss = avgLossResult?.avg_loss || 0;
    const totalLosses = Math.abs(avgLoss * (tradeStats.losing_trades || 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    // Get session initial capital for ROI
    const session = await this.db.queryOne<{ initial_capital: number }>(
      'SELECT initial_capital FROM sessions WHERE session_id = ?',
      [sessionId]
    );

    const initialCapital = session?.initial_capital || 0;
    const netPnL = (tradeStats.total_pnl || 0) - (tradeStats.total_fees || 0);
    const roi = initialCapital > 0 ? (netPnL / initialCapital) * 100 : 0;

    const winRate = tradeStats.total_trades > 0
      ? (tradeStats.winning_trades / tradeStats.total_trades) * 100
      : 0;

    // Get daily summary
    const dailySummary = await this.tradeRepo.getDailySummary(sessionId);
    const daily = dailySummary.map((d: any) => ({
      date: d.date,
      trades: d.trades,
      pnl: d.pnl,
      fees: d.fees,
      netPnl: d.pnl - d.fees,
      winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0,
    }));

    // Get monthly aggregates
    const monthlyData = await this.metricsRepo.getMonthlyAggregates(sessionId);
    const monthly = monthlyData.map((m: any) => ({
      month: m.month,
      trades: m.total_trades,
      pnl: m.total_pnl,
      fees: m.total_fees,
      netPnl: m.net_pnl,
      avgWinRate: m.avg_win_rate,
    }));

    // Get best/worst trades
    const bestTrades = await this.tradeRepo.getWinningTrades(sessionId, 10);
    const worstTrades = await this.tradeRepo.getLosingTrades(sessionId, 10);

    // Get best/worst days
    const bestDays = await this.metricsRepo.getBestDays(sessionId, 10);
    const worstDays = await this.metricsRepo.getWorstDays(sessionId, 10);

    // Calculate Sharpe ratio (simplified)
    const sharpeRatio = await this.calculateSharpeRatio(sessionId);

    return {
      overview: {
        totalTrades: tradeStats.total_trades || 0,
        winningTrades: tradeStats.winning_trades || 0,
        losingTrades: tradeStats.losing_trades || 0,
        winRate,
        totalPnL: tradeStats.total_pnl || 0,
        totalFees: tradeStats.total_fees || 0,
        netPnL,
        roi,
        profitFactor,
        avgWin,
        avgLoss,
        largestWin: tradeStats.best_trade || 0,
        largestLoss: tradeStats.worst_trade || 0,
        maxDrawdown: 0, // Would need position snapshots
        sharpeRatio,
        totalVolume: tradeStats.total_volume || 0,
        avgTradeSize: tradeStats.avg_trade_size || 0,
      },
      daily,
      monthly,
      bestTrades,
      worstTrades,
      bestDays,
      worstDays,
    };
  }

  /**
   * Get trade distribution analytics
   */
  public async getTradeDistribution(sessionId: string): Promise<TradeDistribution> {
    // By hour of day
    const byHour = await this.db.query<any>(
      `SELECT
        CAST(strftime('%H', timestamp) AS INTEGER) as hour,
        COUNT(*) as count,
        AVG(realized_pnl) as avgPnl
       FROM trades
       WHERE session_id = ?
       GROUP BY hour
       ORDER BY hour`,
      [sessionId]
    );

    // By day of week
    const byDayOfWeek = await this.db.query<any>(
      `SELECT
        CASE CAST(strftime('%w', timestamp) AS INTEGER)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day,
        COUNT(*) as count,
        AVG(realized_pnl) as avgPnl
       FROM trades
       WHERE session_id = ?
       GROUP BY strftime('%w', timestamp)
       ORDER BY strftime('%w', timestamp)`,
      [sessionId]
    );

    // By side
    const bySide = await this.db.query<any>(
      `SELECT
        side,
        COUNT(*) as count,
        SUM(realized_pnl) as totalPnl
       FROM trades
       WHERE session_id = ?
       GROUP BY side`,
      [sessionId]
    );

    // By PnL range
    const allTrades = await this.db.query<{ realized_pnl: number }>(
      'SELECT realized_pnl FROM trades WHERE session_id = ?',
      [sessionId]
    );

    const totalCount = allTrades.length;
    const ranges = [
      { min: -Infinity, max: -100, label: '< -$100' },
      { min: -100, max: -50, label: '-$100 to -$50' },
      { min: -50, max: -10, label: '-$50 to -$10' },
      { min: -10, max: 0, label: '-$10 to $0' },
      { min: 0, max: 10, label: '$0 to $10' },
      { min: 10, max: 50, label: '$10 to $50' },
      { min: 50, max: 100, label: '$50 to $100' },
      { min: 100, max: Infinity, label: '> $100' },
    ];

    const byPnlRange = ranges.map((range) => {
      const count = allTrades.filter(
        (t) => t.realized_pnl > range.min && t.realized_pnl <= range.max
      ).length;
      return {
        range: range.label,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      };
    });

    return {
      byHour: byHour.map((h: any) => ({
        hour: h.hour,
        count: h.count,
        avgPnl: h.avgPnl || 0,
      })),
      byDayOfWeek: byDayOfWeek.map((d: any) => ({
        day: d.day,
        count: d.count,
        avgPnl: d.avgPnl || 0,
      })),
      bySide: bySide.map((s: any) => ({
        side: s.side,
        count: s.count,
        totalPnl: s.totalPnl || 0,
      })),
      byPnlRange,
    };
  }

  /**
   * Calculate Sharpe ratio
   */
  private async calculateSharpeRatio(sessionId: string): Promise<number> {
    const dailyReturns = await this.db.query<{ net_pnl: number }>(
      `SELECT net_pnl
       FROM performance_metrics
       WHERE session_id = ? AND period_type = 'daily'
       ORDER BY period_start`,
      [sessionId]
    );

    if (dailyReturns.length < 2) {
      return 0;
    }

    const returns = dailyReturns.map((d) => d.net_pnl);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);

    // Assuming risk-free rate = 0 for simplicity
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return sharpeRatio;
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  public async calculateVaR(
    sessionId: string,
    confidenceLevel: number = 0.95
  ): Promise<number> {
    const returns = await this.db.query<{ net_pnl: number }>(
      `SELECT net_pnl
       FROM performance_metrics
       WHERE session_id = ? AND period_type = 'daily'
       ORDER BY net_pnl ASC`,
      [sessionId]
    );

    if (returns.length === 0) {
      return 0;
    }

    const index = Math.floor((1 - confidenceLevel) * returns.length);
    return returns[index]?.net_pnl || 0;
  }

  /**
   * Export report to CSV
   */
  public async exportToCSV(sessionId: string): Promise<string> {
    const trades = await this.tradeRepo.findBySession(sessionId, 10000);

    let csv = 'Timestamp,Symbol,Side,Type,Price,Quantity,Value,Fee,PnL,Order ID,Grid Level\n';

    for (const trade of trades) {
      csv += [
        trade.timestamp,
        trade.symbol,
        trade.side,
        trade.type,
        trade.price,
        trade.quantity,
        trade.value,
        trade.fee || 0,
        trade.realized_pnl || 0,
        trade.order_id || '',
        trade.grid_level || '',
      ].join(',') + '\n';
    }

    return csv;
  }

  /**
   * Get trading streaks
   */
  public async getTradingStreaks(sessionId: string): Promise<{
    currentStreak: { type: 'win' | 'loss'; count: number };
    longestWinStreak: number;
    longestLossStreak: number;
  }> {
    const trades = await this.db.query<{ realized_pnl: number }>(
      `SELECT realized_pnl
       FROM trades
       WHERE session_id = ?
       ORDER BY timestamp ASC`,
      [sessionId]
    );

    let currentStreak = { type: 'win' as 'win' | 'loss', count: 0 };
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    for (const trade of trades) {
      if (trade.realized_pnl > 0) {
        tempWinStreak++;
        tempLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else if (trade.realized_pnl < 0) {
        tempLossStreak++;
        tempWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
      }
    }

    // Set current streak
    if (tempWinStreak > 0) {
      currentStreak = { type: 'win', count: tempWinStreak };
    } else if (tempLossStreak > 0) {
      currentStreak = { type: 'loss', count: tempLossStreak };
    }

    return {
      currentStreak,
      longestWinStreak,
      longestLossStreak,
    };
  }
}
