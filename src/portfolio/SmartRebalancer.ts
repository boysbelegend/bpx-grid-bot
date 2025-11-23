/**
 * Smart Rebalancing Engine
 * Intelligent rebalancing logic with market condition analysis
 */

import { logger } from '../utils';

export interface MarketCondition {
  symbol: string;
  price: number;
  timestamp: number;
  // Technical indicators
  sma20?: number;
  sma50?: number;
  ema12?: number;
  ema26?: number;
  rsi?: number;
  volatility?: number;
  momentum?: number;
  trend?: 'bullish' | 'bearish' | 'neutral';
}

export interface RebalanceSignal {
  symbol: string;
  action: 'increase' | 'decrease' | 'hold';
  confidence: number; // 0-100
  reason: string;
  targetWeight: number;
  currentWeight: number;
  indicators: {
    sma: 'bullish' | 'bearish' | 'neutral';
    rsi: 'overbought' | 'oversold' | 'neutral';
    momentum: 'positive' | 'negative' | 'neutral';
    volatility: 'high' | 'normal' | 'low';
  };
}

export interface RebalanceConfig {
  smaShortPeriod: number;      // Short-term SMA period (e.g., 20)
  smaLongPeriod: number;        // Long-term SMA period (e.g., 50)
  emaShortPeriod: number;       // Short-term EMA period (e.g., 12)
  emaLongPeriod: number;        // Long-term EMA period (e.g., 26)
  rsiPeriod: number;            // RSI period (e.g., 14)
  rsiOverbought: number;        // RSI overbought threshold (e.g., 70)
  rsiOversold: number;          // RSI oversold threshold (e.g., 30)
  volatilityPeriod: number;     // Volatility calculation period
  momentumPeriod: number;       // Momentum calculation period
  minConfidence: number;        // Minimum confidence to rebalance (e.g., 60)
}

export class SmartRebalancingEngine {
  private config: RebalanceConfig;
  private priceHistory: Map<string, number[]> = new Map();
  private maxHistory: number = 200;

  constructor(config: Partial<RebalanceConfig> = {}) {
    this.config = {
      smaShortPeriod: config.smaShortPeriod || 20,
      smaLongPeriod: config.smaLongPeriod || 50,
      emaShortPeriod: config.emaShortPeriod || 12,
      emaLongPeriod: config.emaLongPeriod || 26,
      rsiPeriod: config.rsiPeriod || 14,
      rsiOverbought: config.rsiOverbought || 70,
      rsiOversold: config.rsiOversold || 30,
      volatilityPeriod: config.volatilityPeriod || 20,
      momentumPeriod: config.momentumPeriod || 10,
      minConfidence: config.minConfidence || 60,
    };

    logger.info('SmartRebalancingEngine initialized');
  }

  public addPrice(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const prices = this.priceHistory.get(symbol)!;
    prices.push(price);

    if (prices.length > this.maxHistory) {
      prices.shift();
    }
  }

  public analyzeMarketCondition(symbol: string): MarketCondition | null {
    const prices = this.priceHistory.get(symbol);
    if (!prices || prices.length < 2) {
      return null;
    }

    const currentPrice = prices[prices.length - 1];

    const condition: MarketCondition = {
      symbol,
      price: currentPrice,
      timestamp: Date.now(),
    };

    // Calculate indicators
    if (prices.length >= this.config.smaShortPeriod) {
      condition.sma20 = this.calculateSMA(prices, this.config.smaShortPeriod);
    }

    if (prices.length >= this.config.smaLongPeriod) {
      condition.sma50 = this.calculateSMA(prices, this.config.smaLongPeriod);
    }

    if (prices.length >= this.config.emaShortPeriod) {
      condition.ema12 = this.calculateEMA(prices, this.config.emaShortPeriod);
    }

    if (prices.length >= this.config.emaLongPeriod) {
      condition.ema26 = this.calculateEMA(prices, this.config.emaLongPeriod);
    }

    if (prices.length >= this.config.rsiPeriod + 1) {
      condition.rsi = this.calculateRSI(prices, this.config.rsiPeriod);
    }

    if (prices.length >= this.config.volatilityPeriod) {
      condition.volatility = this.calculateVolatility(prices, this.config.volatilityPeriod);
    }

    if (prices.length >= this.config.momentumPeriod) {
      condition.momentum = this.calculateMomentum(prices, this.config.momentumPeriod);
    }

    // Determine trend
    if (condition.sma20 && condition.sma50) {
      if (condition.sma20 > condition.sma50) {
        condition.trend = 'bullish';
      } else if (condition.sma20 < condition.sma50) {
        condition.trend = 'bearish';
      } else {
        condition.trend = 'neutral';
      }
    }

    return condition;
  }

  public generateRebalanceSignal(
    symbol: string,
    currentWeight: number
  ): RebalanceSignal | null {
    const condition = this.analyzeMarketCondition(symbol);
    if (!condition) {
      return null;
    }

    const indicators = {
      sma: this.analyzeSMA(condition),
      rsi: this.analyzeRSI(condition),
      momentum: this.analyzeMomentum(condition),
      volatility: this.analyzeVolatility(condition),
    };

    // Calculate confidence and action
    const { action, confidence, reason, targetWeight } = this.decideAction(
      condition,
      indicators,
      currentWeight
    );

    return {
      symbol,
      action,
      confidence,
      reason,
      targetWeight,
      currentWeight,
      indicators,
    };
  }

