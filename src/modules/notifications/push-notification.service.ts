import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionUrl?: string;
}

interface PushNotificationPayload {
  token: string;
  notification: {
    title: string;
    body: string;
    imageUrl?: string;
  };
  data?: Record<string, string>;
  android?: {
    notification: {
      icon: string;
      color: string;
      sound: string;
      clickAction: string;
    };
  };
  apns?: {
    payload: {
      aps: {
        alert: {
          title: string;
          body: string;
        };
        sound: string;
        badge: number;
      };
    };
  };
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const serviceAccount = {
        type: 'service_account',
        project_id: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        private_key_id: this.configService.get<string>('FIREBASE_PRIVATE_KEY_ID'),
        private_key: this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        client_email: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        client_id: this.configService.get<string>('FIREBASE_CLIENT_ID'),
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${this.configService.get<string>('FIREBASE_CLIENT_EMAIL')}`,
      };

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
      });

      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  async sendToDevice(deviceToken: string, notification: PushNotificationData): Promise<boolean> {
    try {
      const payload: PushNotificationPayload = {
        token: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data,
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#007AFF',
            sound: 'default',
            clickAction: notification.actionUrl || 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(payload);
      this.logger.log(`Push notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async sendToMultipleDevices(deviceTokens: string[], notification: PushNotificationData): Promise<{ successCount: number; failureCount: number }> {
    try {
      const payload: Omit<PushNotificationPayload, 'token'> = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data,
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#007AFF',
            sound: 'default',
            clickAction: notification.actionUrl || 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendMulticast({
        tokens: deviceTokens,
        notification: payload.notification,
        data: payload.data,
      });

      this.logger.log(`Multicast push notification sent: ${response.successCount} success, ${response.failureCount} failures`);
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      this.logger.error(`Failed to send multicast push notification: ${error instanceof Error ? error.message : String(error)}`);
      return { successCount: 0, failureCount: deviceTokens.length };
    }
  }

  async sendToTopic(topic: string, notification: PushNotificationData): Promise<boolean> {
    try {
      const payload: Omit<PushNotificationPayload, 'token'> = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data,
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#007AFF',
            sound: 'default',
            clickAction: notification.actionUrl || 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendToTopic(topic, {
        notification: payload.notification,
        data: payload.data,
      });
      this.logger.log(`Topic push notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send topic push notification: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async subscribeToTopic(deviceToken: string, topic: string): Promise<boolean> {
    try {
      const response = await admin.messaging().subscribeToTopic([deviceToken], topic);
      this.logger.log(`Device subscribed to topic ${topic}: ${response.successCount} success`);
      return response.successCount > 0;
    } catch (error) {
      this.logger.error(`Failed to subscribe device to topic: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async unsubscribeFromTopic(deviceToken: string, topic: string): Promise<boolean> {
    try {
      const response = await admin.messaging().unsubscribeFromTopic([deviceToken], topic);
      this.logger.log(`Device unsubscribed from topic ${topic}: ${response.successCount} success`);
      return response.successCount > 0;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe device from topic: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // Order-related notifications
  async notifyOrderUpdate(_userId: string, deviceToken: string, orderId: string, status: string): Promise<boolean> {
    const notification: PushNotificationData = {
      title: 'Sipariş Güncellendi',
      body: `Siparişiniz ${status} durumuna güncellendi.`,
      data: {
        type: 'order_update',
        orderId,
        status,
      },
      actionUrl: `ayaztrade://order/${orderId}`,
    };

    return this.sendToDevice(deviceToken, notification);
  }

  async notifyOrderShipped(_userId: string, deviceToken: string, orderId: string, trackingNumber: string): Promise<boolean> {
    const notification: PushNotificationData = {
      title: 'Siparişiniz Kargoya Verildi',
      body: `Siparişiniz kargoya verildi. Takip numarası: ${trackingNumber}`,
      data: {
        type: 'order_shipped',
        orderId,
        trackingNumber,
      },
      actionUrl: `ayaztrade://order/${orderId}`,
    };

    return this.sendToDevice(deviceToken, notification);
  }

  async notifyOrderDelivered(userId: string, deviceToken: string, orderId: string): Promise<boolean> {
    const notification: PushNotificationData = {
      title: 'Siparişiniz Teslim Edildi',
      body: 'Siparişiniz başarıyla teslim edildi. Değerlendirmenizi yapabilirsiniz.',
      data: {
        type: 'order_delivered',
        orderId,
      },
      actionUrl: `ayaztrade://order/${orderId}`,
    };

    return this.sendToDevice(deviceToken, notification);
  }

  // Payment-related notifications
  async notifyPaymentSuccess(_userId: string, deviceToken: string, orderId: string, amount: number): Promise<boolean> {
    const notification: PushNotificationData = {
      title: 'Ödeme Başarılı',
      body: `₺${amount.toLocaleString()} tutarındaki ödemeniz başarıyla alındı.`,
      data: {
        type: 'payment_success',
        orderId,
        amount: amount.toString(),
      },
      actionUrl: `ayaztrade://order/${orderId}`,
    };

    return this.sendToDevice(deviceToken, notification);
  }

  async notifyPaymentFailed(_userId: string, deviceToken: string, orderId: string, reason: string): Promise<boolean> {
    const notification: PushNotificationData = {
      title: 'Ödeme Başarısız',
      body: `Ödemeniz alınamadı. Sebep: ${reason}`,
      data: {
        type: 'payment_failed',
        orderId,
        reason,
      },
      actionUrl: `ayaztrade://order/${orderId}`,
    };

    return this.sendToDevice(deviceToken, notification);
  }

  // Product-related notifications
  async notifyProductBackInStock(_userId: string, deviceToken: string, productId: string, productName: string): Promise<boolean> {
    const notification: PushNotificationData = {
      title: 'Ürün Stokta',
      body: `${productName} ürünü tekrar stokta! Hemen sipariş verin.`,
      data: {
        type: 'product_back_in_stock',
        productId,
      },
      actionUrl: `ayaztrade://product/${productId}`,
    };

    return this.sendToDevice(deviceToken, notification);
  }

  async notifyPriceDrop(_userId: string, deviceToken: string, productId: string, productName: string, oldPrice: number, newPrice: number): Promise<boolean> {
    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    const notification: PushNotificationData = {
      title: 'Fiyat Düştü!',
      body: `${productName} ürününde %${discount} indirim! Eski fiyat: ₺${oldPrice.toLocaleString()}, Yeni fiyat: ₺${newPrice.toLocaleString()}`,
      data: {
        type: 'price_drop',
        productId,
        oldPrice: oldPrice.toString(),
        newPrice: newPrice.toString(),
        discount: discount.toString(),
      },
      actionUrl: `ayaztrade://product/${productId}`,
    };

    return this.sendToDevice(deviceToken, notification);
  }

  // Marketing notifications
  async notifyPromotion(_userId: string, deviceToken: string, promotionTitle: string, promotionDescription: string, promotionId: string): Promise<boolean> {
    const notification: PushNotificationData = {
      title: promotionTitle,
      body: promotionDescription,
      data: {
        type: 'promotion',
        promotionId,
      },
      actionUrl: `ayaztrade://promotion/${promotionId}`,
    };

    return this.sendToDevice(deviceToken, notification);
  }

  async notifyNewProduct(_userId: string, deviceToken: string, productId: string, productName: string, category: string): Promise<boolean> {
    const notification: PushNotificationData = {
      title: 'Yeni Ürün',
      body: `${category} kategorisinde yeni ürün: ${productName}`,
      data: {
        type: 'new_product',
        productId,
        category,
      },
      actionUrl: `ayaztrade://product/${productId}`,
    };

    return this.sendToDevice(deviceToken, notification);
  }

  // System notifications
  async notifyMaintenance(_userId: string, deviceToken: string, message: string, scheduledTime?: string): Promise<boolean> {
    const notification: PushNotificationData = {
      title: 'Sistem Bakımı',
      body: message,
      data: {
        type: 'maintenance',
        scheduledTime: scheduledTime || '',
      },
    };

    return this.sendToDevice(deviceToken, notification);
  }

  async notifyAppUpdate(_userId: string, deviceToken: string, version: string, features: string[]): Promise<boolean> {
    const notification: PushNotificationData = {
      title: 'Uygulama Güncellendi',
      body: `Yeni sürüm (${version}) yayınlandı. Yeni özellikler: ${features.join(', ')}`,
      data: {
        type: 'app_update',
        version,
        features: features.join(','),
      },
    };

    return this.sendToDevice(deviceToken, notification);
  }

  // Generic notification method
  async sendCustomNotification(
    _userId: string,
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    actionUrl?: string
  ): Promise<boolean> {
    const notification: PushNotificationData = {
      title,
      body,
      data,
      actionUrl,
    };

    return this.sendToDevice(deviceToken, notification);
  }

  // Batch notifications
  async sendBatchNotifications(
    notifications: Array<{
      userId: string;
      deviceToken: string;
      title: string;
      body: string;
      data?: Record<string, string>;
      actionUrl?: string;
    }>
  ): Promise<{ successCount: number; failureCount: number }> {
    const deviceTokens = notifications.map(n => n.deviceToken);
    const firstNotification = notifications[0];

    if (!firstNotification) {
      return { successCount: 0, failureCount: 0 };
    }

    const notification: PushNotificationData = {
      title: firstNotification.title,
      body: firstNotification.body,
      data: firstNotification.data,
      actionUrl: firstNotification.actionUrl,
    };

    return this.sendToMultipleDevices(deviceTokens, notification);
  }
}
