/**
 * Calculation Utilities
 * Price, grid, and mathematical calculations
 */

import { GridLevel, GridConfig, SpacingType, PriceRange, Inventory } from '../core/interfaces';

/**
 * Calculate grid levels based on configuration
 */
export function calculateGridLevels(
  centerPrice: number,
  config: GridConfig,
  priceDecimal: number = 2
): GridLevel[] {
  const levels: GridLevel[] = [];
  const { levels: levelCount, spacing, range } = config;

  // Determine price range
  const priceRange = calculatePriceRange(centerPrice, range.lower, range.upper);

  // Calculate step size
  const step = (priceRange.upper - priceRange.lower) / levelCount;

  for (let i = 0; i < levelCount; i++) {
    const price = parseFloat((priceRange.lower + i * step).toFixed(priceDecimal));
    const side = price < centerPrice ? 'Bid' : 'Ask';

    levels.push({
      index: i,
      price,
      side,
      quantity: 0, // Will be set by strategy
    });
  }

  return levels;
}

/**
 * Calculate grid levels with percentage spacing
 */
export function calculateGridLevelsWithSpacing(
  centerPrice: number,
  levelCount: number,
  spacingPercent: number,
  priceDecimal: number = 2
): GridLevel[] {
  const levels: GridLevel[] = [];
  const halfLevels = Math.floor(levelCount / 2);

  // Create bid levels (below center price)
  for (let i = halfLevels; i > 0; i--) {
    const price = parseFloat(
      (centerPrice * (1 - (spacingPercent / 100) * i)).toFixed(priceDecimal)
    );
    levels.push({
      index: halfLevels - i,
      price,
      side: 'Bid',
      quantity: 0,
    });
  }

  // Create ask levels (above center price)
  for (let i = 1; i <= halfLevels; i++) {
    const price = parseFloat(
      (centerPrice * (1 + (spacingPercent / 100) * i)).toFixed(priceDecimal)
    );
    levels.push({
      index: halfLevels + i - 1,
      price,
      side: 'Ask',
      quantity: 0,
    });
  }

  return levels.sort((a, b) => a.price - b.price);
}

/**
 * Calculate price range from configuration
 */
export function calculatePriceRange(
  currentPrice: number,
  lower: number | 'auto',
  upper: number | 'auto',
  autoRangePercent: number = 20
): PriceRange {
  const lowerPrice =
    lower === 'auto' ? currentPrice * (1 - autoRangePercent / 100) : lower;
  const upperPrice =
    upper === 'auto' ? currentPrice * (1 + autoRangePercent / 100) : upper;

  return {
    lower: lowerPrice,
    upper: upperPrice,
    mid: (lowerPrice + upperPrice) / 2,
  };
}

/**
 * Calculate optimal grid quantity based on available balance
 */
export function calculateGridQuantity(
  totalBalance: number,
  levels: number,
  price: number,
  side: 'Bid' | 'Ask'
): number {
  // For bid orders, we need quote asset (USDC)
  // For ask orders, we need base asset (SOL)
  const quantityPerLevel = totalBalance / levels;

  if (side === 'Bid') {
    // Convert quote asset to base asset quantity
    return quantityPerLevel / price;
  } else {
    // Directly use base asset quantity
    return quantityPerLevel;
  }
}

/**
 * Calculate inventory skew
 * Returns value between -1 (oversold) and +1 (overbought)
 */
export function calculateInventorySkew(inventory: Inventory): number {
  const { baseAsset, quoteAsset, netValue } = inventory;

  if (netValue === 0) return 0;

  // Calculate ideal 50/50 split
  const idealBaseValue = netValue / 2;
  const actualBaseValue = baseAsset.total;

  // Normalize to -1 to +1 range
  const skew = (actualBaseValue - idealBaseValue) / idealBaseValue;
  return Math.max(-1, Math.min(1, skew));
}

/**
 * Adjust grid quantity based on inventory skew
 * When inventory is skewed, adjust quantities to rebalance
 */
export function adjustQuantityForInventory(
  baseQuantity: number,
  side: 'Bid' | 'Ask',
  inventorySkew: number,
  aggressiveness: number = 0.5
): number {
  // If skew is positive (too much base asset), increase ask quantities
  // If skew is negative (too much quote asset), increase bid quantities

  if (side === 'Ask' && inventorySkew > 0) {
    // Increase sell quantity to reduce base asset
    return baseQuantity * (1 + Math.abs(inventorySkew) * aggressiveness);
  } else if (side === 'Bid' && inventorySkew < 0) {
    // Increase buy quantity to reduce quote asset
    return baseQuantity * (1 + Math.abs(inventorySkew) * aggressiveness);
  }

  return baseQuantity;
}

/**
 * Calculate minimum profitable spread considering fees
 */
export function calculateMinSpread(
  makerFeeRate: number,
  takerFeeRate: number,
  safetyMargin: number = 1.5
): number {
  // Minimum spread = (maker fee + taker fee) * safety margin
  return (makerFeeRate + takerFeeRate) * safetyMargin;
}

/**
 * Check if price movement exceeds threshold
 */
export function isPriceMovementSignificant(
  currentPrice: number,
  referencePrice: number,
  thresholdPercent: number
): boolean {
  const percentChange = Math.abs((currentPrice - referencePrice) / referencePrice) * 100;
  return percentChange >= thresholdPercent;
}

/**
 * Calculate average entry price from fills
 */
export function calculateAveragePrice(fills: { price: number; quantity: number }[]): number {
  if (fills.length === 0) return 0;

  const totalValue = fills.reduce((sum, fill) => sum + fill.price * fill.quantity, 0);
  const totalQuantity = fills.reduce((sum, fill) => sum + fill.quantity, 0);

  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
}

/**
 * Calculate unrealized PnL for a position
 */
export function calculateUnrealizedPnL(
  side: 'Long' | 'Short' | 'Bid' | 'Ask',
  entryPrice: number,
  currentPrice: number,
  quantity: number
): number {
  if (side === 'Long' || side === 'Bid') {
    return (currentPrice - entryPrice) * quantity;
  } else {
    return (entryPrice - currentPrice) * quantity;
  }
}

/**
 * Round price to specified decimal places
 */
export function roundPrice(price: number, decimals: number): number {
  return parseFloat(price.toFixed(decimals));
}

/**
 * Round quantity to specified decimal places
 */
export function roundQuantity(quantity: number, decimals: number): number {
  return parseFloat(quantity.toFixed(decimals));
}

/**
 * Calculate percentage change
 */
export function percentChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

/**
 * Calculate liquidation price for futures position
 */
export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  side: 'Long' | 'Short',
  maintenanceMarginRate: number = 0.005
): number {
  if (side === 'Long') {
    return entryPrice * (1 - 1 / leverage + maintenanceMarginRate);
  } else {
    return entryPrice * (1 + 1 / leverage - maintenanceMarginRate);
  }
}

/**
 * Validate if price is within safe range
 */
export function isWithinSafeRange(
  price: number,
  minPrice: number,
  maxPrice: number
): boolean {
  return price >= minPrice && price <= maxPrice;
}
