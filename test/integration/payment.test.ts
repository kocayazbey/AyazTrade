import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DatabaseService } from '../../src/core/database/database.service';
import { ConfigService } from '@nestjs/config';

describe('Payment Integration Tests', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Payment Gateway Integration', () => {
    it('should successfully process Stripe payment', async () => {
      const paymentData = {
        amount: 1000,
        currency: 'TRY',
        paymentMethod: 'card',
        cardToken: 'test_card_token',
        orderId: 'test-order-123',
        customerId: 'test-customer-123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/stripe/charge')
        .send(paymentData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('paymentId');
      expect(response.body).toHaveProperty('status');
      expect(response.body.amount).toBe(paymentData.amount);
    });

    it('should handle Stripe payment failure', async () => {
      const invalidPaymentData = {
        amount: -100, // Invalid amount
        currency: 'TRY',
        paymentMethod: 'card',
        cardToken: 'invalid_token',
        orderId: 'test-order-456',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/stripe/charge')
        .send(invalidPaymentData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should process Iyzico payment successfully', async () => {
      const iyzicoPaymentData = {
        amount: 500,
        currency: 'TRY',
        paymentMethod: 'iyzico',
        installment: 1,
        orderId: 'test-order-iyzico-123',
        customerInfo: {
          email: 'test@example.com',
          name: 'Test User',
        },
        cardInfo: {
          cardNumber: '4111111111111111',
          expireMonth: '12',
          expireYear: '2025',
          cvc: '123',
          cardHolderName: 'Test User',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/iyzico/charge')
        .send(iyzicoPaymentData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('iyzicoPaymentId');
    });

    it('should handle Iyzico payment failure', async () => {
      const invalidIyzicoData = {
        amount: 100,
        currency: 'TRY',
        paymentMethod: 'iyzico',
        cardInfo: {
          cardNumber: 'invalid_card',
          expireMonth: '13', // Invalid month
          expireYear: '2020', // Expired year
          cvc: '12', // Invalid CVC
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/iyzico/charge')
        .send(invalidIyzicoData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('validation');
    });
  });

  describe('Virtual POS Integration', () => {
    it('should process Akbank POS payment', async () => {
      const posPaymentData = {
        amount: 750,
        currency: 'TRY',
        orderId: 'test-pos-order-123',
        customerInfo: {
          name: 'Test Customer',
          email: 'test@example.com',
        },
        cardInfo: {
          cardNumber: '4111111111111111',
          expireMonth: '12',
          expireYear: '2025',
          cvc: '123',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/virtual-pos/akbank')
        .send(posPaymentData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transactionId');
    });

    it('should process Garanti POS payment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/virtual-pos/garanti')
        .send({
          amount: 1000,
          currency: 'TRY',
          orderId: 'test-garanti-order-123',
          customerInfo: {
            name: 'Test Customer',
            email: 'test@example.com',
          },
          cardInfo: {
            cardNumber: '4111111111111111',
            expireMonth: '12',
            expireYear: '2025',
            cvc: '123',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Payment Refund Integration', () => {
    it('should process payment refund successfully', async () => {
      const refundData = {
        paymentId: 'test-payment-123',
        amount: 500,
        reason: 'Customer request',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .send(refundData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('refundId');
      expect(response.body.amount).toBe(refundData.amount);
    });

    it('should handle partial refund', async () => {
      const partialRefundData = {
        paymentId: 'test-payment-456',
        amount: 300, // Partial amount
        reason: 'Partial refund',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .send(partialRefundData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('refundId');
    });
  });

  describe('Payment Webhook Integration', () => {
    it('should handle Stripe webhook successfully', async () => {
      const webhookData = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 1000,
            currency: 'try',
            status: 'succeeded',
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/webhooks/stripe')
        .send(webhookData)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });

    it('should handle Iyzico webhook successfully', async () => {
      const iyzicoWebhookData = {
        type: 'payment_success',
        paymentId: 'test-payment-123',
        status: 'SUCCESS',
        amount: 500,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/webhooks/iyzico')
        .send(iyzicoWebhookData)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });
  });

  describe('Payment Security Tests', () => {
    it('should reject payment without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/stripe/charge')
        .send({
          amount: 1000,
          currency: 'TRY',
        })
        .expect(401);
    });

    it('should validate payment amount limits', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/stripe/charge')
        .set('Authorization', 'Bearer test-token')
        .send({
          amount: 999999999, // Too high amount
          currency: 'TRY',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('validation');
    });

    it('should handle rate limiting for payment requests', async () => {
      const paymentData = {
        amount: 100,
        currency: 'TRY',
        paymentMethod: 'card',
        cardToken: 'test_token',
      };

      // Send multiple requests rapidly
      const requests = Array(20).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/payments/stripe/charge')
          .set('Authorization', 'Bearer test-token')
          .send(paymentData)
      );

      const responses = await Promise.all(requests);

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Payment Analytics Integration', () => {
    it('should track payment metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/payments/metrics')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('paymentCount');
      expect(response.body).toHaveProperty('successRate');
    });

    it('should generate payment reports', async () => {
      const reportData = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        paymentMethods: ['stripe', 'iyzico'],
        currencies: ['TRY', 'USD'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/analytics/payments/report')
        .set('Authorization', 'Bearer admin-token')
        .send(reportData)
        .expect(201);

      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('generatedAt');
    });
  });

  describe('ERP Payment Sync Integration', () => {
    it('should sync payment data to ERP system', async () => {
      const erpSyncData = {
        paymentId: 'test-payment-123',
        erpOrderId: 'ERP-ORDER-456',
        syncType: 'payment_confirmation',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/integrations/erp/payment-sync')
        .set('Authorization', 'Bearer admin-token')
        .send(erpSyncData)
        .expect(201);

      expect(response.body).toHaveProperty('syncId');
      expect(response.body).toHaveProperty('erpResponse');
    });

    it('should handle ERP sync failure gracefully', async () => {
      const invalidErpData = {
        paymentId: 'invalid-payment',
        erpOrderId: 'INVALID-ORDER',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/integrations/erp/payment-sync')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidErpData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Multi-Currency Payment Integration', () => {
    it('should handle USD payments via Stripe', async () => {
      const usdPaymentData = {
        amount: 100, // $1.00
        currency: 'USD',
        paymentMethod: 'card',
        cardToken: 'test_usd_token',
        orderId: 'usd-order-123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/stripe/charge')
        .send(usdPaymentData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.currency).toBe('USD');
    });

    it('should handle EUR payments via PayPal', async () => {
      const eurPaymentData = {
        amount: 50,
        currency: 'EUR',
        paymentMethod: 'paypal',
        orderId: 'eur-order-123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/paypal/charge')
        .send(eurPaymentData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.currency).toBe('EUR');
    });
  });

  describe('Payment Error Recovery', () => {
    it('should retry failed payments', async () => {
      const retryData = {
        paymentId: 'failed-payment-123',
        retryCount: 1,
        maxRetries: 3,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/retry')
        .set('Authorization', 'Bearer admin-token')
        .send(retryData)
        .expect(200);

      expect(response.body).toHaveProperty('retryId');
      expect(response.body).toHaveProperty('status');
    });

    it('should handle payment timeout scenarios', async () => {
      const timeoutData = {
        paymentId: 'timeout-payment-123',
        timeout: 30000, // 30 seconds
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/timeout')
        .set('Authorization', 'Bearer admin-token')
        .send(timeoutData)
        .expect(200);

      expect(response.body).toHaveProperty('handled', true);
    });
  });
});
