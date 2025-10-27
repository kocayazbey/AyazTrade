import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import { QueryOptimizerService } from '../../core/database/query-optimizer.service';
import { StripeService } from '../payments/stripe.service';
import { IyzicoService } from '../payments/iyzico.service';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let queryOptimizerService: QueryOptimizerService;
  let stripeService: StripeService;
  let iyzicoService: IyzicoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        {
          provide: QueryOptimizerService,
          useValue: {
            executeQuery: jest.fn(),
          },
        },
        {
          provide: StripeService,
          useValue: {
            createPaymentIntent: jest.fn(),
            confirmPayment: jest.fn(),
          },
        },
        {
          provide: IyzicoService,
          useValue: {
            createPayment: jest.fn(),
            confirmPayment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    queryOptimizerService = module.get<QueryOptimizerService>(QueryOptimizerService);
    stripeService = module.get<StripeService>(StripeService);
    iyzicoService = module.get<IyzicoService>(IyzicoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processCheckout', () => {
    it('should process checkout with Stripe payment', async () => {
      const checkoutDto = {
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
      };

      const mockOrder = {
        id: '1',
        customerId: '1',
        totalAmount: 100,
        status: 'pending',
        paymentIntentId: 'pi_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockOrder]);
      jest.spyOn(stripeService, 'createPaymentIntent').mockResolvedValue({
        id: 'pi_123',
        clientSecret: 'pi_123_secret',
      });

      const result = await service.processCheckout(checkoutDto);

      expect(result).toEqual({
        order: mockOrder,
        paymentIntent: {
          id: 'pi_123',
          clientSecret: 'pi_123_secret',
        },
      });
    });

    it('should process checkout with Iyzico payment', async () => {
      const checkoutDto = {
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
      };

      const mockOrder = {
        id: '1',
        customerId: '1',
        totalAmount: 100,
        status: 'pending',
        paymentId: 'iyzico_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockOrder]);
      jest.spyOn(iyzicoService, 'createPayment').mockResolvedValue({
        id: 'iyzico_123',
        status: 'pending',
      });

      const result = await service.processCheckout(checkoutDto);

      expect(result).toEqual({
        order: mockOrder,
        payment: {
          id: 'iyzico_123',
          status: 'pending',
        },
      });
    });
  });

  describe('confirmPayment', () => {
    it('should confirm Stripe payment', async () => {
      const confirmPaymentDto = {
        paymentIntentId: 'pi_123',
        paymentMethod: 'stripe',
      };

      const mockOrder = {
        id: '1',
        customerId: '1',
        totalAmount: 100,
        status: 'paid',
        paymentIntentId: 'pi_123',
        updatedAt: new Date(),
      };

      jest.spyOn(stripeService, 'confirmPayment').mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
      });
      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockOrder]);

      const result = await service.confirmPayment(confirmPaymentDto);

      expect(result).toEqual({
        order: mockOrder,
        payment: {
          id: 'pi_123',
          status: 'succeeded',
        },
      });
    });

    it('should confirm Iyzico payment', async () => {
      const confirmPaymentDto = {
        paymentId: 'iyzico_123',
        paymentMethod: 'iyzico',
      };

      const mockOrder = {
        id: '1',
        customerId: '1',
        totalAmount: 100,
        status: 'paid',
        paymentId: 'iyzico_123',
        updatedAt: new Date(),
      };

      jest.spyOn(iyzicoService, 'confirmPayment').mockResolvedValue({
        id: 'iyzico_123',
        status: 'success',
      });
      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockOrder]);

      const result = await service.confirmPayment(confirmPaymentDto);

      expect(result).toEqual({
        order: mockOrder,
        payment: {
          id: 'iyzico_123',
          status: 'success',
        },
      });
    });
  });
});
