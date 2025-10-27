import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Payment Flow (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let productId: string;
  let cartId: string;

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

    // Get a product
    const productsResponse = await request(app.getHttpServer())
      .get('/products')
      .expect(200);

    productId = productsResponse.body[0]?.id;

    // Add product to cart
    const addToCartResponse = await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        productId: productId,
        quantity: 1,
        price: 100,
      })
      .expect(201);

    cartId = addToCartResponse.body.cartId;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Stripe Payment Flow', () => {
    it('should complete Stripe payment flow', async () => {
      // Process checkout with Stripe
      const checkoutResponse = await request(app.getHttpServer())
        .post('/checkout/process')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cartId: cartId,
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
        .expect(201);

      expect(checkoutResponse.body).toHaveProperty('order');
      expect(checkoutResponse.body).toHaveProperty('paymentIntent');
      expect(checkoutResponse.body.order.status).toBe('pending');
      expect(checkoutResponse.body.paymentIntent.status).toBe('requires_payment_method');

      // Confirm payment
      const confirmResponse = await request(app.getHttpServer())
        .post('/checkout/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentIntentId: checkoutResponse.body.paymentIntent.id,
          paymentMethod: 'stripe',
        })
        .expect(200);

      expect(confirmResponse.body.order.status).toBe('paid');
      expect(confirmResponse.body.payment.status).toBe('succeeded');
    });

    it('should handle Stripe payment failure', async () => {
      // Process checkout with invalid card
      const checkoutResponse = await request(app.getHttpServer())
        .post('/checkout/process')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cartId: cartId,
          paymentMethod: 'stripe',
          paymentDetails: {
            cardNumber: '4000000000000002',
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
        .expect(201);

      // Try to confirm with invalid payment intent
      await request(app.getHttpServer())
        .post('/checkout/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentIntentId: 'invalid_payment_intent',
          paymentMethod: 'stripe',
        })
        .expect(400);
    });
  });

  describe('Iyzico Payment Flow', () => {
    it('should complete Iyzico payment flow', async () => {
      // Process checkout with Iyzico
      const checkoutResponse = await request(app.getHttpServer())
        .post('/checkout/process')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cartId: cartId,
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
        .expect(201);

      expect(checkoutResponse.body).toHaveProperty('order');
      expect(checkoutResponse.body).toHaveProperty('payment');
      expect(checkoutResponse.body.order.status).toBe('pending');
      expect(checkoutResponse.body.payment.status).toBe('pending');

      // Confirm payment
      const confirmResponse = await request(app.getHttpServer())
        .post('/checkout/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: checkoutResponse.body.payment.id,
          paymentMethod: 'iyzico',
        })
        .expect(200);

      expect(confirmResponse.body.order.status).toBe('paid');
      expect(confirmResponse.body.payment.status).toBe('success');
    });

    it('should handle Iyzico payment failure', async () => {
      // Process checkout with invalid card
      const checkoutResponse = await request(app.getHttpServer())
        .post('/checkout/process')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cartId: cartId,
          paymentMethod: 'iyzico',
          paymentDetails: {
            cardNumber: '4000000000000002',
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
        .expect(201);

      // Try to confirm with invalid payment
      await request(app.getHttpServer())
        .post('/checkout/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentId: 'invalid_payment_id',
          paymentMethod: 'iyzico',
        })
        .expect(400);
    });
  });

  describe('Payment Validation', () => {
    it('should validate payment details', async () => {
      // Test with missing payment details
      await request(app.getHttpServer())
        .post('/checkout/process')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cartId: cartId,
          paymentMethod: 'stripe',
          paymentDetails: {},
          shippingAddress: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '90210',
            country: 'USA',
          },
        })
        .expect(400);

      // Test with invalid payment method
      await request(app.getHttpServer())
        .post('/checkout/process')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cartId: cartId,
          paymentMethod: 'invalid',
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
        .expect(400);
    });

    it('should validate shipping address', async () => {
      // Test with missing shipping address
      await request(app.getHttpServer())
        .post('/checkout/process')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cartId: cartId,
          paymentMethod: 'stripe',
          paymentDetails: {
            cardNumber: '4242424242424242',
            expiryDate: '12/25',
            cvc: '123',
          },
          shippingAddress: {},
        })
        .expect(400);
    });
  });
});
