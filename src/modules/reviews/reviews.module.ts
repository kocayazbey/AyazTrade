import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsManagementController } from './reviews-management.controller';
import { DatabaseModule } from '../../core/database/database.module';
import { CacheModule } from '../../core/cache/cache.module';
import { LoggerModule } from '../../core/logger/logger.module';

@Module({
  imports: [DatabaseModule, CacheModule, LoggerModule],
  controllers: [ReviewsManagementController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
