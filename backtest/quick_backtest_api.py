"""
Quick Backtest API
Fast backtesting service for scenario preview with Telegram notifications
"""

import json
import asyncio
from typing import Dict, Any, Optional
from dataclasses import dataclass
import logging
import requests

from data_loader import BackpackDataLoader
from strategy_tester import GridStrategyTester
from reporter import PerformanceReporter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class BacktestRequest:
    """Backtest request parameters"""
    scenario_id: str
    symbol: str
    days: int = 7
    interval: str = '1h'
    initial_capital: float = 1000.0
    telegram_chat_id: Optional[int] = None


@dataclass
class BacktestResult:
    """Backtest result summary"""
    scenario_id: str
    symbol: str
    duration_days: int
    total_trades: int
    win_rate: float
    sharpe_ratio: float
    total_return_pct: float
    max_drawdown_pct: float
    final_value: float
    daily_return_pct: float
    execution_time_seconds: float
    success: bool
    error: Optional[str] = None


class QuickBacktestAPI:
    """
    Quick backtesting service for scenario previews
    """

    def __init__(self, telegram_bot_token: Optional[str] = None):
        self.data_loader = BackpackDataLoader()
        self.telegram_bot_token = telegram_bot_token
        logger.info("QuickBacktestAPI initialized")

    async def run_backtest(self, request: BacktestRequest) -> BacktestResult:
        """
        Run backtest asynchronously with optional Telegram notification

        Args:
            request: Backtest request parameters

        Returns:
            Backtest result summary
        """
        import time
        start_time = time.time()

        try:
            logger.info(f"Starting backtest for {request.scenario_id} on {request.symbol}")

            # Load historical data
            logger.info(f"Loading {request.days} days of {request.interval} data...")
            klines = self.data_loader.fetch_klines(
                request.symbol,
                request.interval,
                days=request.days
            )

            if len(klines) == 0:
                raise ValueError(f"No data available for {request.symbol}")

            logger.info(f"Loaded {len(klines)} candles")

            # Load scenario configuration
            scenario_config = self._load_scenario_config(request.scenario_id)

            # Run backtest
            logger.info("Running backtest simulation...")
            tester = GridStrategyTester(
                request.symbol,
                klines,
                scenario_config,
                request.initial_capital
            )

            trades = tester.run()
            logger.info(f"Backtest completed with {len(trades)} trades")

            if len(trades) == 0:
                raise ValueError("No trades generated during backtest")

            # Calculate metrics
            reporter = PerformanceReporter(trades, request.initial_capital)
            metrics = reporter.calculate_metrics()

            execution_time = time.time() - start_time

            # Create result
            result = BacktestResult(
                scenario_id=request.scenario_id,
                symbol=request.symbol,
                duration_days=request.days,
                total_trades=metrics['total_trades'],
                win_rate=metrics['win_rate'],
                sharpe_ratio=metrics['sharpe_ratio'],
                total_return_pct=metrics['total_return_pct'],
                max_drawdown_pct=metrics['max_drawdown_pct'],
                final_value=metrics['final_value'],
                daily_return_pct=metrics['total_return_pct'] / request.days,
                execution_time_seconds=execution_time,
                success=True
            )

            logger.info(f"Backtest successful: {result.total_return_pct:.2f}% return, "
                       f"{result.sharpe_ratio:.2f} Sharpe, {result.win_rate:.1f}% win rate")

            # Send Telegram notification if requested
            if request.telegram_chat_id and self.telegram_bot_token:
                await self._send_telegram_notification(request.telegram_chat_id, result)

            return result

        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Backtest failed: {e}")

            result = BacktestResult(
                scenario_id=request.scenario_id,
                symbol=request.symbol,
                duration_days=request.days,
                total_trades=0,
                win_rate=0.0,
                sharpe_ratio=0.0,
                total_return_pct=0.0,
                max_drawdown_pct=0.0,
                final_value=request.initial_capital,
                daily_return_pct=0.0,
                execution_time_seconds=execution_time,
                success=False,
                error=str(e)
            )

            # Send error notification
            if request.telegram_chat_id and self.telegram_bot_token:
                await self._send_telegram_error(request.telegram_chat_id, result)

            return result

    def _load_scenario_config(self, scenario_id: str) -> Dict[str, Any]:
        """
        Load scenario configuration

        Args:
            scenario_id: Scenario ID

        Returns:
            Scenario configuration dict
        """
        # Default configurations for known scenarios
        configs = {
            'spot-conservative': {
                'grid_levels': 20,
                'grid_spacing': 2.0,
                'quantity_per_level': 0.03,
                'inventory_target': 0.5,
                'max_position_size': 10.0,
                'stop_loss_pct': 20.0
            },
            'spot-moderate': {
                'grid_levels': 20,
                'grid_spacing': 1.0,
                'quantity_per_level': 0.05,
                'inventory_target': 0.5,
                'max_position_size': 10.0,
                'stop_loss_pct': 15.0
            },
            'spot-aggressive': {
                'grid_levels': 30,
                'grid_spacing': 0.5,
                'quantity_per_level': 0.08,
                'inventory_target': 0.5,
                'max_position_size': 15.0,
                'stop_loss_pct': 10.0
            },
            'futures-conservative': {
                'grid_levels': 16,
                'grid_spacing': 2.0,
                'quantity_per_level': 0.03,
                'inventory_target': 0.5,
                'max_position_size': 5.0,
                'stop_loss_pct': 10.0
            },
            'futures-moderate': {
                'grid_levels': 16,
                'grid_spacing': 1.5,
                'quantity_per_level': 0.03,
                'inventory_target': 0.5,
                'max_position_size': 2.0,
                'stop_loss_pct': 8.0
            },
            'futures-aggressive': {
                'grid_levels': 12,
                'grid_spacing': 1.0,
                'quantity_per_level': 0.02,
                'inventory_target': 0.5,
                'max_position_size': 1.0,
                'stop_loss_pct': 5.0
            }
        }

        if scenario_id not in configs:
            raise ValueError(f"Unknown scenario: {scenario_id}")

        return configs[scenario_id]

    async def _send_telegram_notification(
        self,
        chat_id: int,
        result: BacktestResult
    ) -> None:
        """
        Send Telegram notification for completed backtest

        Args:
            chat_id: Telegram chat ID
            result: Backtest result
        """
        if not self.telegram_bot_token:
            return

        try:
            # Format message
            emoji = '📈' if result.total_return_pct > 0 else '📉'
            sharpe_emoji = '⭐' if result.sharpe_ratio > 1.5 else '⭐' if result.sharpe_ratio > 1.0 else '•'

            message = f"""
{emoji} *Backtest Complete!*

*Scenario:* {result.scenario_id}
*Symbol:* {result.symbol}
*Duration:* {result.duration_days} days

*📊 Performance:*
• Return: {result.total_return_pct:+.2f}%
• Daily Return: {result.daily_return_pct:+.2f}%
• Sharpe Ratio: {sharpe_emoji} {result.sharpe_ratio:.2f}
• Max Drawdown: {result.max_drawdown_pct:.2f}%

*📈 Trading:*
• Total Trades: {result.total_trades}
• Win Rate: {result.win_rate:.1f}%
• Final Value: ${result.final_value:.2f}

*⏱ Execution Time:* {result.execution_time_seconds:.1f}s

{'✅ Ready to use!' if result.total_return_pct > 0 and result.sharpe_ratio > 1.0 else '⚠️ Review carefully before using'}
            """.strip()

            # Send via Telegram API
            url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"
            payload = {
                'chat_id': chat_id,
                'text': message,
                'parse_mode': 'Markdown'
            }

            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()

            logger.info(f"Telegram notification sent to {chat_id}")

        except Exception as e:
            logger.error(f"Failed to send Telegram notification: {e}")

    async def _send_telegram_error(
        self,
        chat_id: int,
        result: BacktestResult
    ) -> None:
        """
        Send Telegram error notification

        Args:
            chat_id: Telegram chat ID
            result: Failed backtest result
        """
        if not self.telegram_bot_token:
            return

        try:
            message = f"""
❌ *Backtest Failed*

*Scenario:* {result.scenario_id}
*Symbol:* {result.symbol}

*Error:* {result.error}

*Duration:* {result.execution_time_seconds:.1f}s

Please check the logs for more details.
            """.strip()

            url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"
            payload = {
                'chat_id': chat_id,
                'text': message,
                'parse_mode': 'Markdown'
            }

            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()

            logger.info(f"Telegram error notification sent to {chat_id}")

        except Exception as e:
            logger.error(f"Failed to send Telegram error notification: {e}")


