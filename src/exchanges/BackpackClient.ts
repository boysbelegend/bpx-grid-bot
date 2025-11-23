/**
 * Backpack Exchange Client
 * Implementation of IExchangeClient for Backpack Exchange
 */

import crypto, { KeyObject } from 'crypto';
import axios from 'axios';
import qs from 'qs';
import WebSocket from 'ws';
import { IExchangeClient } from '../core/interfaces/IExchangeClient';
import {
  Ticker,
  OrderBook,
  Balance,
  Position,
  Order,
  OrderRequest,
  OrderUpdate,
  MarketData,
  OrderSide,
  OrderStatus,
} from '../core/interfaces/types';
import { logger, retry, sleep } from '../utils';

const API_ENDPOINT = 'https://api.backpack.exchange';
const WS_ENDPOINT = 'wss://ws.backpack.exchange';
const DEFAULT_X_WINDOW = 5000;
const DEFAULT_WS_RECONNECT_TIMEOUT = 10000;
const BACKOFF_MILLISECONDS = 5000;

interface BackpackConfig {
  apiKey: string;
  apiSecret: string;
  endpoint?: string;
  wsEndpoint?: string;
  xWindow?: number;
  wsReconnectTimeout?: number;
}

export class BackpackClient implements IExchangeClient {
  private apiKey: string;
  private apiSecret: KeyObject;
  private endpoint: string;
  private wsEndpoint: string;
  private xWindow: number;
  private wsReconnectTimeout: number;
  private wss: WebSocket | null = null;
  private isWsConnected: boolean = false;
  private orderUpdateCallbacks: ((update: OrderUpdate) => void)[] = [];
  private marketDataCallbacks: Map<string, (data: MarketData) => void> = new Map();

