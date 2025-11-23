/**
 * Dashboard Frontend Types
 * Matches backend API types
 */

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
  position?: PositionData;
  pnl?: PnLData;
  orders?: OrderData[];
  grid?: GridData;
  risk?: RiskData;
  metrics?: TradingMetrics;
  market?: MarketData;
  lastUpdate: number;
}

export interface Strategy {
  name: string;
  path: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'update' | 'error' | 'ping' | 'pong';
  channel?: string;
  data?: any;
  timestamp: number;
}

// Scenario Types
export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  marketType: 'spot' | 'futures';
  recommended: string;
  pros: string[];
  cons: string[];
  config: {
    grid: {
      levels: number;
      spacing: { type: string; value: number };
    };
    order: {
      quantityPerLevel: number;
    };
    risk: {
      maxPositionSize: number;
      maxPositionValue: number;
      maxDailyLoss: number;
      emergencyStopLoss: number;
    };
    futures?: {
      leverage: number;
      marginMode: 'cross' | 'isolated';
      liquidationBuffer: number;
    };
  };
}

export interface CustomScenario extends ScenarioTemplate {
  isCustom: true;
  createdAt: number;
  lastModified: number;
}

export interface UserProfile {
  experience: 'beginner' | 'intermediate' | 'expert';
  riskTolerance: 'low' | 'medium' | 'high';
  marketType: 'spot' | 'futures';
}

export interface ExportScenarioConfig {
  scenarioId: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  dryRun?: boolean;
}
