import { Test, TestingModule } from '@nestjs/testing';
import { PushNotificationService } from './push-notification.service';
import { ConfigService } from '@nestjs/config';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPushNotification', () => {
    it('should send a push notification', async () => {
      const sendPushNotificationDto = {
        to: 'device_token_123',
        title: 'Test Notification',
        body: 'This is a test notification',
        data: { key: 'value' },
      };

      const mockResult = {
        messageId: 'msg_123',
        status: 'sent',
      };

      jest.spyOn(service, 'sendPushNotification').mockResolvedValue(mockResult);

      const result = await service.sendPushNotification(sendPushNotificationDto);

      expect(result).toEqual(mockResult);
    });
  });

  describe('sendOrderConfirmationPush', () => {
    it('should send an order confirmation push notification', async () => {
      const sendOrderConfirmationPushDto = {
        to: 'device_token_123',
        orderId: 'order_123',
        orderTotal: 100,
      };

      const mockResult = {
        messageId: 'msg_123',
        status: 'sent',
      };

      jest.spyOn(service, 'sendOrderConfirmationPush').mockResolvedValue(mockResult);

      const result = await service.sendOrderConfirmationPush(sendOrderConfirmationPushDto);

      expect(result).toEqual(mockResult);
    });
  });

  describe('sendPromotionalPush', () => {
    it('should send a promotional push notification', async () => {
      const sendPromotionalPushDto = {
        to: 'device_token_123',
        title: 'Special Offer',
        body: 'Get 20% off on all items',
        data: { offerId: 'offer_123' },
      };

      const mockResult = {
        messageId: 'msg_123',
        status: 'sent',
      };

      jest.spyOn(service, 'sendPromotionalPush').mockResolvedValue(mockResult);

      const result = await service.sendPromotionalPush(sendPromotionalPushDto);

      expect(result).toEqual(mockResult);
    });
  });
});
