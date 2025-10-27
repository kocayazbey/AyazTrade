import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEnhancedController } from './analytics-enhanced.controller';
import { FrontendAnalyticsDashboardService } from './frontend-analytics-dashboard.service';
import { CacheModule } from '../../core/cache/cache.module';
import { LoggerModule } from '../../core/logger/logger.module';
import { DatabaseModule } from '../../core/database/database.module';
import { PaginationModule } from '../../core/pagination/pagination.module';

@Module({
  imports: [
    DatabaseModule,
    CacheModule,
    LoggerModule,
    PaginationModule,
  ],
  controllers: [AnalyticsController, AnalyticsEnhancedController],
  providers: [AnalyticsService, FrontendAnalyticsDashboardService],
  exports: [AnalyticsService, FrontendAnalyticsDashboardService],
})
export class AnalyticsModule {}