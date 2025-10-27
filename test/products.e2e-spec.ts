import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ProductsController (e2e)', () => {
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

  describe('/products (GET)', () => {
    it('should return all products', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return products filtered by category', () => {
      return request(app.getHttpServer())
        .get('/products?categoryId=1')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/products/:id (GET)', () => {
    it('should return a single product', () => {
      return request(app.getHttpServer())
        .get('/products/1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('price');
        });
    });

    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .get('/products/999')
        .expect(404);
    });
  });

  describe('/products (POST)', () => {
    it('should create a new product', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Product',
          price: 100,
          categoryId: '1',
          description: 'A test product',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', 'Test Product');
          expect(res.body).toHaveProperty('price', 100);
        });
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Test Product',
          price: 100,
          categoryId: '1',
          description: 'A test product',
        })
        .expect(401);
    });

    it('should return 400 with invalid data', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '',
          price: -100,
        })
        .expect(400);
    });
  });

  describe('/products/:id (PUT)', () => {
    it('should update a product', () => {
      return request(app.getHttpServer())
        .put('/products/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Product',
          price: 150,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', 'Updated Product');
          expect(res.body).toHaveProperty('price', 150);
        });
    });

    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .put('/products/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Product',
          price: 150,
        })
        .expect(404);
    });
  });

  describe('/products/:id (DELETE)', () => {
    it('should delete a product', () => {
      return request(app.getHttpServer())
        .delete('/products/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Product deleted successfully');
        });
    });

    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .delete('/products/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
