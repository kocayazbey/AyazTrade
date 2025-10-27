import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
  onLimitReached?: (req: Request, res: Response) => void; // Callback when limit is reached
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
  remaining: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get rate limit configuration from decorator or use defaults
    const config = this.getRateLimitConfig(context) || this.defaultConfig;

    // Generate unique key for this request
    const key = this.generateKey(request, config);

    try {
      const rateLimitInfo = await this.getRateLimitInfo(key, config);
      
      // Check if limit is exceeded
      if (rateLimitInfo.count >= config.maxRequests) {
        this.handleRateLimitExceeded(request, response, rateLimitInfo, config);
        return false;
      }

      // Increment counter
      await this.incrementCounter(key, config);

      // Set rate limit headers
      this.setRateLimitHeaders(response, rateLimitInfo, config);

      return true;
    } catch (error) {
      this.logger.error('Rate limit check failed', error);
      // Allow request to proceed if rate limiting fails
      return true;
    }
  }

  private getRateLimitConfig(context: ExecutionContext): RateLimitConfig | null {
    // Check for @RateLimit decorator
    const rateLimitConfig = this.reflector.get<RateLimitConfig>('rateLimit', context.getHandler());
    if (rateLimitConfig) {
      return { ...this.defaultConfig, ...rateLimitConfig };
    }

    // Check for @RateLimit decorator on class
    const classRateLimitConfig = this.reflector.get<RateLimitConfig>('rateLimit', context.getClass());
    if (classRateLimitConfig) {
      return { ...this.defaultConfig, ...classRateLimitConfig };
    }

    return null;
  }

  private generateKey(request: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(request);
    }

    // Default key generation based on IP and user
    const ip = this.getClientIp(request);
    const userId = (request as any).user?.id;
    const userAgent = request.headers['user-agent'] || 'unknown';

    // Create a more specific key for authenticated users
    if (userId) {
      return `rate_limit:user:${userId}:${ip}`;
    }

    return `rate_limit:ip:${ip}:${userAgent}`;
  }

  private getClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private async getRateLimitInfo(key: string, config: RateLimitConfig): Promise<RateLimitInfo> {
    const cached = await this.cacheService.get(key);
    
    if (!cached) {
      return {
        count: 0,
        resetTime: Date.now() + config.windowMs,
        remaining: config.maxRequests,
      };
    }

    const data = JSON.parse(cached);
    const now = Date.now();

    // Check if window has expired
    if (now >= data.resetTime) {
      return {
        count: 0,
        resetTime: now + config.windowMs,
        remaining: config.maxRequests,
      };
    }

    return {
      count: data.count,
      resetTime: data.resetTime,
      remaining: Math.max(0, config.maxRequests - data.count),
    };
  }

  private async incrementCounter(key: string, config: RateLimitConfig): Promise<void> {
    const cached = await this.cacheService.get(key);
    const now = Date.now();

    if (!cached) {
      const data = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      await this.cacheService.set(key, JSON.stringify(data), config.windowMs / 1000);
    } else {
      const data = JSON.parse(cached);
      
      if (now >= data.resetTime) {
        // Window expired, reset counter
        const newData = {
          count: 1,
          resetTime: now + config.windowMs,
        };
        await this.cacheService.set(key, JSON.stringify(newData), config.windowMs / 1000);
      } else {
        // Increment counter
        data.count++;
        await this.cacheService.set(key, JSON.stringify(data), Math.ceil((data.resetTime - now) / 1000));
      }
    }
  }

  private setRateLimitHeaders(response: Response, rateLimitInfo: RateLimitInfo, config: RateLimitConfig): void {
    const remaining = Math.max(0, config.maxRequests - rateLimitInfo.count);
    const resetTime = Math.ceil(rateLimitInfo.resetTime / 1000);

    response.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    response.setHeader('X-RateLimit-Remaining', remaining.toString());
    response.setHeader('X-RateLimit-Reset', resetTime.toString());
    response.setHeader('X-RateLimit-Window', config.windowMs.toString());
  }

  private handleRateLimitExceeded(
    request: Request,
    response: Response,
    rateLimitInfo: RateLimitInfo,
    config: RateLimitConfig,
  ): void {
    const ip = this.getClientIp(request);
    const userId = (request as any).user?.id;

    this.logger.warn(
      `Rate limit exceeded for ${userId ? `user ${userId}` : `IP ${ip}`}`,
      {
        ip,
        userId,
        path: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        count: rateLimitInfo.count,
        limit: config.maxRequests,
        resetTime: rateLimitInfo.resetTime,
      },
    );

    // Call custom handler if provided
    if (config.onLimitReached) {
      config.onLimitReached(request, response);
    }

    // Set rate limit headers
    this.setRateLimitHeaders(response, rateLimitInfo, config);

    // Throw rate limit exception
    throw new HttpException(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          statusCode: 429,
          details: {
            limit: config.maxRequests,
            remaining: 0,
            resetTime: rateLimitInfo.resetTime,
            retryAfter: Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000),
          },
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // Utility methods for manual rate limit management
  async getRateLimitStatus(key: string): Promise<RateLimitInfo | null> {
    const cached = await this.cacheService.get(key);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const now = Date.now();

    if (now >= data.resetTime) {
      return null; // Window expired
    }

    return {
      count: data.count,
      resetTime: data.resetTime,
      remaining: Math.max(0, this.defaultConfig.maxRequests - data.count),
    };
  }

  async resetRateLimit(key: string): Promise<void> {
    await this.cacheService.del(key);
  }

  async getRateLimitKeys(pattern: string = 'rate_limit:*'): Promise<string[]> {
    return this.cacheService.keys(pattern);
  }
}
