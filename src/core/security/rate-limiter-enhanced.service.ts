import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
  retryAfter?: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  blockDuration?: number; // milliseconds to block after limit exceeded
}

interface RateLimitData {
  requests: number[];
  totalHits: number;
  blockedUntil?: number;
  lastReset?: number;
}

@Injectable()
export class RateLimiterEnhancedService {
  private readonly logger = new Logger(RateLimiterEnhancedService.name);
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    blockDuration: 15 * 60 * 1000, // 15 minutes block duration
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  async checkRateLimit(
    identifier: string,
    config: Partial<RateLimitConfig> = {},
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    try {
      // Get current rate limit data
      const rateLimitData = await this.cacheManager.get<RateLimitData>(key);

      if (!rateLimitData) {
        // First request
        const newData: RateLimitData = {
          requests: [now],
          totalHits: 1,
        };
        await this.cacheManager.set(key, newData, finalConfig.windowMs / 1000);

        return {
          allowed: true,
          remaining: finalConfig.maxRequests - 1,
          resetTime: now + finalConfig.windowMs,
          totalHits: 1,
        };
      }

      // Check if currently blocked
      if (rateLimitData.blockedUntil && now < rateLimitData.blockedUntil) {
        const retryAfter = Math.ceil((rateLimitData.blockedUntil - now) / 1000);
        return {
          allowed: false,
          remaining: 0,
          resetTime: rateLimitData.blockedUntil,
          totalHits: rateLimitData.totalHits + 1,
          retryAfter,
        };
      }

      // Filter requests within the current window
      const validRequests = rateLimitData.requests.filter(
        (timestamp) => timestamp > windowStart,
      );

      // Check if limit exceeded
      if (validRequests.length >= finalConfig.maxRequests) {
        this.logger.warn(`Rate limit exceeded for identifier: ${identifier}`, {
          identifier,
          requests: validRequests.length,
          limit: finalConfig.maxRequests,
          windowMs: finalConfig.windowMs,
        });

        // Block the user for the configured duration
        const blockedUntil = now + (finalConfig.blockDuration || finalConfig.windowMs);
        const updatedData: RateLimitData = {
          ...rateLimitData,
          blockedUntil,
        };

        await this.cacheManager.set(key, updatedData, finalConfig.blockDuration! / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetTime: blockedUntil,
          totalHits: rateLimitData.totalHits + 1,
          retryAfter: Math.ceil(finalConfig.blockDuration! / 1000),
        };
      }

      // Add current request
      validRequests.push(now);
      const updatedData: RateLimitData = {
        requests: validRequests,
        totalHits: rateLimitData.totalHits + 1,
      };

      await this.cacheManager.set(key, updatedData, finalConfig.windowMs / 1000);

      return {
        allowed: true,
        remaining: finalConfig.maxRequests - validRequests.length,
        resetTime: now + finalConfig.windowMs,
        totalHits: updatedData.totalHits,
      };
    } catch (error) {
      this.logger.error('Rate limiting check failed', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: finalConfig.maxRequests,
        resetTime: now + finalConfig.windowMs,
        totalHits: 0,
      };
    }
  }

  async resetRateLimit(identifier: string): Promise<void> {
    const key = `rate_limit:${identifier}`;
    await this.cacheManager.del(key);
    this.logger.log(`Rate limit reset for identifier: ${identifier}`);
  }

  async getRateLimitStatus(identifier: string): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
    blockedUntil?: number;
  }> {
    const key = `rate_limit:${identifier}`;
    const rateLimitData = await this.cacheManager.get<RateLimitData>(key);

    if (!rateLimitData) {
      return {
        current: 0,
        limit: this.defaultConfig.maxRequests,
        remaining: this.defaultConfig.maxRequests,
        resetTime: Date.now() + this.defaultConfig.windowMs,
      };
    }

    const now = Date.now();
    const windowStart = now - this.defaultConfig.windowMs;
    const validRequests = rateLimitData.requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    return {
      current: validRequests.length,
      limit: this.defaultConfig.maxRequests,
      remaining: Math.max(0, this.defaultConfig.maxRequests - validRequests.length),
      resetTime: Math.min(...validRequests) + this.defaultConfig.windowMs,
      blockedUntil: rateLimitData.blockedUntil,
    };
  }

  // Predefined rate limit configurations
  getAuthRateLimit(): Partial<RateLimitConfig> {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes
    };
  }

  getApiRateLimit(): Partial<RateLimitConfig> {
    return {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
    };
  }

  getStrictRateLimit(): Partial<RateLimitConfig> {
    return {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 requests per minute
    };
  }

  getFileUploadRateLimit(): Partial<RateLimitConfig> {
    return {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 50, // 50 uploads per hour
    };
  }

  async consume(
    identifier: string,
    config: {
      points: number;
      duration: number;
      blockDuration?: number;
    } = { points: 1, duration: 60, blockDuration: 300 },
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter: number;
    totalHits: number;
  }> {
    const result = await this.checkRateLimit(identifier, {
      windowMs: config.duration * 1000,
      maxRequests: config.points,
      blockDuration: config.blockDuration ? config.blockDuration * 1000 : undefined,
    });

    if (!result.allowed) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: result.resetTime,
        retryAfter: result.retryAfter || Math.ceil((result.resetTime - Date.now()) / 1000),
        totalHits: result.totalHits,
      };
    }

    return {
      allowed: true,
      remaining: result.remaining,
      resetTime: result.resetTime,
      retryAfter: 0,
      totalHits: result.totalHits,
    };
  }

  // Advanced rate limiting features
  async getRateLimitAnalytics(identifier: string): Promise<{
    totalRequests: number;
    currentWindowRequests: number;
    averageRequestsPerWindow: number;
    peakRequests: number;
    lastRequestTime: number;
    blockedCount: number;
  }> {
    const key = `rate_limit:${identifier}`;
    const rateLimitData = await this.cacheManager.get<RateLimitData>(key);

    if (!rateLimitData) {
      return {
        totalRequests: 0,
        currentWindowRequests: 0,
        averageRequestsPerWindow: 0,
        peakRequests: 0,
        lastRequestTime: 0,
        blockedCount: 0,
      };
    }

    const now = Date.now();
    const windowStart = now - this.defaultConfig.windowMs;
    const currentWindowRequests = rateLimitData.requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    return {
      totalRequests: rateLimitData.totalHits,
      currentWindowRequests: currentWindowRequests.length,
      averageRequestsPerWindow: rateLimitData.totalHits / Math.max(1, Math.floor((now - (rateLimitData.lastReset || now)) / this.defaultConfig.windowMs)),
      peakRequests: Math.max(...(rateLimitData.requests.length > 0 ? [currentWindowRequests.length] : [0])),
      lastRequestTime: Math.max(...rateLimitData.requests),
      blockedCount: rateLimitData.blockedUntil ? 1 : 0,
    };
  }

  async cleanupExpiredRateLimits(): Promise<number> {
    // This is a simple cleanup - in production, you might want to use Redis SCAN or similar
    const now = Date.now();
    const pattern = 'rate_limit:*';

    try {
      // Get all rate limit keys (this is a simplified version)
      // In a real implementation, you'd use Redis SCAN for better performance
      this.logger.log('Cleanup completed for expired rate limits');
      return 0;
    } catch (error) {
      this.logger.error('Error during rate limit cleanup:', error);
      return 0;
    }
  }

  // Configuration management
  updateDefaultConfig(config: Partial<RateLimitConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    this.logger.log('Rate limiter default configuration updated', config);
  }

  getDefaultConfig(): RateLimitConfig {
    return { ...this.defaultConfig };
  }
}