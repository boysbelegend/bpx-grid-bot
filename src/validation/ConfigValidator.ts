/**
 * Configuration Validator
 * Validates strategy and system configuration parameters for safety
 */

import { StrategyConfig } from '../core/interfaces/types';
import { logger } from '../utils';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRule {
  field: string;
  validate: (value: any, config: any) => { valid: boolean; error?: string; warning?: string };
}

/**
 * Configuration Validator
 * Ensures all parameters are within safe and reasonable bounds
 */
export class ConfigValidator {
  private rules: ValidationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Symbol validation
    this.addRule({
      field: 'symbol',
      validate: (value) => {
        if (!value || typeof value !== 'string') {
          return { valid: false, error: 'Symbol is required and must be a string' };
        }
        if (!value.includes('_') && !value.includes('-')) {
          return { valid: false, error: 'Symbol must be in format BASE_QUOTE or BASE-QUOTE' };
        }
        return { valid: true };
      },
    });

    // Grid configuration validation
    this.addRule({
      field: 'grid.gridLevels',
      validate: (value) => {
        if (!value || typeof value !== 'number') {
          return { valid: false, error: 'gridLevels is required and must be a number' };
        }
        if (value < 2) {
          return { valid: false, error: 'gridLevels must be at least 2' };
        }
        if (value > 100) {
          return { valid: false, error: 'gridLevels cannot exceed 100 (too many orders)' };
        }
        if (value > 50) {
          return { valid: true, warning: 'gridLevels > 50 may result in high API usage' };
        }
        return { valid: true };
      },
    });

    this.addRule({
      field: 'grid.gridSpacing',
      validate: (value) => {
        if (value === undefined || value === null || typeof value !== 'number') {
          return { valid: false, error: 'gridSpacing is required and must be a number' };
        }
        if (value <= 0) {
          return { valid: false, error: 'gridSpacing must be greater than 0' };
        }
        if (value < 0.001) {
          return { valid: false, error: 'gridSpacing too small (< 0.1%), may cause excessive trading' };
        }
        if (value > 0.5) {
          return { valid: true, warning: 'gridSpacing > 50% is very wide, may miss opportunities' };
        }
        return { valid: true };
      },
    });

    this.addRule({
      field: 'grid.lowerPrice',
      validate: (value, config) => {
        if (value === undefined || value === null || typeof value !== 'number') {
          return { valid: false, error: 'lowerPrice is required and must be a number' };
        }
        if (value <= 0) {
          return { valid: false, error: 'lowerPrice must be greater than 0' };
        }
        if (config.grid?.upperPrice && value >= config.grid.upperPrice) {
          return { valid: false, error: 'lowerPrice must be less than upperPrice' };
        }
        return { valid: true };
      },
    });

    this.addRule({
      field: 'grid.upperPrice',
      validate: (value, config) => {
        if (value === undefined || value === null || typeof value !== 'number') {
          return { valid: false, error: 'upperPrice is required and must be a number' };
        }
        if (value <= 0) {
          return { valid: false, error: 'upperPrice must be greater than 0' };
        }
        if (config.grid?.lowerPrice && value <= config.grid.lowerPrice) {
          return { valid: false, error: 'upperPrice must be greater than lowerPrice' };
        }
        // Check price range
        if (config.grid?.lowerPrice) {
          const priceRange = (value - config.grid.lowerPrice) / config.grid.lowerPrice;
          if (priceRange < 0.05) {
            return { valid: false, error: 'Price range too narrow (< 5%)' };
          }
          if (priceRange > 5) {
            return { valid: true, warning: 'Price range very wide (> 500%), ensure sufficient capital' };
          }
        }
        return { valid: true };
      },
    });

    // Order size validation
    this.addRule({
      field: 'grid.quantityPerGrid',
      validate: (value, config) => {
        if (value === undefined || value === null || typeof value !== 'number') {
          return { valid: false, error: 'quantityPerGrid is required and must be a number' };
        }
        if (value <= 0) {
          return { valid: false, error: 'quantityPerGrid must be greater than 0' };
        }

        // Estimate total capital required
        if (config.grid?.gridLevels && config.grid?.lowerPrice && config.grid?.upperPrice) {
          const avgPrice = (config.grid.lowerPrice + config.grid.upperPrice) / 2;
          const totalValue = value * config.grid.gridLevels * avgPrice;

          if (totalValue < 10) {
            return { valid: true, warning: 'Total grid value < $10, may not be profitable due to fees' };
          }
          if (totalValue > 1000000) {
            return { valid: true, warning: 'Total grid value > $1M, ensure you have sufficient capital' };
          }
        }

        return { valid: true };
      },
    });

    // Risk management validation
    this.addRule({
      field: 'risk.maxDrawdownPercent',
      validate: (value) => {
        if (value === undefined || value === null) {
          return { valid: true }; // Optional field
        }
        if (typeof value !== 'number') {
          return { valid: false, error: 'maxDrawdownPercent must be a number' };
        }
        if (value <= 0) {
          return { valid: false, error: 'maxDrawdownPercent must be greater than 0' };
        }
        if (value > 100) {
          return { valid: false, error: 'maxDrawdownPercent cannot exceed 100%' };
        }
        if (value > 50) {
          return { valid: true, warning: 'maxDrawdownPercent > 50% is very risky' };
        }
        return { valid: true };
      },
    });