# CLI interface
if __name__ == '__main__':
    import argparse
    import os

    parser = argparse.ArgumentParser(description='Quick Backtest API')
    parser.add_argument('--scenario', required=True, help='Scenario ID')
    parser.add_argument('--symbol', required=True, help='Trading symbol (e.g., SOL_USDC)')
    parser.add_argument('--days', type=int, default=7, help='Number of days to backtest')
    parser.add_argument('--interval', default='1h', help='Candle interval')
    parser.add_argument('--capital', type=float, default=1000.0, help='Initial capital')
    parser.add_argument('--telegram-chat-id', type=int, help='Telegram chat ID for notification')

    args = parser.parse_args()

    # Get Telegram bot token from environment
    telegram_token = os.getenv('TELEGRAM_BOT_TOKEN')

    # Create API
    api = QuickBacktestAPI(telegram_bot_token=telegram_token)

    # Create request
    request = BacktestRequest(
        scenario_id=args.scenario,
        symbol=args.symbol,
        days=args.days,
        interval=args.interval,
        initial_capital=args.capital,
        telegram_chat_id=args.telegram_chat_id
    )

    # Run backtest
    result = asyncio.run(api.run_backtest(request))

    # Print results
    print("\n" + "="*60)
    print("BACKTEST RESULTS")
    print("="*60)
    print(f"Scenario: {result.scenario_id}")
    print(f"Symbol: {result.symbol}")
    print(f"Duration: {result.duration_days} days")
    print(f"\nPerformance:")
    print(f"  Total Return: {result.total_return_pct:+.2f}%")
    print(f"  Daily Return: {result.daily_return_pct:+.2f}%")
    print(f"  Sharpe Ratio: {result.sharpe_ratio:.2f}")
    print(f"  Max Drawdown: {result.max_drawdown_pct:.2f}%")
    print(f"\nTrading:")
    print(f"  Total Trades: {result.total_trades}")
    print(f"  Win Rate: {result.win_rate:.1f}%")
    print(f"  Final Value: ${result.final_value:.2f}")
    print(f"\nExecution Time: {result.execution_time_seconds:.1f}s")
    print("="*60)

    if result.success:
        print("\n✅ Backtest successful!")
        if result.telegram_chat_id:
            print(f"📱 Notification sent to Telegram chat {result.telegram_chat_id}")
    else:
        print(f"\n❌ Backtest failed: {result.error}")

    # Exit with appropriate code
    exit(0 if result.success else 1)
