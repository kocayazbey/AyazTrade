import { SetMetadata } from '@nestjs/common';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: any) => string; // Custom key generator
  onLimitReached?: (req: any, res: any) => void; // Callback when limit is reached
}

export const RATE_LIMIT_CONFIG = 'rateLimit';

export const RateLimit = (config: RateLimitConfig) => SetMetadata(RATE_LIMIT_CONFIG, config);