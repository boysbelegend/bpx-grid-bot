/**
 * Config Validator Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConfigValidator } from '../../../src/validation/ConfigValidator';
import { StrategyConfig } from '../../../src/core/interfaces/types';

describe('ConfigValidator', () => {
  let validator: ConfigValidator;
  let baseConfig: StrategyConfig;

  beforeEach(() => {
    validator = new ConfigValidator();
    baseConfig = {
      symbol: 'SOL_USDC',
      baseAsset: 'SOL',
      quoteAsset: 'USDC',
      type: 'spot',
      grid: {
        gridLevels: 10,
        gridSpacing: 0.02,
        lowerPrice: 100,
        upperPrice: 120,
        quantityPerGrid: 0.1,
      },
      risk: {
        maxDrawdownPercent: 20,
        maxDailyLossPercent: 5,
        maxOpenOrders: 20,
      },
      order: {
        orderType: 'Limit',
        timeInForce: 'GTC',
      },
      rebalancing: {
        enabled: true,
        priceChangePercent: 0.05,
      },
      dryRun: false,
    };
  });

  describe('Symbol Validation', () => {
    it('should accept valid symbol format', () => {
      const result = validator.validate(baseConfig);
      expect(result.valid).toBe(true);
    });

    it('should reject missing symbol', () => {
      const config = { ...baseConfig, symbol: '' };
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Symbol is required'))).toBe(true);
    });

    it('should reject invalid symbol format', () => {
      const config = { ...baseConfig, symbol: 'SOLUSDC' };
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('BASE_QUOTE'))).toBe(true);
    });
  });

  describe('Grid Levels Validation', () => {
    it('should accept valid grid levels', () => {
      const config = { ...baseConfig };
      config.grid!.gridLevels = 20;
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
    });

    it('should reject grid levels < 2', () => {
      const config = { ...baseConfig };
      config.grid!.gridLevels = 1;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least 2'))).toBe(true);
    });

    it('should reject grid levels > 100', () => {
      const config = { ...baseConfig };
      config.grid!.gridLevels = 150;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot exceed 100'))).toBe(true);
    });

    it('should warn when grid levels > 50', () => {
      const config = { ...baseConfig };
      config.grid!.gridLevels = 60;
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('high API usage'))).toBe(true);
    });
  });

  describe('Grid Spacing Validation', () => {
    it('should accept valid grid spacing', () => {
      const config = { ...baseConfig };
      config.grid!.gridSpacing = 0.01;
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
    });

    it('should reject grid spacing <= 0', () => {
      const config = { ...baseConfig };
      config.grid!.gridSpacing = 0;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
    });

    it('should reject very small grid spacing', () => {
      const config = { ...baseConfig };
      config.grid!.gridSpacing = 0.0005;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('too small'))).toBe(true);
    });

    it('should warn on very wide grid spacing', () => {
      const config = { ...baseConfig };
      config.grid!.gridSpacing = 0.6;
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('very wide'))).toBe(true);
    });
  });

  describe('Price Range Validation', () => {
    it('should accept valid price range', () => {
      const result = validator.validate(baseConfig);
      expect(result.valid).toBe(true);
    });

    it('should reject lowerPrice >= upperPrice', () => {
      const config = { ...baseConfig };
      config.grid!.lowerPrice = 150;
      config.grid!.upperPrice = 120;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('less than upperPrice'))).toBe(true);
    });

    it('should reject negative prices', () => {
      const config = { ...baseConfig };
      config.grid!.lowerPrice = -10;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('greater than 0'))).toBe(true);
    });

    it('should reject too narrow price range', () => {
      const config = { ...baseConfig };
      config.grid!.lowerPrice = 100;
      config.grid!.upperPrice = 102; // Only 2% range
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('too narrow'))).toBe(true);
    });

    it('should warn on very wide price range', () => {
      const config = { ...baseConfig };
      config.grid!.lowerPrice = 10;
      config.grid!.upperPrice = 100; // 900% range
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('very wide'))).toBe(true);
    });
  });

  describe('Quantity Validation', () => {
    it('should accept valid quantity', () => {
      const result = validator.validate(baseConfig);
      expect(result.valid).toBe(true);
    });

    it('should reject zero or negative quantity', () => {
      const config = { ...baseConfig };
      config.grid!.quantityPerGrid = 0;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
    });

    it('should warn on very small order value', () => {
      const config = { ...baseConfig };
      config.grid!.quantityPerGrid = 0.01;
      config.grid!.lowerPrice = 100;
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('not be profitable'))).toBe(true);
    });
  });

  describe('Risk Management Validation', () => {
    it('should accept valid risk parameters', () => {
      const result = validator.validate(baseConfig);
      expect(result.valid).toBe(true);
    });

    it('should reject maxDrawdownPercent > 100', () => {
      const config = { ...baseConfig };
      config.risk!.maxDrawdownPercent = 150;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot exceed 100'))).toBe(true);
    });

    it('should warn on high drawdown limit', () => {
      const config = { ...baseConfig };
      config.risk!.maxDrawdownPercent = 60;
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('very risky'))).toBe(true);
    });

    it('should warn on high daily loss limit', () => {
      const config = { ...baseConfig };
      config.risk!.maxDailyLossPercent = 25;
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('very aggressive'))).toBe(true);
    });
  });

  describe('Futures Validation', () => {
    beforeEach(() => {
      baseConfig.type = 'futures';
      baseConfig.futures = {
        maxLeverage: 5,
        marginMode: 'cross',
      };
    });

    it('should require leverage for futures', () => {
      const config = { ...baseConfig };
      delete config.futures;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('maxLeverage is required'))).toBe(true);
    });

    it('should accept safe leverage', () => {
      const result = validator.validate(baseConfig);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it('should warn on moderate leverage', () => {
      const config = { ...baseConfig };
      config.futures!.maxLeverage = 15;
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('risky'))).toBe(true);
    });

    it('should warn on high leverage', () => {
      const config = { ...baseConfig };
      config.futures!.maxLeverage = 25;
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('extremely risky'))).toBe(true);
    });

    it('should reject leverage > 125', () => {
      const config = { ...baseConfig };
      config.futures!.maxLeverage = 150;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot exceed 125'))).toBe(true);
    });
  });

  describe('Order Size Validation', () => {
    it('should reject order value below exchange minimum', () => {
      const config = { ...baseConfig };
      config.grid!.quantityPerGrid = 0.01;
      config.grid!.lowerPrice = 1;
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('below exchange minimum'))).toBe(true);
    });

    it('should warn on small order value', () => {
      const config = { ...baseConfig };
      config.grid!.quantityPerGrid = 0.08;
      config.grid!.lowerPrice = 100;
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('may be below exchange minimum'))).toBe(true);
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw on valid config', () => {
      expect(() => validator.validateOrThrow(baseConfig)).not.toThrow();
    });

    it('should throw on invalid config', () => {
      const config = { ...baseConfig, symbol: '' };
      expect(() => validator.validateOrThrow(config)).toThrow('validation failed');
    });
  });
});
