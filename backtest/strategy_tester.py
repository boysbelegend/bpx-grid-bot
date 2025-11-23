"""
Strategy Backtester
Implements AMM Grid Strategy in Python for backtesting
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import json
from dataclasses import dataclass

from simulator import OrderSimulator, OrderSide, PositionTracker, Fill


@dataclass
class GridConfig:
    """Grid configuration"""
    mode: str = "mean-reversion"
    levels: int = 20
    spacing_type: str = "percentage"
    spacing_value: float = 1.0
    quantity_per_level: float = 0.05


@dataclass
class RiskConfig:
    """Risk management configuration"""
    max_position_size: float = 10.0
    max_daily_loss: float = 100.0
    rebalance_threshold: float = 3.0


class AMMGridBacktester:
    """
    Backtest AMM Grid Strategy
    Python port of TypeScript AMMGridStrategy
    """

    def __init__(
        self,
        grid_config: GridConfig,
        risk_config: RiskConfig,
        initial_base: float = 10.0,
        initial_quote: float = 2000.0,
        maker_fee: float = 0.0002,
        taker_fee: float = 0.0004
    ):
        self.grid_config = grid_config
        self.risk_config = risk_config

        # Initialize simulator and position tracker
        self.simulator = OrderSimulator(
            maker_fee=maker_fee,
            taker_fee=taker_fee
        )

        self.position = PositionTracker(
            initial_base=initial_base,
            initial_quote=initial_quote
        )

        # State
        self.center_price = 0.0
        self.last_rebalance_price = 0.0
        self.grid_levels: List[Dict] = []

        # Metrics
        self.equity_curve: List[float] = []
        self.timestamps: List[pd.Timestamp] = []
        self.prices: List[float] = []

    def calculate_grid_levels(self, center_price: float) -> List[Dict]:
        """Calculate grid price levels"""
        levels = []
        half_levels = self.grid_config.levels // 2

        spacing_pct = self.grid_config.spacing_value / 100

        # Bid levels (below center price)
        for i in range(1, half_levels + 1):
            price = center_price * (1 - spacing_pct * i)
            levels.append({
                'index': half_levels - i,
                'price': round(price, 2),
                'side': OrderSide.BID,
                'quantity': self.grid_config.quantity_per_level
            })

        # Ask levels (above center price)
        for i in range(1, half_levels + 1):
            price = center_price * (1 + spacing_pct * i)
            levels.append({
                'index': half_levels + i - 1,
                'price': round(price, 2),
                'side': OrderSide.ASK,
                'quantity': self.grid_config.quantity_per_level
            })

        # Sort by price
        levels.sort(key=lambda x: x['price'])

        return levels

    def place_grid_orders(self, timestamp: pd.Timestamp):
        """Place all grid orders"""
        for level in self.grid_levels:
            # Skip levels too close to current price (avoid immediate fills)
            price_distance = abs(level['price'] - self.center_price) / self.center_price
            if price_distance < 0.001:  # 0.1% minimum distance
                continue

            self.simulator.place_order(
                client_id=level['index'],
                side=level['side'],
                price=level['price'],
                quantity=level['quantity'],
                timestamp=timestamp
            )

    def should_rebalance(self, current_price: float) -> bool:
        """Check if grid should be rebalanced"""
        if self.last_rebalance_price == 0:
            return False

        price_change_pct = abs(
            (current_price - self.last_rebalance_price) / self.last_rebalance_price
        ) * 100

        return price_change_pct >= self.risk_config.rebalance_threshold

    def rebalance_grid(self, current_price: float, timestamp: pd.Timestamp):
        """Rebalance grid at new center price"""
        # Cancel all pending orders
        self.simulator.cancel_all_orders()

        # Update center price and grid levels
        self.center_price = current_price
        self.grid_levels = self.calculate_grid_levels(current_price)

        # Place new orders
        self.place_grid_orders(timestamp)

        self.last_rebalance_price = current_price

    def process_fills(self, fills: List[Fill], current_price: float, timestamp: pd.Timestamp):
        """Process fills and rebalance if needed"""
        for fill in fills:
            # Update position
            self.position.process_fill(fill)

            # If a fill occurred, check if we need to rebalance
            if self.should_rebalance(current_price):
                self.rebalance_grid(current_price, timestamp)

    def run(
        self,
        price_data: pd.DataFrame,
        progress_interval: int = 1000
    ) -> Dict:
        """
        Run backtest on historical data

        Args:
            price_data: DataFrame with OHLCV data
            progress_interval: Print progress every N candles

        Returns:
            Backtest results dictionary
        """
        print(f"Starting backtest with {len(price_data)} candles...")

        # Initialize with first price
        first_price = price_data.iloc[0]['close']
        self.center_price = first_price
        self.last_rebalance_price = first_price
        self.grid_levels = self.calculate_grid_levels(first_price)

        # Place initial grid
        self.place_grid_orders(price_data.index[0])

        # Run through historical data
        for i, (timestamp, candle) in enumerate(price_data.iterrows()):
            current_price = candle['close']

            # Check for fills
            fills = self.simulator.check_fills(candle, timestamp)

            # Process fills and handle rebalancing
            if fills:
                self.process_fills(fills, current_price, timestamp)

            # Record metrics
            equity = self.position.get_position_value(current_price)
            self.equity_curve.append(equity)
            self.timestamps.append(timestamp)
            self.prices.append(current_price)

            # Progress update
            if (i + 1) % progress_interval == 0:
                pnl = self.position.get_total_pnl(current_price)
                print(f"Progress: {i+1}/{len(price_data)}, "
                      f"Price: ${current_price:.2f}, "
                      f"PnL: ${pnl:.2f}, "
                      f"Equity: ${equity:.2f}")

        # Final summary
        final_price = price_data.iloc[-1]['close']
        final_summary = self.get_summary(final_price)

        print("\n" + "="*60)
        print("BACKTEST COMPLETE")
        print("="*60)
        self.print_summary(final_summary)

        return final_summary

    def get_summary(self, final_price: float) -> Dict:
        """Get backtest summary"""
        position_summary = self.position.get_summary(final_price)

        # Calculate metrics
        initial_value = self.equity_curve[0] if self.equity_curve else 0
        final_value = self.equity_curve[-1] if self.equity_curve else 0
        total_return = ((final_value - initial_value) / initial_value * 100) if initial_value > 0 else 0

        # Calculate max drawdown
        equity_series = pd.Series(self.equity_curve)
        running_max = equity_series.expanding().max()
        drawdown = (equity_series - running_max) / running_max * 100
        max_drawdown = drawdown.min()

        # Get fills summary
        fills_df = self.simulator.get_fills_summary()
        total_trades = len(fills_df)

        # Win rate calculation
        if not fills_df.empty:
            sell_fills = fills_df[fills_df['side'] == 'Ask']
            avg_buy_price = position_summary['avg_buy_price']

            if avg_buy_price > 0 and len(sell_fills) > 0:
                winning_trades = len(sell_fills[sell_fills['price'] > avg_buy_price])
                win_rate = (winning_trades / len(sell_fills) * 100) if len(sell_fills) > 0 else 0
            else:
                win_rate = 0
        else:
            win_rate = 0

        # Calculate Sharpe ratio (simplified daily returns)
        if len(self.equity_curve) > 1:
            returns = pd.Series(self.equity_curve).pct_change().dropna()
            sharpe_ratio = (returns.mean() / returns.std() * np.sqrt(252)) if returns.std() > 0 else 0
        else:
            sharpe_ratio = 0

        return {
            'initial_value': initial_value,
            'final_value': final_value,
            'total_return_pct': total_return,
            'realized_pnl': position_summary['realized_pnl'],
            'unrealized_pnl': position_summary['unrealized_pnl'],
            'total_pnl': position_summary['total_pnl'],
            'total_fees': position_summary['total_fees'],
            'total_trades': total_trades,
            'win_rate': win_rate,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe_ratio,
            'final_base_position': position_summary['base_position'],
            'final_quote_position': position_summary['quote_position'],
            'equity_curve': self.equity_curve,
            'timestamps': self.timestamps,
            'prices': self.prices,
            'fills': fills_df
        }

    def print_summary(self, summary: Dict):
        """Print formatted summary"""
        print(f"\nInitial Value: ${summary['initial_value']:.2f}")
        print(f"Final Value: ${summary['final_value']:.2f}")
        print(f"Total Return: {summary['total_return_pct']:.2f}%")
        print(f"\nRealized PnL: ${summary['realized_pnl']:.2f}")
        print(f"Unrealized PnL: ${summary['unrealized_pnl']:.2f}")
        print(f"Total PnL: ${summary['total_pnl']:.2f}")
        print(f"Total Fees: ${summary['total_fees']:.2f}")
        print(f"\nTotal Trades: {summary['total_trades']}")
        print(f"Win Rate: {summary['win_rate']:.1f}%")
        print(f"Max Drawdown: {summary['max_drawdown']:.2f}%")
        print(f"Sharpe Ratio: {summary['sharpe_ratio']:.2f}")
        print(f"\nFinal Position:")
        print(f"  Base: {summary['final_base_position']:.4f}")
        print(f"  Quote: ${summary['final_quote_position']:.2f}")


def load_strategy_config(config_path: str) -> tuple[GridConfig, RiskConfig]:
    """Load strategy configuration from JSON file"""
    with open(config_path, 'r') as f:
        config = json.load(f)

    grid_config = GridConfig(
        mode=config['grid']['mode'],
        levels=config['grid']['levels'],
        spacing_type=config['grid']['spacing']['type'],
        spacing_value=config['grid']['spacing']['value'],
        quantity_per_level=config['order']['quantityPerLevel']
    )

    risk_config = RiskConfig(
        max_position_size=config['risk']['maxPositionSize'],
        max_daily_loss=config['risk']['maxDailyLoss'],
        rebalance_threshold=config['risk']['rebalanceThreshold']
    )

    return grid_config, risk_config


if __name__ == "__main__":
    # Test with sample data
    print("Testing AMM Grid Backtester...")

    # Create sample price data (simple random walk)
    np.random.seed(42)
    dates = pd.date_range('2024-01-01', periods=1000, freq='1min')
    prices = 100 + np.cumsum(np.random.randn(1000) * 0.5)

    df = pd.DataFrame({
        'open': prices,
        'high': prices + abs(np.random.randn(1000) * 0.2),
        'low': prices - abs(np.random.randn(1000) * 0.2),
        'close': prices,
        'volume': 1000 + np.random.randn(1000) * 100
    }, index=dates)

    # Run backtest
    grid_config = GridConfig(levels=20, spacing_value=1.0, quantity_per_level=0.1)
    risk_config = RiskConfig(rebalance_threshold=3.0)

    backtester = AMMGridBacktester(
        grid_config=grid_config,
        risk_config=risk_config,
        initial_base=10.0,
        initial_quote=1000.0
    )

    results = backtester.run(df, progress_interval=200)
