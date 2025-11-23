/**
 * Backpack Futures Exchange Client
 * Implements IExchangeClient for Backpack futures trading
 */

import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type {
  IExchangeClient,
  Ticker,
  OrderBook,
  Balance,
  Order,
  OrderRequest,
  OrderUpdate,
  Position,
  FuturesPosition,
  FundingRate,
  Collateral,
  LeverageInfo,
  LiquidationRisk,
  FuturesOrderRequest,
} from '../core/interfaces';
import { logger } from '../utils/logger';

interface BackpackFuturesConfig {
  apiKey: string;
  apiSecret: string;
  baseURL?: string;
  wsURL?: string;
  testnet?: boolean;
  window?: number;
}

export class BackpackFuturesClient extends EventEmitter implements IExchangeClient {
  private apiKey: string;
  private apiSecret: crypto.KeyObject;
  private httpClient: AxiosInstance;
  private ws: WebSocket | null = null;
  private window: number;

  private positions: Map<string, FuturesPosition> = new Map();
  private fundingRates: Map<string, FundingRate> = new Map();

  constructor(config: BackpackFuturesConfig) {
    super();

    this.apiKey = config.apiKey;
    this.apiSecret = this.parseApiSecret(config.apiSecret);
    this.window = config.window || 5000;

    const baseURL = config.testnet
      ? 'https://api-testnet.backpack.exchange'
      : config.baseURL || 'https://api.backpack.exchange';

    this.httpClient = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info('BackpackFuturesClient initialized');
  }

  // ============================================================================
  // Authentication & Signing
  // ============================================================================

  private parseApiSecret(secret: string): crypto.KeyObject {
    const rawPrivate = Buffer.from(secret, 'base64');
    const prefixPrivateEd25519 = Buffer.from('302e020100300506032b657004220420', 'hex');
    const der = Buffer.concat([prefixPrivateEd25519 as any, rawPrivate as any]);
    return crypto.createPrivateKey({ key: der as any, format: 'der', type: 'pkcs8' });
  }

  private sign(message: string): string {
    return crypto.sign(null as any, Buffer.from(message) as any, this.apiSecret).toString('base64');
  }

  private getHeaders(instruction?: string, params?: any): Record<string, string> {
    const timestamp = Date.now();
    const window = this.window;

    const message = instruction
      ? `instruction=${instruction}&${this.encodeParams(params)}&timestamp=${timestamp}&window=${window}`
      : `timestamp=${timestamp}&window=${window}`;

    const signature = this.sign(message);

    return {
      'X-Timestamp': timestamp.toString(),
      'X-Window': window.toString(),
      'X-API-Key': this.apiKey,
      'X-Signature': signature,
    };
  }

  private encodeParams(params: any): string {
    if (!params) return '';
    return Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
  }

  // ============================================================================
  // Public Market Data
  // ============================================================================

  async getTicker(symbol: string): Promise<Ticker> {
    try {
      const response = await this.httpClient.get(`/api/v1/ticker`, {
        params: { symbol },
      });

      const data = response.data;
      return {
        symbol,
        lastPrice: parseFloat(data.lastPrice),
        bidPrice: parseFloat(data.bidPrice),
        askPrice: parseFloat(data.askPrice),
        volume24h: parseFloat(data.volume),
        timestamp: Date.now(),
      };
    } catch (error: any) {
      logger.error({ error, symbol }, 'Failed to get ticker');
      throw error;
    }
  }

  async getOrderBook(symbol: string, depth: number = 20): Promise<OrderBook> {
    try {
      const response = await this.httpClient.get(`/api/v1/depth`, {
        params: { symbol, depth },
      });

      const data = response.data;
      return {
        symbol,
        bids: data.bids.map((b: any) => [parseFloat(b[0]), parseFloat(b[1])]),
        asks: data.asks.map((a: any) => [parseFloat(a[0]), parseFloat(a[1])]),
        timestamp: data.timestamp || Date.now(),
      };
    } catch (error: any) {
      logger.error({ error, symbol }, 'Failed to get order book');
      throw error;
    }
  }

  async getFundingRate(symbol: string): Promise<FundingRate> {
    try {
      const response = await this.httpClient.get(`/api/v1/fundingRate`, {
        params: { symbol },
      });

      const data = response.data;
      const fundingRate: FundingRate = {
        symbol,
        fundingRate: parseFloat(data.fundingRate),
        fundingTime: data.fundingTime,
        nextFundingTime: data.nextFundingTime,
        estimatedRate: data.estimatedRate ? parseFloat(data.estimatedRate) : undefined,
      };

      this.fundingRates.set(symbol, fundingRate);
      return fundingRate;
    } catch (error: any) {
      logger.error({ error, symbol }, 'Failed to get funding rate');
      throw error;
    }
  }

