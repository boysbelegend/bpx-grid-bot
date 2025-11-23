/**
 * Jest Test Setup
 * Global configuration and mocks for all tests
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Global test utilities
global.testUtils = {
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  mockPrice: (base: number, variance: number = 0.01) => {
    return base * (1 + (Math.random() - 0.5) * variance);
  },

  createMockTrade: (overrides = {}) => ({
    id: Math.floor(Math.random() * 10000),
    timestamp: new Date().toISOString(),
    symbol: 'SOL_USDC',
    side: 'buy' as const,
    type: 'limit' as const,
    price: 100,
    quantity: 1,
    value: 100,
    fee: 0.1,
    realized_pnl: 0,
    ...overrides,
  }),
};

// Extend global namespace
declare global {
  var testUtils: {
    sleep: (ms: number) => Promise<void>;
    mockPrice: (base: number, variance?: number) => number;
    createMockTrade: (overrides?: any) => any;
  };
}

export {};
