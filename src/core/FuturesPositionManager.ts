/**
 * Futures Position Manager
 * Tracks futures positions, PnL, funding fees, and leverage
 */

import type {
  FuturesPosition,
  OrderFill,
  PnLSnapshot,
  FundingRate,
} from './interfaces';
import { logger } from '../utils/logger';

interface FuturesTradeRecord {
  timestamp: number;
  side: 'Long' | 'Short';
  price: number;
  quantity: number;
  fee: number;
  fundingFee?: number;
}

export class FuturesPositionManager {
  private symbol: string;
  private baseAsset: string;
  private quoteAsset: string;

  private currentPosition: FuturesPosition | null = null;
  private trades: FuturesTradeRecord[] = [];
  private fills: OrderFill[] = [];

  private totalFees: number = 0;
  private totalFundingFees: number = 0;
  private realizedPnl: number = 0;
  private unrealizedPnl: number = 0;

  private initialCapital: number = 0;
  private leverage: number = 1;

  constructor(symbol: string, baseAsset: string, quoteAsset: string, initialCapital: number) {
    this.symbol = symbol;
    this.baseAsset = baseAsset;
    this.quoteAsset = quoteAsset;
    this.initialCapital = initialCapital;

    logger.info({ symbol, initialCapital }, 'FuturesPositionManager initialized');
  }

  /**
   * Update position from exchange data
   */
  updatePosition(position: FuturesPosition | null): void {
    this.currentPosition = position;

    if (position) {
      this.leverage = position.leverage;
      this.unrealizedPnl = position.unrealizedPnl;
      this.realizedPnl = position.realizedPnl;

      logger.debug({ position }, 'Position updated');
    }
  }

  /**
   * Process order fill
   */
  updateFromFill(fill: OrderFill, currentPrice: number): void {
    this.fills.push(fill);
    this.totalFees += fill.fee;

    // Record trade
    const trade: FuturesTradeRecord = {
      timestamp: fill.timestamp,
      side: fill.side === 'Bid' ? 'Long' : 'Short',
      price: fill.price,
      quantity: fill.quantity,
      fee: fill.fee,
    };

    this.trades.push(trade);

    // Update realized PnL if position is closed/reduced
    if (this.currentPosition) {
      // Check if this fill reduces or closes position
      const fillSide = fill.side === 'Bid' ? 'Long' : 'Short';

      if (fillSide !== this.currentPosition.side) {
        // Position is being reduced/closed
        const closeQuantity = Math.min(fill.quantity, this.currentPosition.size);
        const pnl = this.calculateClosePnL(
          this.currentPosition.side,
          this.currentPosition.entryPrice,
          fill.price,
          closeQuantity
        );

        this.realizedPnl += pnl - fill.fee;
      }
    }

    logger.info({ fill, realizedPnl: this.realizedPnl }, 'Order fill processed');
  }

  /**
   * Calculate PnL for closing a position
   */
  private calculateClosePnL(
    side: 'Long' | 'Short',
    entryPrice: number,
    exitPrice: number,
    quantity: number
  ): number {
    if (side === 'Long') {
      return (exitPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - exitPrice) * quantity;
    }
  }

  /**
   * Record funding fee payment
   */
  recordFundingFee(fundingFee: number, fundingRate: FundingRate): void {
    this.totalFundingFees += Math.abs(fundingFee);

    // Add to realized PnL (negative for payment, positive for receipt)
    this.realizedPnl -= fundingFee;

    logger.info(
      { fundingFee, fundingRate: fundingRate.fundingRate },
      'Funding fee recorded'
    );
  }

  /**
   * Estimate next funding fee
   */
  estimateNextFundingFee(fundingRate: FundingRate): number {
    if (!this.currentPosition) return 0;

    // Funding fee = Position Value × Funding Rate
    const positionValue = this.currentPosition.size * this.currentPosition.markPrice;
    return positionValue * fundingRate.fundingRate;
  }

  /**
   * Get current position details
   */
  getCurrentPosition(): FuturesPosition | null {
    return this.currentPosition;
  }

  /**
   * Get PnL snapshot
   */
  getPnLSnapshot(): PnLSnapshot {
    const totalPnl = this.realizedPnl + this.unrealizedPnl;
    const netPnl = totalPnl - this.totalFees - this.totalFundingFees;

    const winningTrades = this.trades.filter((t) => {
      // Simplified: need to match with closing trades
      return true; // TODO: Implement proper win/loss calculation
    }).length;

    return {
      timestamp: Date.now(),
      realizedPnl: this.realizedPnl,
      unrealizedPnl: this.unrealizedPnl,
      totalPnl,
      fees: this.totalFees + this.totalFundingFees,
      trades: this.trades.length,
      winRate: this.trades.length > 0 ? (winningTrades / this.trades.length) * 100 : 0,
    };
  }

  /**
   * Calculate effective leverage
   */
  getEffectiveLeverage(): number {
    if (!this.currentPosition) return 0;

    const positionValue = this.currentPosition.size * this.currentPosition.markPrice;
    const equity = this.initialCapital + this.realizedPnl + this.unrealizedPnl;

    if (equity <= 0) return 0;

    return positionValue / equity;
  }

  /**
   * Calculate margin utilization
   */
  getMarginUtilization(): number {
    if (!this.currentPosition) return 0;

    return (this.currentPosition.margin / this.initialCapital) * 100;
  }

  /**
   * Get current equity
   */
  getCurrentEquity(): number {
    return this.initialCapital + this.realizedPnl + this.unrealizedPnl - this.totalFees - this.totalFundingFees;
  }

  /**
   * Calculate maximum position size given leverage and capital
   */
  calculateMaxPositionSize(price: number, maxLeverage: number): number {
    const equity = this.getCurrentEquity();
    return (equity * maxLeverage) / price;
  }

  /**
   * Get position summary for logging
   */
  getSummary(): any {
    return {
      symbol: this.symbol,
      position: this.currentPosition,
      realizedPnl: this.realizedPnl,
      unrealizedPnl: this.unrealizedPnl,
      totalFees: this.totalFees,
      fundingFees: this.totalFundingFees,
      trades: this.trades.length,
      equity: this.getCurrentEquity(),
      leverage: this.leverage,
      effectiveLeverage: this.getEffectiveLeverage(),
      marginUtilization: this.getMarginUtilization(),
    };
  }

  /**
   * Reset all tracking (for new strategy run)
   */
  reset(): void {
    this.currentPosition = null;
    this.trades = [];
    this.fills = [];
    this.totalFees = 0;
    this.totalFundingFees = 0;
    this.realizedPnl = 0;
    this.unrealizedPnl = 0;

    logger.info('FuturesPositionManager reset');
  }
}