  // ============================================================================
  // Account & Positions
  // ============================================================================

  async getBalances(): Promise<Balance[]> {
    try {
      const headers = this.getHeaders();
      const response = await this.httpClient.get('/api/v1/account', { headers });

      const balances: Balance[] = response.data.balances.map((b: any) => ({
        asset: b.asset,
        available: parseFloat(b.available),
        locked: parseFloat(b.locked),
        total: parseFloat(b.available) + parseFloat(b.locked),
      }));

      return balances;
    } catch (error: any) {
      logger.error({ error }, 'Failed to get balances');
      throw error;
    }
  }

  async getCollateral(): Promise<Collateral[]> {
    try {
      const headers = this.getHeaders();
      const response = await this.httpClient.get('/api/v1/capital/collateral', { headers });

      return response.data.map((c: any) => ({
        asset: c.asset,
        total: parseFloat(c.total),
        available: parseFloat(c.available),
        locked: parseFloat(c.locked),
        marginBalance: parseFloat(c.marginBalance),
        unrealizedPnl: parseFloat(c.unrealizedPnl),
      }));
    } catch (error: any) {
      logger.error({ error }, 'Failed to get collateral');
      throw error;
    }
  }

  async getPositions(): Promise<FuturesPosition[]> {
    try {
      const headers = this.getHeaders();
      const response = await this.httpClient.get('/api/v1/position', { headers });

      const positions: FuturesPosition[] = response.data
        .filter((p: any) => parseFloat(p.size) !== 0)
        .map((p: any) => {
          const position: FuturesPosition = {
            symbol: p.symbol,
            side: parseFloat(p.size) > 0 ? 'Long' : 'Short',
            size: Math.abs(parseFloat(p.size)),
            entryPrice: parseFloat(p.entryPrice),
            markPrice: parseFloat(p.markPrice),
            liquidationPrice: parseFloat(p.liquidationPrice),
            unrealizedPnl: parseFloat(p.unrealizedPnl),
            realizedPnl: parseFloat(p.realizedPnl || 0),
            leverage: parseFloat(p.leverage),
            marginMode: p.marginType === 'cross' ? 'cross' : 'isolated',
            margin: parseFloat(p.margin),
            maintenanceMargin: parseFloat(p.maintenanceMargin),
            marginRatio: parseFloat(p.marginRatio),
            adlQuantile: p.adlQuantile ? parseInt(p.adlQuantile) : undefined,
          };

          this.positions.set(p.symbol, position);
          return position;
        });

      return positions;
    } catch (error: any) {
      logger.error({ error }, 'Failed to get positions');
      throw error;
    }
  }

  async getPosition(symbol: string): Promise<FuturesPosition | null> {
    const positions = await this.getPositions();
    return positions.find((p) => p.symbol === symbol) || null;
  }

  // ============================================================================
  // Leverage & Margin Management
  // ============================================================================

  async setLeverage(symbol: string, leverage: number): Promise<void> {
    try {
      const params = { symbol, leverage };
      const headers = this.getHeaders('leverageSet', params);

      await this.httpClient.post('/api/v1/leverage', params, { headers });

      logger.info({ symbol, leverage }, 'Leverage set successfully');
    } catch (error: any) {
      logger.error({ error, symbol, leverage }, 'Failed to set leverage');
      throw error;
    }
  }

  async setMarginMode(symbol: string, marginMode: 'cross' | 'isolated'): Promise<void> {
    try {
      const params = { symbol, marginType: marginMode };
      const headers = this.getHeaders('marginModeSet', params);

      await this.httpClient.post('/api/v1/marginMode', params, { headers });

      logger.info({ symbol, marginMode }, 'Margin mode set successfully');
    } catch (error: any) {
      logger.error({ error, symbol, marginMode }, 'Failed to set margin mode');
      throw error;
    }
  }

