/**
 * API Routes
 * REST API endpoints for dashboard
 */

import { Router, Request, Response } from 'express';
import { EngineManager } from './engineManager';
import logger from './logger';
import {
  ApiResponse,
  StartEngineRequest,
  StopEngineRequest,
} from './types';

export function createRouter(engineManager: EngineManager): Router {
  const router = Router();

  /**
   * Health check
   */
  router.get('/health', (req: Request, res: Response) => {
    res.json(success({ status: 'ok', timestamp: Date.now() }));
  });

  /**
   * Get engine status
   */
  router.get('/status', (req: Request, res: Response) => {
    const status = engineManager.getStatus();
    res.json(success(status));
  });

  /**
   * Get full dashboard state
   */
  router.get('/state', (req: Request, res: Response) => {
    const state = engineManager.getCurrentState();
    res.json(success(state));
  });

  /**
   * Get position data
   */
  router.get('/position', (req: Request, res: Response) => {
    const state = engineManager.getCurrentState();
    res.json(success(state.position || {}));
  });

  /**
   * Get PnL data
   */
  router.get('/pnl', (req: Request, res: Response) => {
    const state = engineManager.getCurrentState();
    res.json(success(state.pnl || {}));
  });

  /**
   * Get orders
   */
  router.get('/orders', (req: Request, res: Response) => {
    const state = engineManager.getCurrentState();
    res.json(success(state.orders || []));
  });

  /**
   * Get grid data
   */
  router.get('/grid', (req: Request, res: Response) => {
    const state = engineManager.getCurrentState();
    res.json(success(state.grid || {}));
  });

  /**
   * Get risk data
   */
  router.get('/risk', (req: Request, res: Response) => {
    const state = engineManager.getCurrentState();
    res.json(success(state.risk || {}));
  });

  /**
   * Get trading metrics
   */
  router.get('/metrics', (req: Request, res: Response) => {
    const state = engineManager.getCurrentState();
    res.json(success(state.metrics || {}));
  });

  /**
   * Get market data
   */
  router.get('/market', (req: Request, res: Response) => {
    const state = engineManager.getCurrentState();
    res.json(success(state.market || {}));
  });

  /**
   * Start trading engine
   */
  router.post('/control/start', async (req: Request, res: Response) => {
    try {
      const { strategyPath, dryRun = true }: StartEngineRequest = req.body;

      if (!strategyPath) {
        return res.status(400).json(error('Strategy path is required'));
      }

      await engineManager.start(strategyPath, dryRun);

      logger.info({ strategyPath, dryRun }, 'Engine started via API');
      res.json(success({ message: 'Engine started successfully' }));
    } catch (err: any) {
      logger.error({ err }, 'Failed to start engine');
      res.status(500).json(error(err.message));
    }
  });

  /**
   * Stop trading engine
   */
  router.post('/control/stop', async (req: Request, res: Response) => {
    try {
      const { force = false }: StopEngineRequest = req.body;

      await engineManager.stop(force);

      logger.info({ force }, 'Engine stopped via API');
      res.json(success({ message: 'Engine stopped successfully' }));
    } catch (err: any) {
      logger.error({ err }, 'Failed to stop engine');
      res.status(500).json(error(err.message));
    }
  });

  /**
   * Pause trading engine
   */
  router.post('/control/pause', async (req: Request, res: Response) => {
    try {
      await engineManager.pause();

      logger.info('Engine paused via API');
      res.json(success({ message: 'Engine paused successfully' }));
    } catch (err: any) {
      logger.error({ err }, 'Failed to pause engine');
      res.status(500).json(error(err.message));
    }
  });

  /**
   * Resume trading engine
   */
  router.post('/control/resume', async (req: Request, res: Response) => {
    try {
      await engineManager.resume();

      logger.info('Engine resumed via API');
      res.json(success({ message: 'Engine resumed successfully' }));
    } catch (err: any) {
      logger.error({ err }, 'Failed to resume engine');
      res.status(500).json(error(err.message));
    }
  });

  /**
   * List available strategies
   */
  router.get('/strategies', async (req: Request, res: Response) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const strategiesDir = path.join(
        engineManager['botRootPath'],
        'config/strategies'
      );

      const files = await fs.readdir(strategiesDir);
      const strategies = files
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({
          name: f.replace('.json', ''),
          path: `config/strategies/${f}`,
        }));

      res.json(success(strategies));
    } catch (err: any) {
      logger.error({ err }, 'Failed to list strategies');
      res.status(500).json(error(err.message));
    }
  });

  return router;
}

// Helper functions
function success<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

function error(message: string): ApiResponse {
  return {
    success: false,
    error: message,
    timestamp: Date.now(),
  };
}