  private decideAction(
    condition: MarketCondition,
    indicators: RebalanceSignal['indicators'],
    currentWeight: number
  ): { action: 'increase' | 'decrease' | 'hold'; confidence: number; reason: string; targetWeight: number } {
    let score = 0;
    const reasons: string[] = [];

    // SMA analysis (40% weight)
    if (indicators.sma === 'bullish') {
      score += 40;
      reasons.push('bullish SMA crossover');
    } else if (indicators.sma === 'bearish') {
      score -= 40;
      reasons.push('bearish SMA crossover');
    }

    // RSI analysis (30% weight)
    if (indicators.rsi === 'oversold') {
      score += 30;
      reasons.push('oversold RSI');
    } else if (indicators.rsi === 'overbought') {
      score -= 30;
      reasons.push('overbought RSI');
    }

    // Momentum analysis (20% weight)
    if (indicators.momentum === 'positive') {
      score += 20;
      reasons.push('positive momentum');
    } else if (indicators.momentum === 'negative') {
      score -= 20;
      reasons.push('negative momentum');
    }

    // Volatility analysis (10% weight - defensive)
    if (indicators.volatility === 'high') {
      score -= 10;
      reasons.push('high volatility');
    }

    const absScore = Math.abs(score);
    const confidence = Math.min(100, absScore);

    let action: 'increase' | 'decrease' | 'hold';
    let targetWeight = currentWeight;

    if (confidence < this.config.minConfidence) {
      action = 'hold';
    } else if (score > 0) {
      action = 'increase';
      // Increase weight by up to 20% based on confidence
      const increase = (confidence / 100) * 0.2;
      targetWeight = Math.min(0.5, currentWeight * (1 + increase));
    } else {
      action = 'decrease';
      // Decrease weight by up to 20% based on confidence
      const decrease = (confidence / 100) * 0.2;
      targetWeight = Math.max(0.05, currentWeight * (1 - decrease));
    }

    const reason = reasons.join(', ') || 'no clear signal';

    return { action, confidence, reason, targetWeight };
  }

  // ============================================================================
  // Technical Indicators
  // ============================================================================

  private calculateSMA(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    return slice.reduce((sum, p) => sum + p, 0) / period;
  }

  private calculateEMA(prices: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
  }

  private calculateRSI(prices: number[], period: number): number {
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const slice = changes.slice(-period);
    const gains = slice.filter(c => c > 0);
    const losses = slice.filter(c => c < 0).map(c => Math.abs(c));

    const avgGain = gains.length > 0 ? gains.reduce((sum, g) => sum + g, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, l) => sum + l, 0) / period : 0;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateVolatility(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    const returns: number[] = [];

    for (let i = 1; i < slice.length; i++) {
      const ret = (slice[i] - slice[i - 1]) / slice[i - 1];
      returns.push(ret);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  private calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - period];
    return (current - past) / past;
  }

  // ============================================================================
  // Indicator Analysis
  // ============================================================================

  private analyzeSMA(condition: MarketCondition): 'bullish' | 'bearish' | 'neutral' {
    if (!condition.sma20 || !condition.sma50) return 'neutral';

    if (condition.sma20 > condition.sma50 * 1.02) {
      return 'bullish';
    } else if (condition.sma20 < condition.sma50 * 0.98) {
      return 'bearish';
    }

    return 'neutral';
  }

  private analyzeRSI(condition: MarketCondition): 'overbought' | 'oversold' | 'neutral' {
    if (!condition.rsi) return 'neutral';

    if (condition.rsi > this.config.rsiOverbought) {
      return 'overbought';
    } else if (condition.rsi < this.config.rsiOversold) {
      return 'oversold';
    }

    return 'neutral';
  }

  private analyzeMomentum(condition: MarketCondition): 'positive' | 'negative' | 'neutral' {
    if (!condition.momentum) return 'neutral';

    if (condition.momentum > 0.05) {
      return 'positive';
    } else if (condition.momentum < -0.05) {
      return 'negative';
    }

    return 'neutral';
  }

  private analyzeVolatility(condition: MarketCondition): 'high' | 'normal' | 'low' {
    if (!condition.volatility) return 'normal';

    if (condition.volatility > 0.03) {
      return 'high';
    } else if (condition.volatility < 0.01) {
      return 'low';
    }

    return 'normal';
  }

  public getStats(): {
    symbols: string[];
    avgPriceCount: number;
  } {
    const symbols = Array.from(this.priceHistory.keys());
    const avgPriceCount = symbols.length > 0
      ? symbols.reduce((sum, s) => sum + (this.priceHistory.get(s)?.length || 0), 0) / symbols.length
      : 0;

    return {
      symbols,
      avgPriceCount,
    };
  }
}
