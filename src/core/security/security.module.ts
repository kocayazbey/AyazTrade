import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '../cache/cache.module';
import { IPFilterService } from './ip-filter.service';
import { RateLimiterEnhancedService } from './rate-limiter-enhanced.service';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimitingService } from './rate-limiting.service';
import { SessionManagementService } from './session-management.service';
import { DatabaseModule } from '../../database/database.module';
import { EnhancedThrottlerGuard } from './guards/enhanced-throttler.guard';
import { ThrottlerGuardCustom } from './guards/throttler.guard';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [
    CacheModule,
    DatabaseModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    // Guards
    EnhancedThrottlerGuard,
    ThrottlerGuardCustom,
    RateLimitGuard,

    // Services
    IPFilterService,
    RateLimiterEnhancedService,
    RateLimiterService,
    RateLimitingService,
    SessionManagementService,

    // Global guard (using enhanced throttler as default)
    {
      provide: APP_GUARD,
      useClass: EnhancedThrottlerGuard,
    },
  ],
  exports: [
    // Guards
    EnhancedThrottlerGuard,
    ThrottlerGuardCustom,
    RateLimitGuard,

    // Services
    IPFilterService,
    RateLimiterEnhancedService,
    RateLimiterService,
    RateLimitingService,
    SessionManagementService,
  ],
})
export class SecurityModule {}