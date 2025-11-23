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
  CreateCustomScenarioRequest,
  UpdateCustomScenarioRequest,
  ExportScenarioRequest,
  GetRecommendationsRequest,
} from './types';
import { scenarioManager } from '../../../src/config/ScenarioTemplates';

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

  /**
   * Get all scenario templates
   */
  router.get('/scenarios', (req: Request, res: Response) => {
    try {
      const marketType = req.query.marketType as 'spot' | 'futures' | undefined;
      const scenarios = scenarioManager.getAllScenarios(marketType);

      logger.info({ marketType, count: scenarios.length }, 'Fetched scenarios');
      res.json(success(scenarios));
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch scenarios');
      res.status(500).json(error(err.message));
    }
  });

  /**
   * Get specific scenario by ID
   */
  router.get('/scenarios/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const scenario = scenarioManager.getScenario(id);

      if (!scenario) {
        return res.status(404).json(error(`Scenario ${id} not found`));
      }

      logger.info({ id }, 'Fetched scenario');
      res.json(success(scenario));
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch scenario');
      res.status(500).json(error(err.message));
    }
  });

  /**
   * Create custom scenario
   */
  router.post('/scenarios/custom', (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        baseScenarioId,
        customizations,
      }: CreateCustomScenarioRequest = req.body;

      if (!name || !description || !baseScenarioId) {
        return res.status(400).json(error('Missing required fields'));
      }

      const customScenario = scenarioManager.createCustomScenario(
        name,
        description,
        baseScenarioId,
        customizations
      );

      logger.info({ scenarioId: customScenario.id }, 'Created custom scenario');
      res.json(success(customScenario));
    } catch (err: any) {
      logger.error({ err }, 'Failed to create custom scenario');
      res.status(500).json(error(err.message));
    }
  });

  /**
   * Update custom scenario
   */
  router.put('/scenarios/custom/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: UpdateCustomScenarioRequest = req.body;

      const updated = scenarioManager.updateCustomScenario(id, updates);

      logger.info({ scenarioId: id }, 'Updated custom scenario');
      res.json(success(updated));
    } catch (err: any) {
      logger.error({ err }, 'Failed to update custom scenario');
      res.status(500).json(error(err.message));
    }
  });

  /**
   * Delete custom scenario
   */
  router.delete('/scenarios/custom/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = scenarioManager.deleteCustomScenario(id);

      if (!deleted) {
        return res.status(404).json(error(`Custom scenario ${id} not found`));
      }

      logger.info({ scenarioId: id }, 'Deleted custom scenario');
      res.json(success({ message: 'Scenario deleted successfully' }));
    } catch (err: any) {
      logger.error({ err }, 'Failed to delete custom scenario');
      res.status(500).json(error(err.message));
    }
  });

  /**
   * Export scenario as strategy config
   */
  router.post('/scenarios/export', (req: Request, res: Response) => {
    try {
      const {
        scenarioId,
        symbol,
        baseAsset,
        quoteAsset,
        dryRun = true,
      }: ExportScenarioRequest = req.body;

      if (!scenarioId || !symbol || !baseAsset || !quoteAsset) {
        return res.status(400).json(error('Missing required fields'));
      }

      const config = scenarioManager.exportScenarioConfig(
        scenarioId,
        symbol,
        baseAsset,
        quoteAsset,
        dryRun
      );

      logger.info({ scenarioId, symbol }, 'Exported scenario config');
      res.json(success(config));
    } catch (err: any) {
      logger.error({ err }, 'Failed to export scenario');
      res.status(500).json(error(err.message));
    }
  });

  /**
   * Get scenario recommendations based on user profile
   */
  router.post('/scenarios/recommendations', (req: Request, res: Response) => {
    try {
      const profile: GetRecommendationsRequest = req.body;

      if (!profile.experience || !profile.riskTolerance || !profile.marketType) {
        return res.status(400).json(error('Missing required profile fields'));
      }

      const recommendations = scenarioManager.getRecommendations(profile);

      logger.info({ profile, count: recommendations.length }, 'Generated recommendations');
      res.json(success(recommendations));
    } catch (err: any) {
      logger.error({ err }, 'Failed to generate recommendations');
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
