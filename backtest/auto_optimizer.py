"""
Auto Parameter Optimizer
Automatically finds optimal trading parameters using multiple optimization strategies
"""

import json
import numpy as np
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass
import itertools
from concurrent.futures import ProcessPoolExecutor, as_completed
import logging

from strategy_tester import GridStrategyTester
from reporter import PerformanceReporter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class OptimizationRange:
    """Parameter range for optimization"""
    min_value: float
    max_value: float
    step: float

    def get_values(self) -> List[float]:
        """Generate list of values in range"""
        return list(np.arange(self.min_value, self.max_value + self.step, self.step))


@dataclass
class OptimizationResult:
    """Result of parameter optimization"""
    parameters: Dict[str, Any]
    sharpe_ratio: float
    total_return: float
    max_drawdown: float
    win_rate: float
    total_trades: int
    score: float  # Combined optimization score


class AutoOptimizer:
    """
    Automatic parameter optimizer using various strategies
    """

    def __init__(
        self,
        symbol: str,
        klines_data: List[Any],
        initial_capital: float = 1000.0
    ):
        self.symbol = symbol
        self.klines_data = klines_data
        self.initial_capital = initial_capital

        logger.info(f"AutoOptimizer initialized for {symbol} with {len(klines_data)} candles")

    def grid_search(
        self,
        param_ranges: Dict[str, OptimizationRange],
        objective: str = 'sharpe',
        max_combinations: int = 1000,
        n_jobs: int = 4
    ) -> List[OptimizationResult]:
        """
        Grid search optimization

        Args:
            param_ranges: Dictionary of parameter ranges
            objective: Optimization objective ('sharpe', 'return', 'winrate')
            max_combinations: Maximum parameter combinations to test
            n_jobs: Number of parallel jobs

        Returns:
            List of optimization results sorted by score
        """
        logger.info("Starting grid search optimization")

        # Generate all parameter combinations
        param_names = list(param_ranges.keys())
        param_values = [param_ranges[name].get_values() for name in param_names]

        all_combinations = list(itertools.product(*param_values))

        # Limit combinations if too many
        if len(all_combinations) > max_combinations:
            logger.warning(f"Too many combinations ({len(all_combinations)}), sampling {max_combinations}")
            indices = np.random.choice(len(all_combinations), max_combinations, replace=False)
            all_combinations = [all_combinations[i] for i in indices]

        logger.info(f"Testing {len(all_combinations)} parameter combinations")

        # Test all combinations in parallel
        results = []
        with ProcessPoolExecutor(max_workers=n_jobs) as executor:
            futures = []
            for combo in all_combinations:
                params = dict(zip(param_names, combo))
                future = executor.submit(self._test_parameters, params, objective)
                futures.append(future)

            completed = 0
            for future in as_completed(futures):
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                    completed += 1
                    if completed % 10 == 0:
                        logger.info(f"Progress: {completed}/{len(futures)} combinations tested")
                except Exception as e:
                    logger.error(f"Error testing combination: {e}")

        # Sort by score
        results.sort(key=lambda x: x.score, reverse=True)

        logger.info(f"Grid search completed. Best score: {results[0].score:.4f}")

        return results

    def random_search(
        self,
        param_ranges: Dict[str, OptimizationRange],
        objective: str = 'sharpe',
        n_iterations: int = 100,
        n_jobs: int = 4
    ) -> List[OptimizationResult]:
        """
        Random search optimization

        Args:
            param_ranges: Dictionary of parameter ranges
            objective: Optimization objective
            n_iterations: Number of random samples to test
            n_jobs: Number of parallel jobs

        Returns:
            List of optimization results sorted by score
        """
        logger.info(f"Starting random search optimization ({n_iterations} iterations)")

        # Generate random parameter combinations
        param_names = list(param_ranges.keys())
        all_combinations = []

        for _ in range(n_iterations):
            combo = []
            for name in param_names:
                param_range = param_ranges[name]
                values = param_range.get_values()
                combo.append(np.random.choice(values))
            all_combinations.append(combo)

        # Test all combinations in parallel
        results = []
        with ProcessPoolExecutor(max_workers=n_jobs) as executor:
            futures = []
            for combo in all_combinations:
                params = dict(zip(param_names, combo))
                future = executor.submit(self._test_parameters, params, objective)
                futures.append(future)

            completed = 0
            for future in as_completed(futures):
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                    completed += 1
                    if completed % 10 == 0:
                        logger.info(f"Progress: {completed}/{len(futures)} iterations completed")
                except Exception as e:
                    logger.error(f"Error testing combination: {e}")

        # Sort by score
        results.sort(key=lambda x: x.score, reverse=True)

        logger.info(f"Random search completed. Best score: {results[0].score:.4f}")

        return results

    def bayesian_optimization(
        self,
        param_ranges: Dict[str, OptimizationRange],
        objective: str = 'sharpe',
        n_initial: int = 10,
        n_iterations: int = 50
    ) -> List[OptimizationResult]:
        """
        Bayesian optimization (simplified version)
        Uses random search initially, then focuses on promising regions

        Args:
            param_ranges: Dictionary of parameter ranges
            objective: Optimization objective
            n_initial: Number of initial random samples
            n_iterations: Total number of iterations

        Returns:
            List of optimization results sorted by score
        """
        logger.info(f"Starting Bayesian optimization ({n_iterations} iterations)")

        # Phase 1: Random exploration
        logger.info(f"Phase 1: Random exploration ({n_initial} samples)")
        results = self.random_search(param_ranges, objective, n_initial, n_jobs=4)

        # Phase 2: Focused search around best results
        logger.info(f"Phase 2: Focused search ({n_iterations - n_initial} samples)")
        best_params = results[0].parameters

        # Create narrower ranges around best parameters
        focused_ranges = {}
        for param_name, param_range in param_ranges.items():
            best_value = best_params[param_name]
            current_range = param_range.max_value - param_range.min_value
            new_range = current_range * 0.3  # 30% of original range

            focused_ranges[param_name] = OptimizationRange(
                min_value=max(param_range.min_value, best_value - new_range / 2),
                max_value=min(param_range.max_value, best_value + new_range / 2),
                step=param_range.step
            )

        # Do focused random search
        focused_results = self.random_search(
            focused_ranges,
            objective,
            n_iterations - n_initial,
            n_jobs=4
        )

        # Combine and sort results
        all_results = results + focused_results
        all_results.sort(key=lambda x: x.score, reverse=True)

        logger.info(f"Bayesian optimization completed. Best score: {all_results[0].score:.4f}")

        return all_results

    def _test_parameters(
        self,
        params: Dict[str, Any],
        objective: str = 'sharpe'
    ) -> OptimizationResult:
        """
        Test a specific parameter combination

        Args:
            params: Parameters to test
            objective: Optimization objective

        Returns:
            Optimization result
        """
        try:
            # Create strategy config
            config = {
                'grid_levels': int(params.get('grid_levels', 20)),
                'grid_spacing': params.get('grid_spacing', 1.0),
                'quantity_per_level': params.get('quantity_per_level', 0.05),
                'inventory_target': params.get('inventory_target', 0.5),
                'max_position_size': params.get('max_position_size', 10.0),
                'stop_loss_pct': params.get('stop_loss_pct', 10.0)
            }

            # Run backtest
            tester = GridStrategyTester(
                self.symbol,
                self.klines_data,
                config,
                self.initial_capital
            )

            trades = tester.run()

            if len(trades) == 0:
                return None

            # Calculate metrics
            reporter = PerformanceReporter(trades, self.initial_capital)
            metrics = reporter.calculate_metrics()

            # Calculate optimization score based on objective
            if objective == 'sharpe':
                score = metrics['sharpe_ratio']
            elif objective == 'return':
                score = metrics['total_return_pct']
            elif objective == 'winrate':
                score = metrics['win_rate']
            else:  # Multi-objective
                # Weighted combination
                score = (
                    metrics['sharpe_ratio'] * 0.4 +
                    metrics['total_return_pct'] * 0.3 +
                    metrics['win_rate'] * 0.3
                )

            return OptimizationResult(
                parameters=params,
                sharpe_ratio=metrics['sharpe_ratio'],
                total_return=metrics['total_return_pct'],
                max_drawdown=metrics['max_drawdown_pct'],
                win_rate=metrics['win_rate'],
                total_trades=metrics['total_trades'],
                score=score
            )

        except Exception as e:
            logger.error(f"Error testing parameters {params}: {e}")
            return None

    def save_results(
        self,
        results: List[OptimizationResult],
        output_file: str,
        top_n: int = 10
    ):
        """
        Save optimization results to file

        Args:
            results: Optimization results
            output_file: Output file path
            top_n: Number of top results to save
        """
        top_results = results[:top_n]

        output_data = {
            'symbol': self.symbol,
            'optimization_results': [
                {
                    'rank': i + 1,
                    'parameters': r.parameters,
                    'metrics': {
                        'sharpe_ratio': r.sharpe_ratio,
                        'total_return': r.total_return,
                        'max_drawdown': r.max_drawdown,
                        'win_rate': r.win_rate,
                        'total_trades': r.total_trades,
                        'score': r.score
                    }
                }
                for i, r in enumerate(top_results)
            ]
        }

        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2)

        logger.info(f"Results saved to {output_file}")

    def generate_strategy_config(
        self,
        result: OptimizationResult,
        output_file: str,
        symbol: str = None,
        dry_run: bool = True
    ):
        """
        Generate strategy config file from optimization result

        Args:
            result: Optimization result
            output_file: Output config file path
            symbol: Trading symbol (default: use optimizer symbol)
            dry_run: Whether to use dry run mode
        """
        symbol = symbol or self.symbol
        params = result.parameters

        # Extract base and quote assets
        if '_' in symbol:
            base_asset, quote_asset = symbol.split('_')
        else:
            base_asset = symbol[:3]
            quote_asset = 'USDC'

        config = {
            'name': f'{symbol} Optimized Grid Strategy',
            'type': 'spot',
            'symbol': symbol,
            'baseAsset': base_asset,
            'quoteAsset': quote_asset,
            'grid': {
                'mode': 'mean-reversion',
                'levels': int(params.get('grid_levels', 20)),
                'spacing': {
                    'type': 'percentage',
                    'value': params.get('grid_spacing', 1.0)
                },
                'range': {
                    'lower': 'auto',
                    'upper': 'auto'
                }
            },
            'order': {
                'quantityPerLevel': params.get('quantity_per_level', 0.05),
                'orderType': 'PostOnly',
                'timeInForce': 'GTC'
            },
            'risk': {
                'maxPositionSize': params.get('max_position_size', 10.0),
                'maxPositionValue': 2000,
                'maxDailyLoss': 100,
                'maxOrderCount': params.get('grid_levels', 20) * 2,
                'rebalanceThreshold': 3.0,
                'emergencyStopLoss': params.get('stop_loss_pct', 10.0)
            },
            'dryRun': dry_run,
            'cancelOrdersOnStart': True,
            'telegramNotify': False,
            'optimized': True,
            'optimization_metrics': {
                'sharpe_ratio': result.sharpe_ratio,
                'total_return': result.total_return,
                'max_drawdown': result.max_drawdown,
                'win_rate': result.win_rate,
                'total_trades': result.total_trades
            }
        }

        with open(output_file, 'w') as f:
            json.dump(config, f, indent=2)

        logger.info(f"Strategy config saved to {output_file}")


