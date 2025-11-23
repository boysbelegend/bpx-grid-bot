/**
 * WebSocket Server
 * Real-time updates to dashboard clients
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import logger from './logger';
import { EngineManager } from './engineManager';
import { WSMessage, WSUpdateMessage } from './types';

export class DashboardWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(
    server: Server,
    private engineManager: EngineManager
  ) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
    this.setupEngineListeners();
    this.startPingInterval();
  }

  /**
   * Setup WebSocket server
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New WebSocket client connected');
      this.clients.add(ws);

      // Send initial state
      this.sendInitialState(ws);

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error: any) {
          logger.error({ error }, 'Failed to parse WebSocket message');
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error({ error }, 'WebSocket client error');
        this.clients.delete(ws);
      });

      // Handle pong
      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });
    });

    logger.info('WebSocket server initialized');
  }

  /**
   * Setup listeners for engine events
   */
  private setupEngineListeners(): void {
    // Listen for engine status changes
    this.engineManager.on('statusChange', (status) => {
      this.broadcast({
        type: 'update',
        channel: 'status',
        data: { engine: status },
        timestamp: Date.now(),
      });
    });

    // Listen for engine updates
    this.engineManager.on('update', (update) => {
      this.broadcast({
        type: 'update',
        channel: 'all',
        data: update,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Send initial state to new client
   */
  private sendInitialState(ws: WebSocket): void {
    const state = this.engineManager.getCurrentState();
    this.send(ws, {
      type: 'update',
      channel: 'all',
      data: state,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle incoming client messages
   */
  private handleClientMessage(ws: WebSocket, message: WSMessage): void {
    logger.debug({ message }, 'Received WebSocket message');

    switch (message.type) {
      case 'subscribe':
        // Client wants to subscribe to specific channel
        logger.info({ channel: message.channel }, 'Client subscribed');
        this.sendInitialState(ws);
        break;

      case 'ping':
        // Respond to ping
        this.send(ws, {
          type: 'pong',
          timestamp: Date.now(),
        });
        break;

      default:
        logger.warn({ type: message.type }, 'Unknown message type');
    }
  }

  /**
   * Send message to specific client
   */
  private send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error to specific client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, {
      type: 'error',
      data: { error },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Start ping interval to keep connections alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if ((ws as any).isAlive === false) {
          logger.info('Terminating inactive client');
          this.clients.delete(ws);
          return ws.terminate();
        }

        (ws as any).isAlive = false;
        ws.ping();
      });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.clients.forEach((client) => {
      client.close();
    });

    this.wss.close();
    logger.info('WebSocket server closed');
  }
}
