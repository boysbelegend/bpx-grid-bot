/**
 * Integration Tests for Database Repositories
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Database from '../../../src/database/Database';
import { SessionRepository } from '../../../src/database/repositories/SessionRepository';
import { TradeRepository } from '../../../src/database/repositories/TradeRepository';
import { PerformanceMetricsRepository } from '../../../src/database/repositories/PerformanceMetricsRepository';

describe('Database Repositories', () => {
  const testDbPath = ':memory:'; // Use in-memory database for tests
  let sessionRepo: SessionRepository;
  let tradeRepo: TradeRepository;
  let metricsRepo: PerformanceMetricsRepository;

  beforeAll(async () => {
    await Database.initialize(testDbPath);
    sessionRepo = new SessionRepository(Database);
    tradeRepo = new TradeRepository(Database);
    metricsRepo = new PerformanceMetricsRepository(Database);
  });

  afterAll(async () => {
    await Database.close();
  });

  describe('SessionRepository', () => {
    test('should create a new session', async () => {
      const sessionId = await sessionRepo.create({
        symbol: 'SOL_USDC',
        market_type: 'spot',
        strategy_name: 'AMM Grid',
        dry_run: true,
        initial_capital: 10000,
        leverage: 1,
      });

      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');
    });

    test('should retrieve active session', async () => {
      await sessionRepo.create({
        symbol: 'SOL_USDC',
        market_type: 'spot',
        strategy_name: 'AMM Grid',
        dry_run: false,
        initial_capital: 10000,
        leverage: 1,
      });

      const activeSession = await sessionRepo.getActive();
      expect(activeSession).toBeTruthy();
      expect(activeSession?.status).toBe('running');
    });

    test('should update session status', async () => {
      const sessionId = await sessionRepo.create({
        symbol: 'SOL_USDC',
        market_type: 'spot',
        strategy_name: 'AMM Grid',
        dry_run: false,
        initial_capital: 10000,
        leverage: 1,
      });

      await sessionRepo.updateStatus(sessionId, 'paused');

      const session = await sessionRepo.findById(sessionId);
      expect(session?.status).toBe('paused');
    });

    test('should find sessions by symbol', async () => {
      await sessionRepo.create({
        symbol: 'BTC_USDC',
        market_type: 'spot',
        strategy_name: 'AMM Grid',
        dry_run: false,
        initial_capital: 10000,
        leverage: 1,
      });

      const sessions = await sessionRepo.findBySymbol('BTC_USDC');
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].symbol).toBe('BTC_USDC');
    });
  });

  describe('TradeRepository', () => {
    let testSessionId: string;

    beforeEach(async () => {
      testSessionId = await sessionRepo.create({
        symbol: 'SOL_USDC',
        market_type: 'spot',
        strategy_name: 'AMM Grid',
        dry_run: false,
        initial_capital: 10000,
        leverage: 1,
      });
    });

    test('should create a new trade', async () => {
      const tradeId = await tradeRepo.create({
        session_id: testSessionId,
        symbol: 'SOL_USDC',
        side: 'buy',
        type: 'limit',
        price: 100,
        quantity: 1,
        value: 100,
        fee: 0.1,
        realized_pnl: 0,
        order_id: 'test-order-123',
      });

      expect(tradeId).toBeTruthy();
    });

    test('should find trades with filters', async () => {
      // Create test trades
      await tradeRepo.create({
        session_id: testSessionId,
        symbol: 'SOL_USDC',
        side: 'buy',
        type: 'limit',
        price: 100,
        quantity: 1,
        value: 100,
        fee: 0.1,
        realized_pnl: 0,
      });

      await tradeRepo.create({
        session_id: testSessionId,
        symbol: 'SOL_USDC',
        side: 'sell',
        type: 'limit',
        price: 105,
        quantity: 1,
        value: 105,
        fee: 0.1,
        realized_pnl: 4.9,
      });

      const allTrades = await tradeRepo.findWithFilters(
        { session_id: testSessionId },
        100,
        0
      );

      expect(allTrades.length).toBe(2);

      const buyTrades = await tradeRepo.findWithFilters(
        { session_id: testSessionId, side: 'buy' },
        100,
        0
      );

      expect(buyTrades.length).toBe(1);
      expect(buyTrades[0].side).toBe('buy');
    });

    test('should get trade statistics', async () => {
      // Create multiple trades
      for (let i = 0; i < 10; i++) {
        await tradeRepo.create({
          session_id: testSessionId,
          symbol: 'SOL_USDC',
          side: i % 2 === 0 ? 'buy' : 'sell',
          type: 'limit',
          price: 100 + i,
          quantity: 1,
          value: 100 + i,
          fee: 0.1,
          realized_pnl: i % 2 === 0 ? 0 : 5,
        });
      }

      const stats = await tradeRepo.getStats(testSessionId);

      expect(stats.totalTrades).toBe(10);
      expect(stats.totalVolume).toBeGreaterThan(0);
      expect(stats.totalFees).toBeGreaterThan(0);
    });

    test('should support pagination', async () => {
      // Create 25 trades
      for (let i = 0; i < 25; i++) {
        await tradeRepo.create({
          session_id: testSessionId,
          symbol: 'SOL_USDC',
          side: 'buy',
          type: 'limit',
          price: 100,
          quantity: 1,
          value: 100,
          fee: 0.1,
          realized_pnl: 0,
        });
      }

      const page1 = await tradeRepo.findWithFilters(
        { session_id: testSessionId },
        10,
        0
      );

      const page2 = await tradeRepo.findWithFilters(
        { session_id: testSessionId },
        10,
        10
      );

      expect(page1.length).toBe(10);
      expect(page2.length).toBe(10);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('PerformanceMetricsRepository', () => {
    let testSessionId: string;

    beforeEach(async () => {
      testSessionId = await sessionRepo.create({
        symbol: 'SOL_USDC',
        market_type: 'spot',
        strategy_name: 'AMM Grid',
        dry_run: false,
        initial_capital: 10000,
        leverage: 1,
      });

      // Create test trades
      for (let i = 0; i < 20; i++) {
        await tradeRepo.create({
          session_id: testSessionId,
          symbol: 'SOL_USDC',
          side: i % 2 === 0 ? 'buy' : 'sell',
          type: 'limit',
          price: 100 + (i % 2),
          quantity: 1,
          value: 100 + (i % 2),
          fee: 0.1,
          realized_pnl: i % 2 === 0 ? 0 : 1,
        });
      }
    });

    test('should calculate daily metrics', async () => {
      const today = new Date().toISOString().split('T')[0];

      await metricsRepo.calculateDaily(testSessionId, today);

      const metrics = await metricsRepo.findByDate(testSessionId, today);

      expect(metrics).toBeTruthy();
      expect(metrics?.total_trades).toBeGreaterThan(0);
    });

    test('should get best performing days', async () => {
      const today = new Date().toISOString().split('T')[0];
      await metricsRepo.calculateDaily(testSessionId, today);

      const bestDays = await metricsRepo.getBestDays(testSessionId, 5);

      expect(bestDays.length).toBeGreaterThan(0);
      expect(bestDays[0]).toHaveProperty('total_pnl');
    });

    test('should get monthly aggregates', async () => {
      const today = new Date().toISOString().split('T')[0];
      await metricsRepo.calculateDaily(testSessionId, today);

      const monthly = await metricsRepo.getMonthlyAggregates(testSessionId);

      expect(Array.isArray(monthly)).toBe(true);
    });
  });

  describe('Transaction Support', () => {
    test('should rollback on error', async () => {
      try {
        await Database.transaction(async () => {
          await sessionRepo.create({
            symbol: 'TEST_PAIR',
            market_type: 'spot',
            strategy_name: 'Test',
            dry_run: false,
            initial_capital: 10000,
            leverage: 1,
          });

          // Force an error
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected error
      }

      // Session should not exist due to rollback
      const sessions = await sessionRepo.findBySymbol('TEST_PAIR');
      expect(sessions.length).toBe(0);
    });
  });
});
