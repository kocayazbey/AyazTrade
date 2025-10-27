import { Injectable } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async sendOrderConfirmation(userId: string, orderId: string, userEmail: string, phoneNumber?: string, deviceToken?: string) {
    const results = [];

    // Send email confirmation
    try {
      const emailResult = await this.emailService.sendOrderConfirmation(userId, orderId);
      results.push({ type: 'email', success: true, result: emailResult });
    } catch (error) {
      results.push({ type: 'email', success: false, error: error.message });
    }

    // Send SMS confirmation if phone number provided
    if (phoneNumber) {
      try {
        const smsResult = await this.smsService.sendOrderConfirmationSms(phoneNumber, orderId);
        results.push({ type: 'sms', success: true, result: smsResult });
      } catch (error) {
        results.push({ type: 'sms', success: false, error: error.message });
      }
    }

    // Send push notification if device token provided
    if (deviceToken) {
      try {
        const pushResult = await this.pushNotificationService.sendOrderConfirmationPush(deviceToken, orderId);
        results.push({ type: 'push', success: true, result: pushResult });
      } catch (error) {
        results.push({ type: 'push', success: false, error: error.message });
      }
    }

    return {
      success: results.some(r => r.success),
      results,
    };
  }

  async sendOrderStatusUpdate(userId: string, orderId: string, status: string, userEmail: string, phoneNumber?: string, deviceToken?: string) {
    const results = [];

    // Send email status update
    try {
      const emailResult = await this.emailService.sendOrderStatusUpdate(userId, orderId, status);
      results.push({ type: 'email', success: true, result: emailResult });
    } catch (error) {
      results.push({ type: 'email', success: false, error: error.message });
    }

    // Send SMS status update if phone number provided
    if (phoneNumber) {
      try {
        const smsResult = await this.smsService.sendOrderStatusUpdateSms(phoneNumber, orderId, status);
        results.push({ type: 'sms', success: true, result: smsResult });
      } catch (error) {
        results.push({ type: 'sms', success: false, error: error.message });
      }
    }

    // Send push notification if device token provided
    if (deviceToken) {
      try {
        const pushResult = await this.pushNotificationService.sendOrderStatusUpdatePush(deviceToken, orderId, status);
        results.push({ type: 'push', success: true, result: pushResult });
      } catch (error) {
        results.push({ type: 'push', success: false, error: error.message });
      }
    }

    return {
      success: results.some(r => r.success),
      results,
    };
  }

  async sendOrderCancellation(userId: string, orderId: string, reason: string, userEmail: string, phoneNumber?: string, deviceToken?: string) {
    const results = [];

    // Send email cancellation
    try {
      const emailResult = await this.emailService.sendOrderCancellation(userId, orderId, reason);
      results.push({ type: 'email', success: true, result: emailResult });
    } catch (error) {
      results.push({ type: 'email', success: false, error: error.message });
    }

    // Send SMS cancellation if phone number provided
    if (phoneNumber) {
      try {
        const smsResult = await this.smsService.sendSms(phoneNumber, `Your order ${orderId} has been cancelled. Reason: ${reason}`);
        results.push({ type: 'sms', success: true, result: smsResult });
      } catch (error) {
        results.push({ type: 'sms', success: false, error: error.message });
      }
    }

    // Send push notification if device token provided
    if (deviceToken) {
      try {
        const pushResult = await this.pushNotificationService.sendPushNotification(deviceToken, {
          title: 'Order Cancelled',
          body: `Your order ${orderId} has been cancelled. Reason: ${reason}`,
          data: { type: 'order_cancellation', orderId, reason },
        });
        results.push({ type: 'push', success: true, result: pushResult });
      } catch (error) {
        results.push({ type: 'push', success: false, error: error.message });
      }
    }

    return {
      success: results.some(r => r.success),
      results,
    };
  }

  async sendPasswordReset(userEmail: string, resetToken: string, phoneNumber?: string, resetCode?: string) {
    const results = [];

    // Send email reset
    try {
      const emailResult = await this.emailService.sendPasswordResetEmail(userEmail, resetToken);
      results.push({ type: 'email', success: true, result: emailResult });
    } catch (error) {
      results.push({ type: 'email', success: false, error: error.message });
    }

    // Send SMS reset code if phone number and code provided
    if (phoneNumber && resetCode) {
      try {
        const smsResult = await this.smsService.sendPasswordResetSms(phoneNumber, resetCode);
        results.push({ type: 'sms', success: true, result: smsResult });
      } catch (error) {
        results.push({ type: 'sms', success: false, error: error.message });
      }
    }

    return {
      success: results.some(r => r.success),
      results,
    };
  }

  async sendVerificationCode(phoneNumber: string, code: string) {
    try {
      const result = await this.smsService.sendVerificationCode(phoneNumber, code);
      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendPromotionalCampaign(campaignData: {
    title: string;
    description: string;
    discountCode?: string;
    discountPercentage?: number;
    recipients: {
      emails?: string[];
      phoneNumbers?: string[];
      deviceTokens?: string[];
    };
  }) {
    const { title, description, discountCode, discountPercentage, recipients } = campaignData;
    const results = [];

    // Send promotional emails
    if (recipients.emails && recipients.emails.length > 0) {
      try {
        const emailResult = await this.emailService.sendNewsletter({
          subject: title,
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1e3a8a;">${title}</h1>
              <p>${description}</p>
              ${discountCode ? `
                <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 4px;">
                  <h2>Special Offer!</h2>
                  <p>Use code: <strong>${discountCode}</strong></p>
                  ${discountPercentage ? `<p>Get ${discountPercentage}% off!</p>` : ''}
                </div>
              ` : ''}
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/shop" 
                   style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                  Shop Now
                </a>
              </div>
              <p>Best regards,<br>The AyazTrade Team</p>
            </div>
          `,
          recipients: recipients.emails,
        });
        results.push({ type: 'email', success: true, result: emailResult });
      } catch (error) {
        results.push({ type: 'email', success: false, error: error.message });
      }
    }

    // Send promotional SMS
    if (recipients.phoneNumbers && recipients.phoneNumbers.length > 0) {
      try {
        const smsResult = await this.smsService.sendBulkSms(recipients.phoneNumbers, `${title}\n${description}${discountCode ? `\nUse code: ${discountCode}` : ''}\nShop now at AyazTrade!`);
        results.push({ type: 'sms', success: true, result: smsResult });
      } catch (error) {
        results.push({ type: 'sms', success: false, error: error.message });
      }
    }

    // Send promotional push notifications
    if (recipients.deviceTokens && recipients.deviceTokens.length > 0) {
      try {
        const pushResult = await this.pushNotificationService.sendBulkPushNotification(recipients.deviceTokens, {
          title,
          body: `${description}${discountCode ? ` Use code: ${discountCode}` : ''}`,
          data: {
            type: 'promotion',
            discountCode,
            discountPercentage,
            action: 'shop_now',
          },
        });
        results.push({ type: 'push', success: true, result: pushResult });
      } catch (error) {
        results.push({ type: 'push', success: false, error: error.message });
      }
    }

    return {
      success: results.some(r => r.success),
      results,
    };
  }
}