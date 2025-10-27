import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { MetricsService } from './metrics.service';
import { HealthService } from './health.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [LoggerService, MetricsService, HealthService],
  exports: [LoggerService, MetricsService, HealthService],
})
export class MonitoringModule {}
