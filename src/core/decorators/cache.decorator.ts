import { SetMetadata } from '@nestjs/common';

export interface CacheOptions {
  key?: string; // Custom cache key
  ttl?: number; // Time to live in seconds
  condition?: (result: any, args: any[]) => boolean; // Conditional caching
  invalidate?: string[]; // Keys to invalidate on mutation
  tags?: string[]; // Cache tags for group invalidation
}

export const CACHE_OPTIONS = 'cacheOptions';

export const Cache = (options: CacheOptions) => SetMetadata(CACHE_OPTIONS, options);