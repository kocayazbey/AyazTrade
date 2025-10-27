import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { reports } from '../../database/schema/reports.schema';
import { CacheService } from '../../core/cache/cache.service';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async generateSalesReport(tenantId: string, startDate: Date, endDate: Date) {
    try {
      const cacheKey = `sales_report:${tenantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      // In real implementation, this would query the database for sales data
      const reportData = {
        period: { startDate, endDate },
        summary: {
          totalSales: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          topProducts: [] as any[],
          salesByDay: [] as any[],
        },
        generatedAt: new Date(),
      };

      await this.cacheService.set(cacheKey, JSON.stringify(reportData), 3600); // Cache for 1 hour
      return reportData;
    } catch (error) {
      this.loggerService.error('Error generating sales report', (error as Error).stack);
      throw error;
    }
  }

  async generateCustomerReport(tenantId: string, startDate: Date, endDate: Date) {
    try {
      const cacheKey = `customer_report:${tenantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      const reportData = {
        period: { startDate, endDate },
        summary: {
          totalCustomers: 0,
          newCustomers: 0,
          returningCustomers: 0,
          customerSegments: [] as any[],
          topCustomers: [] as any[],
        },
        generatedAt: new Date(),
      };

      await this.cacheService.set(cacheKey, JSON.stringify(reportData), 3600);
      return reportData;
    } catch (error) {
      this.loggerService.error('Error generating customer report', (error as Error).stack);
      throw error;
    }
  }

  async generateInventoryReport(tenantId: string) {
    try {
      const cacheKey = `inventory_report:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      const reportData = {
        summary: {
          totalProducts: 0,
          lowStockProducts: 0,
          outOfStockProducts: 0,
          totalValue: 0,
          categories: [] as any[],
        },
        generatedAt: new Date(),
      };

      await this.cacheService.set(cacheKey, JSON.stringify(reportData), 1800); // Cache for 30 minutes
      return reportData;
    } catch (error) {
      this.loggerService.error('Error generating inventory report', (error as Error).stack);
      throw error;
    }
  }

  async saveReport(name: string, type: string, data: any, tenantId: string, userId: number) {
    try {
      const [saved] = await this.databaseService.drizzleClient
        .insert(reports)
        .values({
          name,
          type,
          data: data as any,
          tenantId,
          createdBy: userId as any,
          createdAt: new Date(),
        })
        .returning();

      return saved;
    } catch (error) {
      this.loggerService.error('Error saving report', (error as Error).stack);
      throw error;
    }
  }

  async getReports(tenantId: string, limit: number = 20) {
    try {
      return await this.databaseService.drizzleClient
        .select()
        .from(reports)
        .where(eq(reports.tenantId, tenantId as any))
        .orderBy(desc(reports.createdAt))
        .limit(limit);
    } catch (error) {
      this.loggerService.error('Error getting reports', (error as Error).stack);
      throw error;
    }
  }
}
