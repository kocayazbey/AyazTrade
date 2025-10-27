import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { CacheService } from '../../src/core/cache/cache.service';
import { LoggerService } from '../../src/core/logger/winston-logger.service';
import { AnalyticsFilterDto } from '../../src/modules/analytics/dto/analytics-filter.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let cacheService: CacheService;
  let loggerService: LoggerService;

  const mockAnalyticsFilter: AnalyticsFilterDto = {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    period: '30d',
    groupBy: 'day',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            deletePattern: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    cacheService = module.get<CacheService>(CacheService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardAnalytics', () => {
    it('should return dashboard analytics with comparison', async () => {
      const mockAnalytics = {
        revenue: { current: 50000, previous: 45000, change: 11.11 },
        orders: { current: 150, previous: 120, change: 25.0 },
        customers: { current: 75, previous: 60, change: 25.0 },
        products: { current: 200, previous: 180, change: 11.11 },
      } as any;

      jest.spyOn<any, any>(service, 'getRevenueMetrics').mockResolvedValue(50000);
      jest.spyOn<any, any>(service, 'getOrderMetrics').mockResolvedValue(150);
      jest.spyOn<any, any>(service, 'getCustomerMetrics').mockResolvedValue(75);
      jest.spyOn<any, any>(service, 'getProductMetrics').mockResolvedValue(200);

      const result = await service.getDashboardAnalytics('30d', true, 'test-tenant');
      expect(result).toEqual(mockAnalytics);
    });

    it('should use cache when available', async () => {
      const cachedAnalytics = {
        revenue: { current: 50000, previous: null, change: 0 },
        orders: { current: 150, previous: null, change: 0 },
        customers: { current: 75, previous: null, change: 0 },
        products: { current: 200, previous: null, change: 0 },
      } as any;

      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedAnalytics as any);
      const result = await service.getDashboardAnalytics('30d', false, 'test-tenant');

      expect(result).toEqual(cachedAnalytics);
    });
  });

  describe('getOverviewMetrics', () => {
    it('should return overview metrics', async () => {
      const mockOverview = {
        totalRevenue: 100000,
        totalOrders: 500,
        totalCustomers: 200,
        averageOrderValue: 200,
        conversionRate: 0.15,
        customerLifetimeValue: 500,
        returnRate: 0.05,
        inventoryTurnover: 4.5,
      } as any;

      jest.spyOn<any, any>(service, 'getTotalRevenue').mockResolvedValue(100000);
      jest.spyOn<any, any>(service, 'getTotalOrders').mockResolvedValue(500);
      jest.spyOn<any, any>(service, 'getTotalCustomers').mockResolvedValue(200);
      jest.spyOn<any, any>(service, 'getAverageOrderValue').mockResolvedValue(200);
      jest.spyOn<any, any>(service, 'getConversionRate').mockResolvedValue(0.15);
      jest.spyOn<any, any>(service, 'getCustomerLifetimeValue').mockResolvedValue(500);
      jest.spyOn<any, any>(service, 'getReturnRate').mockResolvedValue(0.05);
      jest.spyOn<any, any>(service, 'getInventoryTurnover').mockResolvedValue(4.5);

      const result = await service.getOverviewMetrics(mockAnalyticsFilter, 'test-tenant');
      expect(result).toEqual(mockOverview);
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics', async () => {
      const mockRevenueAnalytics = {
        totalRevenue: 100000,
        revenueByPeriod: [
          { period: '2024-01-01', revenue: 5000 },
          { period: '2024-01-02', revenue: 6000 },
        ],
        revenueBySource: [
          { source: 'online', revenue: 80000 },
          { source: 'retail', revenue: 20000 },
        ],
        revenueByProduct: [
          { productId: 1, revenue: 30000 },
          { productId: 2, revenue: 20000 },
        ],
        revenueByCustomer: [
          { customerId: 1, revenue: 15000 },
          { customerId: 2, revenue: 10000 },
        ],
        revenueGrowth: 15.5,
        profitMargin: 0.25,
      };

      jest.spyOn(service as any, 'getTotalRevenue').mockResolvedValue(100000);
      jest.spyOn(service as any, 'getRevenueByPeriod').mockResolvedValue(mockRevenueAnalytics.revenueByPeriod);
      jest.spyOn(service as any, 'getRevenueBySource').mockResolvedValue(mockRevenueAnalytics.revenueBySource);
      jest.spyOn(service as any, 'getRevenueByProduct').mockResolvedValue(mockRevenueAnalytics.revenueByProduct);
      jest.spyOn(service as any, 'getRevenueByCustomer').mockResolvedValue(mockRevenueAnalytics.revenueByCustomer);
      jest.spyOn(service as any, 'getRevenueGrowth').mockResolvedValue(15.5);
      jest.spyOn(service as any, 'getProfitMargin').mockResolvedValue(0.25);

      const result = await service.getRevenueAnalytics(mockAnalyticsFilter, 'test-tenant');

      expect(result).toEqual(mockRevenueAnalytics);
    });
  });

  describe('getSalesAnalytics', () => {
    it('should return sales analytics', async () => {
      const mockSalesAnalytics = {
        totalSales: 500,
        salesByPeriod: [
          { period: '2024-01-01', sales: 25 },
          { period: '2024-01-02', sales: 30 },
        ],
        salesByProduct: [
          { productId: 1, sales: 100 },
          { productId: 2, sales: 80 },
        ],
        salesByCategory: [
          { categoryId: 1, sales: 200 },
          { categoryId: 2, sales: 150 },
        ],
        salesByRegion: [
          { region: 'North', sales: 300 },
          { region: 'South', sales: 200 },
        ],
        salesTrends: {
          trend: 'up',
          change: 10.5,
        },
        topSellingProducts: [
          { productId: 1, name: 'Product 1', sales: 100 },
          { productId: 2, name: 'Product 2', sales: 80 },
        ],
      };

      jest.spyOn(service as any, 'getTotalSales').mockResolvedValue(500);
      jest.spyOn(service as any, 'getSalesByPeriod').mockResolvedValue(mockSalesAnalytics.salesByPeriod);
      jest.spyOn(service as any, 'getSalesByProduct').mockResolvedValue(mockSalesAnalytics.salesByProduct);
      jest.spyOn(service as any, 'getSalesByCategory').mockResolvedValue(mockSalesAnalytics.salesByCategory);
      jest.spyOn(service as any, 'getSalesByRegion').mockResolvedValue(mockSalesAnalytics.salesByRegion);
      jest.spyOn(service as any, 'getSalesTrends').mockResolvedValue(mockSalesAnalytics.salesTrends);
      jest.spyOn(service as any, 'getTopSellingProducts').mockResolvedValue(mockSalesAnalytics.topSellingProducts);

      const result = await service.getSalesAnalytics(mockAnalyticsFilter, 'test-tenant');

      expect(result).toEqual(mockSalesAnalytics);
    });
  });

  describe('getCustomerAnalytics', () => {
    it('should return customer analytics', async () => {
      const mockCustomerAnalytics = {
        totalCustomers: 200,
        newCustomers: 50,
        returningCustomers: 150,
        customerAcquisitionCost: 25.50,
        customerRetentionRate: 0.85,
        customerSegments: [
          { segment: 'premium', count: 30 },
          { segment: 'regular', count: 170 },
        ],
        customerBehavior: {
          averageSessionDuration: 300,
          bounceRate: 0.25,
          pagesPerSession: 4.5,
        },
      };

      jest.spyOn(service as any, 'getTotalCustomers').mockResolvedValue(200);
      jest.spyOn(service as any, 'getNewCustomers').mockResolvedValue(50);
      jest.spyOn(service as any, 'getReturningCustomers').mockResolvedValue(150);
      jest.spyOn(service as any, 'getCustomerAcquisitionCost').mockResolvedValue(25.50);
      jest.spyOn(service as any, 'getCustomerRetentionRate').mockResolvedValue(0.85);
      jest.spyOn(service as any, 'getCustomerSegments').mockResolvedValue(mockCustomerAnalytics.customerSegments);
      jest.spyOn(service as any, 'getCustomerBehavior').mockResolvedValue(mockCustomerAnalytics.customerBehavior);

      const result = await service.getCustomerAnalytics(mockAnalyticsFilter, 'test-tenant');

      expect(result).toEqual(mockCustomerAnalytics);
    });
  });

  describe('getProductAnalytics', () => {
    it('should return product analytics', async () => {
      const mockProductAnalytics = {
        totalProducts: 100,
        productPerformance: [
          { productId: 1, revenue: 30000, orders: 100 },
          { productId: 2, revenue: 20000, orders: 80 },
        ],
        inventoryLevels: {
          totalValue: 500000,
          averageStock: 50,
          lowStockCount: 5,
        },
        lowStockProducts: [
          { productId: 1, name: 'Product 1', stock: 5 },
          { productId: 2, name: 'Product 2', stock: 3 },
        ],
        bestSellingProducts: [
          { productId: 1, name: 'Product 1', sales: 100 },
          { productId: 2, name: 'Product 2', sales: 80 },
        ],
        productCategories: [
          { categoryId: 1, name: 'Electronics', count: 50 },
          { categoryId: 2, name: 'Clothing', count: 30 },
        ],
        productTrends: {
          trendingUp: 10,
          trendingDown: 5,
        },
      };

      jest.spyOn(service as any, 'getTotalProducts').mockResolvedValue(100);
      jest.spyOn(service as any, 'getProductPerformance').mockResolvedValue(mockProductAnalytics.productPerformance);
      jest.spyOn(service as any, 'getInventoryLevels').mockResolvedValue(mockProductAnalytics.inventoryLevels);
      jest.spyOn(service as any, 'getLowStockProducts').mockResolvedValue(mockProductAnalytics.lowStockProducts);
      jest.spyOn(service as any, 'getBestSellingProducts').mockResolvedValue(mockProductAnalytics.bestSellingProducts);
      jest.spyOn(service as any, 'getProductCategories').mockResolvedValue(mockProductAnalytics.productCategories);
      jest.spyOn(service as any, 'getProductTrends').mockResolvedValue(mockProductAnalytics.productTrends);

      const result = await service.getProductAnalytics(mockAnalyticsFilter, 'test-tenant');

      expect(result).toEqual(mockProductAnalytics);
    });
  });

  describe('getMarketingAnalytics', () => {
    it('should return marketing analytics', async () => {
      const mockMarketingAnalytics = {
        campaignPerformance: [
          { campaignId: 1, name: 'Summer Sale', roi: 2.5, conversions: 100 },
          { campaignId: 2, name: 'Black Friday', roi: 3.2, conversions: 150 },
        ],
        trafficSources: [
          { source: 'google', visitors: 1000, conversions: 50 },
          { source: 'facebook', visitors: 800, conversions: 40 },
        ],
        conversionRates: {
          overall: 0.15,
          bySource: [
            { source: 'google', rate: 0.18 },
            { source: 'facebook', rate: 0.12 },
          ],
        },
        marketingROI: 2.8,
        emailMarketing: {
          sent: 10000,
          delivered: 9500,
          opened: 3800,
          clicked: 950,
          unsubscribed: 50,
        },
        socialMedia: {
          followers: 5000,
          engagement: 0.05,
          reach: 25000,
        },
        paidAdvertising: {
          spend: 5000,
          impressions: 100000,
          clicks: 2000,
          conversions: 100,
        },
      };

      jest.spyOn(service as any, 'getCampaignPerformance').mockResolvedValue(mockMarketingAnalytics.campaignPerformance);
      jest.spyOn(service as any, 'getTrafficSources').mockResolvedValue(mockMarketingAnalytics.trafficSources);
      jest.spyOn(service as any, 'getConversionRates').mockResolvedValue(mockMarketingAnalytics.conversionRates);
      jest.spyOn(service as any, 'getMarketingROI').mockResolvedValue(2.8);
      jest.spyOn(service as any, 'getEmailMarketingMetrics').mockResolvedValue(mockMarketingAnalytics.emailMarketing);
      jest.spyOn(service as any, 'getSocialMediaMetrics').mockResolvedValue(mockMarketingAnalytics.socialMedia);
      jest.spyOn(service as any, 'getPaidAdvertisingMetrics').mockResolvedValue(mockMarketingAnalytics.paidAdvertising);

      const result = await service.getMarketingAnalytics(mockAnalyticsFilter, 'test-tenant');

      expect(result).toEqual(mockMarketingAnalytics);
    });
  });

  describe('getFinancialAnalytics', () => {
    it('should return financial analytics', async () => {
      const mockFinancialAnalytics = {
        totalRevenue: 100000,
        totalCosts: 60000,
        grossProfit: 40000,
        netProfit: 25000,
        profitMargin: 0.25,
        cashFlow: {
          operating: 30000,
          investing: -5000,
          financing: 10000,
        },
        expenses: [
          { category: 'marketing', amount: 10000 },
          { category: 'operations', amount: 15000 },
        ],
        financialHealth: {
          currentRatio: 2.5,
          quickRatio: 1.8,
          debtToEquity: 0.3,
        },
      };

      jest.spyOn(service as any, 'getTotalRevenue').mockResolvedValue(100000);
      jest.spyOn(service as any, 'getTotalCosts').mockResolvedValue(60000);
      jest.spyOn(service as any, 'getGrossProfit').mockResolvedValue(40000);
      jest.spyOn(service as any, 'getNetProfit').mockResolvedValue(25000);
      jest.spyOn(service as any, 'getProfitMargin').mockResolvedValue(0.25);
      jest.spyOn(service as any, 'getCashFlow').mockResolvedValue(mockFinancialAnalytics.cashFlow);
      jest.spyOn(service as any, 'getExpenses').mockResolvedValue(mockFinancialAnalytics.expenses);
      jest.spyOn(service as any, 'getFinancialHealth').mockResolvedValue(mockFinancialAnalytics.financialHealth);

      const result = await service.getFinancialAnalytics(mockAnalyticsFilter, 'test-tenant');

      expect(result).toEqual(mockFinancialAnalytics);
    });
  });

  describe('getOperationalAnalytics', () => {
    it('should return operational analytics', async () => {
      const mockOperationalAnalytics = {
        orderFulfillment: {
          averageFulfillmentTime: 2.5,
          onTimeDelivery: 0.95,
          fulfillmentRate: 0.98,
        },
        shippingMetrics: {
          averageShippingTime: 3.2,
          shippingCost: 5000,
          deliverySuccess: 0.97,
        },
        returnRates: {
          overall: 0.05,
          byCategory: [
            { category: 'electronics', rate: 0.03 },
            { category: 'clothing', rate: 0.08 },
          ],
        },
        customerService: {
          averageResponseTime: 2.5,
          satisfactionScore: 4.2,
          ticketVolume: 100,
        },
        inventoryManagement: {
          turnoverRate: 4.5,
          accuracy: 0.98,
          shrinkage: 0.02,
        },
        supplierPerformance: {
          onTimeDelivery: 0.92,
          qualityScore: 4.5,
          costVariance: 0.05,
        },
        operationalEfficiency: {
          productivity: 0.85,
          utilization: 0.78,
          efficiency: 0.82,
        },
      };

      jest.spyOn(service as any, 'getOrderFulfillment').mockResolvedValue(mockOperationalAnalytics.orderFulfillment);
      jest.spyOn(service as any, 'getShippingMetrics').mockResolvedValue(mockOperationalAnalytics.shippingMetrics);
      jest.spyOn(service as any, 'getReturnRates').mockResolvedValue(mockOperationalAnalytics.returnRates);
      jest.spyOn(service as any, 'getCustomerServiceMetrics').mockResolvedValue(mockOperationalAnalytics.customerService);
      jest.spyOn(service as any, 'getInventoryManagement').mockResolvedValue(mockOperationalAnalytics.inventoryManagement);
      jest.spyOn(service as any, 'getSupplierPerformance').mockResolvedValue(mockOperationalAnalytics.supplierPerformance);
      jest.spyOn(service as any, 'getOperationalEfficiency').mockResolvedValue(mockOperationalAnalytics.operationalEfficiency);

      const result = await service.getOperationalAnalytics(mockAnalyticsFilter, 'test-tenant');

      expect(result).toEqual(mockOperationalAnalytics);
    });
  });

  describe('getRealTimeAnalytics', () => {
    it('should return real-time analytics', async () => {
      const mockRealTimeAnalytics = {
        todayRevenue: 5000,
        todayOrders: 25,
        todayCustomers: 15,
        activeUsers: 50,
        currentCartValue: 15000,
        lastUpdated: expect.any(Date),
      };

      jest.spyOn(service as any, 'getTotalRevenue').mockResolvedValue(5000);
      jest.spyOn(service as any, 'getTotalOrders').mockResolvedValue(25);
      jest.spyOn(service as any, 'getTotalCustomers').mockResolvedValue(15);
      jest.spyOn(service as any, 'getActiveUsers').mockResolvedValue(50);
      jest.spyOn(service as any, 'getCurrentCartValue').mockResolvedValue(15000);

      const result = await service.getRealTimeAnalytics('test-tenant');

      expect(result).toEqual(mockRealTimeAnalytics);
    });
  });

  describe('getAnalyticsAlerts', () => {
    it('should return analytics alerts', async () => {
      const mockAlerts = [
        {
          type: 'warning',
          title: 'Low Stock Alert',
          message: '5 products are running low on stock',
          severity: 'medium',
          timestamp: expect.any(Date),
        },
        {
          type: 'critical',
          title: 'Revenue Drop Alert',
          message: 'Revenue has dropped significantly compared to last week',
          severity: 'high',
          timestamp: expect.any(Date),
        },
      ];

      jest.spyOn(service as any, 'getLowStockProducts').mockResolvedValue([
        { id: 1, name: 'Product 1', stock: 5 },
        { id: 2, name: 'Product 2', stock: 3 },
      ]);
      jest.spyOn(service as any, 'getTotalRevenue').mockResolvedValueOnce(40000).mockResolvedValueOnce(50000);

      const result = await service.getAnalyticsAlerts('test-tenant');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('warning');
      expect(result[1].type).toBe('critical');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      jest.spyOn(loggerService, 'error').mockImplementation();

      await expect(service.getDashboardAnalytics('30d', false, 'test-tenant')).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      jest.spyOn(cacheService, 'get').mockRejectedValue(new Error('Cache connection failed'));
      jest.spyOn(service as any, 'getRevenueMetrics').mockResolvedValue(50000);
      jest.spyOn(service as any, 'getOrderMetrics').mockResolvedValue(150);
      jest.spyOn(service as any, 'getCustomerMetrics').mockResolvedValue(75);
      jest.spyOn(service as any, 'getProductMetrics').mockResolvedValue(200);

      const result = await service.getDashboardAnalytics('30d', false, 'test-tenant');

      expect(result).toBeDefined();
      expect(result.revenue.current).toBe(50000);
    });
  });
});
