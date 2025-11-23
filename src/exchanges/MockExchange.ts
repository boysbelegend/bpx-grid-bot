/**
 * Mock Exchange Client
 * For dry-run / paper trading mode
 */

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
  OrderStatus,
} from '../core/interfaces/types';
import { logger, generateClientId } from '../utils';

interface MockConfig {
  initialBalances: Record<string, number>;
  simulateLatency?: boolean;
  latencyMs?: number;
}

export class MockExchange implements IExchangeClient {
  private balances: Map<string, Balance> = new Map();
  private orders: Map<string, Order> = new Map();
  private positions: Map<string, Position> = new Map();
  private currentPrices: Map<string, number> = new Map();
  private orderIdCounter: number = 1;
  private simulateLatency: boolean;
  private latencyMs: number;
  private orderUpdateCallbacks: ((update: OrderUpdate) => void)[] = [];

  constructor(config: MockConfig) {
    this.simulateLatency = config.simulateLatency || false;
    this.latencyMs = config.latencyMs || 100;

    // Initialize balances
    for (const [asset, amount] of Object.entries(config.initialBalances)) {
      this.balances.set(asset, {
        asset,
        available: amount,
        locked: 0,
        total: amount,
      });
    }

    logger.info('[MOCK] Mock exchange initialized with balances:', config.initialBalances);
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  async getTicker(symbol: string): Promise<Ticker> {
    await this.delay();

    // Return mock price or last set price
    const price = this.currentPrices.get(symbol) || 100;

    return {
      symbol,
      lastPrice: price,
      bidPrice: price * 0.9995,
      askPrice: price * 1.0005,
      volume24h: 1000000,
      timestamp: Date.now(),
    };
  }

  async getOrderBook(symbol: string, depth: number = 10): Promise<OrderBook> {
    await this.delay();

    const price = this.currentPrices.get(symbol) || 100;
    const bids: [number, number][] = [];
    const asks: [number, number][] = [];

    for (let i = 0; i < depth; i++) {
      bids.push([price * (1 - 0.001 * (i + 1)), Math.random() * 10]);
      asks.push([price * (1 + 0.001 * (i + 1)), Math.random() * 10]);
    }

    return {
      symbol,
      bids,
      asks,
      timestamp: Date.now(),
    };
  }

  async getTrades(symbol: string, limit: number = 100): Promise<any[]> {
    await this.delay();
    return [];
  }

  // ============================================================================
  // Account Management
  // ============================================================================

  async getBalances(): Promise<Balance[]> {
    await this.delay();
    return Array.from(this.balances.values());
  }

  async getBalance(asset: string): Promise<Balance | null> {
    await this.delay();
    return this.balances.get(asset) || null;
  }

  async getPositions(symbol?: string): Promise<Position[]> {
    await this.delay();
    const allPositions = Array.from(this.positions.values());
    return symbol ? allPositions.filter((p) => p.symbol === symbol) : allPositions;
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  async placeOrder(request: OrderRequest): Promise<Order> {
    await this.delay();

    const orderId = `mock-${this.orderIdCounter++}`;
    const order: Order = {
      id: orderId,
      clientId: request.clientId || generateClientId('mock-'),
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

    // Lock funds for the order
    if (request.side === 'Bid') {
      // Buy order - lock quote asset
      const [base, quote] = request.symbol.split('_');
      const requiredAmount = (request.price || 0) * request.quantity;
      const balance = this.balances.get(quote);

      if (balance && balance.available >= requiredAmount) {
        balance.available -= requiredAmount;
        balance.locked += requiredAmount;
      } else {
        throw new Error(`[MOCK] Insufficient ${quote} balance for buy order`);
      }
    } else {
      // Sell order - lock base asset
      const [base] = request.symbol.split('_');
      const balance = this.balances.get(base);

      if (balance && balance.available >= request.quantity) {
        balance.available -= request.quantity;
        balance.locked += request.quantity;
      } else {
        throw new Error(`[MOCK] Insufficient ${base} balance for sell order`);
      }
    }

    this.orders.set(orderId, order);

    logger.info(`[MOCK] Order placed: ${order.side} ${order.quantity} ${order.symbol} @ ${order.price}`);

    // Emit order accepted event
    this.emitOrderUpdate({
      event: 'orderAccepted',
      order,
    });

    // Simulate immediate fill in mock mode (optional)
    // Can be enhanced to simulate partial fills, delays, etc.
    // For now, we'll leave orders open and let simulation logic handle fills

    return order;
  }

  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    await this.delay();

    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`[MOCK] Order ${orderId} not found`);
    }

    // Release locked funds
    this.releaseFunds(order);

    order.status = 'Cancelled';
    this.orders.delete(orderId);

    logger.info(`[MOCK] Order cancelled: ${orderId}`);

    this.emitOrderUpdate({
      event: 'orderCancelled',
      order,
    });
  }

  async cancelOrderByClientId(clientId: number | string, symbol: string): Promise<void> {
    await this.delay();

    const order = Array.from(this.orders.values()).find(
      (o) => o.clientId === clientId && o.symbol === symbol
    );

    if (order) {
      await this.cancelOrder(order.id, symbol);
    }
  }

