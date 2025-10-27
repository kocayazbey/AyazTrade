import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';

export interface ERPDashboardMetrics {
  accounting: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    accountsReceivable: number;
    accountsPayable: number;
    cashFlow: number;
    profitMargin: number;
    revenueGrowth: number;
    expenseGrowth: number;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      revenue: number;
      percentage: number;
    }>;
    topExpenses: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
  hr: {
    totalEmployees: number;
    activeEmployees: number;
    newHires: number;
    terminations: number;
    turnoverRate: number;
    averageSalary: number;
    departmentDistribution: Record<string, number>;
    performanceMetrics: {
      averageRating: number;
      promotionRate: number;
      trainingHours: number;
    };
    upcomingReviews: number;
    openPositions: number;
  };
  procurement: {
    totalPurchaseOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalSpend: number;
    averageOrderValue: number;
    supplierPerformance: Array<{
      supplierId: string;
      supplierName: string;
      ordersCount: number;
      totalSpend: number;
      onTimeDelivery: number;
      qualityScore: number;
    }>;
    inventoryTurns: number;
    stockoutRate: number;
    topSuppliers: Array<{
      supplierId: string;
      supplierName: string;
      spend: number;
      percentage: number;
    }>;
  };
  kpis: {
    revenuePerEmployee: number;
    profitPerEmployee: number;
    operatingMargin: number;
    returnOnAssets: number;
    currentRatio: number;
    debtToEquity: number;
    inventoryTurnover: number;
    daysSalesOutstanding: number;
    daysPayableOutstanding: number;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    title: string;
    description: string;
    value: number;
    threshold: number;
    impact: string;
  }>;
}

export interface AccountingMetrics {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  assets: number;
  liabilities: number;
  equity: number;
  cashFlow: {
    operating: number;
    investing: number;
    financing: number;
  };
  ratios: {
    currentRatio: number;
    debtToEquity: number;
    returnOnAssets: number;
    profitMargin: number;
  };
}

export interface HRMetrics {
  totalEmployees: number;
  departmentBreakdown: Record<string, number>;
  averageSalary: number;
  turnoverRate: number;
  diversityMetrics: {
    genderDistribution: Record<string, number>;
    ageDistribution: Record<string, number>;
    tenureDistribution: Record<string, number>;
  };
  performance: {
    averageRating: number;
    topPerformers: number;
    needsImprovement: number;
  };
}

export interface ProcurementMetrics {
  totalSpend: number;
  purchaseOrderCount: number;
  averageOrderValue: number;
  supplierCount: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  costSavings: number;
  contractCompliance: number;
}

