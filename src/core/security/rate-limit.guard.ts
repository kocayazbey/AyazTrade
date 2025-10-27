import { Injectable, CanActivate, ExecutionContext, TooManyRequestsException, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { RateLimiterEnhancedService } from './rate-limiter-enhanced.service';
import { IPFilterService } from './ip-filter.service';

export const RATE_LIMIT_METADATA = 'rate_limit';

export interface RateLimitOptions {
  points: number;
  duration: number; // in seconds
  blockDuration?: number; // in seconds
  keyGenerator?: (context: ExecutionContext) => string;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rateLimiterService: RateLimiterEnhancedService,
    private ipFilterService: IPFilterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // Check IP filter first
    const ip = this.getClientIp(request);
    const ipCheck = await this.ipFilterService.isAllowed(ip);
    if (!ipCheck.allowed) {
      throw new TooManyRequestsException({
        message: ipCheck.reason || 'Access denied',
        error: 'Forbidden',
      });
    }

    // Get rate limit config from decorator
    const rateLimitConfig = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_METADATA,
      context.getHandler(),
    ) || this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_METADATA,
      context.getClass(),
    );

    // If no decorator, use default configuration
    const config = rateLimitConfig || this.getDefaultRateLimit(request);

    const key = config.keyGenerator
      ? config.keyGenerator(context)
      : this.getRateLimitKey(request);

    // Check rate limit using enhanced service
    const result = await this.rateLimiterService.checkRateLimit(key, {
      windowMs: config.duration * 1000,
      maxRequests: config.points,
      blockDuration: config.blockDuration ? config.blockDuration * 1000 : undefined,
    });

    // Set informative headers
    response.setHeader('X-RateLimit-Limit', String(config.points));
    response.setHeader('X-RateLimit-Remaining', String(result.remaining));
    response.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    response.setHeader('X-RateLimit-Window', String(config.duration));

    if (!result.allowed) {
      const retryAfter = result.retryAfter || config.duration;
      response.setHeader('Retry-After', String(retryAfter));

      // Track suspicious activity
      await this.ipFilterService.trackSuspiciousActivity(ip);

      throw new TooManyRequestsException({
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
        limit: config.points,
        remaining: 0,
        resetTime: new Date(result.resetTime).toISOString(),
      });
    }

    return true;
  }

  private getRateLimitKey(request: Request): string {
    const ip = this.getClientIp(request);
    const user = request.user?.id || 'anonymous';
    const route = `${request.method}:${request.route?.path || request.url}`;
    return `${ip}:${user}:${route}`;
  }

  private getDefaultRateLimit(request: Request): RateLimitOptions {
    const path = request.path;

    // Different limits for different endpoints
    if (path.includes('/auth/login') || path.includes('/auth/register')) {
      return {
        points: 5,
        duration: 60 * 15, // 15 minutes
        blockDuration: 60 * 15, // 15 minutes
      };
    }

    if (path.includes('/api/v1/products')) {
      return {
        points: 200,
        duration: 60,
      };
    }

    if (path.includes('/api/v1/orders')) {
      return {
        points: 50,
        duration: 60,
      };
    }

    if (path.includes('/api/')) {
      return {
        points: 100,
        duration: 60,
      };
    }

    if (path.includes('/admin/')) {
      return {
        points: 50,
        duration: 300, // 5 minutes
      };
    }

    return {
      points: 20,
      duration: 60,
    };
  }

  private getClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      request.headers['x-real-ip']?.toString() ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}