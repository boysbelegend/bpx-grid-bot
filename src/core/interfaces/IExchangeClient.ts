/**
 * Exchange Client Interface
 * Abstract interface for exchange operations
 */

import {
  Ticker,
  OrderBook,
  Balance,
  Position,
  Order,
  OrderRequest,
  OrderUpdate,
  MarketData,
} from './types';

export interface IExchangeClient {
  // ============================================================================
  // Market Data
  // ============================================================================

  /**
   * Get current ticker for a symbol
   */
  getTicker(symbol: string): Promise<Ticker>;

  /**
   * Get order book for a symbol
   */
  getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;

  /**
   * Get recent trades
   */
  getTrades(symbol: string, limit?: number): Promise<any[]>;

  // ============================================================================
  // Account Management
  // ============================================================================

  /**
   * Get all balances for the account
   */
  getBalances(): Promise<Balance[]>;

  /**
   * Get balance for a specific asset
   */
  getBalance(asset: string): Promise<Balance | null>;

  /**
   * Get all open positions (futures only)
   */
  getPositions(symbol?: string): Promise<Position[]>;

  // ============================================================================
  // Order Management
  // ============================================================================

  /**
   * Place a new order
   */
  placeOrder(request: OrderRequest): Promise<Order>;

  /**
   * Cancel a specific order
   */
  cancelOrder(orderId: string, symbol: string): Promise<void>;

  /**
   * Cancel order by client ID
   */
  cancelOrderByClientId(clientId: number | string, symbol: string): Promise<void>;

  /**
   * Cancel all orders for a symbol
   */
  cancelAllOrders(symbol: string): Promise<void>;

  /**
   * Get all open orders for a symbol
   */
  getOpenOrders(symbol: string): Promise<Order[]>;

  /**
   * Get specific order by ID
   */
  getOrder(orderId: string, symbol: string): Promise<Order | null>;

  /**
   * Get order by client ID
   */
  getOrderByClientId(clientId: number | string, symbol: string): Promise<Order | null>;

  // ============================================================================
  // WebSocket Streams
  // ============================================================================

  /**
   * Subscribe to order updates
   */
  subscribeOrderUpdates(callback: (update: OrderUpdate) => void): Promise<void>;

  /**
   * Subscribe to market data updates
   */
  subscribeMarketData(symbol: string, callback: (data: MarketData) => void): Promise<void>;

  /**
   * Unsubscribe from all streams
   */
  unsubscribeAll(): Promise<void>;

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get exchange info (trading rules, limits, etc.)
   */
  getExchangeInfo(): Promise<any>;

  /**
   * Check if connected to exchange
   */
  isConnected(): boolean;

  /**
   * Close all connections
   */
  disconnect(): Promise<void>;
}
