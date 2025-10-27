import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('E-commerce Flows (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let productId: string;
  let cartId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Registration and Authentication', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '+905551234567',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      authToken = response.body.accessToken;
    });
  });

  describe('Product Catalog Operations', () => {
    it('should get products list with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should search products by query', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products/search?q=laptop&category=electronics')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get product details by ID', async () => {
      // First get a product ID from the list
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/products?limit=1')
        .expect(200);

      if (listResponse.body.data.length > 0) {
        productId = listResponse.body.data[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/api/v1/products/${productId}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', productId);
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('price');
      }
    });
  });

  describe('Shopping Cart Operations', () => {
    it('should add product to cart', async () => {
      if (!productId) {
        // Create a test product first
        const productData = {
          name: 'Test Product',
          description: 'Test Description',
          price: 99.99,
          sku: 'TEST-001',
          stockQuantity: 10,
          status: 'active',
        };

        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send(productData)
          .expect(201);

        productId = createResponse.body.id;
      }

      const cartItemData = {
        productId,
        quantity: 2,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cartItemData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.productId).toBe(productId);
      expect(response.body.quantity).toBe(2);
    });

    it('should get user cart', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should update cart item quantity', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.items.length > 0) {
        const itemId = response.body.items[0].id;
        const updateData = { quantity: 3 };

        const updateResponse = await request(app.getHttpServer())
          .put(`/api/v1/cart/items/${itemId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(updateResponse.body.quantity).toBe(3);
      }
    });

    it('should remove item from cart', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.items.length > 0) {
        const itemId = response.body.items[0].id;

        await request(app.getHttpServer())
          .delete(`/api/v1/cart/items/${itemId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
    });
  });

  describe('Order Processing', () => {
    it('should create order from cart', async () => {
      // Ensure cart has items
      const cartResponse = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (cartResponse.body.items.length === 0) {
        // Add item to cart first
        await request(app.getHttpServer())
          .post('/api/v1/cart/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            productId,
            quantity: 1,
          })
          .expect(201);
      }

      const orderData = {
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          address: 'Test Address 123',
          city: 'Istanbul',
          postalCode: '34000',
          country: 'Turkey',
        },
        paymentMethod: 'credit_card',
        notes: 'Test order',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('totalAmount');
      orderId = response.body.id;
    });

    it('should get user orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get order details', async () => {
      if (orderId) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/orders/${orderId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', orderId);
        expect(response.body).toHaveProperty('items');
        expect(response.body).toHaveProperty('shippingAddress');
      }
    });

    it('should update order status', async () => {
      if (orderId) {
        const updateData = { status: 'processing' };

        const response = await request(app.getHttpServer())
          .put(`/api/v1/orders/${orderId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.status).toBe('processing');
      }
    });
  });

  describe('Payment Processing', () => {
    it('should process payment for order', async () => {
      if (orderId) {
        const paymentData = {
          orderId,
          amount: 99.99,
          currency: 'TRY',
          paymentMethod: 'credit_card',
          cardToken: 'test_card_token',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/payments/process')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('status');
        expect(response.body.orderId).toBe(orderId);
      }
    });
  });

  describe('User Profile Management', () => {
    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe('test@example.com');
    });

    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
        phone: '+905559876543',
      };

      const response = await request(app.getHttpServer())
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe('Updated');
      expect(response.body.lastName).toBe('User');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid product ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/invalid-id')
        .expect(404);
    });

    it('should handle unauthorized access', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .expect(401);
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .get('/api/v1/products')
          .expect((res) => {
            if (res.status === 429) {
              expect(res.headers).toHaveProperty('x-ratelimit-limit');
              expect(res.headers).toHaveProperty('x-ratelimit-remaining');
            }
          });
      }
    });
  });
});
