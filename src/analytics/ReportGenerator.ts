/**
 * Report Generator
 * Generates formatted performance reports
 */

import { PerformanceMetrics, DrawdownPeriod, EquityCurvePoint } from './PerformanceAnalyzer';
import { writeFileSync } from 'fs';
import { join } from 'path';

export interface ReportConfig {
  title?: string;
  outputDir?: string;
  includeCharts?: boolean;
  format?: 'markdown' | 'html' | 'json';
}

/**
 * Report Generator
 * Creates formatted performance reports
 */
export class ReportGenerator {
  /**
   * Generate a formatted text report
   */
  public static generateTextReport(metrics: PerformanceMetrics, config: ReportConfig = {}): string {
    const title = config.title || 'Trading Performance Report';
    const now = new Date().toISOString();

    let report = '';
    report += '='.repeat(80) + '\n';
    report += `${title}\n`;
    report += `Generated: ${now}\n`;
    report += '='.repeat(80) + '\n\n';

    // Summary Section
    report += '📊 SUMMARY\n';
    report += '-'.repeat(80) + '\n';
    report += `Total Trades:        ${metrics.totalTrades}\n`;
    report += `Winning Trades:      ${metrics.winningTrades} (${metrics.winRate.toFixed(2)}%)\n`;
    report += `Losing Trades:       ${metrics.losingTrades}\n`;
    report += `Total PnL:           ${this.formatCurrency(metrics.totalPnl)}\n`;
    report += `Total Return:        ${metrics.totalReturn.toFixed(2)}%\n`;
    report += `Annualized Return:   ${metrics.annualizedReturn.toFixed(2)}%\n\n`;

    // PnL Analysis
    report += '💰 PnL ANALYSIS\n';
    report += '-'.repeat(80) + '\n';
    report += `Average Win:         ${this.formatCurrency(metrics.averageWin)}\n`;
    report += `Average Loss:        ${this.formatCurrency(metrics.averageLoss)}\n`;
    report += `Largest Win:         ${this.formatCurrency(metrics.largestWin)}\n`;
    report += `Largest Loss:        ${this.formatCurrency(metrics.largestLoss)}\n`;
    report += `Profit Factor:       ${metrics.profitFactor.toFixed(2)}\n`;
    report += `Expectancy:          ${this.formatCurrency(metrics.expectancy)}\n\n`;

    // Risk Metrics
    report += '⚠️  RISK METRICS\n';
    report += '-'.repeat(80) + '\n';
    report += `Max Drawdown:        ${this.formatCurrency(metrics.maxDrawdown)} (${metrics.maxDrawdownPercent.toFixed(2)}%)\n`;
    report += `Average Drawdown:    ${this.formatCurrency(metrics.averageDrawdown)}\n`;
    report += `Recovery Factor:     ${metrics.recoveryFactor.toFixed(2)}\n`;
    report += `Sharpe Ratio:        ${metrics.sharpeRatio.toFixed(2)}  ${this.getRatingLabel(metrics.sharpeRatio, 'sharpe')}\n`;
    report += `Sortino Ratio:       ${metrics.sortinoRatio.toFixed(2)}  ${this.getRatingLabel(metrics.sortinoRatio, 'sortino')}\n`;
    report += `Calmar Ratio:        ${metrics.calmarRatio.toFixed(2)}\n\n`;

    // Daily Statistics
    report += '📅 DAILY STATISTICS\n';
    report += '-'.repeat(80) + '\n';
    report += `Total Days:          ${metrics.totalDays.toFixed(0)}\n`;
    report += `Avg Daily PnL:       ${this.formatCurrency(metrics.averageDailyPnl)}\n`;
    report += `Daily Volatility:    ${this.formatCurrency(metrics.dailyVolatility)}\n`;
    report += `Avg Holding Time:    ${metrics.avgHoldingTime.toFixed(2)} hours\n\n`;

    // Consistency Metrics
    report += '🎯 CONSISTENCY\n';
    report += '-'.repeat(80) + '\n';
    report += `Consecutive Wins:    ${metrics.consecutiveWins}\n`;
    report += `Consecutive Losses:  ${metrics.consecutiveLosses}\n`;
    report += `Win Rate:            ${metrics.winRate.toFixed(2)}%  ${this.getWinRateLabel(metrics.winRate)}\n`;
    report += `Monthly Return:      ${metrics.monthlyReturn.toFixed(2)}%\n\n`;

    // Performance Rating
    report += '⭐ OVERALL RATING\n';
    report += '-'.repeat(80) + '\n';
    report += this.getOverallRating(metrics) + '\n\n';

    report += '='.repeat(80) + '\n';

    return report;
  }

