import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/orders (GET)', () => {
    it('should return all orders', () => {
      return request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return orders filtered by customer', () => {
      return request(app.getHttpServer())
        .get('/orders?customerId=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/orders/:id (GET)', () => {
    it('should return a single order', () => {
      return request(app.getHttpServer())
        .get('/orders/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('customerId');
          expect(res.body).toHaveProperty('totalAmount');
          expect(res.body).toHaveProperty('status');
        });
    });

    it('should return 404 for non-existent order', () => {
      return request(app.getHttpServer())
        .get('/orders/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/orders (POST)', () => {
    it('should create a new order', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId: '1',
          items: [
            { productId: '1', quantity: 1, price: 100 },
          ],
          totalAmount: 100,
          shippingAddress: '123 Main St',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('customerId', '1');
          expect(res.body).toHaveProperty('totalAmount', 100);
          expect(res.body).toHaveProperty('status', 'pending');
        });
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          customerId: '1',
          items: [
            { productId: '1', quantity: 1, price: 100 },
          ],
          totalAmount: 100,
          shippingAddress: '123 Main St',
        })
        .expect(401);
    });

    it('should return 400 with invalid data', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId: '',
          items: [],
          totalAmount: -100,
        })
        .expect(400);
    });
  });

  describe('/orders/:id (PUT)', () => {
    it('should update an order', () => {
      return request(app.getHttpServer())
        .put('/orders/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'processing',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('status', 'processing');
        });
    });

    it('should return 404 for non-existent order', () => {
      return request(app.getHttpServer())
        .put('/orders/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'processing',
        })
        .expect(404);
    });
  });

  describe('/orders/:id (DELETE)', () => {
    it('should delete an order', () => {
      return request(app.getHttpServer())
        .delete('/orders/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Order deleted successfully');
        });
    });

    it('should return 404 for non-existent order', () => {
      return request(app.getHttpServer())
        .delete('/orders/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
