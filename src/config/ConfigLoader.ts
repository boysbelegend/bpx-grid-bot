/**
 * Configuration Loader
 * Loads and validates strategy and global configurations
 */

import * as fs from 'fs';
import * as path from 'path';
import { StrategyConfig, GlobalConfig } from '../core/interfaces/types';
import { logger } from '../utils';

export class ConfigLoader {
  /**
   * Load global configuration
   */
  static loadGlobal(configPath?: string): GlobalConfig {
    const defaultPath = path.join(process.cwd(), 'config', 'global.json');
    const filePath = configPath || defaultPath;

    if (!fs.existsSync(filePath)) {
      throw new Error(`Global config file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content) as GlobalConfig;

    logger.info(`[CONFIG] Loaded global config from ${filePath}`);

    return config;
  }

  /**
   * Load strategy configuration
   */
  static loadStrategy(configPath: string): StrategyConfig {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Strategy config file not found: ${configPath}`);
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as StrategyConfig;

    // Validate config
    this.validateStrategyConfig(config);

    logger.info(`[CONFIG] Loaded strategy config: ${config.name}`);

    return config;
  }

  /**
   * Validate strategy configuration
   */
  private static validateStrategyConfig(config: StrategyConfig): void {
    const errors: string[] = [];

    if (!config.name) errors.push('name is required');
    if (!config.symbol) errors.push('symbol is required');
    if (!config.baseAsset) errors.push('baseAsset is required');
    if (!config.quoteAsset) errors.push('quoteAsset is required');
    if (!config.type) errors.push('type is required');

    if (!config.grid) {
      errors.push('grid configuration is required');
    } else {
      if (config.grid.levels <= 0) errors.push('grid.levels must be positive');
      if (config.grid.spacing.value <= 0) errors.push('grid.spacing.value must be positive');
    }

    if (!config.order) {
      errors.push('order configuration is required');
    } else {
      if (config.order.quantityPerLevel <= 0) {
        errors.push('order.quantityPerLevel must be positive');
      }
    }

    if (!config.risk) {
      errors.push('risk configuration is required');
    } else {
      if (config.risk.maxPositionSize <= 0) {
        errors.push('risk.maxPositionSize must be positive');
      }
      if (config.risk.maxDailyLoss <= 0) {
        errors.push('risk.maxDailyLoss must be positive');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid strategy config:\n${errors.join('\n')}`);
    }
  }

  /**
   * Load environment variables into global config
   */
  static loadFromEnv(): GlobalConfig {
    return {
      exchange: {
        name: process.env.EXCHANGE_NAME || 'backpack',
        apiKey: process.env.BACKPACK_API_KEY || '',
        apiSecret: process.env.BACKPACK_API_SECRET || '',
        testnet: process.env.TESTNET === 'true',
      },
      telegram: process.env.TELEGRAM_BOT_API_TOKEN
        ? {
            botToken: process.env.TELEGRAM_BOT_API_TOKEN,
            chatId: process.env.TELEGRAM_TARGET_CHAT_ID || '',
            notifyInterval: parseInt(process.env.TELEGRAM_NOTIFY_INTERVAL || '3600000'),
          }
        : undefined,
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        file: process.env.LOG_FILE,
      },
    };
  }

  /**
   * List available strategy configs
   */
  static listStrategies(strategiesDir?: string): string[] {
    const dir = strategiesDir || path.join(process.cwd(), 'config', 'strategies');

    if (!fs.existsSync(dir)) {
      return [];
    }

    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => path.join(dir, file));
  }
}