  /**
   * Generate Markdown report
   */
  public static generateMarkdownReport(
    metrics: PerformanceMetrics,
    drawdowns: DrawdownPeriod[],
    equityCurve: EquityCurvePoint[],
    config: ReportConfig = {}
  ): string {
    const title = config.title || 'Trading Performance Report';
    const now = new Date().toISOString().split('T')[0];

    let md = `# ${title}\n\n`;
    md += `**Generated:** ${now}\n\n`;
    md += `---\n\n`;

    // Summary
    md += `## 📊 Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Trades | ${metrics.totalTrades} |\n`;
    md += `| Win Rate | ${metrics.winRate.toFixed(2)}% |\n`;
    md += `| Total PnL | ${this.formatCurrency(metrics.totalPnl)} |\n`;
    md += `| Total Return | ${metrics.totalReturn.toFixed(2)}% |\n`;
    md += `| Annualized Return | ${metrics.annualizedReturn.toFixed(2)}% |\n`;
    md += `| Sharpe Ratio | ${metrics.sharpeRatio.toFixed(2)} |\n\n`;

    // PnL Analysis
    md += `## 💰 PnL Analysis\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Winning Trades | ${metrics.winningTrades} |\n`;
    md += `| Losing Trades | ${metrics.losingTrades} |\n`;
    md += `| Average Win | ${this.formatCurrency(metrics.averageWin)} |\n`;
    md += `| Average Loss | ${this.formatCurrency(metrics.averageLoss)} |\n`;
    md += `| Largest Win | ${this.formatCurrency(metrics.largestWin)} |\n`;
    md += `| Largest Loss | ${this.formatCurrency(metrics.largestLoss)} |\n`;
    md += `| Profit Factor | ${metrics.profitFactor.toFixed(2)} |\n`;
    md += `| Expectancy | ${this.formatCurrency(metrics.expectancy)} |\n\n`;

    // Risk Metrics
    md += `## ⚠️ Risk Metrics\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Max Drawdown | ${this.formatCurrency(metrics.maxDrawdown)} (${metrics.maxDrawdownPercent.toFixed(2)}%) |\n`;
    md += `| Average Drawdown | ${this.formatCurrency(metrics.averageDrawdown)} |\n`;
    md += `| Recovery Factor | ${metrics.recoveryFactor.toFixed(2)} |\n`;
    md += `| Sharpe Ratio | ${metrics.sharpeRatio.toFixed(2)} ${this.getRatingLabel(metrics.sharpeRatio, 'sharpe')} |\n`;
    md += `| Sortino Ratio | ${metrics.sortinoRatio.toFixed(2)} ${this.getRatingLabel(metrics.sortinoRatio, 'sortino')} |\n`;
    md += `| Calmar Ratio | ${metrics.calmarRatio.toFixed(2)} |\n\n`;

    // Drawdowns
    if (drawdowns.length > 0) {
      md += `## 📉 Major Drawdown Periods\n\n`;
      md += `| Start | End | Depth | Duration | Recovered |\n`;
      md += `|-------|-----|-------|----------|----------|\n`;
      drawdowns.slice(0, 5).forEach((dd) => {
        const start = new Date(dd.start).toISOString().split('T')[0];
        const end = new Date(dd.end).toISOString().split('T')[0];
        const duration = (dd.duration / (1000 * 60 * 60 * 24)).toFixed(0);
        md += `| ${start} | ${end} | ${this.formatCurrency(dd.depth)} (${dd.depthPercent.toFixed(2)}%) | ${duration} days | ${dd.recovered ? '✅' : '❌'} |\n`;
      });
      md += `\n`;
    }

    // Performance Rating
    md += `## ⭐ Overall Rating\n\n`;
    md += this.getOverallRating(metrics) + '\n\n';

    return md;
  }

