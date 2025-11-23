"""
Data Loader for Backpack Exchange
Downloads historical OHLCV data for backtesting
"""

import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta
from typing import Optional, List
import time


class BackpackDataLoader:
    """Load historical market data from Backpack Exchange"""

    BASE_URL = "https://api.backpack.exchange"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'BPX-Grid-Bot-Backtest'
        })

    def get_klines(
        self,
        symbol: str,
        interval: str = "1m",
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 1000
    ) -> pd.DataFrame:
        """
        Get historical kline/candlestick data

        Args:
            symbol: Trading pair (e.g., "SOL_USDC")
            interval: Time interval (1m, 5m, 15m, 1h, 4h, 1d)
            start_time: Start timestamp in milliseconds
            end_time: End timestamp in milliseconds
            limit: Max number of candles (max 1000)

        Returns:
            DataFrame with columns: timestamp, open, high, low, close, volume
        """
        endpoint = f"{self.BASE_URL}/api/v1/klines"

        params = {
            "symbol": symbol,
            "interval": interval,
        }

        if start_time:
            params["startTime"] = start_time
        if end_time:
            params["endTime"] = end_time
        if limit:
            params["limit"] = limit

        try:
            response = self.session.get(endpoint, params=params)
            response.raise_for_status()
            data = response.json()

            if not data:
                return pd.DataFrame()

            # Parse kline data
            df = pd.DataFrame(data, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades',
                'taker_buy_volume', 'taker_buy_quote_volume', 'ignore'
            ])

            # Convert to proper types
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = pd.to_numeric(df[col], errors='coerce')

            # Keep only essential columns
            df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
            df.set_index('timestamp', inplace=True)

            return df

        except Exception as e:
            print(f"Error fetching klines: {e}")
            return pd.DataFrame()

    def download_historical_data(
        self,
        symbol: str,
        interval: str = "1m",
        days: int = 30
    ) -> pd.DataFrame:
        """
        Download historical data for specified number of days

        Args:
            symbol: Trading pair
            interval: Time interval
            days: Number of days to download

        Returns:
            Complete DataFrame with historical data
        """
        print(f"Downloading {days} days of {interval} data for {symbol}...")

        end_time = int(datetime.now().timestamp() * 1000)
        start_time = int((datetime.now() - timedelta(days=days)).timestamp() * 1000)

        all_data = []
        current_start = start_time

        # Download in chunks (max 1000 candles per request)
        while current_start < end_time:
            print(f"Fetching data from {datetime.fromtimestamp(current_start/1000)}")

            df = self.get_klines(
                symbol=symbol,
                interval=interval,
                start_time=current_start,
                end_time=end_time,
                limit=1000
            )

            if df.empty:
                break

            all_data.append(df)

            # Update start time for next batch
            last_timestamp = df.index[-1].timestamp() * 1000
            current_start = int(last_timestamp) + 1

            # Rate limiting
            time.sleep(0.5)

        if not all_data:
            print("No data downloaded!")
            return pd.DataFrame()

        # Combine all chunks
        result = pd.concat(all_data)
        result = result[~result.index.duplicated(keep='first')]
        result.sort_index(inplace=True)

        print(f"Downloaded {len(result)} candles")
        print(f"Date range: {result.index[0]} to {result.index[-1]}")

        return result

    def save_to_csv(self, df: pd.DataFrame, filename: str):
        """Save DataFrame to CSV file"""
        df.to_csv(filename)
        print(f"Saved to {filename}")

    def load_from_csv(self, filename: str) -> pd.DataFrame:
        """Load DataFrame from CSV file"""
        df = pd.read_csv(filename, index_col='timestamp', parse_dates=True)
        print(f"Loaded {len(df)} candles from {filename}")
        return df

    def get_current_price(self, symbol: str) -> float:
        """Get current market price"""
        endpoint = f"{self.BASE_URL}/api/v1/ticker"

        try:
            response = self.session.get(endpoint, params={"symbol": symbol})
            response.raise_for_status()
            data = response.json()
            return float(data.get('lastPrice', 0))
        except Exception as e:
            print(f"Error fetching current price: {e}")
            return 0.0


# Helper function for quick data download
def download_data(
    symbol: str = "SOL_USDC",
    interval: str = "1m",
    days: int = 30,
    save_path: Optional[str] = None
) -> pd.DataFrame:
    """
    Quick function to download historical data

    Example:
        >>> df = download_data("SOL_USDC", interval="1m", days=7)
        >>> df = download_data("BTC_USDC", interval="5m", days=30, save_path="btc_data.csv")
    """
    loader = BackpackDataLoader()
    df = loader.download_historical_data(symbol, interval, days)

    if save_path and not df.empty:
        loader.save_to_csv(df, save_path)

    return df


if __name__ == "__main__":
    # Test download
    print("Testing Backpack Data Loader...")

    # Download 7 days of 1-minute data
    df = download_data(
        symbol="SOL_USDC",
        interval="1m",
        days=7,
        save_path="backtest/data/SOL_USDC_1m_7d.csv"
    )

    if not df.empty:
        print("\nData Summary:")
        print(df.describe())
        print("\nFirst few rows:")
        print(df.head())
        print("\nLast few rows:")
        print(df.tail())
