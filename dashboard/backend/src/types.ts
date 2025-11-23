/**
 * Dashboard Backend Types
 * Type definitions for API requests/responses
 */

export interface DashboardConfig {
  port: number;
  corsOrigin: string;
  botRootPath: string;
}

// API Request Types
export interface StartEngineRequest {
  strategyPath: string;
  dryRun?: boolean;
}

export interface StopEngineRequest {
  force?: boolean;
}

export interface UpdateConfigRequest {
  config: Record<string, any>;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface EngineStatus {
  status: 'running' | 'stopped' | 'paused' | 'error' | 'initializing';
  strategyName?: string;
  symbol?: string;
  uptime?: number;
  startTime?: number;
  errorMessage?: string;
}

export interface PositionData {
  baseAsset: string;
  quoteAsset: string;
  baseBalance: number;
  quoteBalance: number;
  baseValue: number;
  totalValue: number;
  inventorySkew: number;
  averageBuyPrice: number;
  averageSellPrice: number;
}

export interface PnLData {
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  totalFees: number;
  netPnl: number;
  returnPct: number;
  dailyPnl: number;
  dailyReturnPct: number;
}

export interface OrderData {
  orderId: string;
  clientId: string;
  side: 'Bid' | 'Ask';
  price: number;
  quantity: number;
  filled: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  createdAt: number;
}

export interface GridData {
  centerPrice: number;
  levels: number;
  spacing: number;
  activeOrders: number;
  totalLevels: number;
  buyLevels: number;
  sellLevels: number;
}

export interface RiskData {
  isHealthy: boolean;
  violations: string[];
  warnings: string[];
  maxPositionSize: number;
  currentPositionSize: number;
  maxDailyLoss: number;
  currentDailyLoss: number;
  utilizationPct: number;
}

export interface TradingMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageProfit: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
}

export interface MarketData {
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  spread: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePct24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface DashboardState {
  engine: EngineStatus;
  position: PositionData;
  pnl: PnLData;
  orders: OrderData[];
  grid: GridData;
  risk: RiskData;
  metrics: TradingMetrics;
  market: MarketData;
  lastUpdate: number;
}

// WebSocket Message Types
export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'update' | 'error' | 'ping' | 'pong';
  channel?: string;
  data?: any;
  timestamp: number;
}

export interface WSUpdateMessage extends WSMessage {
  type: 'update';
  channel: 'status' | 'position' | 'orders' | 'pnl' | 'market' | 'all';
  data: Partial<DashboardState>;
}
