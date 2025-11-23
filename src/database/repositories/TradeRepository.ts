/**
 * Trade Repository
 * Manages trade execution records
 */

import { Database } from '../Database';
import { v4 as uuidv4 } from 'uuid';

export interface Trade {
  id?: number;
  session_id: string;
  trade_id: string;
  timestamp?: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price: number;
  quantity: number;
  value: number;
  fee?: number;
  fee_currency?: string;
  order_id?: string;
  grid_level?: number;
  realized_pnl?: number;
  notes?: string;
}

export interface TradeFilter {
  session_id?: string;
  symbol?: string;
  side?: 'buy' | 'sell';
  start_date?: string;
  end_date?: string;
  min_pnl?: number;
  max_pnl?: number;
}

export class TradeRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Create a new trade record
   */
  public async create(trade: Omit<Trade, 'id' | 'trade_id' | 'timestamp'>): Promise<string> {
    const tradeId = trade.order_id ? `${trade.order_id}-${Date.now()}` : uuidv4();

    await this.db.execute(
      `INSERT INTO trades (
        session_id, trade_id, symbol, side, type, price, quantity, value,
        fee, fee_currency, order_id, grid_level, realized_pnl, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trade.session_id,
        tradeId,
        trade.symbol,
        trade.side,
        trade.type,
        trade.price,
        trade.quantity,
        trade.value,
        trade.fee || 0,
        trade.fee_currency || null,
        trade.order_id || null,
        trade.grid_level || null,
        trade.realized_pnl || 0,
        trade.notes || null,
      ]
    );

    return tradeId;
  }

  /**
   * Get trade by ID
   */
  public async findById(tradeId: string): Promise<Trade | undefined> {
    return this.db.queryOne<Trade>(
      'SELECT * FROM trades WHERE trade_id = ?',
      [tradeId]
    );
  }

  /**
   * Get all trades for a session
   */
  public async findBySession(
    sessionId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Trade[]> {
    return this.db.query<Trade>(
      `SELECT * FROM trades
       WHERE session_id = ?
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      [sessionId, limit, offset]
    );
  }

  /**
   * Get trades with filters
   */
  public async findWithFilters(
    filter: TradeFilter,
    limit: number = 100,
    offset: number = 0
  ): Promise<Trade[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.session_id) {
      conditions.push('session_id = ?');
      params.push(filter.session_id);
    }

    if (filter.symbol) {
      conditions.push('symbol = ?');
      params.push(filter.symbol);
    }

    if (filter.side) {
      conditions.push('side = ?');
      params.push(filter.side);
    }

    if (filter.start_date) {
      conditions.push('timestamp >= ?');
      params.push(filter.start_date);
    }

    if (filter.end_date) {
      conditions.push('timestamp <= ?');
      params.push(filter.end_date);
    }

    if (filter.min_pnl !== undefined) {
      conditions.push('realized_pnl >= ?');
      params.push(filter.min_pnl);
    }

    if (filter.max_pnl !== undefined) {
      conditions.push('realized_pnl <= ?');
      params.push(filter.max_pnl);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    return this.db.query<Trade>(
      `SELECT * FROM trades ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      params
    );
  }

  /**
   * Get trade statistics for a session
   */
  public async getStats(sessionId: string): Promise<any> {
    return this.db.queryOne(
      `SELECT
        COUNT(*) as total_trades,
        SUM(CASE WHEN side = 'buy' THEN 1 ELSE 0 END) as buy_trades,
        SUM(CASE WHEN side = 'sell' THEN 1 ELSE 0 END) as sell_trades,
        SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        SUM(realized_pnl) as total_pnl,
        AVG(realized_pnl) as avg_pnl,
        MAX(realized_pnl) as best_trade,
        MIN(realized_pnl) as worst_trade,
        SUM(fee) as total_fees,
        SUM(value) as total_volume,
        AVG(value) as avg_trade_size
       FROM trades
       WHERE session_id = ?`,
      [sessionId]
    );
  }

  /**
   * Get daily trade summary
   */
  public async getDailySummary(sessionId: string): Promise<any[]> {
    return this.db.query(
      `SELECT
        DATE(timestamp) as date,
        COUNT(*) as trades,
        SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END) as losses,
        SUM(realized_pnl) as pnl,
        SUM(fee) as fees,
        SUM(value) as volume
       FROM trades
       WHERE session_id = ?
       GROUP BY DATE(timestamp)
       ORDER BY date DESC`,
      [sessionId]
    );
  }

  /**
   * Get recent trades
   */
  public async getRecent(sessionId: string, count: number = 10): Promise<Trade[]> {
    return this.db.query<Trade>(
      `SELECT * FROM trades
       WHERE session_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [sessionId, count]
    );
  }

  /**
   * Get winning trades
   */
  public async getWinningTrades(sessionId: string, limit: number = 10): Promise<Trade[]> {
    return this.db.query<Trade>(
      `SELECT * FROM trades
       WHERE session_id = ? AND realized_pnl > 0
       ORDER BY realized_pnl DESC
       LIMIT ?`,
      [sessionId, limit]
    );
  }

  /**
   * Get losing trades
   */
  public async getLosingTrades(sessionId: string, limit: number = 10): Promise<Trade[]> {
    return this.db.query<Trade>(
      `SELECT * FROM trades
       WHERE session_id = ? AND realized_pnl < 0
       ORDER BY realized_pnl ASC
       LIMIT ?`,
      [sessionId, limit]
    );
  }

  /**
   * Delete trade
   */
  public async delete(tradeId: string): Promise<void> {
    await this.db.execute('DELETE FROM trades WHERE trade_id = ?', [tradeId]);
  }
}
