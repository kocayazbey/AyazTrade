import { Platform, Alert, Linking } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import { updateOrderStatus } from '../store/slices/ordersSlice';
import { AppDispatch } from '../store';

export interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  priceAlerts: boolean;
  deliveryUpdates: boolean;
  wishlistUpdates: boolean;
  systemNotifications: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

export interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  scheduledTime: Date;
  category: string;
  data?: any;
  repeat?: 'daily' | 'weekly' | 'monthly';
}

interface NotificationData {
  type: string;
  orderId?: string;
  productId?: string;
  promotionId?: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high';
  scheduledTime?: string;
  [key: string]: string | undefined;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private isInitialized = false;
  private dispatch: AppDispatch | null = null;
  private scheduledNotifications: ScheduledNotification[] = [];
  private defaultPreferences: NotificationPreferences = {
    orderUpdates: true,
    promotions: true,
    priceAlerts: true,
    deliveryUpdates: true,
    wishlistUpdates: true,
    systemNotifications: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    frequency: 'immediate',
  };

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(dispatch?: AppDispatch): Promise<void> {
    if (this.isInitialized) return;

    this.dispatch = dispatch || null;

    try {
      // Initialize local notifications
      this.initializeLocalNotifications();

      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Push notification permission not granted');
        // Show custom permission request dialog
        await this.showPermissionDialog();
        return;
      }

      // Get FCM token
      const token = await messaging().getToken();
      await this.saveTokenToServer(token);

      // Set up message handlers
      this.setupMessageHandlers();

      // Set up token refresh listener
      this.setupTokenRefreshListener();

      // Load notification preferences
      await this.loadNotificationPreferences();

      // Set up categories
      this.setupNotificationCategories();

      this.isInitialized = true;
      console.log('Push notification service initialized');
    } catch (error) {
      console.error('Failed to initialize push notification service:', error);
    }
  }

  private initializeLocalNotifications(): void {
    PushNotification.configure({
      onNotification: (notification) => {
        console.log('Local notification received:', notification);
        this.handleLocalNotification(notification);
      },
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'order_updates',
          channelName: 'Sipariş Güncellemeleri',
          channelDescription: 'Sipariş durumu değişiklikleri',
          importance: 4,
          vibrate: true,
        },
        () => {}
      );

      PushNotification.createChannel(
        {
          channelId: 'promotions',
          channelName: 'Kampanyalar',
          channelDescription: 'Özel teklifler ve kampanyalar',
          importance: 3,
          vibrate: true,
        },
        () => {}
      );

      PushNotification.createChannel(
        {
          channelId: 'system',
          channelName: 'Sistem Bildirimleri',
          channelDescription: 'Uygulama güncellemeleri ve duyurular',
          importance: 2,
          vibrate: false,
        },
        () => {}
      );
    }
  }

  private handleLocalNotification(notification: any): void {
    // Handle local notification tap
    if (notification.data) {
      this.navigateToScreen(notification.data);
    }
  }

  private async saveTokenToServer(token: string): Promise<void> {
    try {
      // Save token to AsyncStorage
      await AsyncStorage.setItem('fcm_token', token);

      // Send token to server with preferences
      const preferences = await this.getNotificationPreferences();
      const response = await fetch('/api/v1/notifications/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          appVersion: '1.0.0',
          preferences,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register device token');
      }

      console.log('Device token registered successfully');
    } catch (error) {
      console.error('Failed to save token to server:', error);
    }
  }

  private async showPermissionDialog(): Promise<void> {
    Alert.alert(
      'Bildirim İzni',
      'Sipariş güncellemeleri, kampanyalar ve önemli duyurular için bildirim izni vermeniz gerekiyor.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İzin Ver',
          onPress: async () => {
            const granted = await this.requestPermission();
            if (granted) {
              // Re-initialize after permission granted
              await this.initialize(this.dispatch || undefined);
            }
          },
        },
      ]
    );
  }

  private async loadNotificationPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_preferences');
      if (stored) {
        const preferences: NotificationPreferences = JSON.parse(stored);
        // Validate preferences
        Object.keys(this.defaultPreferences).forEach(key => {
          if (!(key in preferences)) {
            (preferences as any)[key] = (this.defaultPreferences as any)[key];
          }
        });
        await AsyncStorage.setItem('notification_preferences', JSON.stringify(preferences));
      } else {
        // Save default preferences
        await AsyncStorage.setItem('notification_preferences', JSON.stringify(this.defaultPreferences));
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  private setupMessageHandlers(): void {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
      await this.handleBackgroundMessage(remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
      this.handleForegroundMessage(remoteMessage);
    });

    // Handle notification tap
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Handle initial notification (app was opened from a notification)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App opened from notification:', remoteMessage);
          this.handleNotificationTap(remoteMessage);
        }
      });
  }

  private async handleBackgroundMessage(remoteMessage: any): Promise<void> {
    const { data, notification } = remoteMessage;

    // Update order status in Redux if it's an order update
    if (data?.type?.includes('order') && data.orderId && this.dispatch) {
      try {
        // Fetch updated order data and dispatch to Redux
        const response = await fetch(`/api/v1/orders/${data.orderId}`);
        if (response.ok) {
          const orderData = await response.json();
          this.dispatch(updateOrderStatus({
            orderId: data.orderId,
            status: orderData.data.status
          }));
        }
      } catch (error) {
        console.error('Failed to update order status in background:', error);
      }
    }

    // Show local notification for background message
    if (notification) {
      PushNotification.localNotification({
        title: notification.title,
        message: notification.body,
        channelId: this.getChannelId(data?.type || 'system'),
        userInfo: data,
        playSound: true,
        soundName: 'default',
      });
    }
  }

  private handleForegroundMessage(remoteMessage: any): void {
    const { notification, data } = remoteMessage;

    // Check if notification should be shown based on preferences and quiet hours
    if (this.shouldShowNotification(data?.type)) {
      if (notification) {
        // Show in-app notification with actions
        Alert.alert(
          notification.title || 'Bildirim',
          notification.body || '',
          [
            { text: 'Kapat', style: 'cancel' },
            {
              text: 'Görüntüle',
              onPress: () => this.handleNotificationTap(remoteMessage),
            },
          ]
        );
      }
    }
  }

  private shouldShowNotification(type?: string): boolean {
    // Check if notifications are enabled for this type
    // Implementation depends on your notification preferences
    return true; // Simplified for now
  }

  private getChannelId(type: string): string {
    switch (type) {
      case 'order_update':
      case 'order_shipped':
      case 'order_delivered':
      case 'delivery_update':
        return 'order_updates';
      case 'promotion':
      case 'price_drop':
        return 'promotions';
      default:
        return 'system';
    }
  }

  private setupNotificationCategories(): void {
    if (Platform.OS === 'ios') {
      PushNotification.setApplicationIconBadgeNumber(0);
    }
  }

  private handleNotificationTap(remoteMessage: any): void {
    const { data } = remoteMessage;
    
    if (data) {
      this.navigateToScreen(data);
    }
  }

  private navigateToScreen(data: NotificationData): void {
    const { type, orderId, productId, promotionId } = data;

    switch (type) {
      case 'order_update':
      case 'order_shipped':
      case 'order_delivered':
      case 'payment_success':
      case 'payment_failed':
        if (orderId) {
          // Navigate to order details
          this.navigateToOrder(orderId);
        }
        break;

      case 'product_back_in_stock':
      case 'price_drop':
      case 'new_product':
        if (productId) {
          // Navigate to product details
          this.navigateToProduct(productId);
        }
        break;

      case 'promotion':
        if (promotionId) {
          // Navigate to promotion
          this.navigateToPromotion(promotionId);
        }
        break;

      default:
        // Navigate to home or default screen
        this.navigateToHome();
        break;
    }
  }

  private navigateToOrder(orderId: string): void {
    // This would typically use your navigation service
    // For now, we'll use a deep link
    const deepLink = `ayaztrade://order/${orderId}`;
    Linking.openURL(deepLink).catch((err) => {
      console.error('Failed to open deep link:', err);
    });
  }

  private navigateToProduct(productId: string): void {
    const deepLink = `ayaztrade://product/${productId}`;
    Linking.openURL(deepLink).catch((err) => {
      console.error('Failed to open deep link:', err);
    });
  }

  private navigateToPromotion(promotionId: string): void {
    const deepLink = `ayaztrade://promotion/${promotionId}`;
    Linking.openURL(deepLink).catch((err) => {
      console.error('Failed to open deep link:', err);
    });
  }

  private navigateToHome(): void {
    const deepLink = 'ayaztrade://home';
    Linking.openURL(deepLink).catch((err) => {
      console.error('Failed to open deep link:', err);
    });
  }

  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      await this.saveTokenToServer(token);
      return token;
    } catch (error) {
      console.error('Failed to refresh FCM token:', error);
      return null;
    }
  }

  async subscribeToTopic(topic: string): Promise<boolean> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Failed to subscribe to topic ${topic}:`, error);
      return false;
    }
  }

  async unsubscribeFromTopic(topic: string): Promise<boolean> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Failed to unsubscribe from topic ${topic}:`, error);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().hasPermission();
      return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
    } catch (error) {
      console.error('Failed to request permission:', error);
      return false;
    }
  }

  async deleteToken(): Promise<void> {
    try {
      await messaging().deleteToken();
      await AsyncStorage.removeItem('fcm_token');
      console.log('FCM token deleted');
    } catch (error) {
      console.error('Failed to delete FCM token:', error);
    }
  }

  // Handle token refresh
  setupTokenRefreshListener(): void {
    messaging().onTokenRefresh(async (token) => {
      console.log('FCM token refreshed:', token);
      await this.saveTokenToServer(token);
    });
  }

  // Handle app state changes
  setupAppStateListener(): void {
    // You can add app state change handling here
    // This is useful for managing notification permissions and token updates
  }

  // Enhanced notification preferences management
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem('notification_preferences');
      return stored ? JSON.parse(stored) : this.defaultPreferences;
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return this.defaultPreferences;
    }
  }

  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const current = await this.getNotificationPreferences();
      const updated = { ...current, ...preferences };
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(updated));

      // Update server preferences
      await this.updateServerPreferences(updated);

      // Update topic subscriptions based on preferences
      await this.updateTopicSubscriptions(updated);

      return true;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  }

  private async updateServerPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      const response = await fetch('/api/v1/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to update server preferences');
      }
    } catch (error) {
      console.error('Failed to update server preferences:', error);
    }
  }

  private async updateTopicSubscriptions(preferences: NotificationPreferences): Promise<void> {
    try {
      // Subscribe/unsubscribe from topics based on preferences
      if (preferences.promotions) {
        await this.subscribeToTopic('promotions');
      } else {
        await this.unsubscribeFromTopic('promotions');
      }

      if (preferences.orderUpdates) {
        await this.subscribeToTopic('order_updates');
      } else {
        await this.unsubscribeFromTopic('order_updates');
      }

      if (preferences.priceAlerts) {
        await this.subscribeToTopic('price_alerts');
      } else {
        await this.unsubscribeFromTopic('price_alerts');
      }
    } catch (error) {
      console.error('Failed to update topic subscriptions:', error);
    }
  }

  // Scheduled notifications
  async scheduleNotification(notification: ScheduledNotification): Promise<string | null> {
    try {
      const id = `scheduled_${Date.now()}_${Math.random()}`;

      const scheduledNotification: ScheduledNotification = {
        ...notification,
        id,
      };

      this.scheduledNotifications.push(scheduledNotification);

      // Schedule local notification
      PushNotification.localNotificationSchedule({
        id: id,
        title: notification.title,
        message: notification.message,
        date: notification.scheduledTime,
        channelId: this.getChannelId(notification.category),
        userInfo: notification.data,
        repeatType: notification.repeat ? this.getRepeatType(notification.repeat) : undefined,
        playSound: true,
        soundName: 'default',
      });

      // Save to AsyncStorage
      await this.saveScheduledNotifications();

      return id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  async cancelScheduledNotification(id: string): Promise<boolean> {
    try {
      PushNotification.cancelLocalNotifications({ id });

      this.scheduledNotifications = this.scheduledNotifications.filter(n => n.id !== id);
      await this.saveScheduledNotifications();

      return true;
    } catch (error) {
      console.error('Failed to cancel scheduled notification:', error);
      return false;
    }
  }

  async cancelAllScheduledNotifications(): Promise<boolean> {
    try {
      PushNotification.cancelAllLocalNotifications();

      this.scheduledNotifications = [];
      await AsyncStorage.removeItem('scheduled_notifications');

      return true;
    } catch (error) {
      console.error('Failed to cancel all scheduled notifications:', error);
      return false;
    }
  }

  private getRepeatType(repeat: string): 'day' | 'week' | 'month' | undefined {
    switch (repeat) {
      case 'daily': return 'day';
      case 'weekly': return 'week';
      case 'monthly': return 'month';
      default: return undefined;
    }
  }

  private async saveScheduledNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem('scheduled_notifications', JSON.stringify(this.scheduledNotifications));
    } catch (error) {
      console.error('Failed to save scheduled notifications:', error);
    }
  }

  async loadScheduledNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('scheduled_notifications');
      if (stored) {
        this.scheduledNotifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load scheduled notifications:', error);
    }
  }

  // Order-specific notifications
  async subscribeToOrderNotifications(orderId: string): Promise<boolean> {
    return await this.subscribeToTopic(`order_${orderId}`);
  }

  async unsubscribeFromOrderNotifications(orderId: string): Promise<boolean> {
    return await this.unsubscribeFromTopic(`order_${orderId}`);
  }

  // Promotion notifications
  async schedulePromotionNotification(
    title: string,
    message: string,
    scheduledTime: Date,
    promotionId: string
  ): Promise<string | null> {
    return await this.scheduleNotification({
      id: `promotion_${promotionId}_${Date.now()}`,
      title,
      message,
      scheduledTime,
      category: 'promotion',
      data: { type: 'promotion', promotionId },
    });
  }

  // Delivery notifications
  async scheduleDeliveryReminder(orderId: string, deliveryTime: Date): Promise<string | null> {
    return await this.scheduleNotification({
      id: `delivery_${orderId}_${Date.now()}`,
      title: 'Teslimat Hatırlatması',
      message: 'Siparişiniz bugün teslim edilecek!',
      scheduledTime: deliveryTime,
      category: 'order_updates',
      data: { type: 'delivery_reminder', orderId },
    });
  }

  // Utility methods
  async clearBadgeCount(): Promise<void> {
    PushNotification.setApplicationIconBadgeNumber(0);
  }

  async getBadgeCount(): Promise<number> {
    // Note: This might not be available on all platforms
    return 0;
  }

  // Emergency notifications (bypasses quiet hours and preferences)
  async sendEmergencyNotification(title: string, message: string, data?: any): Promise<void> {
    PushNotification.localNotification({
      title,
      message,
      channelId: 'system',
      userInfo: data,
      playSound: true,
      soundName: 'default',
      priority: 'high',
      importance: 'high',
    });
  }

  // Analytics and tracking
  async trackNotificationInteraction(notificationId: string, action: 'opened' | 'dismissed' | 'received'): Promise<void> {
    try {
      await fetch('/api/v1/notifications/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action,
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
        }),
      });
    } catch (error) {
      console.error('Failed to track notification interaction:', error);
    }
  }
}

export default PushNotificationService;
