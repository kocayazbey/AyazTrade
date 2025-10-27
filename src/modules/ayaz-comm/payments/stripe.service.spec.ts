import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';

describe('StripeService', () => {
  let service: StripeService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent', async () => {
      const createPaymentIntentDto = {
        amount: 1000,
        currency: 'usd',
        customerId: 'cus_123',
      };

      const mockPaymentIntent = {
        id: 'pi_123',
        clientSecret: 'pi_123_secret',
        status: 'requires_payment_method',
      };

      jest.spyOn(service, 'createPaymentIntent').mockResolvedValue(mockPaymentIntent);

      const result = await service.createPaymentIntent(createPaymentIntentDto);

      expect(result).toEqual(mockPaymentIntent);
    });
  });

  describe('confirmPayment', () => {
    it('should confirm a payment intent', async () => {
      const confirmPaymentDto = {
        paymentIntentId: 'pi_123',
        paymentMethodId: 'pm_123',
      };

      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded',
        charges: {
          data: [
            {
              id: 'ch_123',
              amount: 1000,
              currency: 'usd',
            },
          ],
        },
      };

      jest.spyOn(service, 'confirmPayment').mockResolvedValue(mockPaymentIntent);

      const result = await service.confirmPayment(confirmPaymentDto);

      expect(result).toEqual(mockPaymentIntent);
    });
  });

  describe('createCustomer', () => {
    it('should create a customer', async () => {
      const createCustomerDto = {
        email: 'test@example.com',
        name: 'John Doe',
      };

      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
        name: 'John Doe',
      };

      jest.spyOn(service, 'createCustomer').mockResolvedValue(mockCustomer);

      const result = await service.createCustomer(createCustomerDto);

      expect(result).toEqual(mockCustomer);
    });
  });

  describe('createPaymentMethod', () => {
    it('should create a payment method', async () => {
      const createPaymentMethodDto = {
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: 2025,
          cvc: '123',
        },
      };

      const mockPaymentMethod = {
        id: 'pm_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
        },
      };

      jest.spyOn(service, 'createPaymentMethod').mockResolvedValue(mockPaymentMethod);

      const result = await service.createPaymentMethod(createPaymentMethodDto);

      expect(result).toEqual(mockPaymentMethod);
    });
  });

  describe('refundPayment', () => {
    it('should refund a payment', async () => {
      const refundPaymentDto = {
        paymentIntentId: 'pi_123',
        amount: 500,
        reason: 'requested_by_customer',
      };

      const mockRefund = {
        id: 're_123',
        amount: 500,
        status: 'succeeded',
        reason: 'requested_by_customer',
      };

      jest.spyOn(service, 'refundPayment').mockResolvedValue(mockRefund);

      const result = await service.refundPayment(refundPaymentDto);

      expect(result).toEqual(mockRefund);
    });
  });
});
