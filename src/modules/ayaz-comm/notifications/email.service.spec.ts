import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send an email', async () => {
      const sendEmailDto = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
        html: '<p>This is a test email</p>',
      };

      const mockResult = {
        messageId: 'msg_123',
        status: 'sent',
      };

      jest.spyOn(service, 'sendEmail').mockResolvedValue(mockResult);

      const result = await service.sendEmail(sendEmailDto);

      expect(result).toEqual(mockResult);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send a welcome email', async () => {
      const sendWelcomeEmailDto = {
        to: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockResult = {
        messageId: 'msg_123',
        status: 'sent',
      };

      jest.spyOn(service, 'sendWelcomeEmail').mockResolvedValue(mockResult);

      const result = await service.sendWelcomeEmail(sendWelcomeEmailDto);

      expect(result).toEqual(mockResult);
    });
  });

  describe('sendOrderConfirmationEmail', () => {
    it('should send an order confirmation email', async () => {
      const sendOrderConfirmationEmailDto = {
        to: 'test@example.com',
        orderId: 'order_123',
        orderTotal: 100,
        items: [
          { name: 'Product 1', quantity: 1, price: 100 },
        ],
      };

      const mockResult = {
        messageId: 'msg_123',
        status: 'sent',
      };

      jest.spyOn(service, 'sendOrderConfirmationEmail').mockResolvedValue(mockResult);

      const result = await service.sendOrderConfirmationEmail(sendOrderConfirmationEmailDto);

      expect(result).toEqual(mockResult);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send a password reset email', async () => {
      const sendPasswordResetEmailDto = {
        to: 'test@example.com',
        resetToken: 'reset_token_123',
      };

      const mockResult = {
        messageId: 'msg_123',
        status: 'sent',
      };

      jest.spyOn(service, 'sendPasswordResetEmail').mockResolvedValue(mockResult);

      const result = await service.sendPasswordResetEmail(sendPasswordResetEmailDto);

      expect(result).toEqual(mockResult);
    });
  });
});
