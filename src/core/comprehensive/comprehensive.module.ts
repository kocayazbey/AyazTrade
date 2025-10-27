import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { 
  ValidationInterceptor, 
  CacheInterceptor, 
  AuditInterceptor, 
  PerformanceInterceptor 
} from '../interceptors';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { MetricsService } from '../metrics/metrics.service';

@Module({
  providers: [
    CacheService,
    AuditService,
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ValidationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
  exports: [
    CacheService,
    AuditService,
    MetricsService,
  ],
})
export class ComprehensiveModule {}
