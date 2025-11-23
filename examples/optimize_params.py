"""
Parameter Optimization
Find optimal grid parameters using grid search
"""

import sys
sys.path.append('..')

from backtest.data_loader import BackpackDataLoader
from backtest.strategy_tester import AMMGridBacktester, GridConfig, RiskConfig
from backtest.reporter import BacktestReporter
import itertools
import pandas as pd
import argparse


def optimize_parameters(
    price_data: pd.DataFrame,
    param_grid: dict,
    initial_base: float = 10.0,
    initial_quote: float = 2000.0
):
    """
    Optimize strategy parameters using grid search

    Args:
        price_data: Historical price data
        param_grid: Dictionary of parameters to test
        initial_base: Initial base asset
        initial_quote: Initial quote asset

    Returns:
        DataFrame with results for each parameter combination
    """
    results = []

    # Generate all parameter combinations
    keys = param_grid.keys()
    values = param_grid.values()
    combinations = list(itertools.product(*values))

    print(f"Testing {len(combinations)} parameter combinations...")
    print("")

    for i, combo in enumerate(combinations):
        params = dict(zip(keys, combo))

        print(f"[{i+1}/{len(combinations)}] Testing: {params}")

        # Create config
        grid_config = GridConfig(
            levels=params.get('levels', 20),
            spacing_value=params.get('spacing', 1.0),
            quantity_per_level=params.get('quantity', 0.05)
        )

        risk_config = RiskConfig(
            rebalance_threshold=params.get('rebalance_threshold', 3.0)
        )

        # Run backtest
        try:
            backtester = AMMGridBacktester(
                grid_config=grid_config,
                risk_config=risk_config,
                initial_base=initial_base,
                initial_quote=initial_quote
            )

            summary = backtester.run(price_data, progress_interval=99999)

            # Record results
            results.append({
                **params,
                'total_return': summary['total_return_pct'],
                'sharpe_ratio': summary['sharpe_ratio'],
                'max_drawdown': summary['max_drawdown'],
                'total_pnl': summary['total_pnl'],
                'total_trades': summary['total_trades'],
                'win_rate': summary['win_rate'],
                'total_fees': summary['total_fees']
            })

        except Exception as e:
            print(f"  Error: {e}")
            continue

    # Create results DataFrame
    results_df = pd.DataFrame(results)

    return results_df


def main():
    parser = argparse.ArgumentParser(description='Optimize grid parameters')
    parser.add_argument('--symbol', type=str, default='SOL_USDC')
    parser.add_argument('--days', type=int, default=7)
    parser.add_argument('--interval', type=str, default='5m')
    parser.add_argument('--output', type=str, default='optimization_results.csv')

    args = parser.parse_args()

    print("="*70)
    print("PARAMETER OPTIMIZATION")
    print("="*70)

    # Download data
    print(f"\nDownloading {args.days} days of {args.interval} data for {args.symbol}...")
    loader = BackpackDataLoader()
    price_data = loader.download_historical_data(
        symbol=args.symbol,
        interval=args.interval,
        days=args.days
    )

    if price_data.empty:
        print("Error: No data downloaded")
        return

    # Define parameter grid
    param_grid = {
        'levels': [10, 15, 20, 25, 30],
        'spacing': [0.5, 0.8, 1.0, 1.5, 2.0],
        'quantity': [0.03, 0.05, 0.08],
        'rebalance_threshold': [2.0, 3.0, 5.0]
    }

    print("\nParameter Grid:")
    for key, values in param_grid.items():
        print(f"  {key}: {values}")
    print("")

    # Run optimization
    results_df = optimize_parameters(
        price_data=price_data,
        param_grid=param_grid,
        initial_base=10.0,
        initial_quote=2000.0
    )

    # Save results
    results_df.to_csv(args.output, index=False)
    print(f"\nResults saved to {args.output}")

    # Show top performers
    print("\n" + "="*70)
    print("TOP 10 PARAMETER COMBINATIONS (by Total Return)")
    print("="*70)
    top_by_return = results_df.nlargest(10, 'total_return')
    print(top_by_return.to_string())

    print("\n" + "="*70)
    print("TOP 10 PARAMETER COMBINATIONS (by Sharpe Ratio)")
    print("="*70)
    top_by_sharpe = results_df.nlargest(10, 'sharpe_ratio')
    print(top_by_sharpe.to_string())

    print("\n" + "="*70)
    print("BEST OVERALL PARAMETERS")
    print("="*70)
    best_idx = results_df['total_return'].idxmax()
    best = results_df.loc[best_idx]
    print(f"\nLevels: {best['levels']}")
    print(f"Spacing: {best['spacing']}%")
    print(f"Quantity: {best['quantity']}")
    print(f"Rebalance Threshold: {best['rebalance_threshold']}%")
    print(f"\nTotal Return: {best['total_return']:.2f}%")
    print(f"Sharpe Ratio: {best['sharpe_ratio']:.2f}")
    print(f"Max Drawdown: {best['max_drawdown']:.2f}%")
    print(f"Win Rate: {best['win_rate']:.1f}%")


if __name__ == "__main__":
    main()
