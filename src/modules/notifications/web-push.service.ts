import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface WebPushNotification {
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

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(private configService: ConfigService) {
    this.initializeWebPush();
  }

  private initializeWebPush() {
    const vapidKeys = {
      subject: this.configService.get<string>('WEBPUSH_SUBJECT', 'mailto:admin@ayaztrade.com'),
      publicKey: this.configService.get<string>('WEBPUSH_PUBLIC_KEY'),
      privateKey: this.configService.get<string>('WEBPUSH_PRIVATE_KEY'),
    };

    if (vapidKeys.publicKey && vapidKeys.privateKey) {
      webpush.setVapidDetails(
        vapidKeys.subject,
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );
      this.logger.log('Web Push VAPID keys configured successfully');
    } else {
      this.logger.warn('Web Push VAPID keys not configured. Web push notifications will not work.');
    }
  }

  async sendNotification(subscription: WebPushSubscription, notification: WebPushNotification): Promise<boolean> {
    try {
      const payload = {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/icon-72x72.png',
        image: notification.image,
        tag: notification.tag || 'ayaztrade-notification',
        url: notification.url,
        actions: notification.actions,
        data: notification.data,
        timestamp: Date.now(),
        requireInteraction: true,
        silent: false,
      };

      const response = await webpush.sendNotification(subscription, JSON.stringify(payload));

      if (response.statusCode === 201 || response.statusCode === 200) {
        this.logger.log(`Web push notification sent successfully: ${response.statusCode}`);
        return true;
      } else {
        this.logger.error(`Web push notification failed with status: ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send web push notification: ${error instanceof Error ? error.message : String(error)}`);

      // Handle subscription expiration
      if (error && typeof error === 'object' && 'statusCode' in error && (error.statusCode === 410 || error.statusCode === 404)) {
        this.logger.warn('Push subscription has expired or is no longer valid');
        // Here you would typically remove the subscription from the database
      }

      return false;
    }
  }

  async sendToMultipleSubscriptions(subscriptions: WebPushSubscription[], notification: WebPushNotification): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;

    const promises = subscriptions.map(async (subscription) => {
      const success = await this.sendNotification(subscription, notification);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    });

    await Promise.allSettled(promises);

    this.logger.log(`Web push multicast: ${successCount} success, ${failureCount} failures`);
    return { successCount, failureCount };
  }

  // Admin notification methods
  async notifyOrderUpdate(subscriptions: WebPushSubscription[], orderId: string, status: string, customerName: string): Promise<{ successCount: number; failureCount: number }> {
    const notification: WebPushNotification = {
      title: 'Sipariş Güncellendi',
      body: `${customerName} müşterisinin ${orderId} numaralı siparişi ${status} durumuna güncellendi.`,
      icon: '/icons/order-icon.png',
      tag: `order-update-${orderId}`,
      url: `/orders/${orderId}`,
      actions: [
        {
          action: 'view',
          title: 'Görüntüle',
          icon: '/icons/view-icon.png',
        },
        {
          action: 'close',
          title: 'Kapat',
        },
      ],
      data: {
        type: 'order_update',
        orderId,
        status,
        customerName,
        timestamp: new Date().toISOString(),
      },
    };

    return this.sendToMultipleSubscriptions(subscriptions, notification);
  }

  async notifyNewOrder(subscriptions: WebPushSubscription[], orderId: string, total: number, customerName: string): Promise<{ successCount: number; failureCount: number }> {
    const notification: WebPushNotification = {
      title: 'Yeni Sipariş',
      body: `${customerName} müşterisinden ₺${total.toLocaleString()} tutarında yeni sipariş (${orderId})`,
      icon: '/icons/new-order-icon.png',
      tag: `new-order-${orderId}`,
      url: `/orders/${orderId}`,
      actions: [
        {
          action: 'process',
          title: 'İşle',
          icon: '/icons/process-icon.png',
        },
        {
          action: 'view',
          title: 'Görüntüle',
          icon: '/icons/view-icon.png',
        },
      ],
      data: {
        type: 'new_order',
        orderId,
        total,
        customerName,
        timestamp: new Date().toISOString(),
      },
    };

    return this.sendToMultipleSubscriptions(subscriptions, notification);
  }

  async notifyLowStock(subscriptions: WebPushSubscription[], productName: string, stockCount: number): Promise<{ successCount: number; failureCount: number }> {
    const notification: WebPushNotification = {
      title: 'Düşük Stok Uyarısı',
      body: `${productName} ürününün stoğu ${stockCount} adede düştü!`,
      icon: '/icons/stock-warning-icon.png',
      tag: `low-stock-${productName}`,
      url: `/products?search=${encodeURIComponent(productName)}`,
      actions: [
        {
          action: 'reorder',
          title: 'Yeniden Sipariş',
          icon: '/icons/reorder-icon.png',
        },
        {
          action: 'view',
          title: 'Görüntüle',
          icon: '/icons/view-icon.png',
        },
      ],
      data: {
        type: 'low_stock',
        productName,
        stockCount,
        timestamp: new Date().toISOString(),
      },
    };

    return this.sendToMultipleSubscriptions(subscriptions, notification);
  }

  async notifyPaymentReceived(subscriptions: WebPushSubscription[], orderId: string, amount: number, customerName: string): Promise<{ successCount: number; failureCount: number }> {
    const notification: WebPushNotification = {
      title: 'Ödeme Alındı',
      body: `${customerName} müşterisinden ₺${amount.toLocaleString()} tutarında ödeme alındı (${orderId})`,
      icon: '/icons/payment-success-icon.png',
      tag: `payment-${orderId}`,
      url: `/orders/${orderId}`,
      actions: [
        {
          action: 'process',
          title: 'İşle',
          icon: '/icons/process-icon.png',
        },
        {
          action: 'view',
          title: 'Görüntüle',
          icon: '/icons/view-icon.png',
        },
      ],
      data: {
        type: 'payment_received',
        orderId,
        amount,
        customerName,
        timestamp: new Date().toISOString(),
      },
    };

    return this.sendToMultipleSubscriptions(subscriptions, notification);
  }

  async notifySystemAlert(subscriptions: WebPushSubscription[], alertType: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<{ successCount: number; failureCount: number }> {
    const icons = {
      low: '/icons/alert-info-icon.png',
      medium: '/icons/alert-warning-icon.png',
      high: '/icons/alert-error-icon.png',
      critical: '/icons/alert-critical-icon.png',
    };

    const notification: WebPushNotification = {
      title: 'Sistem Uyarısı',
      body: message,
      icon: icons[severity],
      tag: `system-alert-${alertType}`,
      url: '/dashboard',
      actions: [
        {
          action: 'view',
          title: 'Görüntüle',
          icon: '/icons/view-icon.png',
        },
        {
          action: 'dismiss',
          title: 'Kapat',
        },
      ],
      data: {
        type: 'system_alert',
        alertType,
        severity,
        message,
        timestamp: new Date().toISOString(),
      },
    };

    return this.sendToMultipleSubscriptions(subscriptions, notification);
  }

  async notifyAnalyticsUpdate(subscriptions: WebPushSubscription[], metric: string, value: string, change: string): Promise<{ successCount: number; failureCount: number }> {
    const notification: WebPushNotification = {
      title: 'Analitik Güncelleme',
      body: `${metric}: ${value} (${change})`,
      icon: '/icons/analytics-icon.png',
      tag: `analytics-${metric}`,
      url: '/analytics',
      actions: [
        {
          action: 'view',
          title: 'Görüntüle',
          icon: '/icons/view-icon.png',
        },
        {
          action: 'close',
          title: 'Kapat',
        },
      ],
      data: {
        type: 'analytics_update',
        metric,
        value,
        change,
        timestamp: new Date().toISOString(),
      },
    };

    return this.sendToMultipleSubscriptions(subscriptions, notification);
  }

  // Custom notification method
  async sendCustomNotification(
    subscriptions: WebPushSubscription[],
    title: string,
    body: string,
    options?: {
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
  ): Promise<{ successCount: number; failureCount: number }> {
    const notification: WebPushNotification = {
      title,
      body,
      icon: options?.icon,
      badge: options?.badge,
      image: options?.image,
      tag: options?.tag,
      url: options?.url,
      actions: options?.actions,
      data: options?.data,
    };

    return this.sendToMultipleSubscriptions(subscriptions, notification);
  }

  // Utility methods
  generateVAPIDKeys(): { publicKey: string; privateKey: string } {
    const keys = webpush.generateVAPIDKeys();
    return keys;
  }

  isValidSubscription(subscription: WebPushSubscription): boolean {
    try {
      return !!(
        subscription.endpoint &&
        subscription.keys?.p256dh &&
        subscription.keys?.auth
      );
    } catch {
      return false;
    }
  }

  // Test notification
  async sendTestNotification(subscription: WebPushSubscription): Promise<boolean> {
    const notification: WebPushNotification = {
      title: 'Test Bildirimi',
      body: 'Bu bir test bildirimi. Web push notifications başarıyla çalışıyor!',
      icon: '/icons/test-icon.png',
      tag: 'test-notification',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    };

    return this.sendNotification(subscription, notification);
  }
}
