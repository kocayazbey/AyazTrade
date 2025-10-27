import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Shipping System Integration (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/shipping (GET)', () => {
    it('should return shipping management dashboard data', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/shipments')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('shipments');
          expect(res.body.data).toHaveProperty('total');
          expect(res.body.data).toHaveProperty('page');
          expect(res.body.data).toHaveProperty('limit');
        });
    });
  });

  describe('/shipping/shipments (GET)', () => {
    it('should return paginated shipments list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/shipments')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('shipments');
          expect(res.body.data).toHaveProperty('total');
          expect(res.body.data).toHaveProperty('page');
          expect(res.body.data).toHaveProperty('limit');
        });
    });

    it('should filter shipments by status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/shipments?status=in_transit')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          const shipments = res.body.data.shipments;
          if (shipments.length > 0) {
            shipments.forEach((shipment: any) => {
              expect(shipment.status).toBe('in_transit');
            });
          }
        });
    });

    it('should filter shipments by carrier', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/shipments?carrier=Aras Kargo')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          const shipments = res.body.data.shipments;
          if (shipments.length > 0) {
            shipments.forEach((shipment: any) => {
              expect(shipment.carrier).toBe('Aras Kargo');
            });
          }
        });
    });

    it('should search shipments by tracking number', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/shipments?search=SHIP')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          const shipments = res.body.data.shipments;
          if (shipments.length > 0) {
            shipments.forEach((shipment: any) => {
              expect(
                shipment.trackingNumber.toLowerCase().includes('ship') ||
                shipment.orderId.toLowerCase().includes('ship')
              ).toBe(true);
            });
          }
        });
    });
  });

  describe('/shipping/shipments/:id (GET)', () => {
    it('should return shipment details', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/shipments/1')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('trackingNumber');
          expect(res.body.data).toHaveProperty('fromAddress');
          expect(res.body.data).toHaveProperty('toAddress');
          expect(res.body.data).toHaveProperty('packages');
        });
    });

    it('should return 404 for non-existent shipment', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/shipments/NON-EXISTENT')
        .expect(404);
    });
  });

  describe('/shipping/shipments (POST)', () => {
    it('should create new shipment', () => {
      const shipmentData = {
        orderId: 'ORD-TEST-001',
        carrier: 'Aras Kargo',
        service: 'Express',
        fromAddress: {
          name: 'Test Warehouse',
          street1: 'Test Street 123',
          city: 'Istanbul',
          postalCode: '34000',
          country: 'Türkiye',
        },
        toAddress: {
          name: 'Test Customer',
          street1: 'Customer Street 456',
          city: 'Ankara',
          postalCode: '06000',
          country: 'Türkiye',
        },
        packages: [
          {
            weight: 1.5,
            length: 30,
            width: 20,
            height: 10,
            description: 'Test product',
          },
        ],
        insuranceAmount: 1000,
        specialInstructions: 'Handle with care',
      };

      return request(app.getHttpServer())
        .post('/api/v1/shipping/shipments')
        .send(shipmentData)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('trackingNumber');
          expect(res.body.data).toHaveProperty('estimatedDelivery');
        });
    });

    it('should validate required fields', () => {
      const invalidShipmentData = {
        orderId: 'ORD-TEST-002',
        // Missing required fields
      };

      return request(app.getHttpServer())
        .post('/api/v1/shipping/shipments')
        .send(invalidShipmentData)
        .expect(400);
    });
  });

  describe('/shipping/shipments/:id/status (PUT)', () => {
    it('should update shipment status', () => {
      return request(app.getHttpServer())
        .put('/api/v1/shipping/shipments/1/status')
        .send({ status: 'delivered', location: 'Ankara Distribution Center' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe('delivered');
        });
    });
  });

  describe('/shipping/tracking/:trackingNumber (GET)', () => {
    it('should return shipment tracking information', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/tracking/TRK123456789')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('trackingNumber');
          expect(res.body.data).toHaveProperty('status');
          expect(res.body.data).toHaveProperty('events');
          expect(res.body.data).toHaveProperty('estimatedDelivery');
        });
    });
  });

  describe('/admin/shipping (GET)', () => {
    it('should return admin shipping management data', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/shipping/shipments')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('shipments');
          expect(res.body.data).toHaveProperty('total');
        });
    });
  });

  describe('/admin/shipping/stats (GET)', () => {
    it('should return shipping statistics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/shipping/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('totalShipments');
          expect(res.body.data).toHaveProperty('pendingShipments');
          expect(res.body.data).toHaveProperty('inTransitShipments');
          expect(res.body.data).toHaveProperty('deliveredShipments');
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid shipment data gracefully', () => {
      const invalidData = {
        // Missing required fields
        carrier: 'Test Carrier',
      };

      return request(app.getHttpServer())
        .post('/api/v1/shipping/shipments')
        .send(invalidData)
        .expect(400);
    });

    it('should handle non-existent shipment ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/shipments/INVALID-ID')
        .expect(404);
    });

    it('should handle invalid tracking number', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/tracking/INVALID-TRACKING')
        .expect(404);
    });
  });

  describe('Pagination and Filtering', () => {
    it('should handle pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/shipments?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.page).toBe(1);
          expect(res.body.data.limit).toBe(10);
          expect(res.body.data.total).toBeGreaterThanOrEqual(0);
        });
    });

    it('should handle multiple filters simultaneously', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/shipments?status=in_transit&carrier=Aras Kargo&search=SHIP&page=1&limit=5')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          const shipments = res.body.data.shipments;
          if (shipments.length > 0) {
            shipments.forEach((shipment: any) => {
              expect(shipment.status).toBe('in_transit');
              expect(shipment.carrier).toBe('Aras Kargo');
            });
          }
        });
    });
  });
});
