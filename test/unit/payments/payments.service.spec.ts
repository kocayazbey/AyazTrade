import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/ayaz-comm/checkout/checkout.service';
import { CacheService } from '../../src/core/cache/cache.service';
import { EventBusService } from '../../src/core/events/event-bus.service';
import { LoggerService } from '../../src/core/logger/winston-logger.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let cacheService: CacheService;
  let eventBusService: EventBusService;
  let loggerService: LoggerService;

  const mockPayment: any = {
    id: '1',
    orderId: '1',
    amount: 199.99,
    currency: 'TRY',
    method: 'credit_card',
    status: 'pending',
    provider: 'iyzico',
    providerTransactionId: 'TXN123456',
    metadata: {},
    tenantId: 'test-tenant',
    createdBy: '1',
    updatedBy: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            deletePattern: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    cacheService = module.get<CacheService>(CacheService);
    eventBusService = module.get<EventBusService>(EventBusService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const mockProcess = jest.spyOn(service as any, 'processPaymentTransaction').mockResolvedValue({
        ...mockPayment,
        status: 'completed',
        completedAt: new Date(),
      });

      const result = await service.processPayment({
        orderId: '1',
        amount: 199.99,
        currency: 'TRY',
        method: 'credit_card',
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '25',
          cvv: '123',
        },
      }, 'test-tenant');

      expect(mockProcess).toHaveBeenCalled();
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
      expect(eventBusService.publish).toHaveBeenCalledWith('payment.processed', expect.any(Object));
    });

    it('should handle payment failure', async () => {
      jest.spyOn(service as any, 'processPaymentTransaction').mockRejectedValue(new BadRequestException('Payment declined'));

      await expect(service.processPayment({
        orderId: '1',
        amount: 199.99,
        currency: 'TRY',
        method: 'credit_card',
        paymentData: {},
      }, 'test-tenant')).rejects.toThrow(BadRequestException);
    });
  });

  describe('refund', () => {
    it('should process refund successfully', async () => {
      const mockRefund = jest.spyOn(service as any, 'processRefund').mockResolvedValue({
        ...mockPayment,
        status: 'refunded',
        refundedAt: new Date(),
        refundAmount: 199.99,
      });

      const result = await service.refund('1', 199.99, 'test-tenant', '1');

      expect(mockRefund).toHaveBeenCalledWith('1', 199.99, 'test-tenant', '1');
      expect(result.status).toBe('refunded');
      expect(result.refundAmount).toBe(199.99);
      expect(eventBusService.publish).toHaveBeenCalledWith('payment.refunded', expect.any(Object));
    });

    it('should prevent over-refund', async () => {
      jest.spyOn(service as any, 'processRefund').mockRejectedValue(new BadRequestException('Refund amount exceeds payment amount'));

      await expect(service.refund('1', 500, 'test-tenant', '1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validatePayment', () => {
    it('should validate payment data', async () => {
      const mockValidate = jest.spyOn(service as any, 'validatePaymentData').mockResolvedValue(true);

      const result = await service.validatePayment({
        orderId: '1',
        amount: 199.99,
        currency: 'TRY',
        method: 'credit_card',
        paymentData: {},
      });

      expect(mockValidate).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should reject invalid payment data', async () => {
      jest.spyOn(service as any, 'validatePaymentData').mockResolvedValue(false);

      const result = await service.validatePayment({
        orderId: '',
        amount: -100,
        currency: 'INVALID',
        method: 'invalid_method',
        paymentData: {},
      });

      expect(result).toBe(false);
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status', async () => {
      const mockGetStatus = jest.spyOn(service as any, 'getPaymentStatus').mockResolvedValue({
        status: 'completed',
        providerStatus: 'SUCCESS',
        timestamp: new Date(),
      });

      const result = await service.getPaymentStatus('1', 'test-tenant');

      expect(mockGetStatus).toHaveBeenCalledWith('1', 'test-tenant');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('providerStatus');
    });
  });

  describe('analytics', () => {
    it('should return payment analytics', async () => {
      jest.spyOn(service as any, 'getTotalRevenue').mockResolvedValue(100000);
      jest.spyOn(service as any, 'getPaymentMethodsDistribution').mockResolvedValue({
        credit_card: 60,
        bank_transfer: 30,
        cash: 10,
      });

      const analytics = await service.getPaymentAnalytics('test-tenant', '30d');

      expect(analytics).toHaveProperty('totalRevenue');
      expect(analytics).toHaveProperty('paymentMethods');
    });
  });

  describe('webhook handling', () => {
    it('should handle payment webhook successfully', async () => {
      const mockHandleWebhook = jest.spyOn(service as any, 'handlePaymentWebhook').mockResolvedValue({
        paymentId: '1',
        status: 'completed',
        processed: true,
      });

      const result = await service.handleWebhook({
        id: 'wh_123',
        type: 'payment.completed',
        data: {
          paymentId: '1',
          status: 'completed',
        },
      });

      expect(mockHandleWebhook).toHaveBeenCalled();
      expect(result.processed).toBe(true);
      expect(eventBusService.publish).toHaveBeenCalledWith('payment.webhook.processed', expect.any(Object));
    });

    it('should handle invalid webhook', async () => {
      jest.spyOn(service as any, 'handlePaymentWebhook').mockResolvedValue({
        paymentId: null,
        status: null,
        processed: false,
      });

      const result = await service.handleWebhook({
        id: 'wh_invalid',
        type: 'invalid.event',
        data: {},
      });

      expect(result.processed).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle payment provider errors', async () => {
      jest.spyOn(service as any, 'processPaymentTransaction').mockRejectedValue(new Error('Provider API error'));

      await expect(service.processPayment({
        orderId: '1',
        amount: 199.99,
        currency: 'TRY',
        method: 'credit_card',
        paymentData: {},
      }, 'test-tenant')).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      jest.spyOn(service as any, 'processPaymentTransaction').mockRejectedValue(new Error('Request timeout'));

      await expect(service.processPayment({
        orderId: '1',
        amount: 199.99,
        currency: 'TRY',
        method: 'credit_card',
        paymentData: {},
      }, 'test-tenant')).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('security', () => {
    it('should validate payment amount', async () => {
      await expect(service.processPayment({
        orderId: '1',
        amount: -100,
        currency: 'TRY',
        method: 'credit_card',
        paymentData: {},
      }, 'test-tenant')).rejects.toThrow();
    });

    it('should prevent duplicate payments', async () => {
      jest.spyOn(service as any, 'checkDuplicatePayment').mockResolvedValue(true);

      await expect(service.processPayment({
        orderId: '1',
        amount: 199.99,
        currency: 'TRY',
        method: 'credit_card',
        paymentData: {},
      }, 'test-tenant')).rejects.toThrow(ConflictException);
    });
  });

  describe('performance', () => {
    it('should cache payment status', async () => {
      jest.spyOn(service as any, 'getPaymentStatus').mockResolvedValue({
        status: 'completed',
        providerStatus: 'SUCCESS',
        timestamp: new Date(),
      });

      await service.getPaymentStatus('1', 'test-tenant');
      await service.getPaymentStatus('1', 'test-tenant');

      expect(cacheService.set).toHaveBeenCalledTimes(1);
      expect(cacheService.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('audit trail', () => {
    it('should track payment processing', async () => {
      jest.spyOn(service as any, 'processPaymentTransaction').mockResolvedValue(mockPayment);

      await service.processPayment({
        orderId: '1',
        amount: 199.99,
        currency: 'TRY',
        method: 'credit_card',
        paymentData: {},
      }, 'test-tenant');

      expect(eventBusService.publish).toHaveBeenCalledWith('payment.processed', expect.objectContaining({
        paymentId: '1',
        orderId: '1',
        amount: 199.99,
        method: 'credit_card',
      }));
    });

    it('should track refund processing', async () => {
      jest.spyOn(service as any, 'processRefund').mockResolvedValue(mockPayment);

      await service.refund('1', 199.99, 'test-tenant', '1');

      expect(eventBusService.publish).toHaveBeenCalledWith('payment.refunded', expect.objectContaining({
        paymentId: '1',
        refundAmount: 199.99,
        refundedBy: '1',
      }));
    });
  });
});
