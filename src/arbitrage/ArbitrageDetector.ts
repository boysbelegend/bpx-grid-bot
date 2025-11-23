/**
 * Arbitrage Detector
 * Detects and analyzes arbitrage opportunities across trading pairs
 */

import { logger } from '../utils';

export interface MarketPrice {
  symbol: string;
  bidPrice: number;
  askPrice: number;
  bidSize: number;
  askSize: number;
  timestamp: number;
}

export interface ArbitrageOpportunity {
  type: 'triangular' | 'two-leg' | 'cross-exchange';
  path: string[];
  expectedProfit: number;
  profitPercent: number;
  volume: number;
  prices: number[];
  timestamp: number;
  riskLevel: 'low' | 'medium' | 'high';
  executionTime: number; // Estimated execution time in ms
}

export interface ArbitrageConfig {
  minProfitPercent: number;      // Minimum profit threshold (e.g., 0.5 for 0.5%)
  maxExecutionTime: number;       // Max time for execution (ms)
  tradingFee: number;             // Trading fee per trade (e.g., 0.001 for 0.1%)
  slippageTolerance: number;      // Slippage tolerance (e.g., 0.002 for 0.2%)
  minVolume: number;              // Minimum trade volume
}

export class ArbitrageDetector {
  private config: ArbitrageConfig;
  private prices: Map<string, MarketPrice> = new Map();
  private opportunities: ArbitrageOpportunity[] = [];

  constructor(config: ArbitrageConfig) {
    this.config = config;
    logger.info('ArbitrageDetector initialized');
  }

  public updatePrice(price: MarketPrice): void {
    this.prices.set(price.symbol, price);
  }

  public detectOpportunities(): ArbitrageOpportunity[] {
    this.opportunities = [];

    // Detect triangular arbitrage
    this.detectTriangularArbitrage();

    // Detect two-leg arbitrage
    this.detectTwoLegArbitrage();

    // Filter by minimum profit and sort
    this.opportunities = this.opportunities
      .filter(opp => opp.profitPercent >= this.config.minProfitPercent)
      .sort((a, b) => b.profitPercent - a.profitPercent);

    if (this.opportunities.length > 0) {
      logger.info(
        { count: this.opportunities.length },
        'Arbitrage opportunities detected'
      );
    }

    return this.opportunities;
  }

  private detectTriangularArbitrage(): void {
    const symbols = Array.from(this.prices.keys());

    // Build currency graph
    const currencies = new Set<string>();
    const pairs = new Map<string, { pair: string; bid: number; ask: number; bidSize: number; askSize: number }>();

    symbols.forEach(symbol => {
      const parts = symbol.split('_');
      if (parts.length === 2) {
        currencies.add(parts[0]);
        currencies.add(parts[1]);
        const price = this.prices.get(symbol);
        if (price) {
          pairs.set(symbol, {
            pair: symbol,
            bid: price.bidPrice,
            ask: price.askPrice,
            bidSize: price.bidSize,
            askSize: price.askSize,
          });
        }
      }
    });

    // Find triangular paths
    const currencyList = Array.from(currencies);

    for (const base of currencyList) {
      for (const intermediate of currencyList) {
        if (intermediate === base) continue;

        for (const target of currencyList) {
          if (target === base || target === intermediate) continue;

          // Try path: base -> intermediate -> target -> base
          const result = this.calculateTriangularProfit(base, intermediate, target, pairs);

          if (result && result.profitPercent > 0) {
            this.opportunities.push(result);
          }
        }
      }
    }
  }

  private calculateTriangularProfit(
    base: string,
    intermediate: string,
    target: string,
    pairs: Map<string, { pair: string; bid: number; ask: number; bidSize: number; askSize: number }>
  ): ArbitrageOpportunity | null {
    // Step 1: base -> intermediate
    const pair1 = pairs.get(`${base}_${intermediate}`) || pairs.get(`${intermediate}_${base}`);
    if (!pair1) return null;

    // Step 2: intermediate -> target
    const pair2 = pairs.get(`${intermediate}_${target}`) || pairs.get(`${target}_${intermediate}`);
    if (!pair2) return null;

    // Step 3: target -> base
    const pair3 = pairs.get(`${target}_${base}`) || pairs.get(`${base}_${target}`);
    if (!pair3) return null;

    let amount = 1.0;
    const path: string[] = [base];
    const prices: number[] = [];
    let volume = amount;

    // Execute virtual trades
    // Trade 1: base -> intermediate
    const isBuy1 = pair1.pair.startsWith(base);
    const price1 = isBuy1 ? pair1.ask : (1 / pair1.bid);
    amount = amount * price1 * (1 - this.config.tradingFee);
    path.push(intermediate);
    prices.push(price1);
    volume = Math.min(volume, isBuy1 ? pair1.askSize : pair1.bidSize);

    // Trade 2: intermediate -> target
    const isBuy2 = pair2.pair.startsWith(intermediate);
    const price2 = isBuy2 ? pair2.ask : (1 / pair2.bid);
    amount = amount * price2 * (1 - this.config.tradingFee);
    path.push(target);
    prices.push(price2);
    volume = Math.min(volume, isBuy2 ? pair2.askSize : pair2.bidSize);

    // Trade 3: target -> base
    const isBuy3 = pair3.pair.startsWith(target);
    const price3 = isBuy3 ? pair3.ask : (1 / pair3.bid);
    amount = amount * price3 * (1 - this.config.tradingFee);
    path.push(base);
    prices.push(price3);
    volume = Math.min(volume, isBuy3 ? pair3.askSize : pair3.bidSize);

    const profit = amount - 1.0;
    const profitPercent = profit * 100;

    // Apply slippage
    const adjustedProfit = profitPercent - (this.config.slippageTolerance * 100);

    if (adjustedProfit <= 0 || volume < this.config.minVolume) {
      return null;
    }

    const riskLevel = this.calculateRiskLevel(profitPercent, 3);

    return {
      type: 'triangular',
      path,
      expectedProfit: profit,
      profitPercent: adjustedProfit,
      volume,
      prices,
      timestamp: Date.now(),
      riskLevel,
      executionTime: 500, // Estimated
    };
  }

