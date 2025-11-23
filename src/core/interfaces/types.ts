/**
 * Core Type Definitions for BPX Grid Bot
 * AMM-Style Spread Trading System
 */

// ============================================================================
// Market Data Types
// ============================================================================

export interface Ticker {
  symbol: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  volume24h: number;
  timestamp: number;
}

export interface OrderBook {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][];
  timestamp: number;
}

export interface MarketData {
  type: 'ticker' | 'orderbook' | 'trade';
  symbol: string;
  data: any;
  timestamp: number;
}

// ============================================================================
// Account & Balance Types
// ============================================================================

export interface Balance {
  asset: string;
  available: number;
  locked: number;
  total: number;
}

export interface Position {
  symbol: string;
  side: 'Long' | 'Short';
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  liquidationPrice?: number;
  leverage?: number;
  marginMode?: 'cross' | 'isolated';
}

export interface Inventory {
  baseAsset: {
    symbol: string;
    total: number;
    available: number;
    locked: number;
  };
  quoteAsset: {
    symbol: string;
    total: number;
    available: number;
    locked: number;
  };
  netValue: number; // Total value in quote asset
  skew: number; // -1 (oversold) to +1 (overbought)
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderSide = 'Bid' | 'Ask';
export type OrderType = 'Limit' | 'Market' | 'PostOnly';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';
export type OrderStatus = 'New' | 'PartiallyFilled' | 'Filled' | 'Cancelled' | 'Rejected' | 'Expired';

export interface OrderRequest {
  clientId?: number | string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  price?: number;
  quantity: number;
  timeInForce?: TimeInForce;
}

export interface Order {
  id: string;
  clientId?: number | string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  price: number;
  quantity: number;
  filledQuantity: number;
  status: OrderStatus;
  timestamp: number;
  timeInForce?: TimeInForce;
}

export interface OrderFill {
  orderId: string;
  clientId?: number | string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  fee: number;
  feeAsset: string;
  timestamp: number;
}

export interface OrderUpdate {
  event: 'orderAccepted' | 'orderFill' | 'orderCancelled' | 'orderExpired';
  order: Order;
  fill?: OrderFill;
}

// ============================================================================
// Grid & Strategy Types
// ============================================================================

export type GridMode = 'mean-reversion' | 'trend-following' | 'adaptive';
export type SpacingType = 'percentage' | 'fixed';
export type MarketType = 'spot' | 'futures';

export interface GridLevel {
  index: number;
  price: number;
  side: OrderSide;
  quantity: number;
}

export interface GridOrder extends GridLevel {
  clientId: number | string;
}

export interface GridState {
  centerPrice: number;
  levels: GridLevel[];
  activeOrders: Map<string, Order>;
  lastRebalancePrice: number;
  lastRebalanceTime: number;
}

export interface OrderDiff {
  toCreate: GridOrder[];
  toCancel: Order[];
}

// ============================================================================
// Strategy Configuration Types
// ============================================================================

export interface GridConfig {
  mode: GridMode;
  levels: number;
  spacing: {
    type: SpacingType;
    value: number;
  };
  range: {
    lower: number | 'auto';
    upper: number | 'auto';
  };
}

export interface OrderConfig {
  quantityPerLevel: number;
  orderType: OrderType;
  timeInForce: TimeInForce;
}

export interface RiskConfig {
  maxPositionSize: number; // In base asset
  maxPositionValue: number; // In quote asset
  maxDailyLoss: number; // In quote asset
  maxOrderCount: number;
  rebalanceThreshold: number; // Percentage
  emergencyStopLoss?: number; // Percentage
}

export interface FuturesConfig {
  leverage: number;
  marginMode: 'cross' | 'isolated';
  liquidationBuffer: number; // Percentage from liquidation price
}

export interface StrategyConfig {
  name: string;
  type: MarketType;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;

  grid: GridConfig;
  order: OrderConfig;
  risk: RiskConfig;
  futures?: FuturesConfig;

  // Operational settings
  dryRun: boolean;
  cancelOrdersOnStart: boolean;
  telegramNotify: boolean;
}

// ============================================================================
// Risk & PnL Types
// ============================================================================

export interface RiskStatus {
  isHealthy: boolean;
  violations: string[];
  warnings: string[];
  metrics: {
    currentPositionSize: number;
    currentPositionValue: number;
    dailyPnl: number;
    activeOrderCount: number;
    leverageUsed?: number;
    distanceToLiquidation?: number;
  };
}

export interface PnLSnapshot {
  timestamp: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  fees: number;
  trades: number;
  winRate: number;
}

export interface TradingMetrics {
  startTime: number;
  endTime?: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalVolume: number;
  totalFees: number;
  realizedPnl: number;
  unrealizedPnl: number;
  maxDrawdown: number;
  sharpeRatio?: number;
}

// ============================================================================
// Engine & Event Types
// ============================================================================

export interface EngineState {
  status: 'initializing' | 'running' | 'paused' | 'stopping' | 'stopped' | 'error';
  startTime?: number;
  endTime?: number;
  lastUpdateTime?: number;
  errorMessage?: string;
}

export type EventType =
  | 'engine:start'
  | 'engine:stop'
  | 'engine:error'
  | 'market:update'
  | 'order:fill'
  | 'order:placed'
  | 'order:cancelled'
  | 'grid:rebalance'
  | 'risk:warning'
  | 'risk:violation';

export interface EngineEvent {
  type: EventType;
  timestamp: number;
  data: any;
}

// ============================================================================
// Configuration File Schema
// ============================================================================

export interface GlobalConfig {
  exchange: {
    name: string;
    apiKey: string;
    apiSecret: string;
    testnet?: boolean;
  };
  telegram?: {
    botToken: string;
    chatId: string;
    notifyInterval: number;
  };
  logging: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PriceRange {
  lower: number;
  upper: number;
  mid: number;
}

export interface CalculationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Futures-Specific Types
// ============================================================================

export interface FuturesPosition extends Position {
  symbol: string;
  side: 'Long' | 'Short';
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  leverage: number;
  marginMode: 'cross' | 'isolated';
  margin: number;
  maintenanceMargin: number;
  marginRatio: number;
  adlQuantile?: number; // Auto-deleveraging quantile (1-5)
}

export interface FundingRate {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  nextFundingTime: number;
  estimatedRate?: number;
}

export interface Collateral {
  asset: string;
  total: number;
  available: number;
  locked: number;
  marginBalance: number;
  unrealizedPnl: number;
}

export interface LeverageInfo {
  symbol: string;
  maxLeverage: number;
  currentLeverage: number;
  brackets: {
    notional: number;
    maxLeverage: number;
    maintenanceMarginRate: number;
  }[];
}

export interface LiquidationRisk {
  symbol: string;
  currentPrice: number;
  liquidationPrice: number;
  distancePercent: number;
  buffer: number;
  isHighRisk: boolean;
  estimatedTimeToLiquidation?: number; // In seconds, if current volatility continues
}

export interface FuturesOrderRequest extends OrderRequest {
  reduceOnly?: boolean;
  positionSide?: 'LONG' | 'SHORT' | 'BOTH';
}
