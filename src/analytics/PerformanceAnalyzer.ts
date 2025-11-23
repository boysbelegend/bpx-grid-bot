/**
 * Performance Analyzer
 * Calculates advanced trading performance metrics
 */

export interface Trade {
  timestamp: number;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  fee: number;
  realizedPnl?: number;
}

export interface EquityCurvePoint {
  timestamp: number;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface PerformanceMetrics {
  // Basic metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;

  // PnL metrics
  totalPnl: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;

  // Risk-adjusted metrics
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;

  // Drawdown metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageDrawdown: number;
  recoveryFactor: number;

  // Time-based metrics
  totalDays: number;
  averageDailyPnl: number;
  dailyVolatility: number;

  // Additional metrics
  expectancy: number;
  avgHoldingTime: number;
  consecutiveWins: number;
  consecutiveLosses: number;

  // Return metrics
  totalReturn: number;
  annualizedReturn: number;
  monthlyReturn: number;
}

export interface DrawdownPeriod {
  start: number;
  end: number;
  depth: number;
  depthPercent: number;
  duration: number;
  recovered: boolean;
}

/**
 * Performance Analyzer
 * Calculates comprehensive trading performance metrics
 */
export class PerformanceAnalyzer {
  private trades: Trade[] = [];
  private equityCurve: EquityCurvePoint[] = [];
  private initialCapital: number;
  private riskFreeRate: number;

  constructor(initialCapital: number, riskFreeRate: number = 0.02) {
    this.initialCapital = initialCapital;
    this.riskFreeRate = riskFreeRate; // Annual risk-free rate (default: 2%)
  }

  /**
   * Add a trade to the analyzer
   */
  public addTrade(trade: Trade): void {
    this.trades.push(trade);
    this.updateEquityCurve(trade);
  }

  /**
   * Add multiple trades
   */
  public addTrades(trades: Trade[]): void {
    trades.forEach((trade) => this.addTrade(trade));
  }

  /**
   * Calculate all performance metrics
   */
  public calculateMetrics(): PerformanceMetrics {
    if (this.trades.length === 0) {
      return this.getEmptyMetrics();
    }

    const pnlTrades = this.getPnLTrades();
    const dailyReturns = this.getDailyReturns();
    const drawdowns = this.calculateDrawdowns();

    const winningTrades = pnlTrades.filter((t) => t > 0);
    const losingTrades = pnlTrades.filter((t) => t < 0);

    const totalPnl = pnlTrades.reduce((sum, pnl) => sum + pnl, 0);
    const totalWins = winningTrades.reduce((sum, pnl) => sum + pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, pnl) => sum + pnl, 0));

    const maxDrawdown = Math.max(...drawdowns.map((d) => d.depth), 0);
    const maxDrawdownPercent = Math.max(...drawdowns.map((d) => d.depthPercent), 0);
    const avgDrawdown = drawdowns.length > 0
      ? drawdowns.reduce((sum, d) => sum + d.depth, 0) / drawdowns.length
      : 0;

    const totalDays = this.getTotalDays();
    const averageDailyPnl = dailyReturns.length > 0
      ? dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length
      : 0;
    const dailyVolatility = this.calculateStdDev(dailyReturns);

    const sharpeRatio = this.calculateSharpeRatio(dailyReturns, dailyVolatility);
    const sortinoRatio = this.calculateSortinoRatio(dailyReturns);
    const calmarRatio = this.calculateCalmarRatio(totalPnl, maxDrawdown, totalDays);

    const totalReturn = (totalPnl / this.initialCapital) * 100;
    const annualizedReturn = totalDays > 0
      ? (Math.pow(1 + totalPnl / this.initialCapital, 365 / totalDays) - 1) * 100
      : 0;
    const monthlyReturn = annualizedReturn / 12;

    const consecutiveStats = this.calculateConsecutiveStats(pnlTrades);

    return {
      // Basic metrics
      totalTrades: pnlTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: pnlTrades.length > 0 ? (winningTrades.length / pnlTrades.length) * 100 : 0,

      // PnL metrics
      totalPnl,
      averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades) : 0,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : 0,