def quick_optimize(
    symbol: str,
    klines_data: List[Any],
    method: str = 'grid',
    objective: str = 'sharpe'
) -> List[OptimizationResult]:
    """
    Quick optimization with default parameter ranges

    Args:
        symbol: Trading symbol
        klines_data: Historical klines data
        method: Optimization method ('grid', 'random', 'bayesian')
        objective: Optimization objective

    Returns:
        List of optimization results
    """
    # Default parameter ranges
    param_ranges = {
        'grid_levels': OptimizationRange(10, 30, 5),
        'grid_spacing': OptimizationRange(0.5, 3.0, 0.5),
        'quantity_per_level': OptimizationRange(0.03, 0.10, 0.01),
        'max_position_size': OptimizationRange(5.0, 20.0, 5.0),
        'stop_loss_pct': OptimizationRange(5.0, 20.0, 5.0)
    }

    optimizer = AutoOptimizer(symbol, klines_data)

    if method == 'grid':
        results = optimizer.grid_search(param_ranges, objective, max_combinations=500)
    elif method == 'random':
        results = optimizer.random_search(param_ranges, objective, n_iterations=100)
    elif method == 'bayesian':
        results = optimizer.bayesian_optimization(param_ranges, objective, n_initial=10, n_iterations=50)
    else:
        raise ValueError(f"Unknown method: {method}")

    return results


if __name__ == '__main__':
    # Example usage
    from data_loader import BackpackDataLoader

    # Load data
    loader = BackpackDataLoader()
    klines = loader.fetch_klines('SOL_USDC', '1h', days=30)

    # Run optimization
    results = quick_optimize('SOL_USDC', klines, method='bayesian', objective='sharpe')

    # Print top 5 results
    print("\n=== Top 5 Parameter Combinations ===")
    for i, result in enumerate(results[:5], 1):
        print(f"\n#{i} (Score: {result.score:.4f})")
        print(f"Parameters: {result.parameters}")
        print(f"Sharpe: {result.sharpe_ratio:.2f}, Return: {result.total_return:.2f}%, "
              f"Max DD: {result.max_drawdown:.2f}%, Win Rate: {result.win_rate:.2f}%")

    # Save results
    optimizer = AutoOptimizer('SOL_USDC', klines)
    optimizer.save_results(results, 'optimization_results.json')
    optimizer.generate_strategy_config(results[0], 'optimized_strategy.json')
