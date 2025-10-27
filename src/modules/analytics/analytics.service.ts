import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/core/database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { orders, products, customers, orderItems } from '@/database/schema';
import { eq, and, gte, lte, sql, desc, asc, ilike } from 'drizzle-orm';
import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { PaginationService, PaginationOptions, PaginationResult } from '@/core/pagination/pagination.service';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
    private readonly paginationService: PaginationService,
  ) {}

  private getDateRangeFromFilter(filterDto: AnalyticsFilterDto): { startDate: Date; endDate: Date } {
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    if (filterDto.startDate && filterDto.endDate) {
      // Custom date range
      startDate = new Date(filterDto.startDate);
      endDate = new Date(filterDto.endDate);
    } else if (filterDto.period) {
      // Period-based calculation
      switch (filterDto.period) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          endDate = now;
          break;
        case '1d':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = now;
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case '1y':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          endDate = now;
          break;
        default:
          // Default to last 30 days
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
      }
    } else {
      // Default to last 30 days if no period specified
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
    }

    return { startDate, endDate };
  }

  async getDashboardAnalytics(period: string, compare: boolean, tenantId: string) {
    try {
      const cacheKey = `dashboard:${tenantId}:${period}:${compare}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      const dateRange = this.getDateRange(period);
      const previousRange = compare ? this.getPreviousDateRange(period) : null;

      const [
        revenue,
        orders,
        customers,
        products,
        previousRevenue,
        previousOrders,
        previousCustomers,
        previousProducts
      ] = await Promise.all([
        this.getRevenueMetrics(dateRange, tenantId),
        this.getOrderMetrics(dateRange, tenantId),
        this.getCustomerMetrics(dateRange, tenantId),
        this.getProductMetrics(dateRange, tenantId),
        compare && previousRange ? this.getRevenueMetrics(previousRange, tenantId) : null,
        compare && previousRange ? this.getOrderMetrics(previousRange, tenantId) : null,
        compare && previousRange ? this.getCustomerMetrics(previousRange, tenantId) : null,
        compare && previousRange ? this.getProductMetrics(previousRange, tenantId) : null,
      ]);

      const analytics = {
        revenue: {
          current: revenue,
          previous: previousRevenue,
          change: compare && previousRevenue ? this.calculateChange(revenue, previousRevenue) : 0
        },
        orders: {
          current: orders,
          previous: previousOrders,
          change: compare && previousOrders ? this.calculateChange(orders, previousOrders) : 0
        },
        customers: {
          current: customers,
          previous: previousCustomers,
          change: compare && previousCustomers ? this.calculateChange(customers, previousCustomers) : 0
        },
        products: {
          current: products,
          previous: previousProducts,
          change: compare && previousProducts ? this.calculateChange(products, previousProducts) : 0
        }
      };

      await this.cacheService.set(cacheKey, JSON.stringify(analytics), 300);
      return analytics;
    } catch (error) {
      this.loggerService.error('Error getting dashboard analytics', error);
      throw error;
    }
  }

  async getOverviewMetrics(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      
      const [
        totalRevenue,
        totalOrders,
        totalCustomers,
        averageOrderValue,
        conversionRate,
        customerLifetimeValue,
        returnRate,
        inventoryTurnover
      ] = await Promise.all([
        this.getTotalRevenue(dateRange, tenantId),
        this.getTotalOrders(dateRange, tenantId),
        this.getTotalCustomers(dateRange, tenantId),
        this.getAverageOrderValue(dateRange, tenantId),
        this.getConversionRate(dateRange, tenantId),
        this.getCustomerLifetimeValue(dateRange, tenantId),
        this.getReturnRate(dateRange, tenantId),
        this.getInventoryTurnover(dateRange, tenantId)
      ]);

      return {
        totalRevenue,
        totalOrders,
        totalCustomers,
        averageOrderValue,
        conversionRate,
        customerLifetimeValue,
        returnRate,
        inventoryTurnover
      };
    } catch (error) {
      this.loggerService.error('Error getting overview metrics', error);
      throw error;
    }
  }

  async getRevenueAnalytics(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      
      const [
        totalRevenue,
        revenueByPeriod,
        revenueBySource,
        revenueByProduct,
        revenueByCustomer,
        revenueGrowth,
        profitMargin
      ] = await Promise.all([
        this.getTotalRevenue(dateRange, tenantId),
        this.getRevenueByPeriod(dateRange, tenantId),
        this.getRevenueBySource(dateRange, tenantId),
        this.getRevenueByProduct(dateRange, tenantId),
        this.getRevenueByCustomer(dateRange, tenantId),
        this.getRevenueGrowth(dateRange, tenantId),
        this.getProfitMargin(dateRange, tenantId)
      ]);

      return {
        totalRevenue,
        revenueByPeriod,
        revenueBySource,
        revenueByProduct,
        revenueByCustomer,
        revenueGrowth,
        profitMargin
      };
    } catch (error) {
      this.loggerService.error('Error getting revenue analytics', error);
      throw error;
    }
  }

  async getSalesAnalytics(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      
      const [
        totalSales,
        salesByPeriod,
        salesByProduct,
        salesByCategory,
        salesByRegion,
        salesTrends,
        topSellingProducts
      ] = await Promise.all([
        this.getTotalSales(dateRange, tenantId),
        this.getSalesByPeriod(dateRange, tenantId),
        this.getSalesByProduct(dateRange, tenantId),
        this.getSalesByCategory(dateRange, tenantId),
        this.getSalesByRegion(dateRange, tenantId),
        this.getSalesTrends(dateRange, tenantId),
        this.getTopSellingProducts(dateRange, tenantId)
      ]);

      return {
        totalSales,
        salesByPeriod,
        salesByProduct,
        salesByCategory,
        salesByRegion,
        salesTrends,
        topSellingProducts
      };
    } catch (error) {
      this.loggerService.error('Error getting sales analytics', error);
      throw error;
    }
  }

  async getCustomerAnalytics(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);

      const [
        totalCustomers,
        newCustomers,
        returningCustomers,
        customerAcquisitionCost,
        customerRetentionRate,
        customerSegments,
        customerBehavior
      ] = await Promise.all([
        this.getTotalCustomers(dateRange, tenantId),
        this.getNewCustomers(dateRange, tenantId),
        this.getReturningCustomers(dateRange, tenantId),
        this.getCustomerAcquisitionCost(dateRange, tenantId),
        this.getCustomerRetentionRate(dateRange, tenantId),
        this.getCustomerSegments(dateRange, tenantId),
        this.getCustomerBehavior(dateRange, tenantId)
      ]);

      return {
        totalCustomers,
        newCustomers,
        returningCustomers,
        customerAcquisitionCost,
        customerRetentionRate,
        customerSegments,
        customerBehavior
      };
    } catch (error) {
      this.loggerService.error('Error getting customer analytics', error);
      throw error;
    }
  }

  async getCustomerAnalyticsPaginated(
    filterDto: AnalyticsFilterDto,
    paginationOptions: PaginationOptions,
    tenantId: string
  ): Promise<PaginationResult<any>> {
    try {
      const sanitizedOptions = this.paginationService.sanitizeOptions(paginationOptions);
      const { page, limit, offset, sortBy, sortOrder, search, searchFields, filters } = this.paginationService.getPaginationParams(sanitizedOptions);

      // Generate cache key
      const cacheKey = this.paginationService.generateCacheKey(
        `customer-analytics:${tenantId}`,
        sanitizedOptions,
        { filterDto }
      );

      // Try cache first
      const cached = await this.cacheService.get<PaginationResult<any>>(cacheKey);
      if (cached) {
        return cached;
      }

      const dateRange = this.getDateRangeFromFilter(filterDto);

      // Build search condition
      let searchCondition = null;
      if (search && searchFields?.length) {
        searchCondition = this.paginationService.buildSearchCondition(search, searchFields, 'c');
      }

      // Build filter conditions
      let filterCondition = null;
      if (Object.keys(filters).length > 0) {
        filterCondition = this.paginationService.buildFilterConditions(filters, 'c');
      }

      // Combine conditions
      let whereConditions = [eq(customers.tenantId, tenantId)];
      if (searchCondition) {
        whereConditions.push(sql`(${searchCondition})`);
      }
      if (filterCondition) {
        whereConditions.push(sql`(${filterCondition})`);
      }

      // Get total count
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(and(...whereConditions));

      // Get paginated data
      let query = this.db
        .select()
        .from(customers)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset);

      // Apply sorting
      if (sortBy) {
        const sortDirection = sortOrder === 'desc' ? desc : asc;
        query = query.orderBy(sortDirection(customers[sortBy as keyof typeof customers]));
      }

      const customerData = await query;

      // Create result
      const result = this.paginationService.createResult(customerData, count, sanitizedOptions);

      // Cache result
      await this.cacheService.set(cacheKey, result, 300); // 5 minutes cache

      return result;
    } catch (error) {
      this.loggerService.error('Error getting paginated customer analytics', error);
      throw error;
    }
  }

  async getProductAnalytics(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      
      const [
        totalProducts,
        productPerformance,
        inventoryLevels,
        lowStockProducts,
        bestSellingProducts,
        productCategories,
        productTrends
      ] = await Promise.all([
        this.getTotalProducts(dateRange, tenantId),
        this.getProductPerformance(dateRange, tenantId),
        this.getInventoryLevels(dateRange, tenantId),
        this.getLowStockProducts(dateRange, tenantId),
        this.getBestSellingProducts(dateRange, tenantId),
        this.getProductCategories(dateRange, tenantId),
        this.getProductTrends(dateRange, tenantId)
      ]);

      return {
        totalProducts,
        productPerformance,
        inventoryLevels,
        lowStockProducts,
        bestSellingProducts,
        productCategories,
        productTrends
      };
    } catch (error) {
      this.loggerService.error('Error getting product analytics', error);
      throw error;
    }
  }

  async getMarketingAnalytics(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      
      const [
        campaignPerformance,
        trafficSources,
        conversionRates,
        marketingROI,
        emailMarketing,
        socialMedia,
        paidAdvertising
      ] = await Promise.all([
        this.getCampaignPerformance(dateRange, tenantId),
        this.getTrafficSources(dateRange, tenantId),
        this.getConversionRates(dateRange, tenantId),
        this.getMarketingROI(dateRange, tenantId),
        this.getEmailMarketingMetrics(dateRange, tenantId),
        this.getSocialMediaMetrics(dateRange, tenantId),
        this.getPaidAdvertisingMetrics(dateRange, tenantId)
      ]);

      return {
        campaignPerformance,
        trafficSources,
        conversionRates,
        marketingROI,
        emailMarketing,
        socialMedia,
        paidAdvertising
      };
    } catch (error) {
      this.loggerService.error('Error getting marketing analytics', error);
      throw error;
    }
  }

  async getFinancialAnalytics(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      
      const [
        totalRevenue,
        totalCosts,
        grossProfit,
        netProfit,
        profitMargin,
        cashFlow,
        expenses,
        financialHealth
      ] = await Promise.all([
        this.getTotalRevenue(dateRange, tenantId),
        this.getTotalCosts(dateRange, tenantId),
        this.getGrossProfit(dateRange, tenantId),
        this.getNetProfit(dateRange, tenantId),
        this.getProfitMargin(dateRange, tenantId),
        this.getCashFlow(dateRange, tenantId),
        this.getExpenses(dateRange, tenantId),
        this.getFinancialHealth(dateRange, tenantId)
      ]);

      return {
        totalRevenue,
        totalCosts,
        grossProfit,
        netProfit,
        profitMargin,
        cashFlow,
        expenses,
        financialHealth
      };
    } catch (error) {
      this.loggerService.error('Error getting financial analytics', error);
      throw error;
    }
  }

  async getOperationalAnalytics(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      
      const [
        orderFulfillment,
        shippingMetrics,
        returnRates,
        customerService,
        inventoryManagement,
        supplierPerformance,
        operationalEfficiency
      ] = await Promise.all([
        this.getOrderFulfillment(dateRange, tenantId),
        this.getShippingMetrics(dateRange, tenantId),
        this.getReturnRates(dateRange, tenantId),
        this.getCustomerServiceMetrics(dateRange, tenantId),
        this.getInventoryManagement(dateRange, tenantId),
        this.getSupplierPerformance(dateRange, tenantId),
        this.getOperationalEfficiency(dateRange, tenantId)
      ]);

      return {
        orderFulfillment,
        shippingMetrics,
        returnRates,
        customerService,
        inventoryManagement,
        supplierPerformance,
        operationalEfficiency
      };
    } catch (error) {
      this.loggerService.error('Error getting operational analytics', error);
      throw error;
    }
  }

  async getRecentActivities(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      const limit = filterDto.limit || 20;
      
      // Get recent orders
      const recentOrders = await this.db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          totalAmount: orders.totalAmount,
          status: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(and(
          gte(orders.createdAt, dateRange.startDate),
          lte(orders.createdAt, dateRange.endDate)
        ))
        .orderBy(desc(orders.createdAt))
        .limit(limit);

      // Get recent customers
      const recentCustomers = await this.db
        .select({
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          createdAt: customers.createdAt,
        })
        .from(customers)
        .where(and(
          gte(customers.createdAt, dateRange.startDate),
          lte(customers.createdAt, dateRange.endDate)
        ))
        .orderBy(desc(customers.createdAt))
        .limit(limit);

      // Combine and format activities
      const activities = [
        ...recentOrders.map(order => ({
          id: order.id,
          type: 'order',
          message: `Yeni sipariş: ${order.orderNumber}`,
          amount: parseFloat(order.totalAmount?.toString() || '0'),
          status: order.status,
          createdAt: order.createdAt,
        })),
        ...recentCustomers.map(customer => ({
          id: customer.id,
          type: 'customer',
          message: `Yeni müşteri: ${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          createdAt: customer.createdAt,
        })),
      ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

      return activities;
    } catch (error) {
      this.loggerService.error('Error getting recent activities', error);
      return [];
    }
  }

  async getOrderStatus(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      
      const statusCounts = await this.db
        .select({
          status: orders.status,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(and(
          gte(orders.createdAt, dateRange.startDate),
          lte(orders.createdAt, dateRange.endDate)
        ))
        .groupBy(orders.status);

      const result: Record<string, number> = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        refunded: 0,
      };

      statusCounts.forEach(item => {
        result[item.status] = Number(item.count);
      });

      return result;
    } catch (error) {
      this.loggerService.error('Error getting order status', error);
      return {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        refunded: 0,
      };
    }
  }

  async getRevenueChartData(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      const chartData = await this.getRevenueByPeriod(dateRange, tenantId);
      
      return {
        labels: chartData.map(item => item.period),
        datasets: [{
          label: 'Revenue',
          data: chartData.map(item => item.revenue),
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F6',
          fill: false
        }]
      };
    } catch (error) {
      this.loggerService.error('Error getting revenue chart data', error);
      throw error;
    }
  }

  async getOrdersChartData(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      const chartData = await this.getOrdersByPeriod(dateRange, tenantId);
      
      return {
        labels: chartData.map(item => item.period),
        datasets: [{
          label: 'Orders',
          data: chartData.map(item => item.orders),
          borderColor: '#10B981',
          backgroundColor: '#10B981',
          fill: false
        }]
      };
    } catch (error) {
      this.loggerService.error('Error getting orders chart data', error);
      throw error;
    }
  }

  async getCustomersChartData(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      const chartData = await this.getCustomersByPeriod(dateRange, tenantId);
      
      return {
        labels: chartData.map(item => item.period),
        datasets: [{
          label: 'Customers',
          data: chartData.map(item => item.customers),
          borderColor: '#8B5CF6',
          backgroundColor: '#8B5CF6',
          fill: false
        }]
      };
    } catch (error) {
      this.loggerService.error('Error getting customers chart data', error);
      throw error;
    }
  }

  async getTopProducts(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      const limit = filterDto.limit || 10;
      
      // Get top products by sales
      const topProducts = await this.db
        .select({
          productId: orderItems.productId,
          productName: orderItems.productName,
          productSku: orderItems.productSku,
          totalQuantity: sql<number>`sum(${orderItems.quantity})`,
          totalRevenue: sql<number>`sum(${orderItems.subtotal})`,
          orderCount: sql<number>`count(distinct ${orderItems.orderId})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(
          gte(orders.createdAt, dateRange.startDate),
          lte(orders.createdAt, dateRange.endDate)
        ))
        .groupBy(orderItems.productId, orderItems.productName, orderItems.productSku)
        .orderBy(desc(sql`sum(${orderItems.subtotal})`))
        .limit(limit);

      return topProducts.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        totalQuantity: Number(item.totalQuantity),
        totalRevenue: Number(item.totalRevenue),
        orderCount: Number(item.orderCount),
      }));
    } catch (error) {
      this.loggerService.error('Error getting top products', error);
      return [];
    }
  }

  async getTopCustomers(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      return await this.getTopValueCustomers(dateRange, tenantId);
    } catch (error) {
      this.loggerService.error('Error getting top customers', error);
      throw error;
    }
  }

  async getTrafficSources(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      return await this.getTrafficSourcesData(dateRange, tenantId);
    } catch (error) {
      this.loggerService.error('Error getting traffic sources', error);
      throw error;
    }
  }

  async getGeographicAnalytics(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      
      const [
        salesByCountry,
        salesByRegion,
        salesByCity,
        customerDistribution
      ] = await Promise.all([
        this.getSalesByCountry(dateRange, tenantId),
        this.getSalesByRegion(dateRange, tenantId),
        this.getSalesByCity(dateRange, tenantId),
        this.getCustomerDistribution(dateRange, tenantId)
      ]);

      return {
        salesByCountry,
        salesByRegion,
        salesByCity,
        customerDistribution
      };
    } catch (error) {
      this.loggerService.error('Error getting geographic analytics', error);
      throw error;
    }
  }

  async getConversionFunnel(filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const dateRange = this.getDateRangeFromFilter(filterDto);
      
      const [
        visitors,
        addToCart,
        initiatedCheckout,
        completedOrders,
        conversionRates
      ] = await Promise.all([
        this.getVisitors(dateRange, tenantId),
        this.getAddToCartEvents(dateRange, tenantId),
        this.getInitiatedCheckoutEvents(dateRange, tenantId),
        this.getCompletedOrders(dateRange, tenantId),
        this.getConversionRates(dateRange, tenantId)
      ]);

      return {
        visitors,
        addToCart,
        initiatedCheckout,
        completedOrders,
        conversionRates
      };
    } catch (error) {
      this.loggerService.error('Error getting conversion funnel', error);
      throw error;
    }
  }

  async getAvailableReports(tenantId: string) {
    try {
      return [
        {
          id: 1,
          name: 'Sales Report',
          description: 'Comprehensive sales performance report',
          type: 'sales',
          parameters: ['period', 'category', 'region']
        },
        {
          id: 2,
          name: 'Customer Report',
          description: 'Customer behavior and acquisition report',
          type: 'customer',
          parameters: ['period', 'segment', 'acquisition_source']
        },
        {
          id: 3,
          name: 'Product Report',
          description: 'Product performance and inventory report',
          type: 'product',
          parameters: ['period', 'category', 'status']
        },
        {
          id: 4,
          name: 'Financial Report',
          description: 'Financial performance and profitability report',
          type: 'financial',
          parameters: ['period', 'revenue_type', 'cost_center']
        }
      ];
    } catch (error) {
      this.loggerService.error('Error getting available reports', error);
      throw error;
    }
  }

  async createCustomReport(createReportDto: CreateReportDto, tenantId: string, userId: number) {
    try {
      // Implementation for creating custom reports
      const report = {
        id: Date.now(),
        name: createReportDto.name,
        description: createReportDto.description,
        type: createReportDto.type,
        parameters: createReportDto.parameters,
        filters: createReportDto.filters,
        createdBy: userId,
        createdAt: new Date(),
        status: 'generating'
      };

      // Generate report data asynchronously
      this.generateReportData(report, tenantId);

      return report;
    } catch (error) {
      this.loggerService.error('Error creating custom report', error);
      throw error;
    }
  }

  async getReport(id: number, tenantId: string) {
    try {
      // Implementation for retrieving specific report
      return {
        id,
        name: 'Sample Report',
        description: 'Sample report description',
        data: [],
        generatedAt: new Date(),
        status: 'completed'
      };
    } catch (error) {
      this.loggerService.error('Error getting report', error);
      throw error;
    }
  }

  async exportAnalytics(format: string, filterDto: AnalyticsFilterDto, tenantId: string) {
    try {
      const data = await this.getOverviewMetrics(filterDto, tenantId);
      const exportUrl = await this.generateExportFile(data, format, tenantId);
      return exportUrl;
    } catch (error) {
      this.loggerService.error('Error exporting analytics', error);
      throw error;
    }
  }

  async getRealTimeAnalytics(tenantId: string) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const [
        todayRevenue,
        todayOrders,
        todayCustomers,
        activeUsers,
        currentCartValue
      ] = await Promise.all([
        this.getTotalRevenue({ startDate: today, endDate: now }, tenantId),
        this.getTotalOrders({ startDate: today, endDate: now }, tenantId),
        this.getTotalCustomers({ startDate: today, endDate: now }, tenantId),
        this.getActiveUsers(tenantId),
        this.getCurrentCartValue(tenantId)
      ]);

      return {
        todayRevenue,
        todayOrders,
        todayCustomers,
        activeUsers,
        currentCartValue,
        lastUpdated: now
      };
    } catch (error) {
      this.loggerService.error('Error getting real-time analytics', error);
      throw error;
    }
  }

  async getAnalyticsAlerts(tenantId: string) {
    try {
      const alerts = [];
      
      // Check for low stock alerts
      const lowStockProducts = await this.getLowStockProducts({ startDate: new Date(), endDate: new Date() }, tenantId);
      if (lowStockProducts.length > 0) {
        alerts.push({
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${lowStockProducts.length} products are running low on stock`,
          severity: 'medium',
          timestamp: new Date()
        });
      }

      // Check for revenue drop alerts
      const currentRevenue = await this.getTotalRevenue({ 
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
        endDate: new Date() 
      }, tenantId);
      
      const previousRevenue = await this.getTotalRevenue({ 
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), 
        endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      }, tenantId);

      if (currentRevenue < previousRevenue * 0.8) {
        alerts.push({
          type: 'critical',
          title: 'Revenue Drop Alert',
          message: 'Revenue has dropped significantly compared to last week',
          severity: 'high',
          timestamp: new Date()
        });
      }

      return alerts;
    } catch (error) {
      this.loggerService.error('Error getting analytics alerts', error);
      throw error;
    }
  }

  // Helper methods for data retrieval
  private async getRevenueMetrics(dateRange: any, tenantId: string) {
    const result = await this.db
      .select({ total: sql`SUM(${orders.totalAmount})` })
      .from(orders)
      .where(
        and(
          eq(orders.userId, tenantId), // TODO: Fix tenant filtering
          gte(orders.createdAt, dateRange.startDate),
          lte(orders.createdAt, dateRange.endDate),
          eq(orders.status, 'completed')
        )
      );

    return parseFloat(result[0]?.total) || 0;
  }

  private async getOrderMetrics(dateRange: any, tenantId: string) {
    const result = await this.db
      .select({ count: sql`COUNT(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.userId, tenantId), // TODO: Fix tenant filtering
          gte(orders.createdAt, dateRange.startDate),
          lte(orders.createdAt, dateRange.endDate)
        )
      );

    return Number(result[0]?.count) || 0;
  }

  private async getCustomerMetrics(dateRange: any, tenantId: string) {
    const result = await this.db
      .select({ count: sql`COUNT(*)` })
      .from(customers)
      .where(
        and(
          gte(customers.createdAt, dateRange.startDate),
          lte(customers.createdAt, dateRange.endDate)
        )
      );

    return Number(result[0]?.count) || 0;
  }

  private async getProductMetrics(dateRange: any, tenantId: string) {
    const result = await this.db
      .select({ count: sql`COUNT(*)` })
      .from(products)
      .where(
        and(
          gte(products.createdAt, dateRange.startDate),
          lte(products.createdAt, dateRange.endDate)
        )
      );

    return Number(result[0]?.count) || 0;
  }

  private calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private getDateRange(period: string) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
  }

  private getPreviousDateRange(period: string) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case '7d':
        endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        endDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        endDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        startDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        break;
      default:
        endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  // Placeholder methods for various analytics calculations
  private async getTotalRevenue(dateRange: any, tenantId: string) { return 0; }
  private async getTotalOrders(dateRange: any, tenantId: string) { return 0; }
  private async getTotalCustomers(dateRange: any, tenantId: string) { return 0; }
  private async getAverageOrderValue(dateRange: any, tenantId: string) { return 0; }
  private async getConversionRate(dateRange: any, tenantId: string) { return 0; }
  private async getCustomerLifetimeValue(dateRange: any, tenantId: string) { return 0; }
  private async getReturnRate(dateRange: any, tenantId: string) { return 0; }
  private async getInventoryTurnover(dateRange: any, tenantId: string) { return 0; }
  private async getRevenueByPeriod(dateRange: any, tenantId: string) { return []; }
  private async getRevenueBySource(dateRange: any, tenantId: string) { return []; }
  private async getRevenueByProduct(dateRange: any, tenantId: string) { return []; }
  private async getRevenueByCustomer(dateRange: any, tenantId: string) { return []; }
  private async getRevenueGrowth(dateRange: any, tenantId: string) { return 0; }
  private async getProfitMargin(dateRange: any, tenantId: string) { return 0; }
  private async getTotalSales(dateRange: any, tenantId: string) { return 0; }
  private async getSalesByPeriod(dateRange: any, tenantId: string) { return []; }
  private async getSalesByProduct(dateRange: any, tenantId: string) { return []; }
  private async getSalesByCategory(dateRange: any, tenantId: string) { return []; }
  private async getSalesByRegion(dateRange: any, tenantId: string) { return []; }
  private async getSalesTrends(dateRange: any, tenantId: string) { return []; }
  private async getTopSellingProducts(dateRange: any, tenantId: string) { return []; }
  private async getNewCustomers(dateRange: any, tenantId: string) { return 0; }
  private async getReturningCustomers(dateRange: any, tenantId: string) { return 0; }
  private async getCustomerAcquisitionCost(dateRange: any, tenantId: string) { return 0; }
  private async getCustomerRetentionRate(dateRange: any, tenantId: string) { return 0; }
  private async getCustomerSegments(dateRange: any, tenantId: string) { return []; }
  private async getCustomerBehavior(dateRange: any, tenantId: string) { return []; }
  private async getTotalProducts(dateRange: any, tenantId: string) { return 0; }
  private async getProductPerformance(dateRange: any, tenantId: string) { return []; }
  private async getInventoryLevels(dateRange: any, tenantId: string) { return []; }
  private async getLowStockProducts(dateRange: any, tenantId: string) { return []; }
  private async getBestSellingProducts(dateRange: any, tenantId: string) { return []; }
  private async getProductCategories(dateRange: any, tenantId: string) { return []; }
  private async getProductTrends(dateRange: any, tenantId: string) { return []; }
  private async getCampaignPerformance(dateRange: any, tenantId: string) { return []; }
  private async getTrafficSourcesData(dateRange: any, tenantId: string) { return []; }
  private async getConversionRates(dateRange: any, tenantId: string) { return []; }
  private async getMarketingROI(dateRange: any, tenantId: string) { return 0; }
  private async getEmailMarketingMetrics(dateRange: any, tenantId: string) { return []; }
  private async getSocialMediaMetrics(dateRange: any, tenantId: string) { return []; }
  private async getPaidAdvertisingMetrics(dateRange: any, tenantId: string) { return []; }
  private async getTotalCosts(dateRange: any, tenantId: string) { return 0; }
  private async getGrossProfit(dateRange: any, tenantId: string) { return 0; }
  private async getNetProfit(dateRange: any, tenantId: string) { return 0; }
  private async getCashFlow(dateRange: any, tenantId: string) { return 0; }
  private async getExpenses(dateRange: any, tenantId: string) { return []; }
  private async getFinancialHealth(dateRange: any, tenantId: string) { return {}; }
  private async getOrderFulfillment(dateRange: any, tenantId: string) { return {}; }
  private async getShippingMetrics(dateRange: any, tenantId: string) { return {}; }
  private async getReturnRates(dateRange: any, tenantId: string) { return 0; }
  private async getCustomerServiceMetrics(dateRange: any, tenantId: string) { return {}; }
  private async getInventoryManagement(dateRange: any, tenantId: string) { return {}; }
  private async getSupplierPerformance(dateRange: any, tenantId: string) { return {}; }
  private async getOperationalEfficiency(dateRange: any, tenantId: string) { return {}; }
  private async getOrdersByPeriod(dateRange: any, tenantId: string) { return []; }
  private async getCustomersByPeriod(dateRange: any, tenantId: string) { return []; }
  private async getTopValueCustomers(dateRange: any, tenantId: string) { return []; }
  private async getSalesByCountry(dateRange: any, tenantId: string) { return []; }
  private async getSalesByCity(dateRange: any, tenantId: string) { return []; }
  private async getCustomerDistribution(dateRange: any, tenantId: string) { return []; }
  private async getVisitors(dateRange: any, tenantId: string) { return 0; }
  private async getAddToCartEvents(dateRange: any, tenantId: string) { return 0; }
  private async getInitiatedCheckoutEvents(dateRange: any, tenantId: string) { return 0; }
  private async getCompletedOrders(dateRange: any, tenantId: string) { return 0; }
  private async getActiveUsers(tenantId: string) { return 0; }
  private async getCurrentCartValue(tenantId: string) { return 0; }
  private async generateReportData(report: any, tenantId: string) { return; }
  private async generateExportFile(data: any, format: string, tenantId: string) { return 'export-url'; }
}