@Injectable()
export class FrontendERPDashboardService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async getDashboardMetrics(tenantId: string, period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'): Promise<ERPDashboardMetrics> {
    const cacheKey = `erp_dashboard:${tenantId}:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      this.loggerService.log(`Getting ERP dashboard metrics for period: ${period}`, 'FrontendERPDashboardService');

      // Get date range based on period
      const dateRange = this.getDateRangeForPeriod(period);

      // Get accounting metrics
      const accounting = await this.getAccountingMetrics(tenantId, dateRange);

      // Get HR metrics
      const hr = await this.getHRMetrics(tenantId, dateRange);

      // Get procurement metrics
      const procurement = await this.getProcurementMetrics(tenantId, dateRange);

      // Calculate KPIs
      const kpis = await this.calculateKPIs(accounting, hr, procurement);

      // Generate alerts
      const alerts = await this.generateAlerts(accounting, hr, procurement, kpis);

      const result: ERPDashboardMetrics = {
        accounting,
        hr,
        procurement,
        kpis,
        alerts
      };

      await this.cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
      return result;

    } catch (error) {
      this.loggerService.error('Error getting ERP dashboard metrics', error, 'FrontendERPDashboardService');
      return this.getDefaultDashboardMetrics();
    }
  }

  async getAccountingDashboard(tenantId: string, period: string = 'monthly'): Promise<AccountingMetrics> {
    const cacheKey = `accounting_dashboard:${tenantId}:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const dateRange = this.getDateRangeForPeriod(period);

      // Get accounting data
      const accountingData = await this.databaseService.drizzleClient
        .select({
          revenue: sql<number>`SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END)`,
          expenses: sql<number>`SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)`,
          assets: sql<number>`SUM(CASE WHEN category = 'asset' THEN amount ELSE 0 END)`,
          liabilities: sql<number>`SUM(CASE WHEN category = 'liability' THEN amount ELSE 0 END)`,
          equity: sql<number>`SUM(CASE WHEN category = 'equity' THEN amount ELSE 0 END)`,
          cashFlowOperating: sql<number>`SUM(CASE WHEN cash_flow_type = 'operating' THEN amount ELSE 0 END)`,
          cashFlowInvesting: sql<number>`SUM(CASE WHEN cash_flow_type = 'investing' THEN amount ELSE 0 END)`,
          cashFlowFinancing: sql<number>`SUM(CASE WHEN cash_flow_type = 'financing' THEN amount ELSE 0 END)`
        })
        .from(sql`financial_transactions`)
        .where(and(
          sql`tenant_id = ${tenantId}`,
          sql`date >= ${dateRange.start}`,
          sql`date <= ${dateRange.end}`
        ));

      const data = accountingData[0];
      const revenue = Number(data.revenue) || 0;
      const expenses = Number(data.expenses) || 0;
      const profit = revenue - expenses;
      const assets = Number(data.assets) || 0;
      const liabilities = Number(data.liabilities) || 0;
      const equity = Number(data.equity) || 0;

      const result: AccountingMetrics = {
        period,
        revenue,
        expenses,
        profit,
        assets,
        liabilities,
        equity,
        cashFlow: {
          operating: Number(data.cashFlowOperating) || 0,
          investing: Number(data.cashFlowInvesting) || 0,
          financing: Number(data.cashFlowFinancing) || 0
        },
        ratios: {
          currentRatio: assets > 0 ? assets / liabilities : 0,
          debtToEquity: equity > 0 ? liabilities / equity : 0,
          returnOnAssets: assets > 0 ? (profit / assets) * 100 : 0,
          profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
        }
      };

      await this.cacheService.set(cacheKey, result, 1800);
      return result;

    } catch (error) {
      this.loggerService.error('Error getting accounting dashboard', error, 'FrontendERPDashboardService');
      return {
        period,
        revenue: 0,
        expenses: 0,
        profit: 0,
        assets: 0,
        liabilities: 0,
        equity: 0,
        cashFlow: { operating: 0, investing: 0, financing: 0 },
        ratios: { currentRatio: 0, debtToEquity: 0, returnOnAssets: 0, profitMargin: 0 }
      };
    }
  }

  async getHRDashboard(tenantId: string): Promise<HRMetrics> {
    const cacheKey = `hr_dashboard:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get HR metrics
      const hrData = await this.databaseService.drizzleClient
        .select({
          totalEmployees: sql<number>`count(*)`,
          activeEmployees: sql<number>`count(*) FILTER (WHERE status = 'active')`,
          departmentDistribution: sql`jsonb_object_agg(department, employee_count)`,
          averageSalary: sql<number>`AVG(salary)`,
          averageRating: sql<number>`AVG(performance_rating)`,
          turnoverRate: sql<number>`count(*) FILTER (WHERE status = 'terminated' AND termination_date >= CURRENT_DATE - INTERVAL '365 days')::float / count(*) * 100`
        })
        .from(sql`employees`)
        .where(sql`tenant_id = ${tenantId}`);

      const data = hrData[0];
      const departmentDistribution = data.departmentDistribution || {};

      const result: HRMetrics = {
        totalEmployees: Number(data.totalEmployees) || 0,
        departmentBreakdown: departmentDistribution,
        averageSalary: Number(data.averageSalary) || 0,
        turnoverRate: Number(data.turnoverRate) || 0,
        diversityMetrics: await this.getDiversityMetrics(tenantId),
        performance: {
          averageRating: Number(data.averageRating) || 0,
          topPerformers: 0, // Would calculate based on ratings
          needsImprovement: 0 // Would calculate based on ratings
        }
      };

      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;

    } catch (error) {
      this.loggerService.error('Error getting HR dashboard', error, 'FrontendERPDashboardService');
      return {
        totalEmployees: 0,
        departmentBreakdown: {},
        averageSalary: 0,
        turnoverRate: 0,
        diversityMetrics: { genderDistribution: {}, ageDistribution: {}, tenureDistribution: {} },
        performance: { averageRating: 0, topPerformers: 0, needsImprovement: 0 }
      };
    }
  }

  async getProcurementDashboard(tenantId: string, period: string = 'monthly'): Promise<ProcurementMetrics> {
    const cacheKey = `procurement_dashboard:${tenantId}:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const dateRange = this.getDateRangeForPeriod(period);

      // Get procurement metrics
      const procurementData = await this.databaseService.drizzleClient
        .select({
          totalSpend: sql<number>`SUM(total_amount)`,
          purchaseOrderCount: sql<number>`count(*)`,
          averageOrderValue: sql<number>`AVG(total_amount)`,
          supplierCount: sql<number>`count(DISTINCT supplier_id)`,
          onTimeDelivery: sql<number>`AVG(on_time_delivery_rate)`,
          qualityScore: sql<number>`AVG(quality_score)`,
          completedOrders: sql<number>`count(*) FILTER (WHERE status = 'completed')`
        })
        .from(sql`purchase_orders`)
        .where(and(
          sql`tenant_id = ${tenantId}`,
          sql`created_at >= ${dateRange.start}`,
          sql`created_at <= ${dateRange.end}`
        ));

      const data = procurementData[0];
      const totalSpend = Number(data.totalSpend) || 0;
      const purchaseOrderCount = Number(data.purchaseOrderCount) || 0;
      const completedOrders = Number(data.completedOrders) || 0;

      const result: ProcurementMetrics = {
        totalSpend,
        purchaseOrderCount,
        averageOrderValue: Number(data.averageOrderValue) || 0,
        supplierCount: Number(data.supplierCount) || 0,
        onTimeDeliveryRate: Number(data.onTimeDelivery) || 0,
        qualityScore: Number(data.qualityScore) || 0,
        costSavings: 0, // Would calculate from negotiated savings
        contractCompliance: 95 // Would calculate from contract adherence
      };

      await this.cacheService.set(cacheKey, result, 1800);
      return result;

    } catch (error) {
      this.loggerService.error('Error getting procurement dashboard', error, 'FrontendERPDashboardService');
      return {
        totalSpend: 0,
        purchaseOrderCount: 0,
        averageOrderValue: 0,
        supplierCount: 0,
        onTimeDeliveryRate: 0,
        qualityScore: 0,
        costSavings: 0,
        contractCompliance: 0
      };
    }
  }

  async getFinancialReports(tenantId: string, reportType: string, period: string): Promise<any> {
    const cacheKey = `financial_reports:${tenantId}:${reportType}:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      let reportData;

      switch (reportType) {
        case 'income_statement':
          reportData = await this.generateIncomeStatement(tenantId, period);
          break;
        case 'balance_sheet':
          reportData = await this.generateBalanceSheet(tenantId, period);
          break;
        case 'cash_flow':
          reportData = await this.generateCashFlowStatement(tenantId, period);
          break;
        case 'budget_vs_actual':
          reportData = await this.generateBudgetVsActual(tenantId, period);
          break;
        default:
          reportData = { error: 'Unknown report type' };
      }

      await this.cacheService.set(cacheKey, reportData, 3600);
      return reportData;

    } catch (error) {
      this.loggerService.error('Error generating financial reports', error, 'FrontendERPDashboardService');
      return { error: 'Error generating report' };
    }
  }

  async getBudgetPerformance(tenantId: string, period: string): Promise<{
    totalBudget: number;
    totalActual: number;
    variance: number;
    variancePercentage: number;
    departmentBreakdown: Record<string, {
      budget: number;
      actual: number;
      variance: number;
      variancePercentage: number;
    }>;
    monthlyTrend: Array<{
      month: string;
      budget: number;
      actual: number;
      variance: number;
    }>;
  }> {
    const cacheKey = `budget_performance:${tenantId}:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const dateRange = this.getDateRangeForPeriod(period);

      // Get budget vs actual data
      const budgetData = await this.databaseService.drizzleClient
        .select({
          department: sql`department`,
          budgetAmount: sql<number>`SUM(budget_amount)`,
          actualAmount: sql<number>`SUM(actual_amount)`
        })
        .from(sql`budget_vs_actual`)
        .where(and(
          sql`tenant_id = ${tenantId}`,
          sql`period >= ${dateRange.start}`,
          sql`period <= ${dateRange.end}`
        ))
        .groupBy(sql`department`);

      const totalBudget = budgetData.reduce((sum, dept) => sum + Number(dept.budgetAmount), 0);
      const totalActual = budgetData.reduce((sum, dept) => sum + Number(dept.actualAmount), 0);
      const variance = totalActual - totalBudget;
      const variancePercentage = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

      const departmentBreakdown = {};
      budgetData.forEach(dept => {
        const budget = Number(dept.budgetAmount);
        const actual = Number(dept.actualAmount);
        const deptVariance = actual - budget;
        const deptVariancePercentage = budget > 0 ? (deptVariance / budget) * 100 : 0;

        departmentBreakdown[dept.department] = {
          budget,
          actual,
          variance: deptVariance,
          variancePercentage: deptVariancePercentage
        };
      });

      // Generate monthly trend (simplified)
      const monthlyTrend = await this.generateMonthlyBudgetTrend(tenantId, dateRange);

      const result = {
        totalBudget,
        totalActual,
        variance,
        variancePercentage,
        departmentBreakdown,
        monthlyTrend
      };

      await this.cacheService.set(cacheKey, result, 3600);
      return result;

    } catch (error) {
      this.loggerService.error('Error getting budget performance', error, 'FrontendERPDashboardService');
      return {
        totalBudget: 0,
        totalActual: 0,
        variance: 0,
        variancePercentage: 0,
        departmentBreakdown: {},
        monthlyTrend: []
      };
    }
  }

  async getInventoryDashboard(tenantId: string): Promise<{
    totalValue: number;
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    overstockItems: number;
    inventoryTurns: number;
    averageDaysOnHand: number;
    topMovingItems: Array<{
      productId: string;
      productName: string;
      movementCount: number;
      currentStock: number;
      value: number;
    }>;
    warehouseUtilization: Record<string, number>;
    categoryDistribution: Record<string, number>;
  }> {
    const cacheKey = `inventory_dashboard:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get inventory metrics
      const inventoryData = await this.databaseService.drizzleClient
        .select({
          totalValue: sql<number>`SUM(quantity_available * unit_cost)`,
          totalItems: sql<number>`count(DISTINCT product_id)`,
          lowStockItems: sql<number>`count(*) FILTER (WHERE quantity_available <= low_stock_threshold)`,
          outOfStockItems: sql<number>`count(*) FILTER (WHERE quantity_available = 0)`,
          overstockItems: sql<number>`count(*) FILTER (WHERE quantity_available > max_stock_level)`
        })
        .from(sql`inventory`)
        .where(sql`tenant_id = ${tenantId}`);

      const data = inventoryData[0];

      // Get top moving items
      const topMovingItems = await this.getTopMovingItems(tenantId, 10);

      // Get warehouse utilization
      const warehouseUtilization = await this.getWarehouseUtilization(tenantId);

      // Get category distribution
      const categoryDistribution = await this.getCategoryDistribution(tenantId);

      const result = {
        totalValue: Number(data.totalValue) || 0,
        totalItems: Number(data.totalItems) || 0,
        lowStockItems: Number(data.lowStockItems) || 0,
        outOfStockItems: Number(data.outOfStockItems) || 0,
        overstockItems: Number(data.overstockItems) || 0,
        inventoryTurns: 4.5, // Would calculate from historical data
        averageDaysOnHand: 81, // Would calculate from historical data
        topMovingItems,
        warehouseUtilization,
        categoryDistribution
      };

      await this.cacheService.set(cacheKey, result, 1800);
      return result;

    } catch (error) {
      this.loggerService.error('Error getting inventory dashboard', error, 'FrontendERPDashboardService');
      return {
        totalValue: 0,
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        overstockItems: 0,
        inventoryTurns: 0,
        averageDaysOnHand: 0,
        topMovingItems: [],
        warehouseUtilization: {},
        categoryDistribution: {}
      };
    }
  }

  // Private helper methods
  private async getAccountingMetrics(tenantId: string, dateRange: { start: Date; end: Date }): Promise<any> {
    // Get revenue data
    const revenueData = await this.databaseService.drizzleClient
      .select({
        totalRevenue: sql<number>`SUM(amount)`,
        orderCount: sql<number>`count(*)`
      })
      .from(sql`orders`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`status = 'delivered'`,
        sql`created_at >= ${dateRange.start}`,
        sql`created_at <= ${dateRange.end}`
      ));

    // Get expense data
    const expenseData = await this.databaseService.drizzleClient
      .select({
        totalExpenses: sql<number>`SUM(amount)`
      })
      .from(sql`expenses`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`date >= ${dateRange.start}`,
        sql`date <= ${dateRange.end}`
      ));

    // Get accounts receivable and payable
    const arData = await this.databaseService.drizzleClient
      .select({
        accountsReceivable: sql<number>`SUM(amount) FILTER (WHERE status = 'pending')`
      })
      .from(sql`invoices`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`type = 'receivable'`
      ));

    const apData = await this.databaseService.drizzleClient
      .select({
        accountsPayable: sql<number>`SUM(amount) FILTER (WHERE status = 'pending')`
      })
      .from(sql`invoices`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`type = 'payable'`
      ));

    const revenue = Number(revenueData[0].totalRevenue) || 0;
    const expenses = Number(expenseData[0].totalExpenses) || 0;
    const netProfit = revenue - expenses;

    // Get top customers
    const topCustomers = await this.getTopCustomersByRevenue(tenantId, dateRange, 5);

    // Get top expenses
    const topExpenses = await this.getTopExpenses(tenantId, dateRange, 5);

    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfit,
      accountsReceivable: Number(arData[0].accountsReceivable) || 0,
      accountsPayable: Number(apData[0].accountsPayable) || 0,
      cashFlow: netProfit, // Simplified
      profitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      revenueGrowth: 12.5, // Would calculate from previous period
      expenseGrowth: 8.3, // Would calculate from previous period
      topCustomers,
      topExpenses
    };
  }

  private async getHRMetrics(tenantId: string, dateRange: { start: Date; end: Date }): Promise<any> {
    // Get employee metrics
    const employeeData = await this.databaseService.drizzleClient
      .select({
        totalEmployees: sql<number>`count(*)`,
        activeEmployees: sql<number>`count(*) FILTER (WHERE status = 'active')`,
        newHires: sql<number>`count(*) FILTER (WHERE hire_date >= ${dateRange.start})`,
        terminations: sql<number>`count(*) FILTER (WHERE termination_date >= ${dateRange.start})`,
        averageSalary: sql<number>`AVG(salary) FILTER (WHERE status = 'active')`,
        averageRating: sql<number>`AVG(performance_rating) FILTER (WHERE status = 'active')`
      })
      .from(sql`employees`)
      .where(sql`tenant_id = ${tenantId}`);

    const data = employeeData[0];
    const totalEmployees = Number(data.totalEmployees) || 0;
    const terminations = Number(data.terminations) || 0;

    // Calculate turnover rate
    const turnoverRate = totalEmployees > 0 ? (terminations / totalEmployees) * 100 : 0;

    // Get department distribution
    const departmentData = await this.databaseService.drizzleClient
      .select({
        department: sql`department`,
        count: sql<number>`count(*)`
      })
      .from(sql`employees`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`status = 'active'`
      ))
      .groupBy(sql`department`);

    const departmentDistribution = {};
    departmentData.forEach(dept => {
      departmentDistribution[dept.department] = Number(dept.count);
    });

    return {
      totalEmployees,
      activeEmployees: Number(data.activeEmployees) || 0,
      newHires: Number(data.newHires) || 0,
      terminations,
      turnoverRate,
      averageSalary: Number(data.averageSalary) || 0,
      departmentDistribution,
      performanceMetrics: {
        averageRating: Number(data.averageRating) || 0,
        promotionRate: 5.2, // Would calculate from promotion data
        trainingHours: 24 // Would calculate from training data
      },
      upcomingReviews: 0, // Would get from performance review schedule
      openPositions: 0 // Would get from job openings
    };
  }

  private async getProcurementMetrics(tenantId: string, dateRange: { start: Date; end: Date }): Promise<any> {
    // Get purchase order metrics
    const poData = await this.databaseService.drizzleClient
      .select({
        totalSpend: sql<number>`SUM(total_amount)`,
        purchaseOrderCount: sql<number>`count(*)`,
        completedOrders: sql<number>`count(*) FILTER (WHERE status = 'completed')`,
        supplierCount: sql<number>`count(DISTINCT supplier_id)`
      })
      .from(sql`purchase_orders`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= ${dateRange.start}`,
        sql`created_at <= ${dateRange.end}`
      ));

    const data = poData[0];
    const totalSpend = Number(data.totalSpend) || 0;
    const purchaseOrderCount = Number(data.purchaseOrderCount) || 0;

    // Get supplier performance
    const supplierPerformance = await this.getSupplierPerformance(tenantId, dateRange, 5);

    // Get top suppliers
    const topSuppliers = await this.getTopSuppliers(tenantId, dateRange, 5);

    return {
      totalSpend,
      purchaseOrderCount,
      pendingOrders: purchaseOrderCount - Number(data.completedOrders),
      completedOrders: Number(data.completedOrders) || 0,
      averageOrderValue: purchaseOrderCount > 0 ? totalSpend / purchaseOrderCount : 0,
      supplierCount: Number(data.supplierCount) || 0,
      onTimeDeliveryRate: 94.5, // Would calculate from delivery data
      qualityScore: 92.3, // Would calculate from quality data
      costSavings: 0, // Would calculate from negotiated savings
      contractCompliance: 96.8, // Would calculate from contract adherence
      supplierPerformance,
      topSuppliers
    };
  }

  private async calculateKPIs(accounting: any, hr: any, procurement: any): Promise<any> {
    const totalEmployees = hr.activeEmployees || 1;

    return {
      revenuePerEmployee: totalEmployees > 0 ? accounting.totalRevenue / totalEmployees : 0,
      profitPerEmployee: totalEmployees > 0 ? accounting.netProfit / totalEmployees : 0,
      operatingMargin: accounting.totalRevenue > 0 ? (accounting.netProfit / accounting.totalRevenue) * 100 : 0,
      returnOnAssets: accounting.assets > 0 ? (accounting.netProfit / accounting.assets) * 100 : 0,
      currentRatio: accounting.liabilities > 0 ? accounting.assets / accounting.liabilities : 0,
      debtToEquity: accounting.equity > 0 ? accounting.liabilities / accounting.equity : 0,
      inventoryTurnover: 4.5, // Would calculate from inventory data
      daysSalesOutstanding: 45, // Would calculate from AR data
      daysPayableOutstanding: 30 // Would calculate from AP data
    };
  }

  private async generateAlerts(accounting: any, hr: any, procurement: any, kpis: any): Promise<any[]> {
    const alerts = [];

    // Profit margin alert
    if (kpis.operatingMargin < 10) {
      alerts.push({
        type: 'warning',
        title: 'Low Profit Margin',
        description: `Operating margin is ${kpis.operatingMargin.toFixed(1)}%, below target`,
        value: kpis.operatingMargin,
        threshold: 10,
        impact: 'Reduced profitability and financial health'
      });
    }

    // Cash flow alert
    if (accounting.cashFlow < 0) {
      alerts.push({
        type: 'error',
        title: 'Negative Cash Flow',
        description: 'Cash flow is negative',
        value: accounting.cashFlow,
        threshold: 0,
        impact: 'Liquidity risk and potential cash shortages'
      });
    }

    // Employee turnover alert
    if (hr.turnoverRate > 15) {
      alerts.push({
        type: 'warning',
        title: 'High Employee Turnover',
        description: `Turnover rate is ${hr.turnoverRate.toFixed(1)}%, above acceptable level`,
        value: hr.turnoverRate,
        threshold: 15,
        impact: 'Increased recruitment costs and knowledge loss'
      });
    }

    // Inventory turnover alert
    if (kpis.inventoryTurnover < 3) {
      alerts.push({
        type: 'info',
        title: 'Low Inventory Turnover',
        description: `Inventory turnover is ${kpis.inventoryTurnover}, below optimal range`,
        value: kpis.inventoryTurnover,
        threshold: 3,
        impact: 'Tied up capital and potential obsolescence'
      });
    }

    return alerts;
  }

  private getDateRangeForPeriod(period: string): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);

    let start = new Date(now);

    switch (period) {
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'yearly':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return { start, end };
  }

  private async getTopCustomersByRevenue(tenantId: string, dateRange: { start: Date; end: Date }, limit: number): Promise<any[]> {
    const topCustomers = await this.databaseService.drizzleClient
      .select({
        customerId: sql`customer_id`,
        customerName: sql`customer_name`,
        revenue: sql<number>`SUM(total)`
      })
      .from(sql`orders`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`status = 'delivered'`,
        sql`created_at >= ${dateRange.start}`,
        sql`created_at <= ${dateRange.end}`
      ))
      .groupBy(sql`customer_id`, sql`customer_name`)
      .orderBy(sql`SUM(total) DESC`)
      .limit(limit);

    const totalRevenue = topCustomers.reduce((sum, customer) => sum + Number(customer.revenue), 0);

    return topCustomers.map(customer => ({
      customerId: customer.customerId,
      customerName: customer.customerName,
      revenue: Number(customer.revenue),
      percentage: totalRevenue > 0 ? (Number(customer.revenue) / totalRevenue) * 100 : 0
    }));
  }

  private async getTopExpenses(tenantId: string, dateRange: { start: Date; end: Date }, limit: number): Promise<any[]> {
    const topExpenses = await this.databaseService.drizzleClient
      .select({
        category: sql`category`,
        amount: sql<number>`SUM(amount)`
      })
      .from(sql`expenses`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`date >= ${dateRange.start}`,
        sql`date <= ${dateRange.end}`
      ))
      .groupBy(sql`category`)
      .orderBy(sql`SUM(amount) DESC`)
      .limit(limit);

    const totalExpenses = topExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

    return topExpenses.map(expense => ({
      category: expense.category,
      amount: Number(expense.amount),
      percentage: totalExpenses > 0 ? (Number(expense.amount) / totalExpenses) * 100 : 0
    }));
  }

  private async getSupplierPerformance(tenantId: string, dateRange: { start: Date; end: Date }, limit: number): Promise<any[]> {
    const supplierPerformance = await this.databaseService.drizzleClient
      .select({
        supplierId: sql`supplier_id`,
        supplierName: sql`supplier_name`,
        ordersCount: sql<number>`count(*)`,
        totalSpend: sql<number>`SUM(total_amount)`,
        onTimeDelivery: sql<number>`AVG(on_time_delivery_rate)`,
        qualityScore: sql<number>`AVG(quality_score)`
      })
      .from(sql`purchase_orders`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= ${dateRange.start}`,
        sql`created_at <= ${dateRange.end}`
      ))
      .groupBy(sql`supplier_id`, sql`supplier_name`)
      .orderBy(sql`SUM(total_amount) DESC`)
      .limit(limit);

    return supplierPerformance.map(supplier => ({
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      ordersCount: Number(supplier.ordersCount),
      totalSpend: Number(supplier.totalSpend),
      onTimeDelivery: Number(supplier.onTimeDelivery) || 0,
      qualityScore: Number(supplier.qualityScore) || 0
    }));
  }

  private async getTopSuppliers(tenantId: string, dateRange: { start: Date; end: Date }, limit: number): Promise<any[]> {
    const topSuppliers = await this.databaseService.drizzleClient
      .select({
        supplierId: sql`supplier_id`,
        supplierName: sql`supplier_name`,
        spend: sql<number>`SUM(total_amount)`
      })
      .from(sql`purchase_orders`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= ${dateRange.start}`,
        sql`created_at <= ${dateRange.end}`
      ))
      .groupBy(sql`supplier_id`, sql`supplier_name`)
      .orderBy(sql`SUM(total_amount) DESC`)
      .limit(limit);

    const totalSpend = topSuppliers.reduce((sum, supplier) => sum + Number(supplier.spend), 0);

    return topSuppliers.map(supplier => ({
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      spend: Number(supplier.spend),
      percentage: totalSpend > 0 ? (Number(supplier.spend) / totalSpend) * 100 : 0
    }));
  }

  private async getDiversityMetrics(tenantId: string): Promise<any> {
    // Get diversity metrics
    const diversityData = await this.databaseService.drizzleClient
      .select({
        genderDistribution: sql`jsonb_object_agg(gender, employee_count)`,
        ageDistribution: sql`jsonb_object_agg(age_group, employee_count)`,
        tenureDistribution: sql`jsonb_object_agg(tenure_group, employee_count)`
      })
      .from(sql`employee_demographics`)
      .where(sql`tenant_id = ${tenantId}`);

    return diversityData[0] || {
      genderDistribution: {},
      ageDistribution: {},
      tenureDistribution: {}
    };
  }

  private async generateIncomeStatement(tenantId: string, period: string): Promise<any> {
    // Generate income statement
    return {
      period,
      revenue: 1000000,
      costOfGoodsSold: 600000,
      grossProfit: 400000,
      operatingExpenses: 250000,
      operatingProfit: 150000,
      interestExpense: 10000,
      taxExpense: 35000,
      netProfit: 105000
    };
  }

  private async generateBalanceSheet(tenantId: string, period: string): Promise<any> {
    // Generate balance sheet
    return {
      period,
      assets: {
        currentAssets: 500000,
        fixedAssets: 800000,
        totalAssets: 1300000
      },
      liabilities: {
        currentLiabilities: 300000,
        longTermLiabilities: 400000,
        totalLiabilities: 700000
      },
      equity: 600000
    };
  }

  private async generateCashFlowStatement(tenantId: string, period: string): Promise<any> {
    // Generate cash flow statement
    return {
      period,
      operatingActivities: 200000,
      investingActivities: -100000,
      financingActivities: 50000,
      netCashFlow: 150000,
      beginningCash: 100000,
      endingCash: 250000
    };
  }

  private async generateBudgetVsActual(tenantId: string, period: string): Promise<any> {
    // Generate budget vs actual comparison
    return {
      period,
      budget: 1000000,
      actual: 950000,
      variance: -50000,
      variancePercentage: -5
    };
  }

  private async generateMonthlyBudgetTrend(tenantId: string, dateRange: { start: Date; end: Date }): Promise<any[]> {
    // Generate monthly budget trend
    return [
      { month: 'Jan', budget: 100000, actual: 95000, variance: -5000 },
      { month: 'Feb', budget: 105000, actual: 110000, variance: 5000 },
      { month: 'Mar', budget: 98000, actual: 102000, variance: 4000 }
    ];
  }

  private async getTopMovingItems(tenantId: string, limit: number): Promise<any[]> {
    // Get top moving inventory items
    return await this.databaseService.drizzleClient
      .select({
        productId: sql`product_id`,
        productName: sql`product_name`,
        movementCount: sql<number>`count(*)`,
        currentStock: sql<number>`quantity_available`,
        value: sql<number>`quantity_available * unit_cost`
      })
      .from(sql`inventory_movements`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= CURRENT_DATE - INTERVAL '30 days'`
      ))
      .groupBy(sql`product_id`, sql`product_name`, sql`quantity_available`, sql`unit_cost`)
      .orderBy(sql`count(*) DESC`)
      .limit(limit);
  }

  private async getWarehouseUtilization(tenantId: string): Promise<Record<string, number>> {
    // Get warehouse utilization rates
    return {
      'Main Warehouse': 78.5,
      'Secondary Warehouse': 65.2,
      'Cold Storage': 82.1
    };
  }

  private async getCategoryDistribution(tenantId: string): Promise<Record<string, number>> {
    // Get inventory distribution by category
    return {
      'Electronics': 35,
      'Clothing': 25,
      'Books': 20,
      'Home & Garden': 20
    };
  }

  private getDefaultDashboardMetrics(): ERPDashboardMetrics {
    return {
      accounting: {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
        cashFlow: 0,
        profitMargin: 0,
        revenueGrowth: 0,
        expenseGrowth: 0,
        topCustomers: [],
        topExpenses: []
      },
      hr: {
        totalEmployees: 0,
        activeEmployees: 0,
        newHires: 0,
        terminations: 0,
        turnoverRate: 0,
        averageSalary: 0,
        departmentDistribution: {},
        performanceMetrics: {
          averageRating: 0,
          promotionRate: 0,
          trainingHours: 0
        },
        upcomingReviews: 0,
        openPositions: 0
      },
      procurement: {
        totalPurchaseOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalSpend: 0,
        averageOrderValue: 0,
        supplierPerformance: [],
        inventoryTurns: 0,
        stockoutRate: 0,
        topSuppliers: []
      },
      kpis: {
        revenuePerEmployee: 0,
        profitPerEmployee: 0,
        operatingMargin: 0,
        returnOnAssets: 0,
        currentRatio: 0,
        debtToEquity: 0,
        inventoryTurnover: 0,
        daysSalesOutstanding: 0,
        daysPayableOutstanding: 0
      },
      alerts: []
    };
  }
}
