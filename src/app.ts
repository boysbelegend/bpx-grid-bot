/**
 * BPX Grid Bot - Main Entry Point
 * AMM-Style Spread Trading System for Backpack Exchange
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { BackpackClient } from './exchanges/BackpackClient';
import { MockExchange } from './exchanges/MockExchange';
import { AMMGridStrategy } from './strategies/AMMGridStrategy';
import { TradingEngine } from './engine/TradingEngine';
import { ConfigLoader } from './config/ConfigLoader';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

async function main() {
  try {
    logger.info('='.repeat(60));
    logger.info('BPX Grid Bot - AMM Style Spread Trading System');
    logger.info('='.repeat(60));

    // Get strategy config path from command line or use default
    const strategyConfigPath =
      process.argv[2] || path.join(process.cwd(), 'config', 'strategies', 'sol-amm-grid.json');

    logger.info(`Loading strategy config: ${strategyConfigPath}`);

    // Load configurations
    const globalConfig = ConfigLoader.loadFromEnv();
    const strategyConfig = ConfigLoader.loadStrategy(strategyConfigPath);

    logger.info(`Strategy: ${strategyConfig.name}`);
    logger.info(`Symbol: ${strategyConfig.symbol}`);
    logger.info(`Type: ${strategyConfig.type}`);
    logger.info(`Dry Run: ${strategyConfig.dryRun}`);

    // Validate API credentials
    if (!strategyConfig.dryRun) {
      if (!globalConfig.exchange.apiKey || !globalConfig.exchange.apiSecret) {
        throw new Error(
          'API credentials not found. Please set BACKPACK_API_KEY and BACKPACK_API_SECRET environment variables.'
        );
      }
    }

    // Initialize exchange client
    const client = strategyConfig.dryRun
      ? new MockExchange({
          initialBalances: {
            [strategyConfig.baseAsset]: 10.0,
            [strategyConfig.quoteAsset]: 2000.0,
          },
          simulateLatency: true,
          latencyMs: 100,
        })
      : new BackpackClient({
          apiKey: globalConfig.exchange.apiKey,
          apiSecret: globalConfig.exchange.apiSecret,
        });

    logger.info(`Exchange client: ${strategyConfig.dryRun ? 'Mock (Dry Run)' : 'Backpack (Live)'}`);

    // Initialize strategy
    const strategy = new AMMGridStrategy(strategyConfig);

    // Create trading engine
    const engine = new TradingEngine({
      client,
      strategy,
      strategyConfig,
      updateIntervalMs: 30000, // 30 seconds
      statusIntervalMs: 60000, // 60 seconds
    });

    // Handle graceful shutdown
    let isShuttingDown = false;

    const shutdown = async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info('\n\nShutdown signal received...');

      try {
        await engine.stop(true);
        logger.info('Engine stopped successfully');
        process.exit(0);
      } catch (error) {
        logger.error(error as Error, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start the engine
    logger.info('\nStarting trading engine...\n');
    await engine.start();

    logger.info('Trading engine is running. Press Ctrl+C to stop.\n');

    // Keep process alive
    await new Promise(() => {});

  } catch (error) {
    logger.error(error as Error, 'Fatal error in main');
    process.exit(1);
  }
}

// Run main function
main();