      // Risk-adjusted metrics
      sharpeRatio,
      sortinoRatio,
      calmarRatio,

      // Drawdown metrics
      maxDrawdown,
      maxDrawdownPercent,
      averageDrawdown: avgDrawdown,
      recoveryFactor: maxDrawdown > 0 ? totalPnl / maxDrawdown : 0,

      // Time-based metrics
      totalDays,
      averageDailyPnl,
      dailyVolatility,

      // Additional metrics
      expectancy: pnlTrades.length > 0
        ? pnlTrades.reduce((sum, pnl) => sum + pnl, 0) / pnlTrades.length
        : 0,
      avgHoldingTime: this.calculateAvgHoldingTime(),
      consecutiveWins: consecutiveStats.maxWins,
      consecutiveLosses: consecutiveStats.maxLosses,

      // Return metrics
      totalReturn,
      annualizedReturn,
      monthlyReturn,
    };
  }

  /**
   * Get drawdown periods
   */
  public getDrawdownPeriods(): DrawdownPeriod[] {
    return this.calculateDrawdowns();
  }

  /**
   * Get equity curve
   */
  public getEquityCurve(): EquityCurvePoint[] {
    return this.equityCurve;
  }

  /**
   * Get monthly breakdown
   */
  public getMonthlyBreakdown(): Array<{ month: string; pnl: number; trades: number; winRate: number }> {
    const monthlyData = new Map<string, Trade[]>();

    this.trades.forEach((trade) => {
      const date = new Date(trade.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey)!.push(trade);
    });

    return Array.from(monthlyData.entries()).map(([month, trades]) => {
      const pnlTrades = trades
        .filter((t) => t.realizedPnl !== undefined)
        .map((t) => t.realizedPnl!);
      const wins = pnlTrades.filter((p) => p > 0).length;

      return {
        month,
        pnl: pnlTrades.reduce((sum, p) => sum + p, 0),
        trades: pnlTrades.length,
        winRate: pnlTrades.length > 0 ? (wins / pnlTrades.length) * 100 : 0,
      };
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private updateEquityCurve(trade: Trade): void {
    const lastEquity = this.equityCurve.length > 0
      ? this.equityCurve[this.equityCurve.length - 1].equity
      : this.initialCapital;

    const newEquity = lastEquity + (trade.realizedPnl || 0);
    const peak = Math.max(
      this.initialCapital,
      ...this.equityCurve.map((p) => p.equity)
    );
    const drawdown = peak - newEquity;
    const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

    this.equityCurve.push({
      timestamp: trade.timestamp,
      equity: newEquity,
      drawdown,
      drawdownPercent,
    });
  }

  private getPnLTrades(): number[] {
    return this.trades
      .filter((t) => t.realizedPnl !== undefined)
      .map((t) => t.realizedPnl!);
  }

  private getDailyReturns(): number[] {
    const dailyPnL = new Map<string, number>();

    this.trades.forEach((trade) => {
      if (trade.realizedPnl !== undefined) {
        const date = new Date(trade.timestamp).toISOString().split('T')[0];
        dailyPnL.set(date, (dailyPnL.get(date) || 0) + trade.realizedPnl);
      }
    });

    return Array.from(dailyPnL.values());
  }

  private calculateDrawdowns(): DrawdownPeriod[] {
    const drawdowns: DrawdownPeriod[] = [];
    let peak = this.initialCapital;
    let peakTime = 0;
    let inDrawdown = false;
    let drawdownStart = 0;

    this.equityCurve.forEach((point, index) => {
      if (point.equity >= peak) {
        // New peak
        if (inDrawdown) {
          // Drawdown recovered
          drawdowns.push({
            start: drawdownStart,
            end: point.timestamp,
            depth: peak - Math.min(...this.equityCurve.slice(
              this.equityCurve.findIndex(p => p.timestamp === drawdownStart),
              index + 1
            ).map(p => p.equity)),
            depthPercent: ((peak - Math.min(...this.equityCurve.slice(
              this.equityCurve.findIndex(p => p.timestamp === drawdownStart),
              index + 1
            ).map(p => p.equity))) / peak) * 100,
            duration: point.timestamp - drawdownStart,
            recovered: true,
          });
          inDrawdown = false;
        }
        peak = point.equity;
        peakTime = point.timestamp;
      } else {
        // In drawdown
        if (!inDrawdown) {
          inDrawdown = true;
          drawdownStart = peakTime;
        }
      }
    });

    // Handle ongoing drawdown
    if (inDrawdown) {
      const currentEquity = this.equityCurve[this.equityCurve.length - 1].equity;
      drawdowns.push({
        start: drawdownStart,
        end: Date.now(),
        depth: peak - currentEquity,
        depthPercent: ((peak - currentEquity) / peak) * 100,
        duration: Date.now() - drawdownStart,
        recovered: false,
      });
    }

    return drawdowns;
  }

  private calculateSharpeRatio(dailyReturns: number[], volatility: number): number {
    if (volatility === 0 || dailyReturns.length === 0) return 0;

    const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const dailyRiskFreeRate = this.riskFreeRate / 365;

    // Annualize
    const annualizedReturn = avgDailyReturn * 365;
    const annualizedVolatility = volatility * Math.sqrt(365);

    return annualizedVolatility > 0
      ? (annualizedReturn - this.riskFreeRate) / annualizedVolatility
      : 0;
  }

  private calculateSortinoRatio(dailyReturns: number[]): number {
    if (dailyReturns.length === 0) return 0;

    const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const downside = dailyReturns.filter((r) => r < 0);
    const downsideDeviation = downside.length > 0 ? this.calculateStdDev(downside) : 0;

    if (downsideDeviation === 0) return 0;

    const annualizedReturn = avgReturn * 365;
    const annualizedDownside = downsideDeviation * Math.sqrt(365);

    return (annualizedReturn - this.riskFreeRate) / annualizedDownside;
  }

  private calculateCalmarRatio(totalPnl: number, maxDrawdown: number, totalDays: number): number {
    if (maxDrawdown === 0 || totalDays === 0) return 0;

    const annualizedReturn = (Math.pow(1 + totalPnl / this.initialCapital, 365 / totalDays) - 1) * 100;
    const maxDrawdownPercent = (maxDrawdown / this.initialCapital) * 100;

    return annualizedReturn / maxDrawdownPercent;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

    return Math.sqrt(variance);
  }

  private getTotalDays(): number {
    if (this.trades.length === 0) return 0;

    const firstTrade = Math.min(...this.trades.map((t) => t.timestamp));
    const lastTrade = Math.max(...this.trades.map((t) => t.timestamp));

    return (lastTrade - firstTrade) / (1000 * 60 * 60 * 24);
  }

  private calculateAvgHoldingTime(): number {
    // This is a simplified calculation
    // In a real scenario, you'd track buy/sell pairs
    if (this.trades.length < 2) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < this.trades.length; i++) {
      intervals.push(this.trades[i].timestamp - this.trades[i - 1].timestamp);
    }

    const avgMs = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    return avgMs / (1000 * 60 * 60); // Convert to hours
  }

  private calculateConsecutiveStats(pnlTrades: number[]): { maxWins: number; maxLosses: number } {
    let maxWins = 0;
    let maxLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    pnlTrades.forEach((pnl) => {
      if (pnl > 0) {
        currentWins++;
        currentLosses = 0;
        maxWins = Math.max(maxWins, currentWins);
      } else if (pnl < 0) {
        currentLosses++;
        currentWins = 0;
        maxLosses = Math.max(maxLosses, currentLosses);
      }
    });

    return { maxWins, maxLosses };
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      averageDrawdown: 0,
      recoveryFactor: 0,
      totalDays: 0,
      averageDailyPnl: 0,
      dailyVolatility: 0,
      expectancy: 0,
      avgHoldingTime: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      totalReturn: 0,
      annualizedReturn: 0,
      monthlyReturn: 0,
    };
  }
}
