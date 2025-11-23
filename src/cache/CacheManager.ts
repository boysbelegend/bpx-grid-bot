/**
 * Cache Manager
 * In-memory caching with TTL support for API responses and database queries
 */

import { logger } from '../utils/logger';

export interface CacheConfig {
  defaultTTL: number; // Default TTL in milliseconds
  maxSize: number; // Maximum number of cache entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: CacheConfig) {
    this.config = config;
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hits
    entry.hits++;

    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    // Enforce max size
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      hits: 0,
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete value from cache
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.cache.clear();
    logger.info('[Cache] Cache cleared');
  }

  /**
   * Get or set (fetch if not cached)
   */
  public async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttl);

    return data;
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; hits: number; age: number }>;
  } {
    const now = Date.now();
    const entries: Array<{ key: string; hits: number; age: number }> = [];
    let totalHits = 0;

    this.cache.forEach((entry, key) => {
      entries.push({
        key,
        hits: entry.hits,
        age: now - entry.timestamp,
      });
      totalHits += entry.hits;
    });

    const hitRate = totalHits / Math.max(this.cache.size, 1);

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate,
      entries: entries.sort((a, b) => b.hits - a.hits).slice(0, 10),
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('[Cache] Evicted LRU entry', { key: oldestKey });
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    });

    if (removed > 0) {
      logger.debug('[Cache] Cleaned up expired entries', { removed });
    }
  }

  /**
   * Stop cleanup timer
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Singleton instance
const cacheConfig: CacheConfig = {
  defaultTTL: 60000, // 1 minute
  maxSize: 1000,
  cleanupInterval: 300000, // 5 minutes
};

export const cache = new CacheManager(cacheConfig);

export default CacheManager;