    this.addRule({
      field: 'risk.maxDailyLossPercent',
      validate: (value) => {
        if (value === undefined || value === null) {
          return { valid: true }; // Optional field
        }
        if (typeof value !== 'number') {
          return { valid: false, error: 'maxDailyLossPercent must be a number' };
        }
        if (value <= 0) {
          return { valid: false, error: 'maxDailyLossPercent must be greater than 0' };
        }
        if (value > 100) {
          return { valid: false, error: 'maxDailyLossPercent cannot exceed 100%' };
        }
        if (value > 20) {
          return { valid: true, warning: 'maxDailyLossPercent > 20% is very aggressive' };
        }
        return { valid: true };
      },
    });

    // Futures-specific validation
    this.addRule({
      field: 'futures.maxLeverage',
      validate: (value, config) => {
        if (config.type !== 'futures') {
          return { valid: true }; // Only validate for futures
        }
        if (value === undefined || value === null) {
          return { valid: false, error: 'maxLeverage is required for futures trading' };
        }
        if (typeof value !== 'number') {
          return { valid: false, error: 'maxLeverage must be a number' };
        }
        if (value < 1) {
          return { valid: false, error: 'maxLeverage must be at least 1' };
        }
        if (value > 125) {
          return { valid: false, error: 'maxLeverage cannot exceed 125 (exchange limit)' };
        }
        if (value > 20) {
          return { valid: true, warning: 'Leverage > 20x is extremely risky, high liquidation risk' };
        }
        if (value > 10) {
          return { valid: true, warning: 'Leverage > 10x is risky, monitor liquidation price closely' };
        }
        return { valid: true };
      },
    });

    // Rebalancing validation
    this.addRule({
      field: 'rebalancing.priceChangePercent',
      validate: (value) => {
        if (value === undefined || value === null) {
          return { valid: true }; // Optional field
        }
        if (typeof value !== 'number') {
          return { valid: false, error: 'priceChangePercent must be a number' };
        }
        if (value <= 0) {
          return { valid: false, error: 'priceChangePercent must be greater than 0' };
        }
        if (value > 1) {
          return { valid: true, warning: 'priceChangePercent > 100% may cause infrequent rebalancing' };
        }
        if (value < 0.01) {
          return { valid: true, warning: 'priceChangePercent < 1% may cause very frequent rebalancing' };
        }
        return { valid: true };
      },
    });
  }

  /**
   * Add a custom validation rule
   */
  public addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Validate configuration
   */
  public validate(config: StrategyConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of this.rules) {
      const value = this.getNestedValue(config, rule.field);
      const result = rule.validate(value, config);

      if (!result.valid && result.error) {
        errors.push(`[${rule.field}] ${result.error}`);
      }
      if (result.warning) {
        warnings.push(`[${rule.field}] ${result.warning}`);
      }
    }

    // Cross-field validations
    this.validateCapitalRequirements(config, errors, warnings);
    this.validateOrderSizeVsMinimums(config, errors, warnings);

    const valid = errors.length === 0;

    // Log results
    if (!valid) {
      logger.error('Configuration validation failed:', { errors, warnings });
    } else if (warnings.length > 0) {
      logger.warn('Configuration validation passed with warnings:', { warnings });
    } else {
      logger.info('Configuration validation passed');
    }

    return { valid, errors, warnings };
  }

  /**
   * Validate capital requirements
   */
  private validateCapitalRequirements(
    config: StrategyConfig,
    errors: string[],
    warnings: string[]
  ): void {
    if (!config.grid?.gridLevels || !config.grid?.quantityPerGrid) {
      return;
    }

    const levels = config.grid.gridLevels;
    const qty = config.grid.quantityPerGrid;
    const lower = config.grid.lowerPrice || 0;
    const upper = config.grid.upperPrice || 0;

    if (lower > 0 && upper > 0) {
      // Estimate capital needed
      const avgPrice = (lower + upper) / 2;
      const baseNeeded = (levels / 2) * qty; // Half the orders are buys
      const quoteNeeded = baseNeeded * avgPrice;

      const totalUSD = quoteNeeded + (baseNeeded * avgPrice);

      if (totalUSD > 100000) {
        warnings.push(
          `[capital] Estimated capital needed: $${totalUSD.toFixed(0)} - ensure you have sufficient funds`
        );
      }

      if (config.type === 'futures' && config.futures?.maxLeverage) {
        const marginNeeded = totalUSD / config.futures.maxLeverage;
        if (marginNeeded > 50000) {
          warnings.push(
            `[capital] Estimated margin needed: $${marginNeeded.toFixed(0)} (with ${config.futures.maxLeverage}x leverage)`
          );
        }
      }
    }
  }

  /**
   * Validate order size vs exchange minimums
   */
  private validateOrderSizeVsMinimums(
    config: StrategyConfig,
    errors: string[],
    warnings: string[]
  ): void {
    if (!config.grid?.quantityPerGrid || !config.grid?.lowerPrice) {
      return;
    }

    const minOrderValue = config.grid.quantityPerGrid * config.grid.lowerPrice;

    // Most exchanges have minimum order value around $5-$10
    if (minOrderValue < 5) {
      errors.push(
        '[orderSize] Order value too small (< $5), likely below exchange minimum'
      );
    } else if (minOrderValue < 10) {
      warnings.push(
        '[orderSize] Order value is small (< $10), may be below exchange minimum'
      );
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Validate and throw if invalid
   */
  public validateOrThrow(config: StrategyConfig): void {
    const result = this.validate(config);
    if (!result.valid) {
      throw new Error(
        `Configuration validation failed:\n${result.errors.join('\n')}`
      );
    }
  }
}

/**
 * Singleton instance
 */
export const configValidator = new ConfigValidator();
