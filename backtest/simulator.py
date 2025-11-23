"""
Order Execution Simulator
Simulates order fills based on historical price data
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class OrderSide(Enum):
    BID = "Bid"
    ASK = "Ask"


class OrderStatus(Enum):
    PENDING = "Pending"
    FILLED = "Filled"
    CANCELLED = "Cancelled"


@dataclass
class Order:
    """Order representation"""
    id: int
    client_id: int
    side: OrderSide
    price: float
    quantity: float
    status: OrderStatus = OrderStatus.PENDING
    filled_quantity: float = 0.0
    filled_price: float = 0.0
    timestamp: pd.Timestamp = None


@dataclass
class Fill:
    """Fill/Trade representation"""
    order_id: int
    client_id: int
    side: OrderSide
    price: float
    quantity: float
    fee: float
    fee_rate: float
    timestamp: pd.Timestamp


class OrderSimulator:
    """
    Simulates order execution based on historical price data
    """

    def __init__(
        self,
        maker_fee: float = 0.0002,  # 0.02% maker fee
        taker_fee: float = 0.0004,  # 0.04% taker fee
        slippage: float = 0.0,       # Slippage in percentage
        partial_fills: bool = False  # Allow partial fills
    ):
        self.maker_fee = maker_fee
        self.taker_fee = taker_fee
        self.slippage = slippage
        self.partial_fills = partial_fills

        self.orders: Dict[int, Order] = {}
        self.fills: List[Fill] = []
        self.next_order_id = 1

    def place_order(
        self,
        client_id: int,
        side: OrderSide,
        price: float,
        quantity: float,
        timestamp: pd.Timestamp
    ) -> Order:
        """Place a new limit order"""
        order = Order(
            id=self.next_order_id,
            client_id=client_id,
            side=side,
            price=price,
            quantity=quantity,
            timestamp=timestamp
        )

        self.orders[order.id] = order
        self.next_order_id += 1

        return order

    def cancel_order(self, order_id: int):
        """Cancel an order"""
        if order_id in self.orders:
            self.orders[order_id].status = OrderStatus.CANCELLED

    def cancel_all_orders(self):
        """Cancel all pending orders"""
        for order in self.orders.values():
            if order.status == OrderStatus.PENDING:
                order.status = OrderStatus.CANCELLED

    def check_fills(
        self,
        candle: pd.Series,
        timestamp: pd.Timestamp
    ) -> List[Fill]:
        """
        Check if any orders should be filled based on current candle

        Args:
            candle: OHLCV data (open, high, low, close, volume)
            timestamp: Current timestamp

        Returns:
            List of fills that occurred
        """
        new_fills = []

        for order in list(self.orders.values()):
            if order.status != OrderStatus.PENDING:
                continue

            filled = False
            fill_price = order.price

            # Check if order price is within candle range
            if order.side == OrderSide.BID:
                # Buy order fills if price goes at or below bid price
                if candle['low'] <= order.price:
                    filled = True
                    # Assume filled at order price (maker)
                    # In reality might fill slightly better
                    fill_price = min(order.price, candle['close'])

            else:  # ASK
                # Sell order fills if price goes at or above ask price
                if candle['high'] >= order.price:
                    filled = True
                    # Assume filled at order price (maker)
                    fill_price = max(order.price, candle['close'])

            if filled:
                # Apply slippage
                if self.slippage > 0:
                    if order.side == OrderSide.BID:
                        fill_price *= (1 + self.slippage / 100)
                    else:
                        fill_price *= (1 - self.slippage / 100)

                # Calculate fee (assume maker fee for limit orders)
                fee = fill_price * order.quantity * self.maker_fee

                # Create fill
                fill = Fill(
                    order_id=order.id,
                    client_id=order.client_id,
                    side=order.side,
                    price=fill_price,
                    quantity=order.quantity,
                    fee=fee,
                    fee_rate=self.maker_fee,
                    timestamp=timestamp
                )

                # Update order
                order.status = OrderStatus.FILLED
                order.filled_quantity = order.quantity
                order.filled_price = fill_price

                # Record fill
                self.fills.append(fill)
                new_fills.append(fill)

        return new_fills

    def get_active_orders(self) -> List[Order]:
        """Get all pending orders"""
        return [o for o in self.orders.values() if o.status == OrderStatus.PENDING]

    def get_fills_summary(self) -> pd.DataFrame:
        """Get summary of all fills as DataFrame"""
        if not self.fills:
            return pd.DataFrame()

        data = []
        for fill in self.fills:
            data.append({
                'timestamp': fill.timestamp,
                'order_id': fill.order_id,
                'client_id': fill.client_id,
                'side': fill.side.value,
                'price': fill.price,
                'quantity': fill.quantity,
                'value': fill.price * fill.quantity,
                'fee': fill.fee,
                'fee_rate': fill.fee_rate
            })

        df = pd.DataFrame(data)
        df.set_index('timestamp', inplace=True)
        return df

    def reset(self):
        """Reset simulator state"""
        self.orders.clear()
        self.fills.clear()
        self.next_order_id = 1


class PositionTracker:
    """
    Track position and PnL from fills
    """

    def __init__(self, initial_base: float = 0.0, initial_quote: float = 0.0):
        self.base_position = initial_base
        self.quote_position = initial_quote

        self.total_fees = 0.0
        self.realized_pnl = 0.0

        self.buy_fills: List[Tuple[float, float]] = []  # (price, quantity)
        self.sell_fills: List[Tuple[float, float]] = []

    def process_fill(self, fill: Fill):
        """Process a fill and update position"""
        if fill.side == OrderSide.BID:
            # Buy: spend quote, receive base
            self.base_position += fill.quantity
            self.quote_position -= (fill.price * fill.quantity + fill.fee)
            self.buy_fills.append((fill.price, fill.quantity))

        else:  # ASK
            # Sell: spend base, receive quote
            self.base_position -= fill.quantity
            self.quote_position += (fill.price * fill.quantity - fill.fee)
            self.sell_fills.append((fill.price, fill.quantity))

            # Calculate realized PnL for this sell
            if self.buy_fills:
                avg_buy_price = self._get_average_buy_price()
                self.realized_pnl += (fill.price - avg_buy_price) * fill.quantity - fill.fee

        self.total_fees += fill.fee

    def _get_average_buy_price(self) -> float:
        """Calculate average buy price from fills"""
        if not self.buy_fills:
            return 0.0

        total_value = sum(price * qty for price, qty in self.buy_fills)
        total_qty = sum(qty for _, qty in self.buy_fills)

        return total_value / total_qty if total_qty > 0 else 0.0

    def get_unrealized_pnl(self, current_price: float) -> float:
        """Calculate unrealized PnL"""
        return self.base_position * current_price

    def get_total_pnl(self, current_price: float) -> float:
        """Calculate total PnL (realized + unrealized)"""
        return self.realized_pnl + self.get_unrealized_pnl(current_price)

    def get_position_value(self, current_price: float) -> float:
        """Get total position value in quote asset"""
        return self.quote_position + self.base_position * current_price

    def get_summary(self, current_price: float) -> Dict:
        """Get position summary"""
        return {
            'base_position': self.base_position,
            'quote_position': self.quote_position,
            'total_value': self.get_position_value(current_price),
            'realized_pnl': self.realized_pnl,
            'unrealized_pnl': self.get_unrealized_pnl(current_price),
            'total_pnl': self.get_total_pnl(current_price),
            'total_fees': self.total_fees,
            'avg_buy_price': self._get_average_buy_price(),
        }


if __name__ == "__main__":
    # Test simulator
    print("Testing Order Simulator...")

    # Create simulator
    sim = OrderSimulator(maker_fee=0.0002, taker_fee=0.0004)

    # Create fake candle data
    candles = pd.DataFrame({
        'open': [100, 101, 102],
        'high': [101, 103, 104],
        'low': [99, 100, 101],
        'close': [100.5, 102, 103],
        'volume': [1000, 1200, 1100]
    }, index=pd.date_range('2024-01-01', periods=3, freq='1min'))

    # Place some orders
    timestamp = candles.index[0]
    order1 = sim.place_order(0, OrderSide.BID, 99.5, 1.0, timestamp)  # Should fill
    order2 = sim.place_order(1, OrderSide.ASK, 103.5, 1.0, timestamp)  # Should fill

    # Simulate
    for timestamp, candle in candles.iterrows():
        fills = sim.check_fills(candle, timestamp)
        print(f"\nTime: {timestamp}, Price: {candle['close']}")
        for fill in fills:
            print(f"  Fill: {fill.side.value} {fill.quantity} @ {fill.price:.2f}, Fee: {fill.fee:.4f}")

    # Show fills
    print("\nFills Summary:")
    print(sim.get_fills_summary())
