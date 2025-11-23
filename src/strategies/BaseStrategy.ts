/**
 * Base Strategy
 * Abstract base class for all trading strategies
 */

import { IStrategy } from '../core/interfaces/IStrategy';
import {
  StrategyConfig,
  GridOrder,
  OrderDiff,
  Inventory,
  Order,
  OrderFill,
  Ticker,
} from '../core/interfaces/types';
import { logger } from '../utils';

export abstract class BaseStrategy implements IStrategy {
  public readonly name: string;
  public readonly config: StrategyConfig;

  protected initialized: boolean = false;
  protected lastPrice: number = 0;

  constructor(config: StrategyConfig) {
    this.config = config;
    this.name = config.name;
  }

  async initialize(currentPrice: number, inventory: Inventory): Promise<void> {
    this.lastPrice = currentPrice;
    this.initialized = true;

    logger.info(`[STRATEGY] ${this.name} initialized at price ${currentPrice}`);
  }

  abstract calculateGridOrders(
    currentPrice: number,
    inventory: Inventory
  ): GridOrder[];

  abstract shouldRebalance(
    currentPrice: number,
    lastRebalancePrice: number
  ): boolean;

  diffOrders(targetOrders: GridOrder[], existingOrders: Order[]): OrderDiff {
    const toCreate: GridOrder[] = [];
    const toCancel: Order[] = [];

    // Create a map of existing orders by clientId for quick lookup
    const existingMap = new Map<number | string | undefined, Order>();
    existingOrders.forEach((order) => {
      if (order.clientId !== undefined) {
        existingMap.set(order.clientId, order);
      }
    });

    // Find orders to create (target orders not in existing)
    for (const targetOrder of targetOrders) {
      const existing = existingMap.get(targetOrder.clientId);

      if (!existing) {
        // Order doesn't exist, need to create
        toCreate.push(targetOrder);
      } else {
        // Order exists, check if price/quantity match
        const priceMatch = Math.abs(existing.price - targetOrder.price) < 0.01;
        const quantityMatch =
          Math.abs(existing.quantity - targetOrder.quantity) < 0.0001;

        if (!priceMatch || !quantityMatch) {
          // Price or quantity mismatch, cancel and recreate
          toCancel.push(existing);
          toCreate.push(targetOrder);
        }

        // Remove from map to track which existing orders are still valid
        existingMap.delete(targetOrder.clientId);
      }
    }

    // Remaining orders in existingMap should be cancelled
    existingMap.forEach((order) => {
      toCancel.push(order);
    });

    return { toCreate, toCancel };
  }

  onOrderFill(fill: OrderFill, inventory: Inventory): void {
    logger.debug(`[STRATEGY] ${this.name} processed fill: ${fill.side} ${fill.quantity} @ ${fill.price}`);
  }

  onMarketUpdate(ticker: Ticker): void {
    this.lastPrice = ticker.lastPrice;
  }

  getState(): any {
    return {
      name: this.name,
      initialized: this.initialized,
      lastPrice: this.lastPrice,
    };
  }

  reset(): void {
    this.initialized = false;
    this.lastPrice = 0;
  }
}
