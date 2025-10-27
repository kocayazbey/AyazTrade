import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { ChurnPredictionService } from './churn-prediction.service';
import { FraudDetectionService } from './fraud-detection.service';
import { SentimentAnalysisService } from './sentiment-analysis.service';

@ApiTags('AI & Machine Learning')
@Controller({ path: 'ai', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(
    private readonly churnPrediction: ChurnPredictionService,
    private readonly fraudDetection: FraudDetectionService,
    private readonly sentimentAnalysis: SentimentAnalysisService,
  ) {}

  @Get('churn-prediction/:customerId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Predict customer churn risk' })
  @ApiResponse({ status: 200, description: 'Churn prediction result' })
  async predictChurn(@Param('customerId') customerId: string) {
    return this.churnPrediction.predictChurn(customerId);
  }

  @Post('fraud-detection')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Analyze transaction for fraud' })
  @ApiResponse({ status: 200, description: 'Fraud analysis result' })
  async detectFraud(@Body() data: { transactionId: string }) {
    return this.fraudDetection.analyzTransaction(data.transactionId);
  }

  @Post('sentiment-analysis')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Analyze customer feedback sentiment' })
  @ApiResponse({ status: 200, description: 'Sentiment analysis result' })
  async analyzeSentiment(@Body() data: { feedback: string }) {
    return this.sentimentAnalysis.analyzeFeedback(data.feedback);
  }

  @Get('customer-insights/:customerId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get comprehensive customer AI insights' })
  @ApiResponse({ status: 200, description: 'Customer insights' })
  async getCustomerInsights(@Param('customerId') customerId: string) {
    const [churnRisk, sentiment] = await Promise.all([
      this.churnPrediction.predictChurn(customerId),
      // Additional insights can be added here
    ]);

    return {
      customerId,
      churnRisk,
      recommendations: churnRisk.retentionActions,
      healthScore: Math.round((1 - churnRisk.probability) * 100),
    };
  }
}

