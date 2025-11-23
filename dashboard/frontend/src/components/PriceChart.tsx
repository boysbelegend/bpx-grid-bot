/**
 * Price Chart Component
 * Lightweight real-time price chart with grid visualization
 * Using lightweight-charts library
 */

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';

interface GridLevel {
  price: number;
  side: 'buy' | 'sell';
  hasOrder: boolean;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface PriceChartProps {
  symbol: string;
  candles: Candle[];
  gridLevels?: GridLevel[];
  currentPrice?: number;
  height?: number;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  symbol,
  candles,
  gridLevels = [],
  currentPrice,
  height = 500,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: '#1E222D' },
        textColor: '#D9D9D9',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
      },
      timeScale: {
        borderColor: '#2B2B43',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    });

    candleSeriesRef.current = candleSeries;

    // Set candle data
    if (candles.length > 0) {
      candleSeries.setData(candles);
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update candles
  useEffect(() => {
    if (candleSeriesRef.current && candles.length > 0) {
      candleSeriesRef.current.setData(candles);
    }
  }, [candles]);

  // Draw grid levels
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    // Draw price lines for grid levels
    gridLevels.forEach((level) => {
      const lineSeries = chartRef.current!.addLineSeries({
        color: level.side === 'buy' ? '#26a69a' : '#ef5350',
        lineWidth: level.hasOrder ? 2 : 1,
        lineStyle: level.hasOrder ? LineStyle.Solid : LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        title: `${level.side.toUpperCase()} ${level.price.toFixed(2)}`,
      });

      // Create horizontal line
      const data = candles.map(c => ({
        time: c.time,
        value: level.price,
      }));

      lineSeries.setData(data);
    });
  }, [gridLevels, candles]);

  // Draw current price line
  useEffect(() => {
    if (!chartRef.current || !currentPrice || !candleSeriesRef.current) return;

    const priceLine = {
      price: currentPrice,
      color: '#2196F3',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: 'Current Price',
    };

    candleSeriesRef.current.createPriceLine(priceLine);
  }, [currentPrice]);

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-lg">{symbol} Chart</h3>
        {currentPrice && (
          <div className="text-2xl font-bold text-blue-500 mt-1">
            ${currentPrice.toFixed(2)}
          </div>
        )}
      </div>
      <div ref={chartContainerRef} style={{ position: 'relative' }} />

      {/* Grid Legend */}
      {gridLevels.length > 0 && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500"></div>
              <span>Buy Levels: {gridLevels.filter(l => l.side === 'buy').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span>Sell Levels: {gridLevels.filter(l => l.side === 'sell').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500"></div>
              <span className="text-green-500">🎯</span>
              <span>Active Orders: {gridLevels.filter(l => l.hasOrder).length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceChart;
