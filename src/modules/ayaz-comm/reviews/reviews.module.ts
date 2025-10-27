import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewModerationService } from './review-moderation.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewModerationService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