  async cancelAllOrders(symbol: string): Promise<void> {
    await this.delay();

    const ordersToCancel = Array.from(this.orders.values()).filter((o) => o.symbol === symbol);

    for (const order of ordersToCancel) {
      await this.cancelOrder(order.id, symbol);
    }

    logger.info(`[MOCK] Cancelled ${ordersToCancel.length} orders for ${symbol}`);
  }

  async getOpenOrders(symbol: string): Promise<Order[]> {
    await this.delay();
    return Array.from(this.orders.values()).filter((o) => o.symbol === symbol);
  }

  async getOrder(orderId: string, symbol: string): Promise<Order | null> {
    await this.delay();
    return this.orders.get(orderId) || null;
  }

  async getOrderByClientId(clientId: number | string, symbol: string): Promise<Order | null> {
    await this.delay();
    return (
      Array.from(this.orders.values()).find((o) => o.clientId === clientId && o.symbol === symbol) ||
      null
    );
  }

  // ============================================================================
  // WebSocket Streams
  // ============================================================================

  async subscribeOrderUpdates(callback: (update: OrderUpdate) => void): Promise<void> {
    this.orderUpdateCallbacks.push(callback);
    logger.info('[MOCK] Subscribed to order updates');
  }

  async subscribeMarketData(symbol: string, callback: (data: MarketData) => void): Promise<void> {
    logger.info(`[MOCK] Subscribed to market data for ${symbol}`);
    // In mock mode, we can simulate price updates if needed
  }

  async unsubscribeAll(): Promise<void> {
    this.orderUpdateCallbacks = [];
    logger.info('[MOCK] Unsubscribed from all streams');
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async getExchangeInfo(): Promise<any> {
    return {
      markets: [],
      assets: [],
    };
  }

  isConnected(): boolean {
    return true;
  }

  async disconnect(): Promise<void> {
    await this.unsubscribeAll();
  }

  // ============================================================================
  // Mock-Specific Methods
  // ============================================================================

  /**
   * Set current price for a symbol (for simulation)
   */
  setPrice(symbol: string, price: number): void {
    this.currentPrices.set(symbol, price);
  }

  /**
   * Simulate order fill
   */
  async simulateFill(orderId: string, quantity?: number): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`[MOCK] Order ${orderId} not found`);
    }

    const fillQuantity = quantity || order.quantity - order.filledQuantity;
    const fillPrice = order.price;

    // Update order
    order.filledQuantity += fillQuantity;
    if (order.filledQuantity >= order.quantity) {
      order.status = 'Filled';
      this.orders.delete(orderId);
    } else {
      order.status = 'PartiallyFilled';
    }

    // Update balances
    const [base, quote] = order.symbol.split('_');

    if (order.side === 'Bid') {
      // Buy order filled - receive base asset
      const cost = fillPrice * fillQuantity;
      const quoteBalance = this.balances.get(quote)!;
      quoteBalance.locked -= cost;
      quoteBalance.total -= cost;

      const baseBalance = this.balances.get(base);
      if (baseBalance) {
        baseBalance.available += fillQuantity;
        baseBalance.total += fillQuantity;
      } else {
        this.balances.set(base, {
          asset: base,
          available: fillQuantity,
          locked: 0,
          total: fillQuantity,
        });
      }
    } else {
      // Sell order filled - receive quote asset
      const proceeds = fillPrice * fillQuantity;
      const baseBalance = this.balances.get(base)!;
      baseBalance.locked -= fillQuantity;
      baseBalance.total -= fillQuantity;

      const quoteBalance = this.balances.get(quote);
      if (quoteBalance) {
        quoteBalance.available += proceeds;
        quoteBalance.total += proceeds;
      } else {
        this.balances.set(quote, {
          asset: quote,
          available: proceeds,
          locked: 0,
          total: proceeds,
        });
      }
    }

    logger.info(`[MOCK] Order filled: ${order.side} ${fillQuantity} ${order.symbol} @ ${fillPrice}`);

    // Emit fill event
    this.emitOrderUpdate({
      event: 'orderFill',
      order,
      fill: {
        orderId: order.id,
        clientId: order.clientId,
        symbol: order.symbol,
        side: order.side,
        price: fillPrice,
        quantity: fillQuantity,
        fee: fillPrice * fillQuantity * 0.001, // 0.1% fee
        feeAsset: quote,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Get current balances (for debugging)
   */
  getBalanceSnapshot(): Record<string, Balance> {
    const snapshot: Record<string, Balance> = {};
    this.balances.forEach((balance, asset) => {
      snapshot[asset] = { ...balance };
    });
    return snapshot;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async delay(): Promise<void> {
    if (this.simulateLatency) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
  }

  private releaseFunds(order: Order): void {
    const [base, quote] = order.symbol.split('_');
    const unfilledQuantity = order.quantity - order.filledQuantity;

    if (order.side === 'Bid') {
      const lockedAmount = order.price * unfilledQuantity;
      const balance = this.balances.get(quote);
      if (balance) {
        balance.locked -= lockedAmount;
        balance.available += lockedAmount;
      }
    } else {
      const balance = this.balances.get(base);
      if (balance) {
        balance.locked -= unfilledQuantity;
        balance.available += unfilledQuantity;
      }
    }
  }

  private emitOrderUpdate(update: OrderUpdate): void {
    this.orderUpdateCallbacks.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        logger.error(error as Error, 'Error in order update callback');
      }
    });
  }
}
