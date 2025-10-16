// Rate limiter implementation for API clients

export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  minInterval?: number; // Minimum ms between requests
}

export class RateLimiter {
  private requests: number[] = [];
  private config: RateLimiterConfig;
  private lastRequestTime: number = 0;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();

    // Remove requests outside the window
    this.requests = this.requests.filter(
      time => now - time < this.config.windowMs
    );

    return this.requests.length < this.config.maxRequests;
  }

  async waitForReset(): Promise<void> {
    const now = Date.now();

    // Clean up old requests
    this.requests = this.requests.filter(
      time => now - time < this.config.windowMs
    );

    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.config.windowMs - (now - oldestRequest) + 100; // +100ms buffer

      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
      }
    }

    // Handle minimum interval between requests
    if (this.config.minInterval) {
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.config.minInterval) {
        const waitTime = this.config.minInterval - timeSinceLastRequest;
        await this.sleep(waitTime);
      }
    }
  }

  recordRequest(): void {
    this.requests.push(Date.now());
    this.lastRequestTime = Date.now();
  }

  getRemainingQuota(): number {
    const now = Date.now();
    this.requests = this.requests.filter(
      time => now - time < this.config.windowMs
    );
    return Math.max(0, this.config.maxRequests - this.requests.length);
  }

  reset(): void {
    this.requests = [];
    this.lastRequestTime = 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exponential backoff for retries
export class ExponentialBackoff {
  private attempt: number = 0;
  private readonly maxAttempts: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  constructor(maxAttempts: number = 3, baseDelay: number = 1000, maxDelay: number = 30000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  async execute<T>(fn: () => Promise<T>, retryableErrors?: string[]): Promise<T> {
    this.attempt = 0;

    while (true) {
      try {
        const result = await fn();
        this.attempt = 0; // Reset on success
        return result;
      } catch (error: any) {
        this.attempt++;

        // Check if error is retryable
        if (retryableErrors && retryableErrors.length > 0) {
          const isRetryable = retryableErrors.some(errMsg =>
            error.message?.includes(errMsg) || error.code?.includes(errMsg)
          );

          if (!isRetryable) {
            throw error;
          }
        }

        if (this.attempt >= this.maxAttempts) {
          throw new Error(`Max retry attempts (${this.maxAttempts}) exceeded: ${error.message}`);
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(2, this.attempt - 1),
          this.maxDelay
        );

        console.log(`Attempt ${this.attempt} failed. Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCurrentAttempt(): number {
    return this.attempt;
  }

  reset(): void {
    this.attempt = 0;
  }
}

// Helper to handle rate limit responses from APIs
export const handleRateLimitResponse = async (
  headers: Headers,
  limitHeader: string = 'x-ratelimit-limit',
  remainingHeader: string = 'x-ratelimit-remaining',
  resetHeader: string = 'x-ratelimit-reset'
): Promise<{
  limit: number;
  remaining: number;
  resetTime: number;
}> => {
  const limit = parseInt(headers.get(limitHeader) || '0');
  const remaining = parseInt(headers.get(remainingHeader) || '0');
  const reset = parseInt(headers.get(resetHeader) || '0');

  if (remaining === 0 && reset > 0) {
    const now = Math.floor(Date.now() / 1000);
    const waitTime = (reset - now) * 1000;

    if (waitTime > 0) {
      console.log(`Rate limit exceeded. Waiting ${waitTime}ms until reset...`);
      await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // +1s buffer
    }
  }

  return {
    limit,
    remaining,
    resetTime: reset,
  };
};