  /**
   * Generate JSON report
   */
  public static generateJSONReport(
    metrics: PerformanceMetrics,
    drawdowns: DrawdownPeriod[],
    equityCurve: EquityCurvePoint[],
    monthlyBreakdown: any[]
  ): string {
    const report = {
      generatedAt: new Date().toISOString(),
      metrics,
      drawdowns,
      equityCurve,
      monthlyBreakdown,
      rating: this.calculateNumericRating(metrics),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Save report to file
   */
  public static saveReport(
    content: string,
    filename: string,
    outputDir: string = './reports'
  ): string {
    const filepath = join(outputDir, filename);
    writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private static formatCurrency(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
  }

  private static getRatingLabel(value: number, type: 'sharpe' | 'sortino'): string {
    if (type === 'sharpe') {
      if (value < 0) return '❌ Poor';
      if (value < 1) return '⚠️ Below Average';
      if (value < 2) return '✅ Good';
      if (value < 3) return '🌟 Very Good';
      return '🏆 Excellent';
    } else {
      if (value < 0) return '❌ Poor';
      if (value < 1) return '⚠️ Below Average';
      if (value < 2) return '✅ Good';
      if (value < 3) return '🌟 Very Good';
      return '🏆 Excellent';
    }
  }

  private static getWinRateLabel(winRate: number): string {
    if (winRate < 40) return '❌ Low';
    if (winRate < 50) return '⚠️ Below Average';
    if (winRate < 60) return '✅ Good';
    if (winRate < 70) return '🌟 Very Good';
    return '🏆 Excellent';
  }

  private static getOverallRating(metrics: PerformanceMetrics): string {
    const score = this.calculateNumericRating(metrics);

    let rating = '';
    if (score >= 80) {
      rating = '🏆 EXCELLENT (Score: ' + score + '/100)';
    } else if (score >= 60) {
      rating = '🌟 GOOD (Score: ' + score + '/100)';
    } else if (score >= 40) {
      rating = '✅ AVERAGE (Score: ' + score + '/100)';
    } else if (score >= 20) {
      rating = '⚠️ BELOW AVERAGE (Score: ' + score + '/100)';
    } else {
      rating = '❌ POOR (Score: ' + score + '/100)';
    }

    return rating + '\n\n' + this.getRecommendations(metrics);
  }

  private static calculateNumericRating(metrics: PerformanceMetrics): number {
    let score = 0;

    // Win rate (0-25 points)
    score += Math.min(25, (metrics.winRate / 70) * 25);

    // Profit factor (0-20 points)
    score += Math.min(20, (metrics.profitFactor / 3) * 20);

    // Sharpe ratio (0-25 points)
    score += Math.min(25, (metrics.sharpeRatio / 3) * 25);

    // Return (0-15 points)
    score += Math.min(15, (metrics.annualizedReturn / 50) * 15);

    // Drawdown (0-15 points) - lower is better
    const drawdownScore = metrics.maxDrawdownPercent > 0
      ? Math.max(0, 15 - (metrics.maxDrawdownPercent / 50) * 15)
      : 15;
    score += drawdownScore;

    return Math.round(score);
  }

  private static getRecommendations(metrics: PerformanceMetrics): string {
    const recommendations: string[] = [];

    if (metrics.winRate < 50) {
      recommendations.push('⚠️ Win rate is below 50%. Consider reviewing your entry/exit strategy.');
    }

    if (metrics.profitFactor < 1.5) {
      recommendations.push('⚠️ Profit factor is low. Ensure your winners are significantly larger than losers.');
    }

    if (metrics.sharpeRatio < 1) {
      recommendations.push('⚠️ Sharpe ratio is below 1. Risk-adjusted returns could be improved.');
    }

    if (metrics.maxDrawdownPercent > 30) {
      recommendations.push('🚨 Max drawdown exceeds 30%. Consider implementing stricter risk controls.');
    }

    if (metrics.consecutiveLosses > 10) {
      recommendations.push('⚠️ Long losing streak detected. Review your strategy during drawdown periods.');
    }

    if (recommendations.length === 0) {
      return '✅ Performance is solid across all metrics. Keep monitoring and stay disciplined!';
    }

    return '**Recommendations:**\n' + recommendations.map(r => `  ${r}`).join('\n');
  }
}