  async getLeverageInfo(symbol: string): Promise<LeverageInfo> {
    try {
      const response = await this.httpClient.get(`/api/v1/leverageBrackets`, {
        params: { symbol },
      });

      const data = response.data;
      return {
        symbol,
        maxLeverage: parseFloat(data.maxLeverage),
        currentLeverage: 1, // Will be updated from position
        brackets: data.brackets.map((b: any) => ({
          notional: parseFloat(b.notional),
          maxLeverage: parseFloat(b.maxLeverage),
          maintenanceMarginRate: parseFloat(b.maintenanceMarginRate),
        })),
      };
    } catch (error: any) {
      logger.error({ error, symbol }, 'Failed to get leverage info');
      throw error;
    }
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  async placeOrder(request: FuturesOrderRequest): Promise<Order> {
    try {
      const params: any = {
        symbol: request.symbol,
        side: request.side,
        orderType: request.orderType,
        quantity: request.quantity.toString(),
        timeInForce: request.timeInForce || 'GTC',
      };

      if (request.price) {
        params.price = request.price.toString();
      }

      if (request.clientId) {
        params.clientId = request.clientId.toString();
      }

      if (request.reduceOnly) {
        params.reduceOnly = true;
      }

      if (request.positionSide) {
        params.positionSide = request.positionSide;
      }

      const headers = this.getHeaders('orderExecute', params);
      const response = await this.httpClient.post('/api/v1/order', params, { headers });

      const order: Order = {
        id: response.data.orderId,
        clientId: request.clientId,
        symbol: request.symbol,
        side: request.side,
        orderType: request.orderType,
        price: request.price || 0,
        quantity: request.quantity,
        filledQuantity: 0,
        status: 'New',
        timestamp: Date.now(),
        timeInForce: request.timeInForce,
      };

      logger.info({ order }, 'Order placed successfully');
      return order;
    } catch (error: any) {
      logger.error({ error, request }, 'Failed to place order');
      throw error;
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    try {
      const params = { orderId, symbol };
      const headers = this.getHeaders('orderCancel', params);

      await this.httpClient.delete('/api/v1/order', { headers, data: params });

      logger.info({ orderId, symbol }, 'Order cancelled successfully');
    } catch (error: any) {
      logger.error({ error, orderId, symbol }, 'Failed to cancel order');
      throw error;
    }
  }

  async cancelAllOrders(symbol?: string): Promise<void> {
    try {
      const params = symbol ? { symbol } : {};
      const headers = this.getHeaders('orderCancelAll', params);

      await this.httpClient.delete('/api/v1/orders', { headers, data: params });

      logger.info({ symbol }, 'All orders cancelled successfully');
    } catch (error: any) {
      logger.error({ error, symbol }, 'Failed to cancel all orders');
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    try {
      const params = symbol ? { symbol } : {};
      const headers = this.getHeaders();

      const response = await this.httpClient.get('/api/v1/orders', { headers, params });

      return response.data.map((o: any) => ({
        id: o.orderId,
        clientId: o.clientId,
        symbol: o.symbol,
        side: o.side,
        orderType: o.orderType,
        price: parseFloat(o.price),
        quantity: parseFloat(o.quantity),
        filledQuantity: parseFloat(o.executedQty || 0),
        status: o.status,
        timestamp: o.timestamp,
        timeInForce: o.timeInForce,
      }));
    } catch (error: any) {
      logger.error({ error, symbol }, 'Failed to get open orders');
      throw error;
    }
  }

  // ============================================================================
  // Risk Management - Liquidation Monitoring
  // ============================================================================

  calculateLiquidationRisk(position: FuturesPosition, buffer: number = 5): LiquidationRisk {
    const distancePercent = Math.abs(
      ((position.markPrice - position.liquidationPrice) / position.markPrice) * 100
    );

    const isHighRisk = distancePercent < buffer;

    return {
      symbol: position.symbol,
      currentPrice: position.markPrice,
      liquidationPrice: position.liquidationPrice,
      distancePercent,
      buffer,
      isHighRisk,
    };
  }

  async getLiquidationRisks(buffer: number = 5): Promise<LiquidationRisk[]> {
    const positions = await this.getPositions();
    return positions.map((p) => this.calculateLiquidationRisk(p, buffer));
  }

  // ============================================================================
  // WebSocket Subscriptions
  // ============================================================================

  subscribeToOrderUpdates(callback: (update: OrderUpdate) => void): void {
    // Implement WebSocket subscription for order updates
    logger.info('Subscribed to order updates');
    this.on('orderUpdate', callback);
  }

  subscribeToMarketData(symbol: string, callback: (data: any) => void): void {
    // Implement WebSocket subscription for market data
    logger.info({ symbol }, 'Subscribed to market data');
    this.on(`market:${symbol}`, callback);
  }

  subscribeToPositionUpdates(callback: (position: FuturesPosition) => void): void {
    // Implement WebSocket subscription for position updates
    logger.info('Subscribed to position updates');
    this.on('positionUpdate', callback);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.removeAllListeners();
    logger.info('BackpackFuturesClient disconnected');
  }
}
