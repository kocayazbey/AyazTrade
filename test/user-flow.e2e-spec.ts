import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('User Flow (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let productId: string;
  let cartId: string;
  let orderId: string;

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

  describe('Complete User Journey', () => {
    it('should complete full user journey from registration to order completion', async () => {
      // Step 1: Register a new user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      accessToken = registerResponse.body.accessToken;
      refreshToken = registerResponse.body.refreshToken;
      userId = registerResponse.body.user.id;

      // Step 2: Get products
      const productsResponse = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(productsResponse.body)).toBe(true);
      productId = productsResponse.body[0]?.id;

      // Step 3: Add product to cart
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

      // Step 4: Get cart
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(cartResponse.body).toHaveProperty('items');
      expect(cartResponse.body.items.length).toBeGreaterThan(0);

      // Step 5: Process checkout
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

      orderId = checkoutResponse.body.order.id;

      // Step 6: Confirm payment
      const confirmPaymentResponse = await request(app.getHttpServer())
        .post('/checkout/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentIntentId: checkoutResponse.body.paymentIntent.id,
          paymentMethod: 'stripe',
        })
        .expect(200);

      expect(confirmPaymentResponse.body.order.status).toBe('paid');

      // Step 7: Get order details
      const orderResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(orderResponse.body.id).toBe(orderId);
      expect(orderResponse.body.status).toBe('paid');

      // Step 8: Get user orders
      const userOrdersResponse = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(userOrdersResponse.body)).toBe(true);
      expect(userOrdersResponse.body.length).toBeGreaterThan(0);

      // Step 9: Update order status (admin action)
      const updateOrderResponse = await request(app.getHttpServer())
        .put(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'shipped',
        })
        .expect(200);

      expect(updateOrderResponse.body.status).toBe('shipped');

      // Step 10: Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(logoutResponse.body.message).toBe('Logged out successfully');
    });

    it('should handle cart operations correctly', async () => {
      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      accessToken = loginResponse.body.accessToken;

      // Get products
      const productsResponse = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      productId = productsResponse.body[0]?.id;

      // Add item to cart
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          productId: productId,
          quantity: 2,
          price: 100,
        })
        .expect(201);

      // Update cart item quantity
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const cartItemId = cartResponse.body.items[0]?.id;

      await request(app.getHttpServer())
        .put(`/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quantity: 3,
        })
        .expect(200);

      // Remove item from cart
      await request(app.getHttpServer())
        .delete(`/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Clear cart
      await request(app.getHttpServer())
        .delete('/cart/clear')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should handle authentication flow correctly', async () => {
      // Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'authuser@example.com',
          password: 'password123',
          firstName: 'Auth',
          lastName: 'User',
        })
        .expect(201);

      accessToken = registerResponse.body.accessToken;
      refreshToken = registerResponse.body.refreshToken;

      // Use access token
      await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');

      // Use new access token
      await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Try to use token after logout (should fail)
      await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
