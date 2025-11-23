/**
 * Integration Tests for Dashboard API Endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app, server } from '../../../dashboard/backend/src/server';

describe('Dashboard API Endpoints', () => {
  afterAll((done) => {
    server.close(done);
  });

  describe('GET /api/health', () => {
    test('should return 200 OK', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should return service status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/state', () => {
    test('should return current dashboard state', async () => {
      const response = await request(app).get('/api/state');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    test('should include engine information', async () => {
      const response = await request(app).get('/api/state');

      const { data } = response.body;
      expect(data).toHaveProperty('engine');
      expect(data.engine).toHaveProperty('status');
      expect(data.engine).toHaveProperty('symbol');
    });

    test('should include market data', async () => {
      const response = await request(app).get('/api/state');

      const { data } = response.body;
      expect(data).toHaveProperty('market');
      expect(data.market).toHaveProperty('lastPrice');
      expect(data.market).toHaveProperty('bid');
      expect(data.market).toHaveProperty('ask');
    });

    test('should include PnL information', async () => {
      const response = await request(app).get('/api/state');

      const { data } = response.body;
      expect(data).toHaveProperty('pnl');
      expect(data.pnl).toHaveProperty('realized');
      expect(data.pnl).toHaveProperty('unrealized');
      expect(data.pnl).toHaveProperty('total');
    });

    test('should include position information', async () => {
      const response = await request(app).get('/api/state');

      const { data } = response.body;
      expect(data).toHaveProperty('position');
      expect(data.position).toHaveProperty('baseBalance');
      expect(data.position).toHaveProperty('quoteBalance');
      expect(data.position).toHaveProperty('totalValue');
    });

    test('should include grid information', async () => {
      const response = await request(app).get('/api/state');

      const { data } = response.body;
      expect(data).toHaveProperty('grid');
      expect(data.grid).toHaveProperty('levels');
      expect(data.grid).toHaveProperty('totalLevels');
      expect(data.grid).toHaveProperty('activeLevels');
    });
  });

  describe('GET /api/history/trades', () => {
    test('should return trade history', async () => {
      const response = await request(app).get('/api/history/trades');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('trades');
      expect(Array.isArray(response.body.data.trades)).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/history/trades')
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('limit', 10);
      expect(response.body.data).toHaveProperty('offset', 0);
    });

    test('should support side filtering', async () => {
      const buyResponse = await request(app)
        .get('/api/history/trades')
        .query({ side: 'buy' });

      expect(buyResponse.status).toBe(200);

      const sellResponse = await request(app)
        .get('/api/history/trades')
        .query({ side: 'sell' });

      expect(sellResponse.status).toBe(200);
    });

    test('should support date filtering', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/history/trades')
        .query({ startDate, endDate });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/analytics/performance', () => {
    test('should return performance metrics', async () => {
      const response = await request(app).get('/api/analytics/performance');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('overview');
    });

    test('should include overview metrics', async () => {
      const response = await request(app).get('/api/analytics/performance');

      const { overview } = response.body.data;
      expect(overview).toHaveProperty('totalPnl');
      expect(overview).toHaveProperty('roi');
      expect(overview).toHaveProperty('winRate');
      expect(overview).toHaveProperty('profitFactor');
      expect(overview).toHaveProperty('sharpeRatio');
      expect(overview).toHaveProperty('maxDrawdown');
    });

    test('should include daily metrics', async () => {
      const response = await request(app).get('/api/analytics/performance');

      expect(response.body.data).toHaveProperty('daily');
      expect(Array.isArray(response.body.data.daily)).toBe(true);
    });

    test('should include monthly aggregates', async () => {
      const response = await request(app).get('/api/analytics/performance');

      expect(response.body.data).toHaveProperty('monthly');
      expect(Array.isArray(response.body.data.monthly)).toBe(true);
    });
  });

  describe('GET /api/analytics/distribution', () => {
    test('should return trade distribution analysis', async () => {
      const response = await request(app).get('/api/analytics/distribution');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should include distribution by hour', async () => {
      const response = await request(app).get('/api/analytics/distribution');

      expect(response.body.data).toHaveProperty('byHour');
      expect(Array.isArray(response.body.data.byHour)).toBe(true);
    });

    test('should include distribution by day of week', async () => {
      const response = await request(app).get('/api/analytics/distribution');

      expect(response.body.data).toHaveProperty('byDayOfWeek');
      expect(Array.isArray(response.body.data.byDayOfWeek)).toBe(true);
    });

    test('should include distribution by side', async () => {
      const response = await request(app).get('/api/analytics/distribution');

      expect(response.body.data).toHaveProperty('bySide');
      expect(response.body.data.bySide).toHaveProperty('buy');
      expect(response.body.data.bySide).toHaveProperty('sell');
    });
  });

  describe('GET /api/scenarios', () => {
    test('should return list of available scenarios', async () => {
      const response = await request(app).get('/api/scenarios');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('scenarios');
      expect(Array.isArray(response.body.data.scenarios)).toBe(true);
    });

    test('should support market type filtering', async () => {
      const spotResponse = await request(app)
        .get('/api/scenarios')
        .query({ marketType: 'spot' });

      expect(spotResponse.status).toBe(200);

      const futuresResponse = await request(app)
        .get('/api/scenarios')
        .query({ marketType: 'futures' });

      expect(futuresResponse.status).toBe(200);
    });

    test('should include scenario metadata', async () => {
      const response = await request(app).get('/api/scenarios');

      const scenarios = response.body.data.scenarios;
      if (scenarios.length > 0) {
        const scenario = scenarios[0];
        expect(scenario).toHaveProperty('id');
        expect(scenario).toHaveProperty('name');
        expect(scenario).toHaveProperty('description');
        expect(scenario).toHaveProperty('marketType');
      }
    });
  });

  describe('POST /api/scenarios/recommendations', () => {
    test('should return recommendations based on user profile', async () => {
      const profile = {
        capital: 10000,
        riskLevel: 'medium',
        experience: 'intermediate',
        marketType: 'spot',
      };

      const response = await request(app)
        .post('/api/scenarios/recommendations')
        .send(profile);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    test('should reject invalid profile data', async () => {
      const response = await request(app)
        .post('/api/scenarios/recommendations')
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/api/unknown-endpoint');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should handle invalid query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/history/trades')
        .query({ limit: 'invalid' });

      // Should either handle gracefully or return 400
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Response Format', () => {
    test('should include timestamp in all responses', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('number');
    });

    test('should include success flag in all responses', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });

    test('should return JSON content type', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});
