/**
 * API Client
 * HTTP client for backend API
 */

import axios from 'axios';
import type { ApiResponse, DashboardState, EngineStatus, Strategy } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health & Status
  health: () => client.get<ApiResponse>('/health'),

  getStatus: () => client.get<ApiResponse<EngineStatus>>('/status'),

  getState: () => client.get<ApiResponse<DashboardState>>('/state'),

  // Data endpoints
  getPosition: () => client.get<ApiResponse>('/position'),

  getPnL: () => client.get<ApiResponse>('/pnl'),

  getOrders: () => client.get<ApiResponse>('/orders'),

  getGrid: () => client.get<ApiResponse>('/grid'),

  getRisk: () => client.get<ApiResponse>('/risk'),

  getMetrics: () => client.get<ApiResponse>('/metrics'),

  getMarket: () => client.get<ApiResponse>('/market'),

  // Control
  start: (strategyPath: string, dryRun: boolean = true) =>
    client.post<ApiResponse>('/control/start', { strategyPath, dryRun }),

  stop: (force: boolean = false) =>
    client.post<ApiResponse>('/control/stop', { force }),

  pause: () => client.post<ApiResponse>('/control/pause'),

  resume: () => client.post<ApiResponse>('/control/resume'),

  // Strategies
  getStrategies: () => client.get<ApiResponse<Strategy[]>>('/strategies'),
};

export default api;
