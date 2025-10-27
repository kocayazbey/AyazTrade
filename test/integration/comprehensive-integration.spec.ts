import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';
import { ComprehensiveModule } from '../../src/core/comprehensive/comprehensive.module';
import { WMSController } from '../../src/modules/wms/wms.controller';
import { CRMController } from '../../src/modules/crm/crm.controller';
import { WarehouseService } from '../../src/modules/wms/services/warehouse.service';
import { CRMService } from '../../src/modules/crm/services/crm.service';
import { ProductsService } from '../../src/modules/products/products.service';
import { OrdersService } from '../../src/modules/ayaz-comm/orders/orders.service';
import { CheckoutService } from '../../src/modules/ayaz-comm/checkout/checkout.service';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { ShippingService } from '../../src/modules/shipping/shipping.service';

describe('Comprehensive Integration Tests', () => {
  let app: INestApplication;
  let warehouseService: WarehouseService;
  let crmService: CRMService;
  let productsService: ProductsService;
  let ordersService: OrdersService;
  let checkoutService: CheckoutService;
  let analyticsService: AnalyticsService;
  let inventoryService: InventoryService;
  let shippingService: ShippingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ComprehensiveModule],
      controllers: [WMSController, CRMController],
      providers: [
        {
          provide: WarehouseService,
          useValue: {
            getWarehouses: jest.fn().mockResolvedValue([
              { id: '1', name: 'Warehouse 1', location: 'Location 1' },
              { id: '2', name: 'Warehouse 2', location: 'Location 2' },
            ]),
            createWarehouse: jest.fn().mockResolvedValue({
              id: '3',
              name: 'New Warehouse',
              location: 'New Location',
            }),
            getWarehouseById: jest.fn().mockResolvedValue({
              id: '1',
              name: 'Warehouse 1',
              location: 'Location 1',
            }),
          },
        },
        {
          provide: CRMService,
          useValue: {
            getCustomers: jest.fn().mockResolvedValue([
              { id: '1', name: 'Customer 1', email: 'customer1@example.com' },
              { id: '2', name: 'Customer 2', email: 'customer2@example.com' },
            ]),
            createCustomer: jest.fn().mockResolvedValue({
              id: '3',
              name: 'New Customer',
              email: 'newcustomer@example.com',
            }),
            getCustomerById: jest.fn().mockResolvedValue({
              id: '1',
              name: 'Customer 1',
              email: 'customer1@example.com',
            }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Add global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

    // Setup Swagger
    const config = new DocumentBuilder()
      .setTitle('AyazTrade API')
      .setDescription('Comprehensive API with full features')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.init();

    warehouseService = moduleFixture.get<WarehouseService>(WarehouseService);
    crmService = moduleFixture.get<CRMService>(CRMService);
    productsService = moduleFixture.get<ProductsService>(ProductsService);
    ordersService = moduleFixture.get<OrdersService>(OrdersService);
    checkoutService = moduleFixture.get<CheckoutService>(CheckoutService);
    analyticsService = moduleFixture.get<AnalyticsService>(AnalyticsService);
    inventoryService = moduleFixture.get<InventoryService>(InventoryService);
    shippingService = moduleFixture.get<ShippingService>(ShippingService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('WMS Endpoints with Comprehensive Features', () => {
    it('should get warehouses with comprehensive features', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/wms/warehouses')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.headers['x-cache-status']).toBeDefined();
      expect(response.headers['x-audit-id']).toBeDefined();
      expect(response.headers['x-performance-time']).toBeDefined();
    });

    it('should create warehouse with comprehensive features', async () => {
      const warehouseData = {
        name: 'New Warehouse',
        location: 'New Location',
        capacity: 1000,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/wms/warehouses')
        .send(warehouseData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.headers['x-audit-id']).toBeDefined();
      expect(response.headers['x-performance-time']).toBeDefined();
    });

    it('should get warehouse by ID with comprehensive features', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/wms/warehouses/1')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.headers['x-cache-status']).toBeDefined();
      expect(response.headers['x-audit-id']).toBeDefined();
      expect(response.headers['x-performance-time']).toBeDefined();
    });
  });

  describe('CRM Endpoints with Comprehensive Features', () => {
    it('should get customers with comprehensive features', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/crm/customers')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.headers['x-cache-status']).toBeDefined();
      expect(response.headers['x-audit-id']).toBeDefined();
      expect(response.headers['x-performance-time']).toBeDefined();
    });

    it('should create customer with comprehensive features', async () => {
      const customerData = {
        name: 'New Customer',
        email: 'newcustomer@example.com',
        phone: '+1234567890',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/crm/customers')
        .send(customerData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.headers['x-audit-id']).toBeDefined();
      expect(response.headers['x-performance-time']).toBeDefined();
    });

    it('should get customer by ID with comprehensive features', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/crm/customers/1')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.headers['x-cache-status']).toBeDefined();
      expect(response.headers['x-audit-id']).toBeDefined();
      expect(response.headers['x-performance-time']).toBeDefined();
    });
  });

  describe('Comprehensive Features Validation', () => {
    it('should include cache headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/wms/warehouses')
        .expect(200);

      expect(response.headers['x-cache-status']).toBeDefined();
      expect(response.headers['x-cache-key']).toBeDefined();
    });

    it('should include audit headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/wms/warehouses')
        .expect(200);

      expect(response.headers['x-audit-id']).toBeDefined();
      expect(response.headers['x-audit-level']).toBeDefined();
    });

    it('should include performance headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/wms/warehouses')
        .expect(200);

      expect(response.headers['x-performance-time']).toBeDefined();
      expect(response.headers['x-performance-memory']).toBeDefined();
      expect(response.headers['x-performance-cpu']).toBeDefined();
    });
  });

  describe('Error Handling with Comprehensive Features', () => {
    it('should handle validation errors with comprehensive features', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/wms/warehouses')
        .send({}) // Empty body should trigger validation error
        .expect(400);

      expect(response.body).toBeDefined();
      expect(response.headers['x-audit-id']).toBeDefined();
    });

    it('should handle not found errors with comprehensive features', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/wms/warehouses/nonexistent')
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.headers['x-audit-id']).toBeDefined();
    });
  });

  describe('E-commerce Complete Flow Integration', () => {
    let createdProduct: any;
    let createdOrder: any;
    let createdCustomer: any;

    it('should complete full product lifecycle', async () => {
      // 1. Create product
      const productData = {
        name: 'Integration Test Product',
        description: 'Product created during integration test',
        price: 299.99,
        stock: 100,
        sku: 'INT-TEST-001',
        categoryId: '1',
        brandId: '1',
        vendorId: '1',
        status: 'active',
        images: ['test-image.jpg'],
      };

      const createProductResponse = await request(app.getHttpServer())
        .post('/v1/products')
        .send(productData)
        .expect(201);

      createdProduct = createProductResponse.body;
      expect(createdProduct.id).toBeDefined();
      expect(createdProduct.sku).toBe('INT-TEST-001');

      // 2. Create customer
      const customerData = {
        name: 'Integration Test Customer',
        email: 'integration@example.com',
        phone: '+1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
      };

      const createCustomerResponse = await request(app.getHttpServer())
        .post('/v1/crm/customers')
        .send(customerData)
        .expect(201);

      createdCustomer = createCustomerResponse.body;
      expect(createdCustomer.id).toBeDefined();

      // 3. Create order
      const orderData = {
        customerId: createdCustomer.id,
        items: [
          {
            productId: createdProduct.id,
            quantity: 2,
            price: createdProduct.price,
            options: {},
          },
        ],
        shippingAddress: customerData.address,
        billingAddress: customerData.address,
        paymentMethod: 'credit_card',
        notes: 'Integration test order',
      };

      const createOrderResponse = await request(app.getHttpServer())
        .post('/v1/orders')
        .send(orderData)
        .expect(201);

      createdOrder = createOrderResponse.body;
      expect(createdOrder.id).toBeDefined();
      expect(createdOrder.orderNumber).toMatch(/^ORD-\d{4}-\d{3}$/);
      expect(createdOrder.total).toBe(629.98); // 2 * 299.99 + tax + shipping

      // 4. Process payment
      const paymentResponse = await request(app.getHttpServer())
        .post(`/v1/orders/${createdOrder.id}/payment`)
        .send({
          method: 'credit_card',
          paymentData: {
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '25',
            cvv: '123',
          },
        })
        .expect(200);

      expect(paymentResponse.body.status).toBe('completed');

      // 5. Update order status to processing
      await request(app.getHttpServer())
        .patch(`/v1/orders/${createdOrder.id}/status`)
        .send({ status: 'processing' })
        .expect(200);

      // 6. Ship order
      await request(app.getHttpServer())
        .patch(`/v1/orders/${createdOrder.id}/shipping`)
        .send({
          status: 'shipped',
          trackingNumber: 'TRK123456789',
        })
        .expect(200);

      // 7. Deliver order
      await request(app.getHttpServer())
        .patch(`/v1/orders/${createdOrder.id}/status`)
        .send({ status: 'delivered' })
        .expect(200);

      // 8. Verify inventory was updated
      const updatedProductResponse = await request(app.getHttpServer())
        .get(`/v1/products/${createdProduct.id}`)
        .expect(200);

      expect(updatedProductResponse.body.stockQuantity).toBe(98); // 100 - 2

      // 9. Verify analytics were updated
      const analyticsResponse = await request(app.getHttpServer())
        .get('/v1/analytics/dashboard?period=1d')
        .expect(200);

      expect(analyticsResponse.body).toHaveProperty('totalOrders');
      expect(analyticsResponse.body).toHaveProperty('totalRevenue');
    });

    it('should handle order cancellation flow', async () => {
      // Create another order for cancellation test
      const cancelOrderData = {
        customerId: createdCustomer.id,
        items: [
          {
            productId: createdProduct.id,
            quantity: 1,
            price: createdProduct.price,
            options: {},
          },
        ],
        shippingAddress: createdCustomer.address,
        billingAddress: createdCustomer.address,
        paymentMethod: 'credit_card',
        notes: 'Order to be cancelled',
      };

      const cancelOrderResponse = await request(app.getHttpServer())
        .post('/v1/orders')
        .send(cancelOrderData)
        .expect(201);

      const orderToCancel = cancelOrderResponse.body;

      // Cancel order
      const cancelResponse = await request(app.getHttpServer())
        .patch(`/v1/orders/${orderToCancel.id}/cancel`)
        .send({ reason: 'Customer request' })
        .expect(200);

      expect(cancelResponse.body.status).toBe('cancelled');

      // Verify inventory was restored
      const finalProductResponse = await request(app.getHttpServer())
        .get(`/v1/products/${createdProduct.id}`)
        .expect(200);

      expect(finalProductResponse.body.stockQuantity).toBe(99); // 100 - 2 + 1 (cancelled order restored)
    });

    it('should handle refund flow', async () => {
      // Process refund for the delivered order
      const refundResponse = await request(app.getHttpServer())
        .post(`/v1/orders/${createdOrder.id}/refund`)
        .send({
          amount: createdOrder.total,
          reason: 'Customer satisfaction',
        })
        .expect(200);

      expect(refundResponse.body.status).toBe('refunded');
      expect(refundResponse.body.refundAmount).toBe(createdOrder.total);
    });
  });

  describe('Multi-Module Integration Scenarios', () => {
    it('should integrate CRM with Orders and Analytics', async () => {
      // Create customer
      const customerData = {
        name: 'CRM Integration Customer',
        email: 'crm.integration@example.com',
        phone: '+9876543210',
      };

      const customerResponse = await request(app.getHttpServer())
        .post('/v1/crm/customers')
        .send(customerData)
        .expect(201);

      const customer = customerResponse.body;

      // Create multiple orders for the customer
      const orders = [];
      for (let i = 0; i < 3; i++) {
        const orderData = {
          customerId: customer.id,
          items: [
            {
              productId: '1',
              quantity: 1,
              price: 100,
              options: {},
            },
          ],
          shippingAddress: customer.address,
          billingAddress: customer.address,
          paymentMethod: 'credit_card',
          notes: `Order ${i + 1}`,
        };

        const orderResponse = await request(app.getHttpServer())
          .post('/v1/orders')
          .send(orderData)
          .expect(201);

        orders.push(orderResponse.body);
      }

      // Verify customer analytics
      const customerAnalyticsResponse = await request(app.getHttpServer())
        .get(`/v1/crm/customers/${customer.id}/analytics`)
        .expect(200);

      expect(customerAnalyticsResponse.body).toHaveProperty('totalOrders');
      expect(customerAnalyticsResponse.body).toHaveProperty('totalSpent');
      expect(customerAnalyticsResponse.body).toHaveProperty('averageOrderValue');
    });

    it('should integrate Inventory with Products and Orders', async () => {
      // Create product with low stock
      const lowStockProductData = {
        name: 'Low Stock Product',
        description: 'Product with low stock for testing',
        price: 49.99,
        stock: 5,
        sku: 'LOW-STOCK-001',
        categoryId: '1',
        brandId: '1',
        vendorId: '1',
        status: 'active',
      };

      const productResponse = await request(app.getHttpServer())
        .post('/v1/products')
        .send(lowStockProductData)
        .expect(201);

      const lowStockProduct = productResponse.body;

      // Create order that depletes stock
      const orderData = {
        customerId: '1',
        items: [
          {
            productId: lowStockProduct.id,
            quantity: 5,
            price: lowStockProduct.price,
            options: {},
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        paymentMethod: 'credit_card',
      };

      await request(app.getHttpServer())
        .post('/v1/orders')
        .send(orderData)
        .expect(201);

      // Verify stock is depleted
      const updatedProductResponse = await request(app.getHttpServer())
        .get(`/v1/products/${lowStockProduct.id}`)
        .expect(200);

      expect(updatedProductResponse.body.stockQuantity).toBe(0);

      // Verify low stock alerts are triggered
      const alertsResponse = await request(app.getHttpServer())
        .get('/v1/inventory/alerts')
        .expect(200);

      expect(alertsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            productId: lowStockProduct.id,
            type: 'out_of_stock',
          }),
        ])
      );
    });

    it('should integrate Analytics with all modules', async () => {
      // Create comprehensive analytics request
      const analyticsResponse = await request(app.getHttpServer())
        .get('/v1/analytics/comprehensive?period=7d')
        .expect(200);

      expect(analyticsResponse.body).toHaveProperty('products');
      expect(analyticsResponse.body).toHaveProperty('orders');
      expect(analyticsResponse.body).toHaveProperty('customers');
      expect(analyticsResponse.body).toHaveProperty('inventory');
      expect(analyticsResponse.body).toHaveProperty('shipping');
      expect(analyticsResponse.body).toHaveProperty('payments');
      expect(analyticsResponse.body).toHaveProperty('performance');

      // Verify cross-module calculations
      expect(analyticsResponse.body.orders.totalRevenue).toBeDefined();
      expect(analyticsResponse.body.inventory.turnoverRate).toBeDefined();
      expect(analyticsResponse.body.customers.lifetimeValue).toBeDefined();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle partial failures gracefully', async () => {
      // Create order with invalid product ID
      const invalidOrderData = {
        customerId: '1',
        items: [
          {
            productId: 'invalid-product-id',
            quantity: 1,
            price: 100,
            options: {},
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        paymentMethod: 'credit_card',
      };

      const errorResponse = await request(app.getHttpServer())
        .post('/v1/orders')
        .send(invalidOrderData)
        .expect(400);

      expect(errorResponse.body).toHaveProperty('message');
      expect(errorResponse.body).toHaveProperty('error');
      expect(errorResponse.headers['x-audit-id']).toBeDefined();
    });

    it('should maintain data consistency during failures', async () => {
      // This would test transaction rollbacks and data consistency
      // In a real scenario, you would mock database failures

      const orderData = {
        customerId: '1',
        items: [
          {
            productId: '1',
            quantity: 1,
            price: 100,
            options: {},
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        paymentMethod: 'credit_card',
      };

      // Verify that even if payment fails, order is still created but with failed payment status
      // This tests the resilience of the system
      const response = await request(app.getHttpServer())
        .post('/v1/orders')
        .send(orderData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.paymentStatus).toBe('pending');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map(async (_, index) => {
        const orderData = {
          customerId: '1',
          items: [
            {
              productId: '1',
              quantity: 1,
              price: 100,
              options: {},
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Test Country',
          },
          billingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Test Country',
          },
          paymentMethod: 'credit_card',
          notes: `Concurrent order ${index + 1}`,
        };

        return request(app.getHttpServer())
          .post('/v1/orders')
          .send(orderData)
          .expect(201);
      });

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.body.id).toBeDefined();
        expect(response.body.orderNumber).toMatch(/^ORD-\d{4}-\d{3}$/);
        expect(response.headers['x-performance-time']).toBeDefined();
      });
    });

    it('should handle large data sets', async () => {
      // Test with large product catalog
      const largeCatalogResponse = await request(app.getHttpServer())
        .get('/v1/products?limit=1000')
        .expect(200);

      expect(largeCatalogResponse.body.data).toBeDefined();
      expect(largeCatalogResponse.body.total).toBeGreaterThan(0);
      expect(largeCatalogResponse.headers['x-performance-time']).toBeDefined();

      // Verify pagination works
      const secondPageResponse = await request(app.getHttpServer())
        .get('/v1/products?limit=100&page=2')
        .expect(200);

      expect(secondPageResponse.body.page).toBe(2);
    });
  });

  describe('Security Integration', () => {
    it('should enforce authentication across modules', async () => {
      // Test unauthorized access
      await request(app.getHttpServer())
        .get('/v1/orders')
        .expect(401);

      await request(app.getHttpServer())
        .post('/v1/products')
        .expect(401);

      await request(app.getHttpServer())
        .get('/v1/crm/customers')
        .expect(401);
    });

    it('should enforce role-based access control', async () => {
      // Test role-based restrictions (assuming different user roles)
      const adminResponse = await request(app.getHttpServer())
        .get('/v1/admin/analytics')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const userResponse = await request(app.getHttpServer())
        .get('/v1/admin/analytics')
        .set('Authorization', 'Bearer user-token')
        .expect(403);

      expect(adminResponse.status).toBe(200);
      expect(userResponse.status).toBe(403);
    });

    it('should validate input across all modules', async () => {
      // Test input validation
      await request(app.getHttpServer())
        .post('/v1/products')
        .send({ invalid: 'data' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/v1/orders')
        .send({ invalid: 'order data' })
        .expect(400);
    });

    it('should prevent SQL injection and XSS', async () => {
      const maliciousData = {
        name: "'; DROP TABLE products; --",
        description: '<script>alert("xss")</script>',
        price: '999999999999999999999',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/products')
        .send(maliciousData)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });
  });

  describe('Real-time Integration', () => {
    it('should update real-time analytics', async () => {
      // Create order and verify real-time updates
      const orderData = {
        customerId: '1',
        items: [
          {
            productId: '1',
            quantity: 1,
            price: 100,
            options: {},
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        paymentMethod: 'credit_card',
      };

      const beforeAnalyticsResponse = await request(app.getHttpServer())
        .get('/v1/analytics/real-time/kpis')
        .expect(200);

      const beforeOrderCount = beforeAnalyticsResponse.body.totalOrders;

      await request(app.getHttpServer())
        .post('/v1/orders')
        .send(orderData)
        .expect(201);

      // Wait a moment for real-time updates
      await new Promise(resolve => setTimeout(resolve, 100));

      const afterAnalyticsResponse = await request(app.getHttpServer())
        .get('/v1/analytics/real-time/kpis')
        .expect(200);

      expect(afterAnalyticsResponse.body.totalOrders).toBe(beforeOrderCount + 1);
    });
  });

  describe('Data Synchronization', () => {
    it('should sync data between modules', async () => {
      // Create product
      const productData = {
        name: 'Sync Test Product',
        description: 'Product for sync testing',
        price: 199.99,
        stock: 50,
        sku: 'SYNC-TEST-001',
        categoryId: '1',
        brandId: '1',
        vendorId: '1',
        status: 'active',
      };

      const productResponse = await request(app.getHttpServer())
        .post('/v1/products')
        .send(productData)
        .expect(201);

      const product = productResponse.body;

      // Create order for the product
      const orderData = {
        customerId: '1',
        items: [
          {
            productId: product.id,
            quantity: 5,
            price: product.price,
            options: {},
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        paymentMethod: 'credit_card',
      };

      await request(app.getHttpServer())
        .post('/v1/orders')
        .send(orderData)
        .expect(201);

      // Verify inventory sync
      const updatedProductResponse = await request(app.getHttpServer())
        .get(`/v1/products/${product.id}`)
        .expect(200);

      expect(updatedProductResponse.body.stockQuantity).toBe(45); // 50 - 5

      // Verify analytics sync
      const analyticsResponse = await request(app.getHttpServer())
        .get('/v1/analytics/dashboard')
        .expect(200);

      expect(analyticsResponse.body).toHaveProperty('totalProducts');
      expect(analyticsResponse.body).toHaveProperty('totalOrders');
    });
  });
});
