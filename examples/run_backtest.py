"""
Simple Backtest Runner
Quick example to run a backtest with your strategy config
"""

import sys
sys.path.append('..')

from backtest.data_loader import BackpackDataLoader
from backtest.strategy_tester import AMMGridBacktester, load_strategy_config
from backtest.reporter import BacktestReporter
import argparse


def main():
    parser = argparse.ArgumentParser(description='Run grid strategy backtest')
    parser.add_argument(
        '--strategy',
        type=str,
        default='../config/strategies/sol-amm-grid.json',
        help='Path to strategy config file'
    )
    parser.add_argument(
        '--symbol',
        type=str,
        default='SOL_USDC',
        help='Trading pair symbol'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=7,
        help='Number of days to backtest'
    )
    parser.add_argument(
        '--interval',
        type=str,
        default='5m',
        help='Data interval (1m, 5m, 15m, 1h, 4h, 1d)'
    )
    parser.add_argument(
        '--initial-base',
        type=float,
        default=10.0,
        help='Initial base asset amount'
    )
    parser.add_argument(
        '--initial-quote',
        type=float,
        default=2000.0,
        help='Initial quote asset amount'
    )
    parser.add_argument(
        '--save-report',
        type=str,
        help='Save report to file'
    )
    parser.add_argument(
        '--save-chart',
        type=str,
        help='Save chart to file'
    )

    args = parser.parse_args()

    print("="*70)
    print("BPX GRID BOT - BACKTESTING")
    print("="*70)
    print(f"\nStrategy: {args.strategy}")
    print(f"Symbol: {args.symbol}")
    print(f"Period: {args.days} days of {args.interval} data")
    print(f"Initial: {args.initial_base} base + ${args.initial_quote} quote\n")

    # Step 1: Load strategy configuration
    print("Loading strategy configuration...")
    grid_config, risk_config = load_strategy_config(args.strategy)

    # Step 2: Download historical data
    print(f"\nDownloading {args.days} days of {args.interval} data...")
    loader = BackpackDataLoader()
    price_data = loader.download_historical_data(
        symbol=args.symbol,
        interval=args.interval,
        days=args.days
    )

    if price_data.empty:
        print("Error: No data downloaded. Please check symbol and date range.")
        return

    # Step 3: Run backtest
    print("\nInitializing backtester...")
    backtester = AMMGridBacktester(
        grid_config=grid_config,
        risk_config=risk_config,
        initial_base=args.initial_base,
        initial_quote=args.initial_quote,
        maker_fee=0.0002,  # 0.02% maker fee
        taker_fee=0.0004   # 0.04% taker fee
    )

    print("\nRunning backtest...")
    results = backtester.run(price_data, progress_interval=500)

    # Step 4: Generate report
    print("\nGenerating report...")
    reporter = BacktestReporter(results)

    report_text = reporter.generate_report(args.save_report)

    if not args.save_report:
        print("\n" + report_text)

    # Step 5: Plot results
    print("\nGenerating visualization...")
    try:
        reporter.plot_results(save_path=args.save_chart)
    except Exception as e:
        print(f"Warning: Could not generate chart: {e}")

    print("\n" + "="*70)
    print("BACKTEST COMPLETE!")
    print("="*70)


if __name__ == "__main__":
    main()
