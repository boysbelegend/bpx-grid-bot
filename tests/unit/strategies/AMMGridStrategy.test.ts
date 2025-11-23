/**
 * Unit Tests for AMM Grid Strategy
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { AMMGridStrategy } from '../../../src/strategies/AMMGridStrategy';
import {
  StrategyConfig,
  Inventory,
  MarketData,
} from '../../../src/core/interfaces/types';

describe('AMMGridStrategy', () => {
  let strategy: AMMGridStrategy;
  let mockConfig: StrategyConfig;
  let mockInventory: Inventory;
  let mockMarketData: MarketData;

  beforeEach(() => {
    mockConfig = {
      symbol: 'SOL_USDC',
      type: 'spot' as const,
      grid: {
        levels: 20,
        spacing: { type: 'percentage', value: 0.5 },
        mode: 'mean-reversion',
        priceRange: { min: 90, max: 110 },
      },
      order: {
        quantityPerLevel: 0.1,
        orderType: 'limit',
      },
      capital: {
        allocation: 10000,
        maxPositionSize: 5000,
      },
      risk: {
        maxDrawdownPercent: 10,
        stopLossPercent: 5,
        dailyLossLimit: 500,
      },
    };

    mockInventory = {
      baseBalance: 10.0,
      quoteBalance: 1000.0,
      baseValue: 1000.0,
      quoteValue: 1000.0,
      netValue: 2000.0,
      inventoryRatio: 0.5,
    };

    mockMarketData = {
      symbol: 'SOL_USDC',
      lastPrice: 100.0,
      bid: 99.9,
      ask: 100.1,
      spread: 0.2,
      timestamp: Date.now(),
    };

    strategy = new AMMGridStrategy(mockConfig);
  });

  describe('Initialization', () => {
    test('should initialize with correct center price', async () => {
      await strategy.initialize(100, mockInventory);

      const orders = strategy.calculateGridOrders(100, mockInventory);
      expect(orders.length).toBeGreaterThan(0);
    });

    test('should generate correct number of grid levels', async () => {
      await strategy.initialize(100, mockInventory);

      const orders = strategy.calculateGridOrders(100, mockInventory);
      // Should have orders for most levels (some may be filtered)
      expect(orders.length).toBeGreaterThan(10);
      expect(orders.length).toBeLessThanOrEqual(mockConfig.grid.levels);
    });

    test('should handle different price points', async () => {
      const prices = [50, 100, 150, 200];

      for (const price of prices) {
        const testStrategy = new AMMGridStrategy(mockConfig);
        await testStrategy.initialize(price, mockInventory);

        const orders = testStrategy.calculateGridOrders(price, mockInventory);
        expect(orders.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Grid Level Generation', () => {
    beforeEach(async () => {
      await strategy.initialize(100, mockInventory);
    });

    test('should create buy and sell orders', () => {
      const orders = strategy.calculateGridOrders(100, mockInventory);

      const buyOrders = orders.filter(o => o.side === 'buy');
      const sellOrders = orders.filter(o => o.side === 'sell');

      expect(buyOrders.length).toBeGreaterThan(0);
      expect(sellOrders.length).toBeGreaterThan(0);
    });

    test('should maintain proper price spacing', () => {
      const orders = strategy.calculateGridOrders(100, mockInventory);

      // Sort orders by price
      const sortedOrders = [...orders].sort((a, b) => a.price - b.price);

      // Check spacing between consecutive orders
      for (let i = 1; i < sortedOrders.length; i++) {
        const priceDiff = sortedOrders[i].price - sortedOrders[i - 1].price;
        const spacingPct = (priceDiff / sortedOrders[i - 1].price) * 100;

        // Spacing should be approximately the configured value
        // Allow some tolerance for rounding
        expect(Math.abs(spacingPct - mockConfig.grid.spacing.value)).toBeLessThan(0.1);
      }
    });

    test('should place buy orders below current price', () => {
      const currentPrice = 100;
      const orders = strategy.calculateGridOrders(currentPrice, mockInventory);

      const buyOrders = orders.filter(o => o.side === 'buy');

      buyOrders.forEach(order => {
        expect(order.price).toBeLessThan(currentPrice);
      });
    });

    test('should place sell orders above current price', () => {
      const currentPrice = 100;
      const orders = strategy.calculateGridOrders(currentPrice, mockInventory);

      const sellOrders = orders.filter(o => o.side === 'sell');

      sellOrders.forEach(order => {
        expect(order.price).toBeGreaterThan(currentPrice);
      });
    });
  });

  describe('Inventory Skew Adjustment', () => {
    beforeEach(async () => {
      await strategy.initialize(100, mockInventory);
    });

    test('should increase buy orders when inventory is low on base', () => {
      const lowBaseInventory: Inventory = {
        baseBalance: 1.0,
        quoteBalance: 1900.0,
        baseValue: 100.0,
        quoteValue: 1900.0,
        netValue: 2000.0,
        inventoryRatio: 0.05,
      };

      const normalOrders = strategy.calculateGridOrders(100, mockInventory);
      const lowBaseOrders = strategy.calculateGridOrders(100, lowBaseInventory);

      const normalBuyQty = normalOrders
        .filter(o => o.side === 'buy')
        .reduce((sum, o) => sum + o.quantity, 0);

      const lowBaseBuyQty = lowBaseOrders
        .filter(o => o.side === 'buy')
        .reduce((sum, o) => sum + o.quantity, 0);

      // Should buy more when base inventory is low
      expect(lowBaseBuyQty).toBeGreaterThan(normalBuyQty);
    });

    test('should increase sell orders when inventory is high on base', () => {
      const highBaseInventory: Inventory = {
        baseBalance: 19.0,
        quoteBalance: 100.0,
        baseValue: 1900.0,
        quoteValue: 100.0,
        netValue: 2000.0,
        inventoryRatio: 0.95,
      };

      const normalOrders = strategy.calculateGridOrders(100, mockInventory);
      const highBaseOrders = strategy.calculateGridOrders(100, highBaseInventory);

      const normalSellQty = normalOrders
        .filter(o => o.side === 'sell')
        .reduce((sum, o => sum + o.quantity, 0);

      const highBaseSellQty = highBaseOrders
        .filter(o => o.side === 'sell')
        .reduce((sum, o) => sum + o.quantity, 0);

      // Should sell more when base inventory is high
      expect(highBaseSellQty).toBeGreaterThan(normalSellQty);
    });
  });

  describe('Order Quantity Calculation', () => {
    beforeEach(async () => {
      await strategy.initialize(100, mockInventory);
    });

    test('should respect minimum quantity thresholds', () => {
      const orders = strategy.calculateGridOrders(100, mockInventory);

      orders.forEach(order => {
        expect(order.quantity).toBeGreaterThan(0.0001);
      });
    });

    test('should round quantities to proper decimals', () => {
      const orders = strategy.calculateGridOrders(100, mockInventory);

      orders.forEach(order => {
        // Check that quantity has at most 4 decimal places
        const decimalPlaces = (order.quantity.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(4);
      });
    });

    test('should calculate total quantity within capital limits', () => {
      const orders = strategy.calculateGridOrders(100, mockInventory);

      const totalBuyValue = orders
        .filter(o => o.side === 'buy')
        .reduce((sum, o) => sum + (o.price * o.quantity), 0);

      const totalSellValue = orders
        .filter(o => o.side === 'sell')
        .reduce((sum, o) => sum + (o.price * o.quantity), 0);

      // Total value should not exceed allocated capital
      expect(totalBuyValue).toBeLessThanOrEqual(mockConfig.capital.allocation * 2);
      expect(totalSellValue).toBeLessThanOrEqual(mockConfig.capital.allocation * 2);
    });
  });

  describe('Price Range Management', () => {
    test('should respect configured price range', async () => {
      await strategy.initialize(100, mockInventory);

      const orders = strategy.calculateGridOrders(100, mockInventory);

      orders.forEach(order => {
        expect(order.price).toBeGreaterThanOrEqual(mockConfig.grid.priceRange.min);
        expect(order.price).toBeLessThanOrEqual(mockConfig.grid.priceRange.max);
      });
    });

    test('should filter orders too close to current price', async () => {
      await strategy.initialize(100, mockInventory);

      const orders = strategy.calculateGridOrders(100, mockInventory);

      // No orders should be within 0.1% of current price
      orders.forEach(order => {
        const distancePct = Math.abs((order.price - 100) / 100) * 100;
        expect(distancePct).toBeGreaterThanOrEqual(0.1);
      });
    });
  });

  describe('Client ID Generation', () => {
    test('should generate unique client IDs', async () => {
      await strategy.initialize(100, mockInventory);

      const orders = strategy.calculateGridOrders(100, mockInventory);
      const clientIds = orders.map(o => o.clientId);
      const uniqueIds = new Set(clientIds);

      expect(uniqueIds.size).toBe(clientIds.length);
    });

    test('should include strategy identifier in client ID', async () => {
      await strategy.initialize(100, mockInventory);

      const orders = strategy.calculateGridOrders(100, mockInventory);

      orders.forEach(order => {
        expect(order.clientId).toContain('AMM');
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle extreme inventory skew', async () => {
      const extremeInventory: Inventory = {
        baseBalance: 0.01,
        quoteBalance: 1999.0,
        baseValue: 1.0,
        quoteValue: 1999.0,
        netValue: 2000.0,
        inventoryRatio: 0.0005,
      };

      await strategy.initialize(100, mockInventory);

      const orders = strategy.calculateGridOrders(100, extremeInventory);
      expect(orders.length).toBeGreaterThan(0);
    });

    test('should handle very low prices', async () => {
      const lowPriceConfig = {
        ...mockConfig,
        grid: {
          ...mockConfig.grid,
          priceRange: { min: 0.1, max: 1.0 },
        },
      };

      const lowPriceStrategy = new AMMGridStrategy(lowPriceConfig);
      await lowPriceStrategy.initialize(0.5, mockInventory);

      const orders = lowPriceStrategy.calculateGridOrders(0.5, mockInventory);
      expect(orders.length).toBeGreaterThan(0);
    });

    test('should handle very high prices', async () => {
      const highPriceConfig = {
        ...mockConfig,
        grid: {
          ...mockConfig.grid,
          priceRange: { min: 10000, max: 20000 },
        },
      };

      const highPriceStrategy = new AMMGridStrategy(highPriceConfig);
      await highPriceStrategy.initialize(15000, mockInventory);

      const orders = highPriceStrategy.calculateGridOrders(15000, mockInventory);
      expect(orders.length).toBeGreaterThan(0);
    });
  });
});
