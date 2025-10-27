import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface CashCycleMetrics {
  periodStart: Date;
  periodEnd: Date;
  daysSalesOutstanding: number; // DSO - Days to collect receivables
  daysInventoryOutstanding: number; // DIO - Days inventory sits
  daysPayableOutstanding: number; // DPO - Days to pay suppliers
  cashToCashCycle: number; // DSO + DIO - DPO
  improvement: number;
}

@Injectable()
export class CashToCashCycleService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async calculateCashCycle(
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<CashCycleMetrics> {
    // Calculate DSO, DIO, DPO from financial data
    const dso = await this.calculateDSO(startDate, endDate, tenantId);
    const dio = await this.calculateDIO(startDate, endDate, tenantId);
    const dpo = await this.calculateDPO(startDate, endDate, tenantId);

    const cashCycle = dso + dio - dpo;

    return {
      periodStart: startDate,
      periodEnd: endDate,
      daysSalesOutstanding: dso,
      daysInventoryOutstanding: dio,
      daysPayableOutstanding: dpo,
      cashToCashCycle: cashCycle,
      improvement: 0,
    };
  }

  private async calculateDSO(startDate: Date, endDate: Date, tenantId: string): Promise<number> {
    // DSO = (Accounts Receivable / Total Credit Sales) * Number of Days
    // Would query from erp_transactions and customer payments
    return 45; // Mock: Industry average is 30-60 days
  }

  private async calculateDIO(startDate: Date, endDate: Date, tenantId: string): Promise<number> {
    // DIO = (Average Inventory / COGS) * Number of Days
    // Would query from wms_inventory and erp_transactions
    return 30; // Mock: Good inventory turnover
  }

  private async calculateDPO(startDate: Date, endDate: Date, tenantId: string): Promise<number> {
    // DPO = (Accounts Payable / COGS) * Number of Days
    // Would query from erp_transactions (supplier payments)
    return 40; // Mock: Payment terms to suppliers
  }

  async getTrendAnalysis(
    months: number,
    tenantId: string,
  ): Promise<Array<CashCycleMetrics>> {
    const trends: CashCycleMetrics[] = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const endDate = new Date(now.getFullYear(), now.getMonth() - i, 0);
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      const metrics = await this.calculateCashCycle(startDate, endDate, tenantId);
      trends.push(metrics);
    }
    
    return trends;
  }
}

