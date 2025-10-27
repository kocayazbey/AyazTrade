import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { ChurnPredictionService } from './churn-prediction.service';
import { FraudDetectionService } from './fraud-detection.service';
import { SentimentAnalysisService } from './sentiment-analysis.service';

@Module({
  controllers: [AIController],
  providers: [
    ChurnPredictionService,
    FraudDetectionService,
    SentimentAnalysisService,
  ],
  exports: [
    ChurnPredictionService,
    FraudDetectionService,
    SentimentAnalysisService,
  ],
})
export class AIModule {}

