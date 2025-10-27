import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CartController (e2e)', () => {
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

  describe('/cart (GET)', () => {
    it('should return user cart', () => {
      return request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('userId');
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('totalAmount');
        });
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer())
        .get('/cart')
        .expect(401);
    });
  });

  describe('/cart/items (POST)', () => {
    it('should add item to cart', () => {
      return request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          productId: '1',
          quantity: 1,
          price: 100,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('productId', '1');
          expect(res.body).toHaveProperty('quantity', 1);
          expect(res.body).toHaveProperty('price', 100);
        });
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer())
        .post('/cart/items')
        .send({
          productId: '1',
          quantity: 1,
          price: 100,
        })
        .expect(401);
    });

    it('should return 400 with invalid data', () => {
      return request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          productId: '',
          quantity: -1,
          price: -100,
        })
        .expect(400);
    });
  });

  describe('/cart/items/:id (PUT)', () => {
    it('should update cart item', () => {
      return request(app.getHttpServer())
        .put('/cart/items/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quantity: 2,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('quantity', 2);
        });
    });

    it('should return 404 for non-existent item', () => {
      return request(app.getHttpServer())
        .put('/cart/items/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quantity: 2,
        })
        .expect(404);
    });
  });

  describe('/cart/items/:id (DELETE)', () => {
    it('should remove item from cart', () => {
      return request(app.getHttpServer())
        .delete('/cart/items/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Item removed from cart successfully');
        });
    });

    it('should return 404 for non-existent item', () => {
      return request(app.getHttpServer())
        .delete('/cart/items/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/cart/clear (DELETE)', () => {
    it('should clear cart', () => {
      return request(app.getHttpServer())
        .delete('/cart/clear')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Cart cleared successfully');
        });
    });
  });
});
