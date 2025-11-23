"""
BPX Grid Bot - Backtesting Engine
Python backtesting system for AMM grid trading strategies
"""

from .data_loader import BackpackDataLoader, download_data
from .simulator import OrderSimulator, PositionTracker, OrderSide
from .strategy_tester import AMMGridBacktester, GridConfig, RiskConfig, load_strategy_config
from .reporter import BacktestReporter

__version__ = "1.0.0"
__all__ = [
    'BackpackDataLoader',
    'download_data',
    'OrderSimulator',
    'PositionTracker',
    'OrderSide',
    'AMMGridBacktester',
    'GridConfig',
    'RiskConfig',
    'load_strategy_config',
    'BacktestReporter',
]
