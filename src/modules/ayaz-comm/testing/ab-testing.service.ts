import { Injectable, Logger } from '@nestjs/common';

interface ABTest {
  id: string;
  name: string;
  description: string;
  type: 'page' | 'price' | 'promotion' | 'email' | 'feature';
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABVariant[];
  targeting: {
    audience?: string;
    trafficAllocation: number;
    deviceType?: string[];
    location?: string[];
  };
  metrics: {
    primaryMetric: string;
    secondaryMetrics?: string[];
  };
  startDate: Date;
  endDate?: Date;
  minSampleSize: number;
  confidenceLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ABVariant {
  id: string;
  name: string;
  description?: string;
  trafficAllocation: number;
  isControl: boolean;
  config: Record<string, any>;
  metrics: {
    impressions: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    bounceRate?: number;
    avgTimeOnPage?: number;
  };
}

interface ABTestAssignment {
  testId: string;
  variantId: string;
  customerId: string;
  assignedAt: Date;
  converted: boolean;
  convertedAt?: Date;
  revenueGenerated?: number;
}

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);
  private tests: Map<string, ABTest> = new Map();
  private assignments: Map<string, Map<string, ABTestAssignment>> = new Map();

  constructor() {
    this.logger.log('AB Testing Service initialized');
  }

  async createTest(test: Partial<ABTest>): Promise<ABTest> {
    const newTest: ABTest = {
      id: `test_${Date.now()}`,
      name: test.name || '',
      description: test.description || '',
      type: test.type || 'page',
      status: test.status || 'draft',
      variants: test.variants || [],
      targeting: test.targeting || { trafficAllocation: 100 },
      metrics: test.metrics || { primaryMetric: 'conversion_rate' },
      startDate: test.startDate || new Date(),
      endDate: test.endDate,
      minSampleSize: test.minSampleSize || 1000,
      confidenceLevel: test.confidenceLevel || 95,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tests.set(newTest.id, newTest);
    this.assignments.set(newTest.id, new Map());
    this.logger.log(`AB test created: ${newTest.id}`);
    return newTest;
  }

  async getVariantForCustomer(testId: string, customerId: string): Promise<ABVariant> {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    const testAssignments = this.assignments.get(testId);
    const existing = testAssignments.get(customerId);

    if (existing) {
      return test.variants.find((v) => v.id === existing.variantId);
    }

    const variant = this.assignVariant(test, customerId);
    
    const assignment: ABTestAssignment = {
      testId,
      variantId: variant.id,
      customerId,
      assignedAt: new Date(),
      converted: false,
    };

    testAssignments.set(customerId, assignment);
    variant.metrics.impressions++;

    this.logger.debug(`Customer ${customerId} assigned to variant ${variant.name}`);
    return variant;
  }

  private assignVariant(test: ABTest, customerId: string): ABVariant {
    const hash = this.hashString(`${test.id}_${customerId}`);
    const normalized = hash / 0xffffffff;
    
    let cumulative = 0;
    for (const variant of test.variants) {
      cumulative += variant.trafficAllocation / 100;
      if (normalized <= cumulative) {
        return variant;
      }
    }

    return test.variants[0];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async trackConversion(testId: string, customerId: string, revenue?: number): Promise<void> {
    const testAssignments = this.assignments.get(testId);
    const assignment = testAssignments?.get(customerId);

    if (!assignment || assignment.converted) {
      return;
    }

    assignment.converted = true;
    assignment.convertedAt = new Date();
    assignment.revenueGenerated = revenue;

    const test = this.tests.get(testId);
    const variant = test?.variants.find((v) => v.id === assignment.variantId);

    if (variant) {
      variant.metrics.conversions++;
      variant.metrics.conversionRate = (variant.metrics.conversions / variant.metrics.impressions) * 100;
      if (revenue) {
        variant.metrics.revenue += revenue;
      }
    }

    this.logger.debug(`Conversion tracked for test ${testId}, customer ${customerId}`);
  }

  async getTestResults(testId: string): Promise<any> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const control = test.variants.find((v) => v.isControl);
    const results = test.variants.map((variant) => {
      const improvement = control 
        ? ((variant.metrics.conversionRate - control.metrics.conversionRate) / control.metrics.conversionRate) * 100
        : 0;

      const significance = this.calculateStatisticalSignificance(variant, control);

      return {
        variantId: variant.id,
        variantName: variant.name,
        impressions: variant.metrics.impressions,
        conversions: variant.metrics.conversions,
        conversionRate: variant.metrics.conversionRate.toFixed(2),
        revenue: variant.metrics.revenue,
        improvement: improvement.toFixed(2),
        isWinner: improvement > 0 && significance.isSignificant,
        confidence: significance.confidence,
        isSignificant: significance.isSignificant,
      };
    });

    return {
      testId: test.id,
      testName: test.name,
      status: test.status,
      startDate: test.startDate,
      endDate: test.endDate,
      results,
      winner: results.find((r) => r.isWinner),
    };
  }

  private calculateStatisticalSignificance(variant: ABVariant, control: ABVariant): { isSignificant: boolean; confidence: number } {
    if (!control) {
      return { isSignificant: false, confidence: 0 };
    }

    const p1 = variant.metrics.conversionRate / 100;
    const p2 = control.metrics.conversionRate / 100;
    const n1 = variant.metrics.impressions;
    const n2 = control.metrics.impressions;

    if (n1 < 30 || n2 < 30) {
      return { isSignificant: false, confidence: 0 };
    }

    const pooledProb = (variant.metrics.conversions + control.metrics.conversions) / (n1 + n2);
    const se = Math.sqrt(pooledProb * (1 - pooledProb) * (1/n1 + 1/n2));
    const zScore = Math.abs((p1 - p2) / se);

    const confidence = this.zScoreToConfidence(zScore);
    const isSignificant = confidence >= 95;

    return { isSignificant, confidence };
  }

  private zScoreToConfidence(zScore: number): number {
    if (zScore >= 2.576) return 99;
    if (zScore >= 1.960) return 95;
    if (zScore >= 1.645) return 90;
    if (zScore >= 1.282) return 80;
    return 0;
  }

  async stopTest(testId: string, winnerVariantId?: string): Promise<ABTest> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'completed';
    test.endDate = new Date();
    test.updatedAt = new Date();

    this.tests.set(testId, test);
    this.logger.log(`AB test stopped: ${testId}`);
    return test;
  }
}

