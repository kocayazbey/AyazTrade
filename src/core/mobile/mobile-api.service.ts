import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { EventBusService } from '../events/event-bus.service';

interface MobileAppConfig {
  version: string;
  minVersion: string;
  updateRequired: boolean;
  features: string[];
  endpoints: {
    baseUrl: string;
    apiVersion: string;
    timeout: number;
  };
}

interface MobileUser {
  id: string;
  deviceId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  lastSeen: Date;
  isActive: boolean;
}

interface PushNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: any;
  scheduledAt?: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
}

@Injectable()
export class MobileApiService {
  private readonly logger = new Logger(MobileApiService.name);
  private readonly config: MobileAppConfig = {
    version: '1.0.0',
    minVersion: '1.0.0',
    updateRequired: false,
    features: [
      'product_catalog',
      'shopping_cart',
      'order_tracking',
      'push_notifications',
      'offline_sync',
      'biometric_auth',
    ],
    endpoints: {
      baseUrl: process.env.MOBILE_API_BASE_URL || 'https://api.ayaztrade.com',
      apiVersion: 'v1',
      timeout: 30000,
    },
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService
  ) {}

  async registerDevice(userId: string, deviceInfo: any): Promise<MobileUser> {
    const mobileUser: MobileUser = {
      id: userId,
      deviceId: deviceInfo.deviceId,
      platform: deviceInfo.platform,
      appVersion: deviceInfo.appVersion,
      lastSeen: new Date(),
      isActive: true,
    };

    await this.cacheService.set(
      `mobile_user:${userId}:${deviceInfo.deviceId}`,
      JSON.stringify(mobileUser),
      30 * 24 * 60 * 60 // 30 days
    );

    this.logger.log(`Device registered for user ${userId}: ${deviceInfo.deviceId}`);
    return mobileUser;
  }

  async getAppConfig(): Promise<MobileAppConfig> {
    const cached = await this.cacheService.get('mobile_app_config');
    if (cached) {
      return JSON.parse(cached.toString());
    }

    await this.cacheService.set(
      'mobile_app_config',
      JSON.stringify(this.config),
      60 * 60 // 1 hour
    );

    return this.config;
  }

  async checkAppUpdate(currentVersion: string): Promise<any> {
    const config = await this.getAppConfig();
    const needsUpdate = this.compareVersions(currentVersion, config.minVersion) < 0;

    return {
      needsUpdate,
      updateRequired: config.updateRequired,
      latestVersion: config.version,
      minVersion: config.minVersion,
      updateUrl: {
        ios: 'https://apps.apple.com/app/ayaztrade',
        android: 'https://play.google.com/store/apps/details?id=com.ayaztrade',
      },
    };
  }

  async syncOfflineData(userId: string, offlineData: any): Promise<any> {
    try {
      const syncResults = {
        products: await this.syncProducts(offlineData.products),
        orders: await this.syncOrders(userId, offlineData.orders),
        cart: await this.syncCart(userId, offlineData.cart),
        user: await this.syncUser(userId, offlineData.user),
      };

      // Emit sync completed event
      await this.eventBusService.publish({
        eventType: 'mobile.sync.completed',
        aggregateId: userId,
        aggregateType: 'Mobile',
        eventData: { syncResults },
        timestamp: new Date(),
        version: 1,
      });

      return syncResults;
    } catch (error) {
      this.logger.error('Offline sync error:', error);
      throw new Error('Failed to sync offline data');
    }
  }

  async sendPushNotification(notification: Omit<PushNotification, 'id' | 'status'>): Promise<PushNotification> {
    const pushNotification: PushNotification = {
      id: this.generateNotificationId(),
      ...notification,
      status: 'pending',
    };

    // Store notification
    await this.cacheService.set(
      `push_notification:${pushNotification.id}`,
      JSON.stringify(pushNotification),
      7 * 24 * 60 * 60 // 7 days
    );

    // Send to push service
    await this.sendToPushService(pushNotification);

    this.logger.log(`Push notification queued: ${pushNotification.id}`);
    return pushNotification;
  }

  async getPushNotificationHistory(userId: string, limit: number = 50): Promise<PushNotification[]> {
    // In a real implementation, this would query a database
    return [];
  }

  async updatePushNotificationStatus(notificationId: string, status: 'sent' | 'failed'): Promise<void> {
    const notification = await this.cacheService.get(`push_notification:${notificationId}`);
    if (notification) {
      const parsed = JSON.parse(notification.toString()) as PushNotification;
      parsed.status = status;
      parsed.sentAt = new Date();
      
      await this.cacheService.set(
        `push_notification:${notificationId}`,
        JSON.stringify(parsed),
        7 * 24 * 60 * 60 // 7 days
      );
    }
  }

  async getMobileAnalytics(userId: string): Promise<any> {
    const analytics = {
      appUsage: {
        totalSessions: 0,
        averageSessionDuration: 0,
        lastActive: new Date(),
      },
      features: {
        productsViewed: 0,
        ordersPlaced: 0,
        cartAbandonments: 0,
      },
      performance: {
        averageLoadTime: 0,
        crashCount: 0,
        errorCount: 0,
      },
    };

    return analytics;
  }

  async reportCrash(userId: string, crashData: any): Promise<void> {
    this.logger.error(`Mobile app crash reported by user ${userId}:`, crashData);
    
    // Store crash data
    await this.cacheService.set(
      `mobile_crash:${userId}:${Date.now()}`,
      JSON.stringify(crashData),
      30 * 24 * 60 * 60 // 30 days
    );

    // Emit crash event
    await this.eventBusService.publish({
      eventType: 'mobile.crash.reported',
      aggregateId: userId,
      aggregateType: 'Mobile',
      eventData: { crashData },
      timestamp: new Date(),
      version: 1,
    });
  }

  async reportPerformance(userId: string, performanceData: any): Promise<void> {
    await this.cacheService.set(
      `mobile_performance:${userId}:${Date.now()}`,
      JSON.stringify(performanceData),
      7 * 24 * 60 * 60 // 7 days
    );

    this.logger.log(`Performance data reported by user ${userId}`);
  }

  private async syncProducts(products: any[]): Promise<any> {
    // Sync product data
    return { synced: products.length, errors: [] };
  }

  private async syncOrders(userId: string, orders: any[]): Promise<any> {
    // Sync order data
    return { synced: orders.length, errors: [] };
  }

  private async syncCart(userId: string, cart: any): Promise<any> {
    // Sync cart data
    return { synced: true, errors: [] };
  }

  private async syncUser(userId: string, user: any): Promise<any> {
    // Sync user data
    return { synced: true, errors: [] };
  }

  private async sendToPushService(notification: PushNotification): Promise<void> {
    // In a real implementation, this would send to FCM, APNS, etc.
    this.logger.log(`Sending push notification: ${notification.id}`);
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  private generateNotificationId(): string {
    return `push_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}