  constructor(config: BackpackConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = this.toPkcs8der(config.apiSecret);
    this.endpoint = config.endpoint || API_ENDPOINT;
    this.wsEndpoint = config.wsEndpoint || WS_ENDPOINT;
    this.xWindow = config.xWindow || DEFAULT_X_WINDOW;
    this.wsReconnectTimeout = config.wsReconnectTimeout || DEFAULT_WS_RECONNECT_TIMEOUT;
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  async getTicker(symbol: string): Promise<Ticker> {
    const response = await this.publicCall('ticker', { symbol });
    return {
      symbol: response.symbol,
      lastPrice: parseFloat(response.lastPrice),
      bidPrice: parseFloat(response.bidPrice || response.lastPrice),
      askPrice: parseFloat(response.askPrice || response.lastPrice),
      volume24h: parseFloat(response.volume || 0),
      timestamp: Date.now(),
    };
  }

  async getOrderBook(symbol: string, depth: number = 100): Promise<OrderBook> {
    const response = await this.publicCall('depth', { symbol, depth });
    return {
      symbol,
      bids: response.bids.map((b: any) => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: response.asks.map((a: any) => [parseFloat(a[0]), parseFloat(a[1])]),
      timestamp: response.timestamp || Date.now(),
    };
  }

  async getTrades(symbol: string, limit: number = 100): Promise<any[]> {
    return this.publicCall('trades', { symbol, limit });
  }

  // ============================================================================
  // Account Management
  // ============================================================================

  async getBalances(): Promise<Balance[]> {
    const response = await this.privateCall('balanceQuery');
    const balances: Balance[] = [];

    for (const [asset, data] of Object.entries(response)) {
      const balance = data as any;
      balances.push({
        asset,
        available: parseFloat(balance.available || 0),
        locked: parseFloat(balance.locked || 0),
        total: parseFloat(balance.available || 0) + parseFloat(balance.locked || 0),
      });
    }

    return balances;
  }

  async getBalance(asset: string): Promise<Balance | null> {
    const balances = await this.getBalances();
    return balances.find((b) => b.asset === asset) || null;
  }

  async getPositions(symbol?: string): Promise<Position[]> {
    // Backpack spot doesn't have positions
    // For futures, this would query position endpoint
    return [];
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  async placeOrder(request: OrderRequest): Promise<Order> {
    const params: any = {
      symbol: request.symbol,
      side: request.side,
      orderType: request.orderType,
      quantity: request.quantity,
      timeInForce: request.timeInForce || 'GTC',
    };

    if (request.clientId !== undefined) {
      params.clientId = request.clientId;
    }

    if (request.price !== undefined) {
      params.price = request.price;
    }

    const response = await this.privateCall('orderExecute', params);

    return this.normalizeOrder(response);
  }

  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    await this.privateCall('orderCancel', { orderId, symbol });
  }

  async cancelOrderByClientId(clientId: number | string, symbol: string): Promise<void> {
    await this.privateCall('orderCancel', { clientId, symbol });
  }

  async cancelAllOrders(symbol: string): Promise<void> {
    await this.privateCall('orderCancelAll', { symbol });
  }

  async getOpenOrders(symbol: string): Promise<Order[]> {
    const response = await this.privateCall('orderQueryAll', { symbol });
    return response.map((o: any) => this.normalizeOrder(o));
  }

  async getOrder(orderId: string, symbol: string): Promise<Order | null> {
    try {
      const response = await this.privateCall('orderQuery', { orderId, symbol });
      return response ? this.normalizeOrder(response) : null;
    } catch (error: any) {
      if (error.toString().includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getOrderByClientId(clientId: number | string, symbol: string): Promise<Order | null> {
    try {
      const response = await this.privateCall('orderQuery', { clientId, symbol });
      return response ? this.normalizeOrder(response) : null;
    } catch (error: any) {
      if (error.toString().includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // ============================================================================
  // WebSocket Streams
  // ============================================================================

  async subscribeOrderUpdates(callback: (update: OrderUpdate) => void): Promise<void> {
    this.orderUpdateCallbacks.push(callback);

    if (!this.isWsConnected) {
      await this.wsConnect();
      await this.wsSubscribe(['account.orderUpdate']);
    }
  }

  async subscribeMarketData(symbol: string, callback: (data: MarketData) => void): Promise<void> {
    this.marketDataCallbacks.set(symbol, callback);

    if (!this.isWsConnected) {
      await this.wsConnect();
    }

    await this.wsSubscribe([`ticker.${symbol}`]);
  }

  async unsubscribeAll(): Promise<void> {
    this.orderUpdateCallbacks = [];
    this.marketDataCallbacks.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.isWsConnected = false;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async getExchangeInfo(): Promise<any> {
    const markets = await this.publicCall('markets');
    const assets = await this.publicCall('assets');
    return { markets, assets };
  }

  isConnected(): boolean {
    return this.isWsConnected;
  }

  async disconnect(): Promise<void> {
    await this.unsubscribeAll();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async publicCall(instruction: string, params: any = {}): Promise<any> {
    const endpoints: Record<string, { method: string; url: string }> = {
      assets: { method: 'GET', url: `${this.endpoint}/api/v1/assets` },
      markets: { method: 'GET', url: `${this.endpoint}/api/v1/markets` },
      ticker: { method: 'GET', url: `${this.endpoint}/api/v1/ticker` },
      depth: { method: 'GET', url: `${this.endpoint}/api/v1/depth` },
      klines: { method: 'GET', url: `${this.endpoint}/api/v1/klines` },
      trades: { method: 'GET', url: `${this.endpoint}/api/v1/trades` },
      time: { method: 'GET', url: `${this.endpoint}/api/v1/time` },
    };

    const endpoint = endpoints[instruction];
    if (!endpoint) {
      throw new Error(`Unknown public instruction: ${instruction}`);
    }

    return this.rawRequest(endpoint.method, endpoint.url, {}, params);
  }

  private async privateCall(instruction: string, params: any = {}, retries: number = 3): Promise<any> {
    const endpoints: Record<string, { method: string; url: string }> = {
      balanceQuery: { method: 'GET', url: `${this.endpoint}/api/v1/capital` },
      orderQuery: { method: 'GET', url: `${this.endpoint}/api/v1/order` },
      orderExecute: { method: 'POST', url: `${this.endpoint}/api/v1/order` },
      orderCancel: { method: 'DELETE', url: `${this.endpoint}/api/v1/order` },
      orderQueryAll: { method: 'GET', url: `${this.endpoint}/api/v1/orders` },
      orderCancelAll: { method: 'DELETE', url: `${this.endpoint}/api/v1/orders` },
      orderHistoryQueryAll: { method: 'GET', url: `${this.endpoint}/wapi/v1/history/orders` },
      fillHistoryQueryAll: { method: 'GET', url: `${this.endpoint}/wapi/v1/history/fills` },
    };

    const endpoint = endpoints[instruction];
    if (!endpoint) {
      throw new Error(`Unknown private instruction: ${instruction}`);
    }

    try {
      const timestamp = Date.now();
      const signature = this.createSignature(instruction, params, timestamp);
      const headers = {
        'X-Timestamp': timestamp.toString(),
        'X-Window': this.xWindow.toString(),
        'X-API-Key': this.apiKey,
        'X-Signature': signature,
      };

      return await this.rawRequest(endpoint.method, endpoint.url, headers, params);
    } catch (error: any) {
      if (instruction === 'orderQuery' && error.toString().includes('404')) {
        return null;
      }

      if (retries > 0) {
        await sleep(BACKOFF_MILLISECONDS * (Math.random() + 1));
        return this.privateCall(instruction, params, retries - 1);
      }

      throw new Error(
        `API ${instruction} failed: ${error.toString()}${
          error.response?.data ? ': ' + JSON.stringify(error.response.data) : ''
        }`
      );
    }
  }

  private async rawRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    data: Record<string, any>
  ): Promise<any> {
    headers['User-Agent'] = 'BPX-Grid-Bot';
    headers['Content-Type'] = 'application/json; charset=utf-8';

    const config = {
      headers,
      params: method === 'GET' ? data : undefined,
      data: method !== 'GET' ? data : undefined,
    };

    const response = await axios.request({ url, method, ...config });

    const contentType = response.headers['content-type'];
    if (contentType?.includes('application/json')) {
      const parsed = response.data;
      if (parsed.error && Array.isArray(parsed.error) && parsed.error.length) {
        const errors = parsed.error
          .filter((e: string) => e.startsWith('E'))
          .map((e: string) => e.substring(1));
        if (errors.length) {
          throw new Error(`API Error: ${errors.join(', ')}`);
        }
      }
      return parsed;
    }

    return response.data;
  }

  private createSignature(instruction: string, params: any, timestamp: number): string {
    const sortedParams = qs.stringify(params, {
      sort: (a, b) => a.localeCompare(b),
    });

    const message =
      'instruction=' +
      instruction +
      (sortedParams ? '&' + sortedParams : '') +
      '&timestamp=' +
      timestamp +
      '&window=' +
      this.xWindow;

    return crypto.sign(null as any, Buffer.from(message) as any, this.apiSecret).toString('base64');
  }

  private toPkcs8der(rawB64: string): KeyObject {
    const rawPrivate = Buffer.from(rawB64, 'base64').subarray(0, 32);
    const prefixPrivateEd25519 = Buffer.from('302e020100300506032b657004220420', 'hex');
    const der = Buffer.concat([prefixPrivateEd25519 as any, rawPrivate as any]);
    return crypto.createPrivateKey({ key: der as any, format: 'der', type: 'pkcs8' });
  }

  private async wsConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isWsConnected) {
        resolve();
        return;
      }

      this.wss = new WebSocket(this.wsEndpoint);

      this.wss.on('open', () => {
        this.isWsConnected = true;
        logger.info('WebSocket connected to Backpack');
        resolve();
      });

      this.wss.on('close', () => {
        this.isWsConnected = false;
        logger.warn('WebSocket disconnected from Backpack');
        setTimeout(() => {
          this.wsConnect().catch((error) => {
            logger.error(error, 'WebSocket reconnect failed');
          });
        }, this.wsReconnectTimeout);
      });

      this.wss.on('error', (error) => {
        logger.error(error, 'WebSocket error');
        reject(error);
      });

      this.wss.on('message', (data: WebSocket.Data) => {
        this.handleWsMessage(data);
      });
    });
  }

  private async wsSubscribe(streams: string[]): Promise<void> {
    if (!this.isWsConnected || !this.wss) {
      await this.wsConnect();
    }

    const timestamp = Date.now();
    const signature = this.createSignature('subscribe', {}, timestamp);

    const subscribeMessage = {
      method: 'SUBSCRIBE',
      params: streams,
      signature: [this.apiKey, signature, timestamp, this.xWindow],
    };

    this.wss!.send(JSON.stringify(subscribeMessage));
  }

  private handleWsMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      // Order updates
      if (message.stream?.startsWith('account.orderUpdate')) {
        const update = this.normalizeOrderUpdate(message.data);
        this.orderUpdateCallbacks.forEach((callback) => callback(update));
      }

      // Market data
      if (message.stream?.startsWith('ticker.')) {
        const symbol = message.stream.split('.')[1];
        const callback = this.marketDataCallbacks.get(symbol);
        if (callback) {
          callback({
            type: 'ticker',
            symbol,
            data: message.data,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      logger.error(error as Error, 'Failed to parse WebSocket message');
    }
  }

  private normalizeOrder(raw: any): Order {
    return {
      id: raw.id || raw.orderId || '',
      clientId: raw.clientId,
      symbol: raw.symbol,
      side: raw.side as OrderSide,
      orderType: raw.orderType || raw.type,
      price: parseFloat(raw.price || 0),
      quantity: parseFloat(raw.quantity || raw.origQty || 0),
      filledQuantity: parseFloat(raw.executedQuantity || raw.executedQty || 0),
      status: this.normalizeStatus(raw.status),
      timestamp: raw.timestamp || Date.now(),
      timeInForce: raw.timeInForce,
    };
  }

  private normalizeOrderUpdate(raw: any): OrderUpdate {
    const eventMap: Record<string, OrderUpdate['event']> = {
      orderFill: 'orderFill',
      orderAccepted: 'orderAccepted',
      orderCancelled: 'orderCancelled',
      orderExpired: 'orderExpired',
    };

    return {
      event: eventMap[raw.e] || 'orderAccepted',
      order: this.normalizeOrder(raw),
      fill:
        raw.e === 'orderFill'
          ? {
              orderId: raw.i || '',
              clientId: raw.c,
              symbol: raw.s,
              side: raw.S as OrderSide,
              price: parseFloat(raw.p),
              quantity: parseFloat(raw.q),
              fee: parseFloat(raw.n || 0),
              feeAsset: raw.N || 'USDC',
              timestamp: raw.T || Date.now(),
            }
          : undefined,
    };
  }

  private normalizeStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      New: 'New',
      PartiallyFilled: 'PartiallyFilled',
      Filled: 'Filled',
      Cancelled: 'Cancelled',
      Rejected: 'Rejected',
      Expired: 'Expired',
    };
    return statusMap[status] || 'New';
  }
}
