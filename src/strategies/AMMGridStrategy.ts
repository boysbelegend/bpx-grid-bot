/**
 * AMM Grid Strategy
 * Mean-reversion grid strategy inspired by AMM liquidity provision
 */

import { BaseStrategy } from './BaseStrategy';
import {
  StrategyConfig,
  GridOrder,
  Inventory,
  GridLevel,
  OrderFill,
} from '../core/interfaces/types';
import {
  calculateGridLevelsWithSpacing,
  calculatePriceRange,
  adjustQuantityForInventory,
  calculateInventorySkew,
  isPriceMovementSignificant,
  roundPrice,
  roundQuantity,
} from '../utils';
import { logger } from '../utils/logger';

export class AMMGridStrategy extends BaseStrategy {
  private priceDecimal: number = 2;
  private quantityDecimal: number = 4;
  private centerPrice: number = 0;
  private gridLevels: GridLevel[] = [];

  constructor(config: StrategyConfig) {
    super(config);

    // Extract decimals from config (or use defaults)
    // In production, these should come from exchange info
    this.priceDecimal = 2;
    this.quantityDecimal = 4;
  }

  async initialize(currentPrice: number, inventory: Inventory): Promise<void> {
    await super.initialize(currentPrice, inventory);

    this.centerPrice = currentPrice;
    this.generateGridLevels(currentPrice);

    logger.info(`[AMM-GRID] Strategy initialized`, {
      centerPrice: this.centerPrice,
      levels: this.gridLevels.length,
      spacing: this.config.grid.spacing.value,
      mode: this.config.grid.mode,
    });
  }

  calculateGridOrders(currentPrice: number, inventory: Inventory): GridOrder[] {
    const gridOrders: GridOrder[] = [];
    const inventorySkew = calculateInventorySkew(inventory);

    logger.debug(`[AMM-GRID] Calculating grid orders`, {
      currentPrice,
      inventorySkew: inventorySkew.toFixed(3),
      gridLevels: this.gridLevels.length,
    });

    for (let i = 0; i < this.gridLevels.length; i++) {
      const level = this.gridLevels[i];

      // Skip levels too close to current price (to avoid immediate fills)
      const priceDistancePct =
        Math.abs((level.price - currentPrice) / currentPrice) * 100;
      if (priceDistancePct < 0.1) {
        continue;
      }

      // Calculate base quantity
      let quantity = this.config.order.quantityPerLevel;

      // Adjust quantity based on inventory skew
      if (this.config.grid.mode === 'mean-reversion') {
        quantity = adjustQuantityForInventory(
          quantity,
          level.side,
          inventorySkew,
          0.5 // Aggressiveness factor
        );
      }

      // Round to proper decimals
      quantity = roundQuantity(quantity, this.quantityDecimal);

      // Skip if quantity is too small
      if (quantity < 0.0001) {
        continue;
      }

      gridOrders.push({
        index: level.index,
        price: level.price,
        side: level.side,
        quantity,
        clientId: this.generateClientId(i),
      });
    }

    logger.info(`[AMM-GRID] Generated ${gridOrders.length} grid orders`, {
      bidCount: gridOrders.filter((o) => o.side === 'Bid').length,
      askCount: gridOrders.filter((o) => o.side === 'Ask').length,
    });

    return gridOrders;
  }

  shouldRebalance(currentPrice: number, lastRebalancePrice: number): boolean {
    if (this.config.grid.mode === 'mean-reversion') {
      // Rebalance if price moved beyond threshold
      return isPriceMovementSignificant(
        currentPrice,
        lastRebalancePrice,
        this.config.risk.rebalanceThreshold
      );
    }

    // For other modes, implement different logic
    return false;
  }

  onOrderFill(fill: OrderFill, inventory: Inventory): void {
    super.onOrderFill(fill, inventory);

    // Log fill with context
    logger.info(`[AMM-GRID] Fill processed`, {
      side: fill.side,
      price: fill.price,
      quantity: fill.quantity,
      fee: fill.fee,
      inventorySkew: calculateInventorySkew(inventory).toFixed(3),
    });

    // In mean-reversion mode, we might want to adjust grid dynamically
    // For now, we rely on the rebalance mechanism
  }

  /**
   * Generate grid levels based on current price
   */
  private generateGridLevels(centerPrice: number): void {
    const { grid } = this.config;

    if (grid.spacing.type === 'percentage') {
      // Use percentage-based spacing
      this.gridLevels = calculateGridLevelsWithSpacing(
        centerPrice,
        grid.levels,
        grid.spacing.value,
        this.priceDecimal
      );
    } else {
      // Use fixed spacing
      const priceRange = calculatePriceRange(
        centerPrice,
        grid.range.lower,
        grid.range.upper
      );

      const step = (priceRange.upper - priceRange.lower) / grid.levels;

      this.gridLevels = [];
      for (let i = 0; i < grid.levels; i++) {
        const price = roundPrice(
          priceRange.lower + i * step,
          this.priceDecimal
        );
        const side = price < centerPrice ? 'Bid' : 'Ask';

        this.gridLevels.push({
          index: i,
          price,
          side,
          quantity: 0, // Will be set by calculateGridOrders
        });
      }
    }

    logger.debug(`[AMM-GRID] Generated ${this.gridLevels.length} grid levels`, {
      lowestPrice: this.gridLevels[0]?.price,
      highestPrice: this.gridLevels[this.gridLevels.length - 1]?.price,
    });
  }

  /**
   * Regenerate grid levels (used during rebalance)
   */
  regenerateGrid(newCenterPrice: number): void {
    this.centerPrice = newCenterPrice;
    this.generateGridLevels(newCenterPrice);

    logger.info(`[AMM-GRID] Grid regenerated at new center price: ${newCenterPrice}`);
  }

  /**
   * Generate client ID for grid level
   */
  private generateClientId(levelIndex: number): number {
    // Use level index as client ID for easy identification
    // In production, might want to add prefix or timestamp
    return levelIndex;
  }

  /**
   * Get strategy-specific state
   */
  getState(): any {
    return {
      ...super.getState(),
      centerPrice: this.centerPrice,
      gridLevels: this.gridLevels.length,
      lowestPrice: this.gridLevels[0]?.price,
      highestPrice: this.gridLevels[this.gridLevels.length - 1]?.price,
    };
  }

  /**
   * Reset strategy
   */
  reset(): void {
    super.reset();
    this.centerPrice = 0;
    this.gridLevels = [];
  }
}
