import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  constructor(private readonly cacheService: CacheService) {}

  async checkRateLimit(
    key: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    const windowStart = Math.floor(now / finalConfig.windowMs) * finalConfig.windowMs;
    const cacheKey = `rate_limit:${key}:${windowStart}`;

    try {
      // Get current count
      const currentCount = await this.cacheService.get(cacheKey);
      const count = currentCount ? parseInt(currentCount.toString()) : 0;

      // Check if limit exceeded
      if (count >= finalConfig.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + finalConfig.windowMs,
          totalHits: count,
        };
      }

      // Increment counter
      const newCount = count + 1;
      await this.cacheService.set(
        cacheKey,
        newCount.toString(),
        Math.ceil(finalConfig.windowMs / 1000)
      );

      return {
        allowed: true,
        remaining: finalConfig.maxRequests - newCount,
        resetTime: windowStart + finalConfig.windowMs,
        totalHits: newCount,
      };
    } catch (error) {
      this.logger.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: finalConfig.maxRequests,
        resetTime: now + finalConfig.windowMs,
        totalHits: 0,
      };
    }
  }

  async checkLoginRateLimit(ip: string, email: string): Promise<RateLimitResult> {
    const key = `login:${ip}:${email}`;
    return this.checkRateLimit(key, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes
    });
  }

  async checkApiRateLimit(apiKey: string): Promise<RateLimitResult> {
    return this.checkRateLimit(`api:${apiKey}`, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute
    });
  }

  async checkPasswordResetRateLimit(ip: string, email: string): Promise<RateLimitResult> {
    const key = `password_reset:${ip}:${email}`;
    return this.checkRateLimit(key, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 password reset attempts per hour
    });
  }

  async checkEmailVerificationRateLimit(ip: string, email: string): Promise<RateLimitResult> {
    const key = `email_verification:${ip}:${email}`;
    return this.checkRateLimit(key, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1, // 1 email verification per minute
    });
  }

  async checkSmsRateLimit(phone: string): Promise<RateLimitResult> {
    const key = `sms:${phone}`;
    return this.checkRateLimit(key, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1, // 1 SMS per minute
    });
  }

  async checkFileUploadRateLimit(userId: string): Promise<RateLimitResult> {
    const key = `file_upload:${userId}`;
    return this.checkRateLimit(key, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 file uploads per minute
    });
  }

  async checkSearchRateLimit(userId: string): Promise<RateLimitResult> {
    const key = `search:${userId}`;
    return this.checkRateLimit(key, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 searches per minute
    });
  }

  async resetRateLimit(key: string): Promise<void> {
    const patterns = [
      `rate_limit:${key}:*`,
      `rate_limit:*:${key}:*`,
    ];

    for (const pattern of patterns) {
      await this.cacheService.del(pattern);
    }
  }

  async getRateLimitStatus(key: string): Promise<RateLimitResult | null> {
    const now = Date.now();
    const windowMs = this.defaultConfig.windowMs;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const cacheKey = `rate_limit:${key}:${windowStart}`;

    try {
      const currentCount = await this.cacheService.get(cacheKey);
      const count = currentCount ? parseInt(currentCount.toString()) : 0;

      return {
        allowed: count < this.defaultConfig.maxRequests,
        remaining: Math.max(0, this.defaultConfig.maxRequests - count),
        resetTime: windowStart + windowMs,
        totalHits: count,
      };
    } catch (error) {
      this.logger.error('Error getting rate limit status:', error);
      return null;
    }
  }
}
