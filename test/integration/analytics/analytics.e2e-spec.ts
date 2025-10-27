import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Generate test JWT token
    authToken = jwtService.sign({
      sub: 1,
      email: 'test@example.com',
      role: 'admin',
      tenantId: 'test-tenant',
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/analytics/dashboard (GET)', () => {
    it('should return dashboard analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data).toHaveProperty('orders');
      expect(response.body.data).toHaveProperty('customers');
      expect(response.body.data).toHaveProperty('products');
    });

    it('should return dashboard analytics with comparison', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard?compare=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.revenue).toHaveProperty('current');
      expect(response.body.data.revenue).toHaveProperty('previous');
      expect(response.body.data.revenue).toHaveProperty('change');
    });

    it('should return dashboard analytics for specific period', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard?period=7d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data).toHaveProperty('orders');
      expect(response.body.data).toHaveProperty('customers');
      expect(response.body.data).toHaveProperty('products');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .expect(401);
    });
  });

  describe('/analytics/overview (GET)', () => {
    it('should return business overview metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('totalOrders');
      expect(response.body.data).toHaveProperty('totalCustomers');
      expect(response.body.data).toHaveProperty('averageOrderValue');
      expect(response.body.data).toHaveProperty('conversionRate');
      expect(response.body.data).toHaveProperty('customerLifetimeValue');
      expect(response.body.data).toHaveProperty('returnRate');
      expect(response.body.data).toHaveProperty('inventoryTurnover');
    });

    it('should filter overview metrics by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/overview?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
    });
  });

  describe('/analytics/revenue (GET)', () => {
    it('should return revenue analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/revenue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('revenueByPeriod');
      expect(response.body.data).toHaveProperty('revenueBySource');
      expect(response.body.data).toHaveProperty('revenueByProduct');
      expect(response.body.data).toHaveProperty('revenueByCustomer');
      expect(response.body.data).toHaveProperty('revenueGrowth');
      expect(response.body.data).toHaveProperty('profitMargin');
    });

    it('should return revenue analytics with grouping', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/revenue?groupBy=day')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('revenueByPeriod');
    });
  });

  describe('/analytics/sales (GET)', () => {
    it('should return sales analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalSales');
      expect(response.body.data).toHaveProperty('salesByPeriod');
      expect(response.body.data).toHaveProperty('salesByProduct');
      expect(response.body.data).toHaveProperty('salesByCategory');
      expect(response.body.data).toHaveProperty('salesByRegion');
      expect(response.body.data).toHaveProperty('salesTrends');
      expect(response.body.data).toHaveProperty('topSellingProducts');
    });
  });

  describe('/analytics/customers (GET)', () => {
    it('should return customer analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCustomers');
      expect(response.body.data).toHaveProperty('newCustomers');
      expect(response.body.data).toHaveProperty('returningCustomers');
      expect(response.body.data).toHaveProperty('customerAcquisitionCost');
      expect(response.body.data).toHaveProperty('customerRetentionRate');
      expect(response.body.data).toHaveProperty('customerSegments');
      expect(response.body.data).toHaveProperty('customerBehavior');
    });
  });

  describe('/analytics/products (GET)', () => {
    it('should return product analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalProducts');
      expect(response.body.data).toHaveProperty('productPerformance');
      expect(response.body.data).toHaveProperty('inventoryLevels');
      expect(response.body.data).toHaveProperty('lowStockProducts');
      expect(response.body.data).toHaveProperty('bestSellingProducts');
      expect(response.body.data).toHaveProperty('productCategories');
      expect(response.body.data).toHaveProperty('productTrends');
    });
  });

  describe('/analytics/marketing (GET)', () => {
    it('should return marketing analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/marketing')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('campaignPerformance');
      expect(response.body.data).toHaveProperty('trafficSources');
      expect(response.body.data).toHaveProperty('conversionRates');
      expect(response.body.data).toHaveProperty('marketingROI');
      expect(response.body.data).toHaveProperty('emailMarketing');
      expect(response.body.data).toHaveProperty('socialMedia');
      expect(response.body.data).toHaveProperty('paidAdvertising');
    });
  });

  describe('/analytics/financial (GET)', () => {
    it('should return financial analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/financial')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('totalCosts');
      expect(response.body.data).toHaveProperty('grossProfit');
      expect(response.body.data).toHaveProperty('netProfit');
      expect(response.body.data).toHaveProperty('profitMargin');
      expect(response.body.data).toHaveProperty('cashFlow');
      expect(response.body.data).toHaveProperty('expenses');
      expect(response.body.data).toHaveProperty('financialHealth');
    });
  });

  describe('/analytics/operational (GET)', () => {
    it('should return operational analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/operational')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderFulfillment');
      expect(response.body.data).toHaveProperty('shippingMetrics');
      expect(response.body.data).toHaveProperty('returnRates');
      expect(response.body.data).toHaveProperty('customerService');
      expect(response.body.data).toHaveProperty('inventoryManagement');
      expect(response.body.data).toHaveProperty('supplierPerformance');
      expect(response.body.data).toHaveProperty('operationalEfficiency');
    });
  });

  describe('/analytics/charts/revenue (GET)', () => {
    it('should return revenue chart data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/charts/revenue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('labels');
      expect(response.body.data).toHaveProperty('datasets');
      expect(Array.isArray(response.body.data.labels)).toBe(true);
      expect(Array.isArray(response.body.data.datasets)).toBe(true);
    });
  });

  describe('/analytics/charts/orders (GET)', () => {
    it('should return orders chart data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/charts/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('labels');
      expect(response.body.data).toHaveProperty('datasets');
      expect(Array.isArray(response.body.data.labels)).toBe(true);
      expect(Array.isArray(response.body.data.datasets)).toBe(true);
    });
  });

  describe('/analytics/charts/customers (GET)', () => {
    it('should return customers chart data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/charts/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('labels');
      expect(response.body.data).toHaveProperty('datasets');
      expect(Array.isArray(response.body.data.labels)).toBe(true);
      expect(Array.isArray(response.body.data.datasets)).toBe(true);
    });
  });

  describe('/analytics/top-products (GET)', () => {
    it('should return top products', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/top-products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('/analytics/top-customers (GET)', () => {
    it('should return top customers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/top-customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('/analytics/traffic-sources (GET)', () => {
    it('should return traffic sources', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/traffic-sources')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('/analytics/geographic (GET)', () => {
    it('should return geographic analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/geographic')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('salesByCountry');
      expect(response.body.data).toHaveProperty('salesByRegion');
      expect(response.body.data).toHaveProperty('salesByCity');
      expect(response.body.data).toHaveProperty('customerDistribution');
    });
  });

  describe('/analytics/conversion-funnel (GET)', () => {
    it('should return conversion funnel analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/conversion-funnel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('visitors');
      expect(response.body.data).toHaveProperty('addToCart');
      expect(response.body.data).toHaveProperty('initiatedCheckout');
      expect(response.body.data).toHaveProperty('completedOrders');
      expect(response.body.data).toHaveProperty('conversionRates');
    });
  });

  describe('/analytics/reports (GET)', () => {
    it('should return available reports', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('/analytics/reports (POST)', () => {
    it('should create a custom report', async () => {
      const createReportDto = {
        name: 'Custom Report',
        description: 'Custom report description',
        type: 'sales',
        parameters: [
          { name: 'period', value: '30d' },
          { name: 'category', value: 'electronics' },
        ],
        filters: [
          { field: 'status', operator: 'equals', value: 'active' },
        ],
        includeCharts: true,
        includeTables: true,
        includeSummaries: true,
        includeRecommendations: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/analytics/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createReportDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('type');
    });
  });

  describe('/analytics/reports/:id (GET)', () => {
    it('should return a specific report', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/reports/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('data');
    });
  });

  describe('/analytics/export/:format (GET)', () => {
    it('should export analytics data as CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/export/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('url');
    });

    it('should export analytics data as Excel', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/export/excel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('url');
    });

    it('should export analytics data as PDF', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/export/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('url');
    });
  });

  describe('/analytics/real-time (GET)', () => {
    it('should return real-time analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/real-time')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('todayRevenue');
      expect(response.body.data).toHaveProperty('todayOrders');
      expect(response.body.data).toHaveProperty('todayCustomers');
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(response.body.data).toHaveProperty('currentCartValue');
      expect(response.body.data).toHaveProperty('lastUpdated');
    });
  });

  describe('/analytics/alerts (GET)', () => {
    it('should return analytics alerts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/overview?startDate=invalid-date&endDate=invalid-date')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should handle invalid period parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard?period=invalid-period')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should handle invalid export format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/export/invalid-format')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });
});