  private detectTwoLegArbitrage(): void {
    // Detect simple 2-leg arbitrage opportunities
    // Example: SOL_USDC and BTC_USDC imply SOL_BTC price
    // If actual SOL_BTC differs significantly, there's an arbitrage opportunity

    const symbols = Array.from(this.prices.keys());

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];

        const parts1 = symbol1.split('_');
        const parts2 = symbol2.split('_');

        if (parts1.length !== 2 || parts2.length !== 2) continue;

        // Find common currency
        const common = parts1.find(c => parts2.includes(c));
        if (!common) continue;

        const other1 = parts1.find(c => c !== common)!;
        const other2 = parts2.find(c => c !== common)!;

        // Check if implied pair exists
        const impliedPair = `${other1}_${other2}`;
        const reversePair = `${other2}_${other1}`;

        const actualPrice = this.prices.get(impliedPair) || this.prices.get(reversePair);
        if (!actualPrice) continue;

        // Calculate implied price
        const price1 = this.prices.get(symbol1);
        const price2 = this.prices.get(symbol2);

        if (!price1 || !price2) continue;

        const result = this.calculateTwoLegProfit(price1, price2, actualPrice, other1, other2, common);

        if (result && result.profitPercent > 0) {
          this.opportunities.push(result);
        }
      }
    }
  }

  private calculateTwoLegProfit(
    price1: MarketPrice,
    price2: MarketPrice,
    actualPrice: MarketPrice,
    currency1: string,
    currency2: string,
    common: string
  ): ArbitrageOpportunity | null {
    // This is a simplified calculation
    // In practice, you would need to consider the exact trading path

    const parts1 = price1.symbol.split('_');
    const parts2 = price2.symbol.split('_');

    // Calculate implied rate
    let impliedRate: number;

    if (parts1[1] === common && parts2[1] === common) {
      // Both quote in common currency
      impliedRate = price1.askPrice / price2.bidPrice;
    } else if (parts1[0] === common && parts2[0] === common) {
      // Both base in common currency
      impliedRate = price2.bidPrice / price1.askPrice;
    } else {
      return null; // Mixed case - more complex
    }

    // Compare with actual
    const actualRate = actualPrice.bidPrice;
    const priceDiff = (impliedRate - actualRate) / actualRate;
    const profitPercent = Math.abs(priceDiff) * 100;

    // Adjust for fees and slippage
    const netProfit = profitPercent - (2 * this.config.tradingFee * 100) - (this.config.slippageTolerance * 100);

    if (netProfit <= 0) {
      return null;
    }

    const volume = Math.min(price1.askSize, price2.bidSize, actualPrice.bidSize);

    if (volume < this.config.minVolume) {
      return null;
    }

    const path = priceDiff > 0
      ? [common, currency1, currency2, common]
      : [common, currency2, currency1, common];

    const riskLevel = this.calculateRiskLevel(netProfit, 2);

    return {
      type: 'two-leg',
      path,
      expectedProfit: netProfit / 100,
      profitPercent: netProfit,
      volume,
      prices: [price1.askPrice, price2.bidPrice, actualRate],
      timestamp: Date.now(),
      riskLevel,
      executionTime: 300, // Estimated
    };
  }

  private calculateRiskLevel(profitPercent: number, legCount: number): 'low' | 'medium' | 'high' {
    // Higher profit = lower risk (more margin for error)
    // More legs = higher risk (more execution steps)

    if (profitPercent > 2.0 && legCount <= 2) {
      return 'low';
    } else if (profitPercent > 1.0 && legCount <= 3) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  public getTopOpportunities(count: number = 5): ArbitrageOpportunity[] {
    return this.opportunities.slice(0, count);
  }

  public clearOpportunities(): void {
    this.opportunities = [];
  }

  public getStats(): {
    totalOpportunities: number;
    averageProfit: number;
    triangularCount: number;
    twoLegCount: number;
    lowRiskCount: number;
  } {
    const triangular = this.opportunities.filter(o => o.type === 'triangular').length;
    const twoLeg = this.opportunities.filter(o => o.type === 'two-leg').length;
    const lowRisk = this.opportunities.filter(o => o.riskLevel === 'low').length;

    const avgProfit = this.opportunities.length > 0
      ? this.opportunities.reduce((sum, o) => sum + o.profitPercent, 0) / this.opportunities.length
      : 0;

    return {
      totalOpportunities: this.opportunities.length,
      averageProfit: avgProfit,
      triangularCount: triangular,
      twoLegCount: twoLeg,
      lowRiskCount: lowRisk,
    };
  }
}
