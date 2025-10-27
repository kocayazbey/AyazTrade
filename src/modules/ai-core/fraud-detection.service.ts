import { Injectable } from '@nestjs/common';

@Injectable()
export class FraudDetectionService {
  async analyzTransaction(transactionId: string): Promise<{
    fraudScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    indicators: string[];
    recommendation: string;
  }> {
    return {
      fraudScore: 15,
      riskLevel: 'low',
      indicators: [],
      recommendation: 'Approve',
    };
  }
}

