/**
 * Dashboard Backend Server
 * Express + WebSocket server for real-time trading dashboard
 */

import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import logger from './logger';
import { EngineManager } from './engineManager';
import { DashboardWebSocketServer } from './websocketServer';
import { createRouter } from './routes';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const BOT_ROOT_PATH = path.resolve(__dirname, process.env.BOT_ROOT_PATH || '../../');

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
    });
  });
  next();
});

// Initialize engine manager
const engineManager = new EngineManager(BOT_ROOT_PATH);

// API Routes
app.use('/api', createRouter(engineManager));

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'BPX Grid Bot Dashboard API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      state: '/api/state',
      position: '/api/position',
      pnl: '/api/pnl',
      orders: '/api/orders',
      grid: '/api/grid',
      risk: '/api/risk',
      metrics: '/api/metrics',
      market: '/api/market',
      control: {
        start: 'POST /api/control/start',
        stop: 'POST /api/control/stop',
        pause: 'POST /api/control/pause',
        resume: 'POST /api/control/resume',
      },
      strategies: '/api/strategies',
      websocket: 'ws://localhost:' + PORT + '/ws',
    },
  });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: err.message,
    timestamp: Date.now(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    timestamp: Date.now(),
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wsServer = new DashboardWebSocketServer(server, engineManager);

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');

  wsServer.destroy();
  engineManager.destroy();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

// Start server
server.listen(PORT, () => {
  logger.info({
    port: PORT,
    corsOrigin: CORS_ORIGIN,
    botRootPath: BOT_ROOT_PATH,
    env: process.env.NODE_ENV || 'development',
  }, 'Dashboard backend server started');

  logger.info(`API available at http://localhost:${PORT}`);
  logger.info(`WebSocket available at ws://localhost:${PORT}/ws`);
});

export { app, server, engineManager, wsServer };
