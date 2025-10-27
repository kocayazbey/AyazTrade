import { Injectable } from '@nestjs/common';

@Injectable()
export class SentimentAnalysisService {
  async analyzeFeedback(feedback: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    topics: string[];
    urgency: 'low' | 'medium' | 'high';
  }> {
    return {
      sentiment: 'positive',
      score: 0.85,
      topics: ['service quality', 'delivery time'],
      urgency: 'low',
    };
  }
}

