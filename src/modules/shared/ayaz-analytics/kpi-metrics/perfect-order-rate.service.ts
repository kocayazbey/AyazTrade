import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface PerfectOrderMetrics {
  totalOrders: number;
  perfectOrders: number;
  perfectOrderRate: number;
  defects: {
    wrongItem: number;
    wrongQuantity: number;
    damaged: number;
    lateDelivery: number;
    documentationError: number;
  };
  breakdown: {
    onTime: number;
    complete: number;
    undamaged: number;
    correctDocumentation: number;
  };
}

@Injectable()
export class PerfectOrderRateService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async calculatePerfectOrderRate(
    startDate: Date,
    endDate: Date,
    customerId?: string,
    tenantId?: string,
  ): Promise<PerfectOrderMetrics> {
    // Would query from orders and return records
    const totalOrders = 1000;
    const defects = {
      wrongItem: 15,
      wrongQuantity: 25,
      damaged: 10,
      lateDelivery: 35,
      documentationError: 8,
    };

    const totalDefects = Object.values(defects).reduce((sum, val) => sum + val, 0);
    const perfectOrders = totalOrders - totalDefects;
    const perfectOrderRate = (perfectOrders / totalOrders) * 100;

    return {
      totalOrders,
      perfectOrders,
      perfectOrderRate: Math.round(perfectOrderRate * 100) / 100,
      defects,
      breakdown: {
        onTime: ((totalOrders - defects.lateDelivery) / totalOrders) * 100,
        complete: ((totalOrders - defects.wrongQuantity) / totalOrders) * 100,
        undamaged: ((totalOrders - defects.damaged) / totalOrders) * 100,
        correctDocumentation: ((totalOrders - defects.documentationError) / totalOrders) * 100,
      },
    };
  }

  async getPerfectOrderTrend(
    months: number,
    tenantId: string,
  ): Promise<Array<{ month: string; rate: number }>> {
    // Calculate monthly trend
    const trends = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
      
      // Mock rate - would calculate from actual data
      const rate = 90 + Math.random() * 8;
      trends.push({ month: monthName, rate: Math.round(rate * 100) / 100 });
    }
    
    return trends;
  }

  async getDefectAnalysis(
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<Array<{
    defectType: string;
    count: number;
    percentage: number;
    cost: number;
  }>> {
    // Detailed defect analysis for improvement
    return [
      { defectType: 'Late Delivery', count: 35, percentage: 3.5, cost: 5250 },
      { defectType: 'Wrong Quantity', count: 25, percentage: 2.5, cost: 3750 },
      { defectType: 'Wrong Item', count: 15, percentage: 1.5, cost: 4500 },
      { defectType: 'Damaged', count: 10, percentage: 1.0, cost: 3000 },
      { defectType: 'Documentation Error', count: 8, percentage: 0.8, cost: 1200 },
    ];
  }
}

