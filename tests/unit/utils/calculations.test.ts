/**
 * Unit Tests for Calculation Utilities
 */

import { describe, test, expect } from '@jest/globals';
import {
  calculateGridLevels,
  calculateGridLevelsWithSpacing,
  calculatePriceRange,
  calculateInventorySkew,
  adjustQuantityForInventory,
  calculateUnrealizedPnL,
  calculateAveragePrice,
  calculateLiquidationPrice,
  roundPrice,
  roundQuantity,
  percentChange,
} from '../../../src/utils/calculations';
import { Inventory } from '../../../src/core/interfaces';

describe('Calculation Utilities', () => {
  describe('PnL Calculations', () => {
    describe('calculateUnrealizedPnL', () => {
      test('should calculate long position profit correctly', () => {
        const pnl = calculateUnrealizedPnL('Long', 100, 110, 10);
        expect(pnl).toBe(100); // (110 - 100) * 10 = 100
      });

      test('should calculate long position loss correctly', () => {
        const pnl = calculateUnrealizedPnL('Long', 100, 90, 10);
        expect(pnl).toBe(-100); // (90 - 100) * 10 = -100
      });

      test('should calculate short position profit correctly', () => {
        const pnl = calculateUnrealizedPnL('Short', 100, 90, 10);
        expect(pnl).toBe(100); // (100 - 90) * 10 = 100
      });

      test('should calculate short position loss correctly', () => {
        const pnl = calculateUnrealizedPnL('Short', 100, 110, 10);
        expect(pnl).toBe(-100); // (100 - 110) * 10 = -100
      });

      test('should return zero when price unchanged', () => {
        const pnl = calculateUnrealizedPnL('Long', 100, 100, 10);
        expect(pnl).toBe(0);
      });

      test('should handle fractional quantities', () => {
        const pnl = calculateUnrealizedPnL('Long', 100, 105, 0.5);
        expect(pnl).toBe(2.5); // (105 - 100) * 0.5 = 2.5
      });

      test('should work with Bid/Ask sides', () => {
        const bidPnl = calculateUnrealizedPnL('Bid', 100, 110, 10);
        const askPnl = calculateUnrealizedPnL('Ask', 100, 90, 10);

        expect(bidPnl).toBe(100); // Bid acts like Long
        expect(askPnl).toBe(100); // Ask acts like Short
      });
    });

    describe('calculateAveragePrice', () => {
      test('should calculate average entry price correctly', () => {
        const fills = [
          { price: 100, quantity: 1 },
          { price: 110, quantity: 1 },
        ];

        const avgPrice = calculateAveragePrice(fills);
        expect(avgPrice).toBe(105); // (100 + 110) / 2
      });

      test('should weight by quantity', () => {
        const fills = [
          { price: 100, quantity: 1 },
          { price: 110, quantity: 3 },
        ];

        const avgPrice = calculateAveragePrice(fills);
        expect(avgPrice).toBe(107.5); // (100*1 + 110*3) / (1+3)
      });

      test('should handle empty fills array', () => {
        const avgPrice = calculateAveragePrice([]);
        expect(avgPrice).toBe(0);
      });

      test('should handle single fill', () => {
        const fills = [{ price: 100, quantity: 5 }];
        const avgPrice = calculateAveragePrice(fills);
        expect(avgPrice).toBe(100);
      });

      test('should handle very different prices and quantities', () => {
        const fills = [
          { price: 50, quantity: 10 },
          { price: 150, quantity: 2 },
        ];

        const avgPrice = calculateAveragePrice(fills);
        expect(avgPrice).toBeCloseTo(66.67, 2); // (50*10 + 150*2) / 12
      });
    });

    describe('calculateLiquidationPrice', () => {
      test('should calculate long liquidation price correctly', () => {
        const liqPrice = calculateLiquidationPrice(100, 10, 'Long');

        // With 10x leverage, liquidation at ~90% of entry
        expect(liqPrice).toBeCloseTo(90.5, 1);
      });

      test('should calculate short liquidation price correctly', () => {
        const liqPrice = calculateLiquidationPrice(100, 10, 'Short');

        // With 10x leverage, liquidation at ~110% of entry
        expect(liqPrice).toBeCloseTo(109.5, 1);
      });

      test('should handle different leverage values', () => {
        const liq2x = calculateLiquidationPrice(100, 2, 'Long');
        const liq5x = calculateLiquidationPrice(100, 5, 'Long');
        const liq20x = calculateLiquidationPrice(100, 20, 'Long');

        // Higher leverage = closer to entry price
        expect(liq2x).toBeLessThan(liq5x);
        expect(liq5x).toBeLessThan(liq20x);
      });

      test('should respect maintenance margin rate', () => {
        const defaultLiq = calculateLiquidationPrice(100, 10, 'Long');
        const customLiq = calculateLiquidationPrice(100, 10, 'Long', 0.01);

        expect(customLiq).not.toBe(defaultLiq);
      });
    });
  });

  describe('Grid Calculations', () => {
    describe('calculateGridLevelsWithSpacing', () => {
      test('should create correct number of levels', () => {
        const levels = calculateGridLevelsWithSpacing(100, 20, 0.5);
        expect(levels.length).toBe(20);
      });

      test('should distribute levels around center price', () => {
        const levels = calculateGridLevelsWithSpacing(100, 20, 0.5);

        const bidLevels = levels.filter(l => l.side === 'Bid');
        const askLevels = levels.filter(l => l.side === 'Ask');

        expect(bidLevels.length).toBe(10);
        expect(askLevels.length).toBe(10);
      });

      test('should maintain correct spacing percentage', () => {
        const spacingPct = 1.0;
        const levels = calculateGridLevelsWithSpacing(100, 10, spacingPct);

        for (let i = 1; i < levels.length; i++) {
          const priceDiff = Math.abs(levels[i].price - levels[i - 1].price);
          const avgPrice = (levels[i].price + levels[i - 1].price) / 2;
          const actualSpacing = (priceDiff / avgPrice) * 100;

          expect(actualSpacing).toBeCloseTo(spacingPct, 1);
        }
      });

      test('should round prices to specified decimals', () => {
        const levels = calculateGridLevelsWithSpacing(100.12345, 10, 0.5, 2);

        levels.forEach(level => {
          const decimals = (level.price.toString().split('.')[1] || '').length;
          expect(decimals).toBeLessThanOrEqual(2);
        });
      });

      test('should handle different price points', () => {
        const low = calculateGridLevelsWithSpacing(1, 10, 0.5);
        const mid = calculateGridLevelsWithSpacing(100, 10, 0.5);
        const high = calculateGridLevelsWithSpacing(10000, 10, 0.5);

        expect(low.length).toBe(10);
        expect(mid.length).toBe(10);
        expect(high.length).toBe(10);
      });
    });

    describe('calculatePriceRange', () => {
      test('should respect explicit lower and upper bounds', () => {
        const range = calculatePriceRange(100, 90, 110);

        expect(range.lower).toBe(90);
        expect(range.upper).toBe(110);
        expect(range.mid).toBe(100);
      });

      test('should auto-calculate range with default percentage', () => {
        const range = calculatePriceRange(100, 'auto', 'auto');

        expect(range.lower).toBe(80); // 100 * (1 - 20/100)
        expect(range.upper).toBe(120); // 100 * (1 + 20/100)
        expect(range.mid).toBe(100);
      });

      test('should auto-calculate range with custom percentage', () => {
        const range = calculatePriceRange(100, 'auto', 'auto', 10);

        expect(range.lower).toBe(90);
        expect(range.upper).toBe(110);
        expect(range.mid).toBe(100);
      });

      test('should handle mixed auto and explicit bounds', () => {
        const range1 = calculatePriceRange(100, 95, 'auto', 10);
        const range2 = calculatePriceRange(100, 'auto', 105, 10);

        expect(range1.lower).toBe(95);
        expect(range1.upper).toBe(110);

        expect(range2.lower).toBe(90);
        expect(range2.upper).toBe(105);
      });
    });
  });

  describe('Inventory Calculations', () => {
    describe('calculateInventorySkew', () => {
      test('should return 0 for balanced inventory', () => {
        const inventory: Inventory = {
          baseAsset: { total: 1000, symbol: 'SOL' },
          quoteAsset: { total: 1000, symbol: 'USDC' },
          netValue: 2000,
        };

        const skew = calculateInventorySkew(inventory);
        expect(skew).toBe(0);
      });

      test('should return positive value when too much base asset', () => {
        const inventory: Inventory = {
          baseAsset: { total: 1500, symbol: 'SOL' },
          quoteAsset: { total: 500, symbol: 'USDC' },
          netValue: 2000,
        };

        const skew = calculateInventorySkew(inventory);
        expect(skew).toBeGreaterThan(0);
        expect(skew).toBeLessThanOrEqual(1);
      });

      test('should return negative value when too much quote asset', () => {
        const inventory: Inventory = {
          baseAsset: { total: 500, symbol: 'SOL' },
          quoteAsset: { total: 1500, symbol: 'USDC' },
          netValue: 2000,
        };

        const skew = calculateInventorySkew(inventory);
        expect(skew).toBeLessThan(0);
        expect(skew).toBeGreaterThanOrEqual(-1);
      });

      test('should handle extreme skew', () => {
        const inventory: Inventory = {
          baseAsset: { total: 2000, symbol: 'SOL' },
          quoteAsset: { total: 0, symbol: 'USDC' },
          netValue: 2000,
        };

        const skew = calculateInventorySkew(inventory);
        expect(skew).toBe(1); // Clamped to 1
      });

      test('should handle zero net value', () => {
        const inventory: Inventory = {
          baseAsset: { total: 0, symbol: 'SOL' },
          quoteAsset: { total: 0, symbol: 'USDC' },
          netValue: 0,
        };

        const skew = calculateInventorySkew(inventory);
        expect(skew).toBe(0);
      });
    });

    describe('adjustQuantityForInventory', () => {
      test('should increase ask quantity when inventory is positive', () => {
        const baseQty = 1.0;
        const skew = 0.5; // Too much base asset

        const adjusted = adjustQuantityForInventory(baseQty, 'Ask', skew, 0.5);

        expect(adjusted).toBeGreaterThan(baseQty);
      });

      test('should increase bid quantity when inventory is negative', () => {
        const baseQty = 1.0;
        const skew = -0.5; // Too much quote asset

        const adjusted = adjustQuantityForInventory(baseQty, 'Bid', skew, 0.5);

        expect(adjusted).toBeGreaterThan(baseQty);
      });

      test('should not adjust when inventory favors opposite side', () => {
        const baseQty = 1.0;
        const skew = 0.5; // Too much base asset

        const adjusted = adjustQuantityForInventory(baseQty, 'Bid', skew, 0.5);

        expect(adjusted).toBe(baseQty);
      });

      test('should respect aggressiveness parameter', () => {
        const baseQty = 1.0;
        const skew = 0.5;

        const conservative = adjustQuantityForInventory(baseQty, 'Ask', skew, 0.3);
        const aggressive = adjustQuantityForInventory(baseQty, 'Ask', skew, 0.8);

        expect(aggressive).toBeGreaterThan(conservative);
      });

      test('should handle zero skew', () => {
        const baseQty = 1.0;
        const adjusted = adjustQuantityForInventory(baseQty, 'Ask', 0, 0.5);

        expect(adjusted).toBe(baseQty);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('roundPrice', () => {
      test('should round to specified decimals', () => {
        expect(roundPrice(100.12345, 2)).toBe(100.12);
        expect(roundPrice(100.12345, 4)).toBe(100.1235);
        expect(roundPrice(100.12345, 0)).toBe(100);
      });

      test('should handle rounding up', () => {
        expect(roundPrice(100.999, 2)).toBe(101.00);
        expect(roundPrice(100.555, 2)).toBe(100.56);
      });
    });

    describe('roundQuantity', () => {
      test('should round to specified decimals', () => {
        expect(roundQuantity(1.23456, 2)).toBe(1.23);
        expect(roundQuantity(1.23456, 4)).toBe(1.2346);
        expect(roundQuantity(1.23456, 0)).toBe(1);
      });
    });

    describe('percentChange', () => {
      test('should calculate positive percentage change', () => {
        expect(percentChange(100, 110)).toBe(10);
        expect(percentChange(100, 150)).toBe(50);
      });

      test('should calculate negative percentage change', () => {
        expect(percentChange(100, 90)).toBe(-10);
        expect(percentChange(100, 50)).toBe(-50);
      });

      test('should handle zero from value', () => {
        expect(percentChange(0, 100)).toBe(0);
      });

      test('should return 0 when values are equal', () => {
        expect(percentChange(100, 100)).toBe(0);
      });
    });
  });
});
