/**
 * Session Repository
 * Manages trading session records
 */

import { Database } from '../Database';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id?: number;
  session_id: string;
  symbol: string;
  market_type: 'spot' | 'futures';
  strategy_name?: string;
  started_at?: string;
  ended_at?: string | null;
  status: 'running' | 'paused' | 'stopped';
  dry_run: boolean;
  initial_capital?: number;
  leverage?: number;
}

export class SessionRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Create a new session
   */
  public async create(session: Omit<Session, 'id' | 'session_id' | 'started_at'>): Promise<string> {
    const sessionId = uuidv4();

    await this.db.execute(
      `INSERT INTO sessions (session_id, symbol, market_type, strategy_name, status, dry_run, initial_capital, leverage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        session.symbol,
        session.market_type,
        session.strategy_name || null,
        session.status,
        session.dry_run ? 1 : 0,
        session.initial_capital || null,
        session.leverage || 1,
      ]
    );

    return sessionId;
  }

  /**
   * Get session by ID
   */
  public async findById(sessionId: string): Promise<Session | undefined> {
    return this.db.queryOne<Session>(
      'SELECT * FROM sessions WHERE session_id = ?',
      [sessionId]
    );
  }

  /**
   * Get active session
   */
  public async getActive(): Promise<Session | undefined> {
    return this.db.queryOne<Session>(
      "SELECT * FROM sessions WHERE status IN ('running', 'paused') ORDER BY started_at DESC LIMIT 1"
    );
  }

  /**
   * Get all sessions
   */
  public async findAll(limit: number = 100, offset: number = 0): Promise<Session[]> {
    return this.db.query<Session>(
      'SELECT * FROM sessions ORDER BY started_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }

  /**
   * Update session status
   */
  public async updateStatus(sessionId: string, status: 'running' | 'paused' | 'stopped'): Promise<void> {
    const updates: any[] = [status];
    let sql = 'UPDATE sessions SET status = ?';

    if (status === 'stopped') {
      sql += ', ended_at = CURRENT_TIMESTAMP';
    }

    sql += ' WHERE session_id = ?';
    updates.push(sessionId);

    await this.db.execute(sql, updates);
  }

  /**
   * Get session statistics
   */
  public async getStats(sessionId: string): Promise<any> {
    return this.db.queryOne(
      `SELECT
        s.*,
        COUNT(t.id) as total_trades,
        SUM(CASE WHEN t.realized_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN t.realized_pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        SUM(t.realized_pnl) as total_realized_pnl,
        SUM(t.fee) as total_fees
       FROM sessions s
       LEFT JOIN trades t ON s.session_id = t.session_id
       WHERE s.session_id = ?
       GROUP BY s.id`,
      [sessionId]
    );
  }

  /**
   * Delete session and all related data
   */
  public async delete(sessionId: string): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.execute('DELETE FROM performance_metrics WHERE session_id = ?', [sessionId]);
      await this.db.execute('DELETE FROM grid_snapshots WHERE session_id = ?', [sessionId]);
      await this.db.execute('DELETE FROM risk_snapshots WHERE session_id = ?', [sessionId]);
      await this.db.execute('DELETE FROM pnl_snapshots WHERE session_id = ?', [sessionId]);
      await this.db.execute('DELETE FROM position_snapshots WHERE session_id = ?', [sessionId]);
      await this.db.execute('DELETE FROM trades WHERE session_id = ?', [sessionId]);
      await this.db.execute('DELETE FROM events WHERE session_id = ?', [sessionId]);
      await this.db.execute('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
    });
  }
}
