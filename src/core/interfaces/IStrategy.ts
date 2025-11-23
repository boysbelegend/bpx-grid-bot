/**
 * Strategy Interface
 * Base interface for all trading strategies
 */

import {
  StrategyConfig,
  GridOrder,
  OrderDiff,
  Inventory,
  Order,
  OrderFill,
  Ticker,
} from './types';

export interface IStrategy {
  /**
   * Strategy name
   */
  readonly name: string;

  /**
   * Strategy configuration
   */
  readonly config: StrategyConfig;

  /**
   * Initialize strategy
   */
  initialize(currentPrice: number, inventory: Inventory): Promise<void>;

  /**
   * Calculate target grid orders based on current market state
   */
  calculateGridOrders(
    currentPrice: number,
    inventory: Inventory
  ): GridOrder[];

  /**
   * Determine if grid rebalancing is needed
   */
  shouldRebalance(
    currentPrice: number,
    lastRebalancePrice: number
  ): boolean;

  /**
   * Compare target orders with existing orders and determine diff
   */
  diffOrders(
    targetOrders: GridOrder[],
    existingOrders: Order[]
  ): OrderDiff;

  /**
   * Handle order fill event
   */
  onOrderFill(fill: OrderFill, inventory: Inventory): void;

  /**
   * Handle market data update
   */
  onMarketUpdate(ticker: Ticker): void;

  /**
   * Get current strategy state
   */
  getState(): any;

  /**
   * Reset strategy state
   */
  reset(): void;
}
