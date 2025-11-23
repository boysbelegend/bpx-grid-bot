/**
 * API Client for Backend Communication
 */

import axios, {AxiosInstance} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DashboardState {
  engine: {
    status: string;
    uptime: number;
    symbol: string;
    dryRun: boolean;
  };
  market: {
    symbol: string;
    lastPrice: number;
    bid: number;
    ask: number;
    spread: number;
    priceChangePct24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  };
  pnl: {
    realized: number;
    unrealized: number;
    total: number;
    roi: number;
  };
  position: {
    baseBalance: number;
    quoteBalance: number;
    totalValue: number;
    inventoryRatio: number;
    inventorySkew: number;
  };
  risk: {
    maxDrawdown: number;
    currentDrawdown: number;
    dailyLoss: number;
    exposure: number;
  };
  grid: {
    levels: Array<{
      price: number;
      side: string;
      hasOrder: boolean;
    }>;
    totalLevels: number;
    activeLevels: number;
  };
  metrics: {
    totalTrades: number;
    winRate: number;
    avgProfit: number;
    profitFactor: number;
  };
  orders: any[];
}

export interface PortfolioSummary {
  totalPairs: number;
  activePairs: number;
  totalPnl: number;
  totalPositionValue: number;
  dailyPnl: number;
  pairBreakdown: Array<{
    symbol: string;
    status: string;
    pnl: number;
    positionValue: number;
    weight: number;
    uptime: number;
    totalTrades?: number;
    winRate?: number;
  }>;
}

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string = 'http://localhost:3001/api';

  constructor() {
    this.client = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.loadSettings();
  }

  private async loadSettings() {
    try {
      const savedUrl = await AsyncStorage.getItem('apiBaseUrl');
      if (savedUrl) {
        this.baseURL = savedUrl;
      }
    } catch (error) {
      console.error('Failed to load API settings:', error);
    }
  }

  public async setBaseURL(url: string) {
    this.baseURL = url;
    await AsyncStorage.setItem('apiBaseUrl', url);
  }

  public getBaseURL(): string {
    return this.baseURL;
  }

  // Dashboard APIs
  public async getDashboardState(): Promise<DashboardState> {
    const response = await this.client.get(`${this.baseURL}/state`);
    return response.data.data;
  }

  public async startEngine(strategyPath: string, dryRun: boolean): Promise<void> {
    await this.client.post(`${this.baseURL}/control/start`, {
      strategyPath,
      dryRun,
    });
  }

  public async stopEngine(emergency: boolean = false): Promise<void> {
    await this.client.post(`${this.baseURL}/control/stop`, {emergency});
  }

  public async pauseEngine(): Promise<void> {
    await this.client.post(`${this.baseURL}/control/pause`);
  }

  public async resumeEngine(): Promise<void> {
    await this.client.post(`${this.baseURL}/control/resume`);
  }

  // Multi-Pair Portfolio APIs
  public async getPortfolioSummary(): Promise<PortfolioSummary> {
    const response = await this.client.get(`${this.baseURL}/portfolio/summary`);
    return response.data.data;
  }

  public async startPair(symbol: string, strategyPath: string): Promise<void> {
    await this.client.post(`${this.baseURL}/portfolio/start`, {
      symbol,
      strategyPath,
    });
  }

  public async stopPair(symbol: string): Promise<void> {
    await this.client.post(`${this.baseURL}/portfolio/stop`, {symbol});
  }

  // Scenarios APIs
  public async getScenarios(marketType?: 'spot' | 'futures') {
    const params = marketType ? {marketType} : {};
    const response = await this.client.get(`${this.baseURL}/scenarios`, {params});
    return response.data.data;
  }

  public async getScenarioRecommendations(profile: any) {
    const response = await this.client.post(
      `${this.baseURL}/scenarios/recommendations`,
      profile,
    );
    return response.data.data;
  }

  // Health Check
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get(`${this.baseURL}/health`, {
        timeout: 3000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

export default new ApiClient();
