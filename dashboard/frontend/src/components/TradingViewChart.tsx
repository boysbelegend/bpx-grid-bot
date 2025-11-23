/**
 * TradingView Chart Component
 * Real-time price chart with grid level visualization
 */

import React, { useEffect, useRef, useState } from 'react';

interface GridLevel {
  price: number;
  side: 'buy' | 'sell';
  hasOrder: boolean;
}

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  gridLevels?: GridLevel[];
  currentPrice?: number;
  theme?: 'light' | 'dark';
  height?: number;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  interval = '1h',
  gridLevels = [],
  currentPrice,
  theme = 'dark',
  height = 500,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    // Load TradingView library
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => initChart();
    document.head.appendChild(script);

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (chartRef.current && gridLevels.length > 0) {
      drawGridLevels();
    }
  }, [gridLevels]);

  const initChart = () => {
    if (!containerRef.current || !(window as any).TradingView) return;

    const tvSymbol = symbol.replace('_', '');

    chartRef.current = new (window as any).TradingView.widget({
      container_id: containerRef.current.id,
      width: '100%',
      height: height,
      symbol: `BACKPACK:${tvSymbol}`,
      interval: interval,
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1', // Candles
      locale: 'en',
      toolbar_bg: theme === 'dark' ? '#1E222D' : '#FFFFFF',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      studies: [
        'Volume@tv-basicstudies',
      ],
      disabled_features: [
        'use_localstorage_for_settings',
        'header_symbol_search',
      ],
      enabled_features: [
        'study_templates',
      ],
      overrides: {
        'mainSeriesProperties.candleStyle.upColor': '#26a69a',
        'mainSeriesProperties.candleStyle.downColor': '#ef5350',
        'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
        'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
        'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
        'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
      },
    });

    chartRef.current.onChartReady(() => {
      drawGridLevels();
      if (currentPrice) {
        drawCurrentPrice(currentPrice);
      }
    });
  };

  const drawGridLevels = () => {
    if (!chartRef.current) return;

    const chart = chartRef.current.chart();

    // Remove existing grid lines
    chart.getAllShapes().forEach((shape: any) => {
      if (shape.name?.startsWith('grid_')) {
        chart.removeEntity(shape.id);
      }
    });

    // Draw new grid levels
    gridLevels.forEach((level, index) => {
      const lineColor = level.side === 'buy' ? '#26a69a' : '#ef5350';
      const lineStyle = level.hasOrder ? 0 : 2; // Solid if has order, dashed otherwise

      chart.createShape(
        { time: Date.now() / 1000, price: level.price },
        {
          shape: 'horizontal_line',
          overrides: {
            linecolor: lineColor,
            linestyle: lineStyle,
            linewidth: level.hasOrder ? 2 : 1,
            showLabel: true,
            textcolor: lineColor,
            text: `${level.side.toUpperCase()} ${level.price.toFixed(2)}${level.hasOrder ? ' 🎯' : ''}`,
          },
        },
        {
          name: `grid_${index}`,
          lock: true,
          disableSelection: true,
          disableSave: true,
          disableUndo: true,
        }
      );
    });
  };

  const drawCurrentPrice = (price: number) => {
    if (!chartRef.current) return;

    const chart = chartRef.current.chart();

    // Remove existing current price line
    chart.getAllShapes().forEach((shape: any) => {
      if (shape.name === 'current_price') {
        chart.removeEntity(shape.id);
      }
    });

    // Draw current price line
    chart.createShape(
      { time: Date.now() / 1000, price: price },
      {
        shape: 'horizontal_line',
        overrides: {
          linecolor: '#2196F3',
          linestyle: 0,
          linewidth: 3,
          showLabel: true,
          textcolor: '#FFFFFF',
          horzLabelsAlign: 'right',
          text: `Current: ${price.toFixed(2)}`,
        },
      },
      {
        name: 'current_price',
        lock: true,
        disableSelection: true,
        disableSave: true,
        disableUndo: true,
      }
    );
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        ref={containerRef}
        id="tradingview_chart"
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  );
};

export default TradingViewChart;
