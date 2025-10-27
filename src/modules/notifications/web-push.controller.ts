import { Controller, Post, Get, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { WebPushService } from './web-push.service';

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface RegisterSubscriptionDto {
  subscription: WebPushSubscription;
  userId: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    vendor: string;
  };
}

interface SendNotificationDto {
  subscriptions: WebPushSubscription[];
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
}

interface TestNotificationDto {
  subscription: WebPushSubscription;
}

@Controller('web-push')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebPushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Post('subscribe')
  @Roles('admin', 'editor', 'viewer')
  async subscribe(@Body() dto: RegisterSubscriptionDto) {
    try {
      // Here you would typically save the subscription to the database
      // with user ID and device info for later use

      const isValid = this.webPushService.isValidSubscription(dto.subscription);

      if (!isValid) {
        return {
          success: false,
          message: 'Invalid subscription format',
        };
      }

      // TODO: Save subscription to database
      // await this.subscriptionService.saveSubscription({
      //   userId: dto.userId,
      //   subscription: dto.subscription,
      //   deviceInfo: dto.deviceInfo,
      //   createdAt: new Date(),
      // });

      return {
        success: true,
        message: 'Subscription registered successfully',
        publicKey: process.env.WEBPUSH_PUBLIC_KEY,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to register subscription',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Delete('unsubscribe')
  @Roles('admin', 'editor', 'viewer')
  async unsubscribe(@Body() dto: { subscription: WebPushSubscription }) {
    try {
      // Here you would typically remove the subscription from the database

      const isValid = this.webPushService.isValidSubscription(dto.subscription);

      if (!isValid) {
        return {
          success: false,
          message: 'Invalid subscription format',
        };
      }

      // TODO: Remove subscription from database
      // await this.subscriptionService.removeSubscription(dto.subscription);

      return {
        success: true,
        message: 'Subscription removed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to remove subscription',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('public-key')
  @Roles('admin', 'editor', 'viewer')
  async getPublicKey() {
    return {
      publicKey: process.env.WEBPUSH_PUBLIC_KEY,
    };
  }

  @Post('test')
  @Roles('admin', 'editor')
  async sendTestNotification(@Body() dto: TestNotificationDto) {
    try {
      const success = await this.webPushService.sendTestNotification(dto.subscription);

      return {
        success,
        message: success ? 'Test notification sent successfully' : 'Failed to send test notification',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send test notification',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('send-custom')
  @Roles('admin', 'editor')
  async sendCustomNotification(@Body() dto: SendNotificationDto) {
    try {
      const result = await this.webPushService.sendCustomNotification(
        dto.subscriptions,
        dto.title,
        dto.body,
        {
          icon: dto.icon,
          badge: dto.badge,
          image: dto.image,
          tag: dto.tag,
          url: dto.url,
          actions: dto.actions,
          data: dto.data,
        }
      );

      return {
        success: true,
        message: 'Custom notification sent',
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send custom notification',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('notify-order-update')
  @Roles('admin', 'editor')
  async notifyOrderUpdate(@Body() dto: {
    subscriptions: WebPushSubscription[];
    orderId: string;
    status: string;
    customerName: string;
  }) {
    try {
      const result = await this.webPushService.notifyOrderUpdate(
        dto.subscriptions,
        dto.orderId,
        dto.status,
        dto.customerName
      );

      return {
        success: true,
        message: 'Order update notifications sent',
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send order update notifications',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('notify-new-order')
  @Roles('admin', 'editor')
  async notifyNewOrder(@Body() dto: {
    subscriptions: WebPushSubscription[];
    orderId: string;
    total: number;
    customerName: string;
  }) {
    try {
      const result = await this.webPushService.notifyNewOrder(
        dto.subscriptions,
        dto.orderId,
        dto.total,
        dto.customerName
      );

      return {
        success: true,
        message: 'New order notifications sent',
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send new order notifications',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('notify-low-stock')
  @Roles('admin', 'editor')
  async notifyLowStock(@Body() dto: {
    subscriptions: WebPushSubscription[];
    productName: string;
    stockCount: number;
  }) {
    try {
      const result = await this.webPushService.notifyLowStock(
        dto.subscriptions,
        dto.productName,
        dto.stockCount
      );

      return {
        success: true,
        message: 'Low stock notifications sent',
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send low stock notifications',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('notify-payment-received')
  @Roles('admin', 'editor')
  async notifyPaymentReceived(@Body() dto: {
    subscriptions: WebPushSubscription[];
    orderId: string;
    amount: number;
    customerName: string;
  }) {
    try {
      const result = await this.webPushService.notifyPaymentReceived(
        dto.subscriptions,
        dto.orderId,
        dto.amount,
        dto.customerName
      );

      return {
        success: true,
        message: 'Payment received notifications sent',
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send payment received notifications',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('notify-system-alert')
  @Roles('admin', 'editor')
  async notifySystemAlert(@Body() dto: {
    subscriptions: WebPushSubscription[];
    alertType: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }) {
    try {
      const result = await this.webPushService.notifySystemAlert(
        dto.subscriptions,
        dto.alertType,
        dto.message,
        dto.severity
      );

      return {
        success: true,
        message: 'System alert notifications sent',
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send system alert notifications',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('notify-analytics-update')
  @Roles('admin', 'editor')
  async notifyAnalyticsUpdate(@Body() dto: {
    subscriptions: WebPushSubscription[];
    metric: string;
    value: string;
    change: string;
  }) {
    try {
      const result = await this.webPushService.notifyAnalyticsUpdate(
        dto.subscriptions,
        dto.metric,
        dto.value,
        dto.change
      );

      return {
        success: true,
        message: 'Analytics update notifications sent',
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send analytics update notifications',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('generate-vapid-keys')
  @Roles('admin')
  async generateVAPIDKeys() {
    try {
      const keys = this.webPushService.generateVAPIDKeys();

      return {
        success: true,
        message: 'VAPID keys generated successfully',
        keys,
        instructions: {
          publicKey: 'Add this to your environment variables as WEBPUSH_PUBLIC_KEY',
          privateKey: 'Add this to your environment variables as WEBPUSH_PRIVATE_KEY',
          subject: 'Add mailto:admin@ayaztrade.com to your environment variables as WEBPUSH_SUBJECT',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate VAPID keys',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
