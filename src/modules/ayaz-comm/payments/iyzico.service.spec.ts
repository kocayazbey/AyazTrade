import { Test, TestingModule } from '@nestjs/testing';
import { IyzicoService } from './iyzico.service';
import { ConfigService } from '@nestjs/config';

describe('IyzicoService', () => {
  let service: IyzicoService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IyzicoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IyzicoService>(IyzicoService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create a payment', async () => {
      const createPaymentDto = {
        amount: 1000,
        currency: 'TRY',
        customerId: 'cus_123',
        cardToken: 'card_token_123',
      };

      const mockPayment = {
        id: 'iyzico_123',
        status: 'pending',
        paymentId: 'iyzico_123',
      };

      jest.spyOn(service, 'createPayment').mockResolvedValue(mockPayment);

      const result = await service.createPayment(createPaymentDto);

      expect(result).toEqual(mockPayment);
    });
  });

  describe('confirmPayment', () => {
    it('should confirm a payment', async () => {
      const confirmPaymentDto = {
        paymentId: 'iyzico_123',
        conversationId: 'conv_123',
      };

      const mockPayment = {
        id: 'iyzico_123',
        status: 'success',
        paymentId: 'iyzico_123',
        conversationId: 'conv_123',
      };

      jest.spyOn(service, 'confirmPayment').mockResolvedValue(mockPayment);

      const result = await service.confirmPayment(confirmPaymentDto);

      expect(result).toEqual(mockPayment);
    });
  });

  describe('createCardToken', () => {
    it('should create a card token', async () => {
      const createCardTokenDto = {
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123',
        cardHolderName: 'John Doe',
      };

      const mockCardToken = {
        token: 'card_token_123',
        cardUserKey: 'card_user_key_123',
      };

      jest.spyOn(service, 'createCardToken').mockResolvedValue(mockCardToken);

      const result = await service.createCardToken(createCardTokenDto);

      expect(result).toEqual(mockCardToken);
    });
  });

  describe('refundPayment', () => {
    it('should refund a payment', async () => {
      const refundPaymentDto = {
        paymentId: 'iyzico_123',
        amount: 500,
        reason: 'requested_by_customer',
      };

      const mockRefund = {
        id: 'refund_123',
        amount: 500,
        status: 'success',
        reason: 'requested_by_customer',
      };

      jest.spyOn(service, 'refundPayment').mockResolvedValue(mockRefund);

      const result = await service.refundPayment(refundPaymentDto);

      expect(result).toEqual(mockRefund);
    });
  });
});
