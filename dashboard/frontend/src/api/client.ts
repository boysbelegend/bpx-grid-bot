/**
 * API Client
 * HTTP client for backend API
 */

import axios from 'axios';
import type {
  ApiResponse,
  DashboardState,
  EngineStatus,
  Strategy,
  ScenarioTemplate,
  CustomScenario,
  UserProfile,
  ExportScenarioConfig,
} from '../types';

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

  // Scenarios
  getScenarios: (marketType?: 'spot' | 'futures') =>
    client.get<ApiResponse<ScenarioTemplate[]>>('/scenarios', {
      params: marketType ? { marketType } : undefined,
    }),

  getScenario: (id: string) =>
    client.get<ApiResponse<ScenarioTemplate>>(`/scenarios/${id}`),

  createCustomScenario: (data: {
    name: string;
    description: string;
    baseScenarioId: string;
    customizations: Partial<ScenarioTemplate['config']>;
  }) => client.post<ApiResponse<CustomScenario>>('/scenarios/custom', data),

  updateCustomScenario: (
    id: string,
    data: {
      name?: string;
      description?: string;
      config?: Partial<ScenarioTemplate['config']>;
    }
  ) => client.put<ApiResponse<CustomScenario>>(`/scenarios/custom/${id}`, data),

  deleteCustomScenario: (id: string) =>
    client.delete<ApiResponse>(`/scenarios/custom/${id}`),

  exportScenario: (data: ExportScenarioConfig) =>
    client.post<ApiResponse<any>>('/scenarios/export', data),

  getRecommendations: (profile: UserProfile) =>
    client.post<ApiResponse<ScenarioTemplate[]>>('/scenarios/recommendations', profile),
};

export default api;
