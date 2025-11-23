/**
 * Position Manager
 * Manages inventory, positions, and PnL tracking
 */

import {
  Inventory,
  OrderFill,
  Position,
  Balance,
  PnLSnapshot,
  TradingMetrics,
  MarketType,
} from './interfaces/types';
import { calculateInventorySkew, calculateUnrealizedPnL, calculateAveragePrice } from '../utils';
import { logger } from '../utils/logger';

interface PositionManagerConfig {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  type: MarketType;
}

export class PositionManager {
  private config: PositionManagerConfig;
  private inventory: Inventory;
  private fills: OrderFill[] = [];
  private startTime: number;
  private totalFees: number = 0;
  private realizedPnl: number = 0;
  private buyFills: { price: number; quantity: number }[] = [];
  private sellFills: { price: number; quantity: number }[] = [];

  constructor(config: PositionManagerConfig) {
    this.config = config;
    this.startTime = Date.now();

    // Initialize empty inventory
    this.inventory = {
      baseAsset: {
        symbol: config.baseAsset,
        total: 0,
        available: 0,
        locked: 0,
      },
      quoteAsset: {
        symbol: config.quoteAsset,
        total: 0,
        available: 0,
        locked: 0,
      },
      netValue: 0,
      skew: 0,
    };
  }

  /**
   * Update inventory from exchange balances
   */
  updateInventoryFromBalances(balances: Balance[]): void {
    const baseBalance = balances.find((b) => b.asset === this.config.baseAsset);
    const quoteBalance = balances.find((b) => b.asset === this.config.quoteAsset);

    if (baseBalance) {
      this.inventory.baseAsset = {
        symbol: this.config.baseAsset,
        total: baseBalance.total,
        available: baseBalance.available,
        locked: baseBalance.locked,
      };
    }

    if (quoteBalance) {
      this.inventory.quoteAsset = {
        symbol: this.config.quoteAsset,
        total: quoteBalance.total,
        available: quoteBalance.available,
        locked: quoteBalance.locked,
      };
    }

    this.updateNetValue();
  }

  /**
   * Process order fill and update inventory
   */
  updateFromFill(fill: OrderFill, currentPrice: number): void {
    this.fills.push(fill);
    this.totalFees += fill.fee;

    // Track fills for average price calculation
    if (fill.side === 'Bid') {
      this.buyFills.push({ price: fill.price, quantity: fill.quantity });
    } else {
      this.sellFills.push({ price: fill.price, quantity: fill.quantity });
    }

    // Calculate realized PnL for this fill
    const realizedPnlForFill = this.calculateRealizedPnlForFill(fill);
    this.realizedPnl += realizedPnlForFill;

    logger.info(`[POSITION] Fill processed: ${fill.side} ${fill.quantity} @ ${fill.price}`, {
      realizedPnl: realizedPnlForFill.toFixed(2),
      totalRealizedPnl: this.realizedPnl.toFixed(2),
      fee: fill.fee.toFixed(4),
    });

    this.updateNetValue(currentPrice);
  }

  /**
   * Calculate realized PnL for a fill
   */
  private calculateRealizedPnlForFill(fill: OrderFill): number {
    if (fill.side === 'Ask') {
      // Sell: Calculate profit from matched buys
      const avgBuyPrice = calculateAveragePrice(this.buyFills);
      if (avgBuyPrice > 0) {
        return (fill.price - avgBuyPrice) * fill.quantity - fill.fee;
      }
    }
    // For buy orders, PnL is realized when we sell
    return -fill.fee;
  }

  /**
   * Get current inventory
   */
  getInventory(): Inventory {
    return { ...this.inventory };
  }

  /**
   * Get inventory skew
   */
  getInventorySkew(): number {
    return calculateInventorySkew(this.inventory);
  }

  /**
   * Calculate unrealized PnL
   */
  getUnrealizedPnL(currentPrice: number): number {
    const baseValue = this.inventory.baseAsset.total * currentPrice;
    const quoteValue = this.inventory.quoteAsset.total;

    // Calculate initial value (assuming we started with 50/50 split)
    const initialValue = this.inventory.netValue;

    // Unrealized PnL = current value - initial value - realized PnL
    const currentValue = baseValue + quoteValue;
    return currentValue - initialValue - this.realizedPnl;
  }

  /**
   * Get current PnL snapshot
   */
  getPnLSnapshot(currentPrice: number): PnLSnapshot {
    const unrealizedPnl = this.getUnrealizedPnL(currentPrice);
    const totalPnl = this.realizedPnl + unrealizedPnl;

    const wins = this.fills.filter((f) => {
      if (f.side === 'Ask') {
        const avgBuyPrice = calculateAveragePrice(this.buyFills);
        return f.price > avgBuyPrice;
      }
      return false;
    }).length;

    const sellCount = this.sellFills.length;
    const winRate = sellCount > 0 ? (wins / sellCount) * 100 : 0;

    return {
      timestamp: Date.now(),
      realizedPnl: this.realizedPnl,
      unrealizedPnl,
      totalPnl,
      fees: this.totalFees,
      trades: this.fills.length,
      winRate,
    };
  }

  /**
   * Get trading metrics
   */
  getTradingMetrics(currentPrice: number): TradingMetrics {
    const snapshot = this.getPnLSnapshot(currentPrice);

    const winningTrades = this.fills.filter((f) => {
      if (f.side === 'Ask') {
        const avgBuyPrice = calculateAveragePrice(this.buyFills);
        return f.price > avgBuyPrice;
      }
      return false;
    }).length;

    const totalVolume = this.fills.reduce((sum, f) => sum + f.price * f.quantity, 0);

    return {
      startTime: this.startTime,
      totalTrades: this.fills.length,
      winningTrades,
      losingTrades: this.sellFills.length - winningTrades,
      totalVolume,
      totalFees: this.totalFees,
      realizedPnl: snapshot.realizedPnl,
      unrealizedPnl: snapshot.unrealizedPnl,
      maxDrawdown: 0, // TODO: Implement drawdown tracking
      sharpeRatio: undefined, // TODO: Implement Sharpe ratio calculation
    };
  }

  /**
   * Get average buy price
   */
  getAverageBuyPrice(): number {
    return calculateAveragePrice(this.buyFills);
  }

  /**
   * Get average sell price
   */
  getAverageSellPrice(): number {
    return calculateAveragePrice(this.sellFills);
  }

  /**
   * Get total fills
   */
  getFills(): OrderFill[] {
    return [...this.fills];
  }

  /**
   * Get fill count
   */
  getFillCount(): number {
    return this.fills.length;
  }

  /**
   * Get total fees paid
   */
  getTotalFees(): number {
    return this.totalFees;
  }

  /**
   * Get realized PnL
   */
  getRealizedPnL(): number {
    return this.realizedPnl;
  }

  /**
   * Reset position manager
   */
  reset(): void {
    this.fills = [];
    this.buyFills = [];
    this.sellFills = [];
    this.totalFees = 0;
    this.realizedPnl = 0;
    this.startTime = Date.now();
  }

  /**
   * Update net value
   */
  private updateNetValue(currentPrice?: number): void {
    const price = currentPrice || 0;
    const baseValue = this.inventory.baseAsset.total * price;
    const quoteValue = this.inventory.quoteAsset.total;

    this.inventory.netValue = baseValue + quoteValue;
    this.inventory.skew = calculateInventorySkew(this.inventory);
  }
}
