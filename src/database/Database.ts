/**
 * Database Connection Manager
 * SQLite-based persistent storage
 */

import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDatabase } from 'sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

export class Database {
  private static instance: Database;
  private db: SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Initialize database connection and create tables
   */
  public async initialize(dbPath: string = './data/bpx-grid-bot.db'): Promise<void> {
    try {
      // Open database connection
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      logger.info(`Database connected: ${dbPath}`);

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON;');

      // Create tables from schema
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      await this.db.exec(schema);

      logger.info('Database schema initialized');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  public getDb(): SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  /**
   * Execute a query
   */
  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const db = this.getDb();
    return db.all<T[]>(sql, params);
  }

  /**
   * Execute a single row query
   */
  public async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const db = this.getDb();
    return db.get<T>(sql, params);
  }

  /**
   * Execute an insert/update/delete
   */
  public async execute(sql: string, params: any[] = []): Promise<{ lastID?: number; changes: number }> {
    const db = this.getDb();
    return db.run(sql, params);
  }

  /**
   * Begin transaction
   */
  public async beginTransaction(): Promise<void> {
    await this.execute('BEGIN TRANSACTION');
  }

  /**
   * Commit transaction
   */
  public async commit(): Promise<void> {
    await this.execute('COMMIT');
  }

  /**
   * Rollback transaction
   */
  public async rollback(): Promise<void> {
    await this.execute('ROLLBACK');
  }

  /**
   * Execute in transaction
   */
  public async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.beginTransaction();
    try {
      const result = await callback();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}

export default Database.getInstance();
