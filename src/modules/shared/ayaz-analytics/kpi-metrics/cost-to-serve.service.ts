import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface CostToServeAnalysis {
  customerId: string;
  period: { startDate: Date; endDate: Date };
  totalOrders: number;
  totalCost: number;
  costPerOrder: number;
  costBreakdown: {
    orderProcessing: number;
    warehousing: number;
    picking: number;
    packing: number;
    shipping: number;
    returns: number;
    customerService: number;
  };
  costDrivers: Array<{
    driver: string;
    impact: number;
    percentage: number;
  }>;
  benchmark: {
    industryAverage: number;
    variance: number;
    status: 'below_average' | 'average' | 'above_average';
  };
}

@Injectable()
export class CostToServeService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async calculateCostToServe(
    customerId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<CostToServeAnalysis> {
    // Would query from orders, wms operations, and costs
    const totalOrders = 500; // Mock
    
    const costBreakdown = {
      orderProcessing: 2500,
      warehousing: 8000,
      picking: 6000,
      packing: 4500,
      shipping: 12000,
      returns: 2000,
      customerService: 1500,
    };

    const totalCost = Object.values(costBreakdown).reduce((sum, val) => sum + val, 0);
    const costPerOrder = totalCost / totalOrders;

    const costDrivers = Object.entries(costBreakdown).map(([driver, cost]) => ({
      driver,
      impact: cost,
      percentage: (cost / totalCost) * 100,
    })).sort((a, b) => b.impact - a.impact);

    const industryAverage = 75;
    const variance = ((costPerOrder - industryAverage) / industryAverage) * 100;

    let status: 'below_average' | 'average' | 'above_average' = 'average';
    if (variance < -10) status = 'below_average';
    if (variance > 10) status = 'above_average';

    return {
      customerId,
      period: { startDate, endDate },
      totalOrders,
      totalCost,
      costPerOrder: Math.round(costPerOrder * 100) / 100,
      costBreakdown,
      costDrivers,
      benchmark: {
        industryAverage,
        variance: Math.round(variance * 100) / 100,
        status,
      },
    };
  }

  async identifyCostReductionOpportunities(
    customerId: string,
    tenantId: string,
  ): Promise<Array<{
    opportunity: string;
    currentCost: number;
    potentialSavings: number;
    recommendation: string;
  }>> {
    return [
      {
        opportunity: 'Optimize picking routes',
        currentCost: 6000,
        potentialSavings: 900,
        recommendation: 'Implement zone picking and batch orders',
      },
      {
        opportunity: 'Reduce returns processing',
        currentCost: 2000,
        potentialSavings: 600,
        recommendation: 'Improve quality control at packing',
      },
      {
        opportunity: 'Automate order processing',
        currentCost: 2500,
        potentialSavings: 750,
        recommendation: 'Integrate with e-commerce platform',
      },
    ];
  }
}

