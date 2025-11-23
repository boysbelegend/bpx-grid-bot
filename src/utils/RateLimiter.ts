/**
 * Rate Limiter
 * Implements token bucket algorithm for rate limiting
 */

export interface RateLimiterConfig {
  maxRequestsPerSecond?: number;
  maxRequestsPerMinute?: number;
  maxBurst?: number;
  enableLogging?: boolean;
}

export interface RateLimiterStats {
  totalRequests: number;
  rejectedRequests: number;
  currentTokens: number;
  maxTokens: number;
  refillRate: number;
}

/**
 * Token Bucket Rate Limiter
 * Prevents API throttling by limiting request rate
 */
export class RateLimiter {
  private maxTokens: number;
  private tokensPerSecond: number;
  private currentTokens: number;
  private lastRefillTime: number;
  private enableLogging: boolean;

  // Statistics
  private totalRequests: number = 0;
  private rejectedRequests: number = 0;

  constructor(config: RateLimiterConfig) {
    // Calculate max tokens (burst capacity)
    this.maxTokens = config.maxBurst || config.maxRequestsPerSecond || 10;

    // Calculate refill rate (tokens per second)
    if (config.maxRequestsPerSecond) {
      this.tokensPerSecond = config.maxRequestsPerSecond;
    } else if (config.maxRequestsPerMinute) {
      this.tokensPerSecond = config.maxRequestsPerMinute / 60;
    } else {
      this.tokensPerSecond = 10; // Default: 10 req/s
    }

    this.currentTokens = this.maxTokens;
    this.lastRefillTime = Date.now();
    this.enableLogging = config.enableLogging || false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;

    if (elapsedSeconds > 0) {
      const tokensToAdd = elapsedSeconds * this.tokensPerSecond;
      this.currentTokens = Math.min(this.maxTokens, this.currentTokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  /**
   * Try to acquire a token
   * Returns true if successful, false if rate limit exceeded
   */
  public tryAcquire(tokens: number = 1): boolean {
    this.refill();
    this.totalRequests++;

    if (this.currentTokens >= tokens) {
      this.currentTokens -= tokens;
      return true;
    }

    this.rejectedRequests++;
    return false;
  }

  /**
   * Wait until a token is available, then acquire it
   * Returns delay in milliseconds
   */
  public async acquire(tokens: number = 1): Promise<number> {
    this.refill();
    this.totalRequests++;

    if (this.currentTokens >= tokens) {
      this.currentTokens -= tokens;
      return 0; // No delay needed
    }

    // Calculate wait time
    const tokensNeeded = tokens - this.currentTokens;
    const waitTimeMs = (tokensNeeded / this.tokensPerSecond) * 1000;

    if (this.enableLogging) {
      console.log(`[RateLimiter] Waiting ${waitTimeMs.toFixed(0)}ms for tokens`);
    }

    // Wait and refill
    await this.sleep(waitTimeMs);
    this.refill();
    this.currentTokens -= tokens;

    return waitTimeMs;
  }

  /**
   * Get current statistics
   */
  public getStats(): RateLimiterStats {
    this.refill();
    return {
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests,
      currentTokens: Math.floor(this.currentTokens * 100) / 100,
      maxTokens: this.maxTokens,
      refillRate: this.tokensPerSecond,
    };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.totalRequests = 0;
    this.rejectedRequests = 0;
  }

  /**
   * Reset tokens to maximum
   */
  public reset(): void {
    this.currentTokens = this.maxTokens;
    this.lastRefillTime = Date.now();
    this.resetStats();
  }

  /**
   * Get estimated wait time for acquiring tokens
   */
  public getEstimatedWaitTime(tokens: number = 1): number {
    this.refill();

    if (this.currentTokens >= tokens) {
      return 0;
    }

    const tokensNeeded = tokens - this.currentTokens;
    return (tokensNeeded / this.tokensPerSecond) * 1000;
  }

  /**
   * Check if tokens are available without consuming them
   */
  public hasTokens(tokens: number = 1): boolean {
    this.refill();
    return this.currentTokens >= tokens;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Multi-tier Rate Limiter
 * Enforces multiple rate limits (e.g., per second AND per minute)
 */
export class MultiTierRateLimiter {
  private limiters: RateLimiter[];
  private names: string[];

  constructor(configs: Array<{ name: string; config: RateLimiterConfig }>) {
    this.limiters = configs.map((c) => new RateLimiter(c.config));
    this.names = configs.map((c) => c.name);
  }

  /**
   * Try to acquire tokens from all limiters
   */
  public tryAcquire(tokens: number = 1): boolean {
    // Check all limiters first (don't consume tokens yet)
    for (const limiter of this.limiters) {
      if (!limiter.hasTokens(tokens)) {
        return false;
      }
    }

    // All limiters have tokens, consume them
    for (const limiter of this.limiters) {
      limiter.tryAcquire(tokens);
    }

    return true;
  }

  /**
   * Wait and acquire tokens from all limiters
   */
  public async acquire(tokens: number = 1): Promise<number> {
    let maxDelay = 0;

    for (const limiter of this.limiters) {
      const delay = await limiter.acquire(tokens);
      maxDelay = Math.max(maxDelay, delay);
    }

    return maxDelay;
  }

  /**
   * Get statistics for all limiters
   */
  public getAllStats(): Array<{ name: string; stats: RateLimiterStats }> {
    return this.limiters.map((limiter, i) => ({
      name: this.names[i],
      stats: limiter.getStats(),
    }));
  }

  /**
   * Reset all limiters
   */
  public reset(): void {
    this.limiters.forEach((limiter) => limiter.reset());
  }
}
