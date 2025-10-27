import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';
import { ConfigService } from '@nestjs/config';

describe('SmsService', () => {
  let service: SmsService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendSms', () => {
    it('should send an SMS', async () => {
      const sendSmsDto = {
        to: '+1234567890',
        message: 'This is a test SMS',
      };

      const mockResult = {
        messageId: 'msg_123',
        status: 'sent',
      };

      jest.spyOn(service, 'sendSms').mockResolvedValue(mockResult);

      const result = await service.sendSms(sendSmsDto);

      expect(result).toEqual(mockResult);
    });
  });

  describe('sendOrderConfirmationSms', () => {
    it('should send an order confirmation SMS', async () => {
      const sendOrderConfirmationSmsDto = {
        to: '+1234567890',
        orderId: 'order_123',
        orderTotal: 100,
      };

      const mockResult = {
        messageId: 'msg_123',
        status: 'sent',
      };

      jest.spyOn(service, 'sendOrderConfirmationSms').mockResolvedValue(mockResult);

      const result = await service.sendOrderConfirmationSms(sendOrderConfirmationSmsDto);

      expect(result).toEqual(mockResult);
    });
  });

  describe('sendPasswordResetSms', () => {
    it('should send a password reset SMS', async () => {
      const sendPasswordResetSmsDto = {
        to: '+1234567890',
        resetToken: 'reset_token_123',
      };

      const mockResult = {
        messageId: 'msg_123',
        status: 'sent',
      };

      jest.spyOn(service, 'sendPasswordResetSms').mockResolvedValue(mockResult);

      const result = await service.sendPasswordResetSms(sendPasswordResetSmsDto);

      expect(result).toEqual(mockResult);
    });
  });
});
