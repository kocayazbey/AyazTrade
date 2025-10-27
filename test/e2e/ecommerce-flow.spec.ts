import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('E-commerce Flow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@ayaztrade.com', password: 'test123' });
    
    authToken = response.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Product Browsing', () => {
    it('should list products', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should search products', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products/search?q=test')
        .expect(200);
    });
  });

  describe('Shopping Cart', () => {
    let cartId: string;

    it('should create cart', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/carts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customerId: 'test_customer' })
        .expect(201);

      cartId = response.body.id;
    });

    it('should add item to cart', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/carts/${cartId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: 'prod_test', quantity: 2 })
        .expect(200);
    });
  });

  describe('Order Processing', () => {
    it('should create order', () => {
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: 'test_customer',
          items: [{ productId: 'prod_test', quantity: 1 }],
        })
        .expect(201);
    });
  });
});

