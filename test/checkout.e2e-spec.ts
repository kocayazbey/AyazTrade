import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CheckoutController (e2e)', () => {
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

  describe('/checkout/process (POST)', () => {
    it('should process checkout with Stripe payment', () => {
      return request(app.getHttpServer())
        .post('/checkout/process')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cartId: '1',
          paymentMethod: 'stripe',
          paymentDetails: {
            cardNumber: '4242424242424242',
            expiryDate: '12/25',
            cvc: '123',
          },
          shippingAddress: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '90210',
            country: 'USA',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('order');
          expect(res.body).toHaveProperty('paymentIntent');
          expect(res.body.order).toHaveProperty('id');
          expect(res.body.order).toHaveProperty('status', 'pending');
          expect(res.body.paymentIntent).toHaveProperty('id');
          expect(res.body.paymentIntent).toHaveProperty('clientSecret');
        });
    });

    it('should process checkout with Iyzico payment', () => {
      return request(app.getHttpServer())
        .post('/checkout/process')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cartId: '1',
          paymentMethod: 'iyzico',
          paymentDetails: {
            cardNumber: '4242424242424242',
            expiryDate: '12/25',
            cvc: '123',
          },
          shippingAddress: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '90210',
            country: 'USA',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('order');
          expect(res.body).toHaveProperty('payment');
          expect(res.body.order).toHaveProperty('id');
          expect(res.body.order).toHaveProperty('status', 'pending');
          expect(res.body.payment).toHaveProperty('id');
          expect(res.body.payment).toHaveProperty('status', 'pending');
        });
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer())
        .post('/checkout/process')
        .send({
          cartId: '1',
          paymentMethod: 'stripe',
          paymentDetails: {
            cardNumber: '4242424242424242',
            expiryDate: '12/25',
            cvc: '123',
          },
          shippingAddress: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '90210',
            country: 'USA',
          },
        })
        .expect(401);
    });

    it('should return 400 with invalid data', () => {
      return request(app.getHttpServer())
        .post('/checkout/process')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cartId: '',
          paymentMethod: 'invalid',
          paymentDetails: {},
          shippingAddress: {},
        })
        .expect(400);
    });
  });

  describe('/checkout/confirm (POST)', () => {
    it('should confirm Stripe payment', () => {
      return request(app.getHttpServer())
        .post('/checkout/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentIntentId: 'pi_123',
          paymentMethod: 'stripe',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('order');
          expect(res.body).toHaveProperty('payment');
          expect(res.body.order).toHaveProperty('id');
          expect(res.body.order).toHaveProperty('status', 'paid');
          expect(res.body.payment).toHaveProperty('id');
          expect(res.body.payment).toHaveProperty('status', 'succeeded');
        });
    });

    it('should confirm Iyzico payment', () => {
      return request(app.getHttpServer())
        .post('/checkout/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: 'iyzico_123',
          paymentMethod: 'iyzico',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('order');
          expect(res.body).toHaveProperty('payment');
          expect(res.body.order).toHaveProperty('id');
          expect(res.body.order).toHaveProperty('status', 'paid');
          expect(res.body.payment).toHaveProperty('id');
          expect(res.body.payment).toHaveProperty('status', 'success');
        });
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer())
        .post('/checkout/confirm')
        .send({
          paymentIntentId: 'pi_123',
          paymentMethod: 'stripe',
        })
        .expect(401);
    });

    it('should return 400 with invalid data', () => {
      return request(app.getHttpServer())
        .post('/checkout/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentIntentId: '',
          paymentMethod: 'invalid',
        })
        .expect(400);
    });
  });
});
