import { SetMetadata } from '@nestjs/common';
import { RateLimitOptions, RATE_LIMIT_METADATA } from '../rate-limit.guard';

export const RATE_LIMIT_KEY = 'rate_limit';
export const THROTTLE_SKIP_KEY = 'skip_throttle';

// Note: Importing decorators from throttler.guard causes conflicts, removed

// Re-export RateLimitOptions for consistency
export type { RateLimitOptions } from '../rate-limit.guard';

// Main rate limiting decorators using the enhanced guard
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_METADATA, options);

export const SkipRateLimit = () => SetMetadata(THROTTLE_SKIP_KEY, true);

// Predefined rate limit decorators
export const StandardRateLimit = () => RateLimit({
  points: 100,
  duration: 60, // 1 minute
});

export const AuthRateLimit = () => RateLimit({
  points: 5,
  duration: 60 * 15, // 15 minutes
  blockDuration: 60 * 15, // 15 minutes block
});

export const ApiRateLimit = () => RateLimit({
  points: 100,
  duration: 60, // 1 minute
  blockDuration: 60 * 5, // 5 minutes block
});

export const StrictRateLimit = () => RateLimit({
  points: 10,
  duration: 60, // 1 minute
  blockDuration: 60 * 10, // 10 minutes block
});

export const UploadRateLimit = () => RateLimit({
  points: 20,
  duration: 60 * 60, // 1 hour
  blockDuration: 60 * 30, // 30 minutes block
});

export const SearchRateLimit = () => RateLimit({
  points: 30,
  duration: 60, // 1 minute
  blockDuration: 60 * 2, // 2 minutes block
});

// Legacy aliases for backward compatibility
export const LegacyAuthRateLimit = () => AuthRateLimit();
export const LegacyStandardRateLimit = () => StandardRateLimit();

