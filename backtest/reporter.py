"""
Backtest Reporter and Visualizer
Generates reports and charts from backtest results
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from typing import Dict, Optional
import json
from datetime import datetime


class BacktestReporter:
    """Generate detailed reports and visualizations"""

    def __init__(self, results: Dict):
        self.results = results
        self.timestamps = pd.to_datetime(results['timestamps'])
        self.equity_curve = pd.Series(
            results['equity_curve'],
            index=self.timestamps
        )
        self.prices = pd.Series(
            results['prices'],
            index=self.timestamps
        )

    def generate_report(self, output_file: Optional[str] = None) -> str:
        """Generate text report"""
        report = []
        report.append("="*70)
        report.append("BACKTEST REPORT")
        report.append("="*70)
        report.append("")

        # Period
        start_date = self.timestamps[0].strftime("%Y-%m-%d %H:%M")
        end_date = self.timestamps[-1].strftime("%Y-%m-%d %H:%M")
        duration = (self.timestamps[-1] - self.timestamps[0]).days
        report.append(f"Period: {start_date} to {end_date} ({duration} days)")
        report.append("")

        # Performance Summary
        report.append("PERFORMANCE SUMMARY")
        report.append("-"*70)
        report.append(f"Initial Value:        ${self.results['initial_value']:>12,.2f}")
        report.append(f"Final Value:          ${self.results['final_value']:>12,.2f}")
        report.append(f"Total Return:         {self.results['total_return_pct']:>12.2f}%")
        report.append(f"Annualized Return:    {self._annualized_return():>12.2f}%")
        report.append("")

        # PnL Breakdown
        report.append("PNL BREAKDOWN")
        report.append("-"*70)
        report.append(f"Realized PnL:         ${self.results['realized_pnl']:>12,.2f}")
        report.append(f"Unrealized PnL:       ${self.results['unrealized_pnl']:>12,.2f}")
        report.append(f"Total PnL:            ${self.results['total_pnl']:>12,.2f}")
        report.append(f"Total Fees Paid:      ${self.results['total_fees']:>12,.2f}")
        report.append(f"Net PnL (after fees): ${self.results['total_pnl'] - self.results['total_fees']:>12,.2f}")
        report.append("")

        # Trading Statistics
        report.append("TRADING STATISTICS")
        report.append("-"*70)
        report.append(f"Total Trades:         {self.results['total_trades']:>12}")
        report.append(f"Win Rate:             {self.results['win_rate']:>12.1f}%")
        report.append(f"Avg Trades/Day:       {self._avg_trades_per_day():>12.1f}")
        report.append("")

        # Risk Metrics
        report.append("RISK METRICS")
        report.append("-"*70)
        report.append(f"Max Drawdown:         {self.results['max_drawdown']:>12.2f}%")
        report.append(f"Sharpe Ratio:         {self.results['sharpe_ratio']:>12.2f}")
        report.append(f"Volatility (daily):   {self._daily_volatility():>12.2f}%")
        report.append(f"Calmar Ratio:         {self._calmar_ratio():>12.2f}")
        report.append("")

        # Final Position
        report.append("FINAL POSITION")
        report.append("-"*70)
        report.append(f"Base Asset:           {self.results['final_base_position']:>12.4f}")
        report.append(f"Quote Asset:          ${self.results['final_quote_position']:>12,.2f}")
        report.append("")

        # Price Statistics
        report.append("PRICE STATISTICS")
        report.append("-"*70)
        report.append(f"Starting Price:       ${self.prices.iloc[0]:>12,.2f}")
        report.append(f"Ending Price:         ${self.prices.iloc[-1]:>12,.2f}")
        report.append(f"Price Change:         {((self.prices.iloc[-1] / self.prices.iloc[0] - 1) * 100):>12.2f}%")
        report.append(f"Min Price:            ${self.prices.min():>12,.2f}")
        report.append(f"Max Price:            ${self.prices.max():>12,.2f}")
        report.append("")

        report.append("="*70)

        report_text = "\n".join(report)

        if output_file:
            with open(output_file, 'w') as f:
                f.write(report_text)
            print(f"Report saved to {output_file}")

        return report_text

    def plot_results(
        self,
        save_path: Optional[str] = None,
        figsize: tuple = (15, 10)
    ):
        """Generate comprehensive visualization"""
        fig, axes = plt.subplots(3, 2, figsize=figsize)
        fig.suptitle('Backtest Results', fontsize=16, fontweight='bold')

        # 1. Price Chart
        ax = axes[0, 0]
        ax.plot(self.timestamps, self.prices, label='Price', linewidth=1.5)
        ax.set_title('Price Movement')
        ax.set_ylabel('Price ($)')
        ax.grid(True, alpha=0.3)
        ax.legend()

        # 2. Equity Curve
        ax = axes[0, 1]
        ax.plot(self.timestamps, self.equity_curve, label='Equity', color='green', linewidth=1.5)
        ax.axhline(y=self.results['initial_value'], color='gray', linestyle='--', alpha=0.5, label='Initial')
        ax.set_title('Equity Curve')
        ax.set_ylabel('Equity ($)')
        ax.grid(True, alpha=0.3)
        ax.legend()

        # 3. Drawdown
        ax = axes[1, 0]
        drawdown = self._calculate_drawdown()
        ax.fill_between(self.timestamps, 0, drawdown, color='red', alpha=0.3)
        ax.plot(self.timestamps, drawdown, color='red', linewidth=1)
        ax.set_title('Drawdown')
        ax.set_ylabel('Drawdown (%)')
        ax.grid(True, alpha=0.3)

        # 4. Returns Distribution
        ax = axes[1, 1]
        returns = self.equity_curve.pct_change().dropna() * 100
        ax.hist(returns, bins=50, alpha=0.7, color='blue', edgecolor='black')
        ax.axvline(x=returns.mean(), color='red', linestyle='--', label=f'Mean: {returns.mean():.3f}%')
        ax.set_title('Returns Distribution')
        ax.set_xlabel('Return (%)')
        ax.set_ylabel('Frequency')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # 5. Cumulative Returns
        ax = axes[2, 0]
        cumulative_returns = (self.equity_curve / self.results['initial_value'] - 1) * 100
        ax.plot(self.timestamps, cumulative_returns, color='purple', linewidth=1.5)
        ax.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
        ax.set_title('Cumulative Returns')
        ax.set_ylabel('Return (%)')
        ax.grid(True, alpha=0.3)

        # 6. Trade Distribution (if fills available)
        ax = axes[2, 1]
        if 'fills' in self.results and not self.results['fills'].empty:
            fills = self.results['fills']
            buy_fills = fills[fills['side'] == 'Bid']
            sell_fills = fills[fills['side'] == 'Ask']

            ax.scatter(buy_fills.index, buy_fills['price'], c='green', alpha=0.6, s=30, label='Buy')
            ax.scatter(sell_fills.index, sell_fills['price'], c='red', alpha=0.6, s=30, label='Sell')
            ax.plot(self.timestamps, self.prices, color='blue', alpha=0.3, linewidth=1)
            ax.set_title('Trade Executions')
            ax.set_ylabel('Price ($)')
            ax.legend()
            ax.grid(True, alpha=0.3)
        else:
            ax.text(0.5, 0.5, 'No trades data', ha='center', va='center', transform=ax.transAxes)
            ax.set_title('Trade Executions')

        # Format x-axis
        for ax in axes.flat:
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
            ax.tick_params(axis='x', rotation=45)

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Chart saved to {save_path}")

        plt.show()

    def export_to_json(self, filename: str):
        """Export results to JSON"""
        export_data = {
            'summary': {
                'initial_value': self.results['initial_value'],
                'final_value': self.results['final_value'],
                'total_return_pct': self.results['total_return_pct'],
                'realized_pnl': self.results['realized_pnl'],
                'unrealized_pnl': self.results['unrealized_pnl'],
                'total_pnl': self.results['total_pnl'],
                'total_fees': self.results['total_fees'],
                'total_trades': self.results['total_trades'],
                'win_rate': self.results['win_rate'],
                'max_drawdown': self.results['max_drawdown'],
                'sharpe_ratio': self.results['sharpe_ratio'],
            },
            'equity_curve': self.equity_curve.tolist(),
            'timestamps': [str(ts) for ts in self.timestamps],
            'prices': self.prices.tolist(),
        }

        with open(filename, 'w') as f:
            json.dump(export_data, f, indent=2)

        print(f"Results exported to {filename}")

    # Helper methods for metrics calculation

    def _annualized_return(self) -> float:
        """Calculate annualized return"""
        duration_years = (self.timestamps[-1] - self.timestamps[0]).days / 365.0
        if duration_years == 0:
            return 0
        total_return = self.results['total_return_pct'] / 100
        return ((1 + total_return) ** (1 / duration_years) - 1) * 100

    def _daily_volatility(self) -> float:
        """Calculate daily volatility"""
        returns = self.equity_curve.pct_change().dropna()
        return returns.std() * 100

    def _calmar_ratio(self) -> float:
        """Calculate Calmar ratio (annual return / max drawdown)"""
        annual_return = self._annualized_return()
        max_dd = abs(self.results['max_drawdown'])
        return annual_return / max_dd if max_dd != 0 else 0

    def _avg_trades_per_day(self) -> float:
        """Calculate average trades per day"""
        duration_days = (self.timestamps[-1] - self.timestamps[0]).days
        if duration_days == 0:
            return 0
        return self.results['total_trades'] / duration_days

    def _calculate_drawdown(self) -> pd.Series:
        """Calculate drawdown series"""
        running_max = self.equity_curve.expanding().max()
        drawdown = (self.equity_curve - running_max) / running_max * 100
        return drawdown


if __name__ == "__main__":
    # Test with sample results
    print("Testing Backtest Reporter...")

    # Create sample results
    dates = pd.date_range('2024-01-01', periods=100, freq='1H')
    equity = 1000 + np.cumsum(np.random.randn(100) * 10)
    prices = 100 + np.cumsum(np.random.randn(100) * 0.5)

    sample_results = {
        'initial_value': 1000.0,
        'final_value': equity[-1],
        'total_return_pct': (equity[-1] / 1000 - 1) * 100,
        'realized_pnl': 50.0,
        'unrealized_pnl': equity[-1] - 1000 - 50,
        'total_pnl': equity[-1] - 1000,
        'total_fees': 5.0,
        'total_trades': 25,
        'win_rate': 65.0,
        'max_drawdown': -5.2,
        'sharpe_ratio': 1.5,
        'final_base_position': 5.0,
        'final_quote_position': 500.0,
        'equity_curve': equity.tolist(),
        'timestamps': dates.tolist(),
        'prices': prices.tolist(),
        'fills': pd.DataFrame()
    }

    reporter = BacktestReporter(sample_results)

    # Generate report
    report = reporter.generate_report()
    print(report)

    # Plot results
    reporter.plot_results()
