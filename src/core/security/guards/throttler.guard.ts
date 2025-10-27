import { Injectable, ExecutionContext, HttpException, HttpStatus, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

export const RATE_LIMIT_KEY = 'rate_limit';
export const THROTTLE_SKIP_KEY = 'skip_throttle';

export interface RateLimitOptions {
  points: number;
  duration: number; // in seconds
  blockDuration?: number; // in seconds
  keyGenerator?: (context: ExecutionContext) => string;
}

@Injectable()
export class ThrottlerGuardCustom implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if throttling is disabled for this endpoint
    const skipThrottle = this.reflector.get<boolean>(
      THROTTLE_SKIP_KEY,
      context.getHandler(),
    );

    if (skipThrottle) {
      return true;
    }

    // Get custom rate limit configuration
    const rateLimitConfig = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    // If no custom config, use default configuration
    const defaultConfig: RateLimitOptions = {
      points: 100,
      duration: 60, // 1 minute
      blockDuration: 300, // 5 minutes
    };

    const config = rateLimitConfig || defaultConfig;

    // Apply rate limiting logic
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const ip = this.getClientIp(request);
    const key = this.generateKey(context, ip, config.keyGenerator);

    // Check rate limit
    const result = await this.checkRateLimit(key, config);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', config.points);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', new Date(Date.now() + config.duration * 1000).toISOString());

    if (!result.allowed) {
      // Set retry-after header if blocked
      const retryAfter = config.duration;
      response.setHeader('Retry-After', retryAfter);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests. Try again in ${retryAfter} seconds.`,
          error: 'Too Many Requests',
          retryAfter,
          limit: config.points,
          remaining: 0,
          resetTime: new Date(Date.now() + config.duration * 1000).toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private async checkRateLimit(
    key: string,
    config: RateLimitOptions,
  ): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const now = Date.now();
      const windowStart = now - (config.duration * 1000);

      // Get current request data
      const requestData = await this.cacheManager.get<{
        requests: number[];
        totalHits: number;
      }>(key);

      if (!requestData) {
        // First request
        const newData = {
          requests: [now],
          totalHits: 1,
        };
        await this.cacheManager.set(key, newData, config.duration);

        return {
          allowed: true,
          remaining: config.points - 1,
        };
      }

      // Filter requests within the current window
      const validRequests = requestData.requests.filter(
        (timestamp) => timestamp > windowStart,
      );

      // Check if limit exceeded
      if (validRequests.length >= config.points) {
        return {
          allowed: false,
          remaining: 0,
        };
      }

      // Add current request
      validRequests.push(now);
      const updatedData = {
        requests: validRequests,
        totalHits: requestData.totalHits + 1,
      };

      await this.cacheManager.set(key, updatedData, config.duration);

      return {
        allowed: true,
        remaining: config.points - validRequests.length,
      };
    } catch (error) {
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: config.points,
      };
    }
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  private generateKey(
    context: ExecutionContext,
    ip: string,
    customKeyGenerator?: (context: ExecutionContext) => string,
  ): string {
    if (customKeyGenerator) {
      return customKeyGenerator(context);
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user?.id || 'anonymous';
    const route = `${request.method}:${request.route?.path || request.url}`;

    return `throttle:${ip}:${user}:${route}`;
  }
}

// Decorator functions for easy configuration
export const SkipThrottle = () => SetMetadata(THROTTLE_SKIP_KEY, true);

export const CustomRateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

// Predefined rate limit configurations
export const AuthRateLimit = () => CustomRateLimit({
  points: 5,
  duration: 60 * 15, // 5 requests per 15 minutes
  blockDuration: 60 * 15, // 15 minutes block
});

export const ApiRateLimit = () => CustomRateLimit({
  points: 100,
  duration: 60, // 100 requests per minute
  blockDuration: 60 * 5, // 5 minutes block
});

export const StrictRateLimit = () => CustomRateLimit({
  points: 10,
  duration: 60, // 10 requests per minute
  blockDuration: 60 * 10, // 10 minutes block
});

export const UploadRateLimit = () => CustomRateLimit({
  points: 20,
  duration: 60 * 60, // 20 uploads per hour
  blockDuration: 60 * 30, // 30 minutes block
});

export const SearchRateLimit = () => CustomRateLimit({
  points: 30,
  duration: 60, // 30 searches per minute
  blockDuration: 60 * 2, // 2 minutes block
});
