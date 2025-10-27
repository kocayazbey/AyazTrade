import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterEnhancedService } from '../security/rate-limiter-enhanced.service';
import { IPFilterService } from '../security/ip-filter.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(
    private rateLimiterService: RateLimiterEnhancedService,
    private ipFilterService: IPFilterService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Check IP filter first
      const ip = this.getClientIp(req);
      const ipCheck = await this.ipFilterService.isAllowed(ip);
      if (!ipCheck.allowed) {
        res.status(403).json({
          success: false,
          message: ipCheck.reason || 'Access denied',
          error: 'Forbidden',
        });
        return;
      }

      // Generate rate limit key
      const user = req.user?.id || 'anonymous';
      const route = `${req.method}:${req.route?.path || req.url}`;
      const key = `${ip}:${user}:${route}`;

      // Check rate limit using default configuration
      const result = await this.rateLimiterService.checkRateLimit(key, {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        blockDuration: 60 * 1000, // 1 minute block
      });

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', '100');
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      res.setHeader('X-RateLimit-Window', '60');

      if (!result.allowed) {
        // Track suspicious activity
        await this.ipFilterService.trackSuspiciousActivity(ip);

        res.status(429).json({
          success: false,
          message: `Too many requests. Try again in ${result.retryAfter || 60} seconds.`,
          retryAfter: result.retryAfter || 60,
          limit: 100,
          remaining: 0,
          resetTime: new Date(result.resetTime).toISOString(),
        });
        return;
      }

      next();
    } catch (error) {
      // If rate limiting fails, allow request to proceed
      console.error('Rate limit middleware error:', error);
      next();
    }
  }

  private getClientIp(req: Request): string {
    return (
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.headers['x-real-ip']?.toString() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }
}

