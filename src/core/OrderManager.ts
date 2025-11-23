/**
 * Order Manager
 * Handles order creation, cancellation, and synchronization
 */

import { IExchangeClient } from './interfaces/IExchangeClient';
import {
  Order,
  OrderRequest,
  GridOrder,
  OrderDiff,
  OrderUpdate,
} from './interfaces/types';
import { logger, retry, sleep } from '../utils';

export class OrderManager {
  private client: IExchangeClient;
  private activeOrders: Map<string, Order> = new Map();
  private orderCallbacks: ((update: OrderUpdate) => void)[] = [];
  private symbol: string;

  constructor(client: IExchangeClient, symbol: string) {
    this.client = client;
    this.symbol = symbol;
  }

  /**
   * Initialize order manager and sync with exchange
   */
  async initialize(): Promise<void> {
    await this.syncOrders();

    // Subscribe to order updates
    await this.client.subscribeOrderUpdates((update) => {
      this.handleOrderUpdate(update);
    });

    logger.info(`[ORDER] Order manager initialized for ${this.symbol}`);
  }

  /**
   * Sync active orders from exchange
   */
  async syncOrders(): Promise<void> {
    try {
      const orders = await this.client.getOpenOrders(this.symbol);
      this.activeOrders.clear();

      for (const order of orders) {
        this.activeOrders.set(order.id, order);
      }

      logger.info(`[ORDER] Synced ${orders.length} active orders for ${this.symbol}`);
    } catch (error) {
      logger.error(error as Error, 'Failed to sync orders');
      throw error;
    }
  }

  /**
   * Place a new order
   */
  async placeOrder(request: OrderRequest): Promise<Order> {
    try {
      const order = await retry(
        () => this.client.placeOrder(request),
        3,
        1000
      );

      this.activeOrders.set(order.id, order);

      logger.info(`[ORDER] Placed: ${order.side} ${order.quantity} @ ${order.price}`, {
        orderId: order.id,
        clientId: order.clientId,
      });

      return order;
    } catch (error) {
      logger.error(error as Error, `Failed to place order: ${request.side} ${request.quantity} @ ${request.price}`);
      throw error;
    }
  }

  /**
   * Place multiple orders in batch
   */
  async placeOrders(requests: OrderRequest[]): Promise<Order[]> {
    const orders: Order[] = [];

    for (const request of requests) {
      try {
        const order = await this.placeOrder(request);
        orders.push(order);
        // Small delay to avoid rate limiting
        await sleep(100);
      } catch (error) {
        logger.error(error as Error, 'Failed to place order in batch');
        // Continue with other orders
      }
    }

    return orders;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<void> {
    try {
      await retry(
        () => this.client.cancelOrder(orderId, this.symbol),
        3,
        1000
      );

      this.activeOrders.delete(orderId);

      logger.info(`[ORDER] Cancelled: ${orderId}`);
    } catch (error) {
      logger.error(error as Error, `Failed to cancel order: ${orderId}`);
      throw error;
    }
  }

  /**
   * Cancel order by client ID
   */
  async cancelOrderByClientId(clientId: number | string): Promise<void> {
    try {
      await retry(
        () => this.client.cancelOrderByClientId(clientId, this.symbol),
        3,
        1000
      );

      // Find and remove from active orders
      for (const [orderId, order] of this.activeOrders.entries()) {
        if (order.clientId === clientId) {
          this.activeOrders.delete(orderId);
          break;
        }
      }

      logger.info(`[ORDER] Cancelled by clientId: ${clientId}`);
    } catch (error) {
      logger.error(error as Error, `Failed to cancel order by clientId: ${clientId}`);
      throw error;
    }
  }

  /**
   * Cancel multiple orders
   */
  async cancelOrders(orderIds: string[]): Promise<void> {
    for (const orderId of orderIds) {
      try {
        await this.cancelOrder(orderId);
        await sleep(100); // Rate limiting
      } catch (error) {
        logger.error(error as Error, `Failed to cancel order ${orderId}`);
        // Continue with other orders
      }
    }
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(): Promise<void> {
    try {
      await this.client.cancelAllOrders(this.symbol);
      this.activeOrders.clear();

      logger.info(`[ORDER] Cancelled all orders for ${this.symbol}`);
    } catch (error) {
      logger.error(error as Error, 'Failed to cancel all orders');
      throw error;
    }
  }

  /**
   * Execute order diff (create new orders, cancel old orders)
   */
  async executeDiff(diff: OrderDiff): Promise<void> {
    // First cancel orders that should be removed
    if (diff.toCancel.length > 0) {
      logger.info(`[ORDER] Cancelling ${diff.toCancel.length} orders`);
      await this.cancelOrders(diff.toCancel.map((o) => o.id));
    }

    // Then create new orders
    if (diff.toCreate.length > 0) {
      logger.info(`[ORDER] Creating ${diff.toCreate.length} orders`);

      const requests: OrderRequest[] = diff.toCreate.map((gridOrder) => ({
        clientId: gridOrder.clientId,
        symbol: this.symbol,
        side: gridOrder.side,
        orderType: 'Limit',
        price: gridOrder.price,
        quantity: gridOrder.quantity,
        timeInForce: 'GTC',
      }));

      await this.placeOrders(requests);
    }
  }

  /**
   * Get active orders
   */
  getActiveOrders(): Order[] {
    return Array.from(this.activeOrders.values());
  }

  /**
   * Get active order count
   */
  getActiveOrderCount(): number {
    return this.activeOrders.size;
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.activeOrders.get(orderId);
  }

  /**
   * Get order by client ID
   */
  getOrderByClientId(clientId: number | string): Order | undefined {
    return Array.from(this.activeOrders.values()).find(
      (order) => order.clientId === clientId
    );
  }

  /**
   * Subscribe to order updates
   */
  onOrderUpdate(callback: (update: OrderUpdate) => void): void {
    this.orderCallbacks.push(callback);
  }

  /**
   * Handle order update from exchange
   */
  private handleOrderUpdate(update: OrderUpdate): void {
    const { event, order } = update;

    switch (event) {
      case 'orderAccepted':
        this.activeOrders.set(order.id, order);
        break;

      case 'orderFill':
        if (order.status === 'Filled') {
          this.activeOrders.delete(order.id);
        } else {
          this.activeOrders.set(order.id, order);
        }
        break;

      case 'orderCancelled':
      case 'orderExpired':
        this.activeOrders.delete(order.id);
        break;
    }

    // Notify callbacks
    this.orderCallbacks.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        logger.error(error as Error, 'Error in order update callback');
      }
    });
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.orderCallbacks = [];
    this.activeOrders.clear();
  }
}
