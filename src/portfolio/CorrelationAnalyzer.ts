/**
 * Correlation Analyzer
 * Analyzes price correlations between trading pairs
 */

import { logger } from '../utils';

export interface PriceData {
  symbol: string;
  timestamp: number;
  price: number;
}

export interface CorrelationMatrix {
  pairs: string[];
  matrix: number[][];
  timestamp: number;
}

export interface CorrelationAlert {
  pair1: string;
  pair2: string;
  correlation: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
}

export class CorrelationAnalyzer {
  private priceHistory: Map<string, number[]> = new Map();
  private timestamps: number[] = [];
  private maxHistoryLength: number;
  private updateInterval: number;
  private lastUpdate: number = 0;

  constructor(config: { maxHistoryLength?: number; updateIntervalMs?: number } = {}) {
    this.maxHistoryLength = config.maxHistoryLength || 100;
    this.updateInterval = config.updateIntervalMs || 60000;
  }

  public addPriceData(symbol: string, price: number, timestamp: number = Date.now()): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const prices = this.priceHistory.get(symbol)!;
    prices.push(price);

    if (prices.length > this.maxHistoryLength) {
      prices.shift();
    }

    if (this.timestamps.length === 0 || timestamp > this.timestamps[this.timestamps.length - 1]) {
      this.timestamps.push(timestamp);
      if (this.timestamps.length > this.maxHistoryLength) {
        this.timestamps.shift();
      }
    }

    this.lastUpdate = timestamp;
  }

  public calculateCorrelationMatrix(): CorrelationMatrix {
    const symbols = Array.from(this.priceHistory.keys());
    const n = symbols.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else if (i < j) {
          const corr = this.calculatePairCorrelation(symbols[i], symbols[j]);
          matrix[i][j] = corr;
          matrix[j][i] = corr;
        }
      }
    }

    return {
      pairs: symbols,
      matrix,
      timestamp: Date.now(),
    };
  }

  public calculatePairCorrelation(symbol1: string, symbol2: string): number {
    const prices1 = this.priceHistory.get(symbol1);
    const prices2 = this.priceHistory.get(symbol2);

    if (!prices1 || prices2) {
      return 0;
    }

    const length = Math.min(prices1.length, prices2.length);
    if (length < 2) {
      return 0;
    }

    const returns1 = this.calculateReturns(prices1.slice(-length));
    const returns2 = this.calculateReturns(prices2.slice(-length));

    return this.pearsonCorrelation(returns1, returns2);
  }

  public getHighlyCorrelatedPairs(threshold: number = 0.7): CorrelationAlert[] {
    const matrix = this.calculateCorrelationMatrix();
    const alerts: CorrelationAlert[] = [];
    const n = matrix.pairs.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const correlation = Math.abs(matrix.matrix[i][j]);

        if (correlation >= threshold) {
          let severity: 'low' | 'medium' | 'high' = 'low';
          if (correlation >= 0.9) {
            severity = 'high';
          } else if (correlation >= 0.8) {
            severity = 'medium';
          }

          alerts.push({
            pair1: matrix.pairs[i],
            pair2: matrix.pairs[j],
            correlation: matrix.matrix[i][j],
            threshold,
            severity,
          });
        }
      }
    }

    return alerts.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  public getDiversificationScore(): number {
    const matrix = this.calculateCorrelationMatrix();
    const n = matrix.pairs.length;

    if (n < 2) {
      return 100;
    }

    let sumCorr = 0;
    let count = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        sumCorr += Math.abs(matrix.matrix[i][j]);
        count++;
      }
    }

    const avgCorr = count > 0 ? sumCorr / count : 0;
    const score = (1 - avgCorr) * 100;

    return Math.round(score * 10) / 10;
  }

  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(ret);
    }
    return returns;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) {
      return 0;
    }

    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let covariance = 0;
    let varX = 0;
    let varY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      covariance += dx * dy;
      varX += dx * dx;
      varY += dy * dy;
    }

    const stdX = Math.sqrt(varX / n);
    const stdY = Math.sqrt(varY / n);

    if (stdX === 0 || stdY === 0) {
      return 0;
    }

    return covariance / (n * stdX * stdY);
  }

  public clear(): void {
    this.priceHistory.clear();
    this.timestamps = [];
    this.lastUpdate = 0;
  }
}
