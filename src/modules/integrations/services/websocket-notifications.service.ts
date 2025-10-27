import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface WebSocketNotification {
  id: string;
  type: 'order_update' | 'payment_success' | 'payment_failed' | 'inventory_low' | 'shipment_update' | 'system_alert';
  title: string;
  message: string;
  data: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  recipientType: 'user' | 'role' | 'tenant' | 'broadcast';
  recipients: string[];
  read: boolean;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

interface WebSocketConnection {
  id: string;
  userId?: string;
  tenantId?: string;
  role?: string;
  socketId: string;
  connectedAt: Date;
  lastPing: Date;
  subscriptions: string[];
}

interface NotificationSubscription {
  id: string;
  userId?: string;
  tenantId?: string;
  role?: string;
  eventTypes: string[];
  channels: string[];
  filters: Record<string, any>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WebSocketNotificationsService {
  private readonly logger = new Logger(WebSocketNotificationsService.name);

  private connections: Map<string, WebSocketConnection> = new Map();
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private notificationQueue: WebSocketNotification[] = [];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {
    // Start notification processor
    this.startNotificationProcessor();

    // Start connection cleanup
    this.startConnectionCleanup();
  }

  async registerConnection(connectionData: {
    socketId: string;
    userId?: string;
    tenantId?: string;
    role?: string;
    subscriptions: string[];
  }): Promise<{
    success: boolean;
    connectionId?: string;
    error?: string;
  }> {
    try {
      const connectionId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const connection: WebSocketConnection = {
        id: connectionId,
        userId: connectionData.userId,
        tenantId: connectionData.tenantId,
        role: connectionData.role,
        socketId: connectionData.socketId,
        connectedAt: new Date(),
        lastPing: new Date(),
        subscriptions: connectionData.subscriptions || []
      };

      this.connections.set(connectionId, connection);

      // Save to database
      await this.saveConnectionToDB(connection);

      // Load user subscriptions
      await this.loadUserSubscriptions(connection);

      this.logger.log(`WebSocket connection registered: ${connectionId}`);
      return { success: true, connectionId };

    } catch (error) {
      this.logger.error('Failed to register WebSocket connection', error);
      return { success: false, error: error.message };
    }
  }

  async unregisterConnection(socketId: string): Promise<void> {
    try {
      const connection = Array.from(this.connections.values()).find(c => c.socketId === socketId);

      if (connection) {
        this.connections.delete(connection.id);
        await this.removeConnectionFromDB(connection.id);
        this.logger.log(`WebSocket connection unregistered: ${connection.id}`);
      }
    } catch (error) {
      this.logger.error('Failed to unregister WebSocket connection', error);
    }
  }

  async updateConnectionPing(socketId: string): Promise<void> {
    try {
      const connection = Array.from(this.connections.values()).find(c => c.socketId === socketId);

      if (connection) {
        connection.lastPing = new Date();
        await this.updateConnectionInDB(connection);
      }
    } catch (error) {
      this.logger.error('Failed to update connection ping', error);
    }
  }

  async sendNotification(notification: {
    type: 'order_update' | 'payment_success' | 'payment_failed' | 'inventory_low' | 'shipment_update' | 'system_alert';
    title: string;
    message: string;
    data: Record<string, any>;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    recipientType: 'user' | 'role' | 'tenant' | 'broadcast';
    recipients: string[];
    expiresAt?: Date;
  }): Promise<{
    success: boolean;
    notificationId?: string;
    sentTo: number;
    error?: string;
  }> {
    try {
      const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const wsNotification: WebSocketNotification = {
        id: notificationId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority || 'medium',
        recipientType: notification.recipientType,
        recipients: notification.recipients,
        read: false,
        expiresAt: notification.expiresAt,
        createdAt: new Date()
      };

      // Save to database
      await this.saveNotificationToDB(wsNotification);

      // Add to queue for processing
      this.notificationQueue.push(wsNotification);

      // Also send immediately if connections exist
      const sentTo = await this.broadcastNotification(wsNotification);

      this.logger.log(`Notification sent: ${notificationId} to ${sentTo} connections`);
      return { success: true, notificationId, sentTo };

    } catch (error) {
      this.logger.error('Failed to send notification', error);
      return { success: false, error: error.message, sentTo: 0 };
    }
  }

  async createSubscription(subscriptionData: {
    userId?: string;
    tenantId?: string;
    role?: string;
    eventTypes: string[];
    channels: string[];
    filters: Record<string, any>;
  }): Promise<{
    success: boolean;
    subscriptionId?: string;
    error?: string;
  }> {
    try {
      const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const subscription: NotificationSubscription = {
        id: subscriptionId,
        userId: subscriptionData.userId,
        tenantId: subscriptionData.tenantId,
        role: subscriptionData.role,
        eventTypes: subscriptionData.eventTypes,
        channels: subscriptionData.channels,
        filters: subscriptionData.filters,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveSubscriptionToDB(subscription);
      this.subscriptions.set(subscriptionId, subscription);

      this.logger.log(`Subscription created: ${subscriptionId}`);
      return { success: true, subscriptionId };

    } catch (error) {
      this.logger.error('Failed to create subscription', error);
      return { success: false, error: error.message };
    }
  }

  async getUserNotifications(userId: string, filters?: {
    type?: string;
    read?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<WebSocketNotification[]> {
    try {
      let query = 'SELECT * FROM websocket_notifications WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      // Add recipient filter (user, role, or tenant)
      query += ` AND (recipients @> $1 OR recipient_type = 'broadcast')`;
      params.push(`["${userId}"]`);
      paramIndex++;

      if (filters?.type) {
        query += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters?.read !== undefined) {
        query += ` AND read = $${paramIndex}`;
        params.push(filters.read);
        paramIndex++;
      }

      if (filters?.dateFrom) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters?.dateTo) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      const limit = filters?.limit || 50;
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        data: JSON.parse(row.data || '{}'),
        recipients: JSON.parse(row.recipients || '[]'),
        readAt: row.read_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at
      }));

    } catch (error) {
      this.logger.error('Failed to get user notifications', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.db.execute(`
        UPDATE websocket_notifications SET
          read = true,
          read_at = $1,
          updated_at = $2
        WHERE id = $3 AND (recipients @> $4 OR recipient_type = 'broadcast')
      `, [new Date(), new Date(), notificationId, `["${userId}"]`]);

      return { success: true };

    } catch (error) {
      this.logger.error('Failed to mark notification as read', error);
      return { success: false, error: error.message };
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<{
    success: boolean;
    updated: number;
    error?: string;
  }> {
    try {
      const result = await this.db.execute(`
        UPDATE websocket_notifications SET
          read = true,
          read_at = $1,
          updated_at = $2
        WHERE (recipients @> $3 OR recipient_type = 'broadcast') AND read = false
      `, [new Date(), new Date(), `["${userId}"]`]);

      return { success: true, updated: parseInt(result.rowCount) || 0 };

    } catch (error) {
      this.logger.error('Failed to mark all notifications as read', error);
      return { success: false, error: error.message, updated: 0 };
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.db.execute(`
        DELETE FROM websocket_notifications
        WHERE id = $1 AND (recipients @> $2 OR recipient_type = 'broadcast')
      `, [notificationId, `["${userId}"]`]);

      return { success: true };

    } catch (error) {
      this.logger.error('Failed to delete notification', error);
      return { success: false, error: error.message };
    }
  }

  async getNotificationStats(userId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      const result = await this.db.execute(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN read = false THEN 1 ELSE 0 END) as unread,
          type,
          priority
        FROM websocket_notifications
        WHERE created_at >= $1
        AND (recipients @> $2 OR recipient_type = 'broadcast')
        GROUP BY type, priority
      `, [this.getPeriodStartDate(period), `["${userId}"]`]);

      const stats = {
        total: 0,
        unread: 0,
        byType: {},
        byPriority: {}
      };

      for (const row of result.rows) {
        stats.total += parseInt(row.total);
        stats.unread += parseInt(row.unread);

        if (row.type) {
          stats.byType[row.type] = (stats.byType[row.type] || 0) + parseInt(row.total);
        }

        if (row.priority) {
          stats.byPriority[row.priority] = (stats.byPriority[row.priority] || 0) + parseInt(row.total);
        }
      }

      return stats;

    } catch (error) {
      this.logger.error('Failed to get notification stats', error);
      return {
        total: 0,
        unread: 0,
        byType: {},
        byPriority: {}
      };
    }
  }

  async broadcastSystemAlert(alert: {
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    data?: Record<string, any>;
    expiresAt?: Date;
  }): Promise<{
    success: boolean;
    sentTo: number;
    error?: string;
  }> {
    return this.sendNotification({
      type: 'system_alert',
      title: alert.title,
      message: alert.message,
      data: alert.data || {},
      priority: alert.priority,
      recipientType: 'broadcast',
      recipients: [],
      expiresAt: alert.expiresAt
    });
  }

  async sendOrderUpdateNotification(orderId: string, orderData: any, recipients: string[]): Promise<{
    success: boolean;
    notificationId?: string;
    error?: string;
  }> {
    return this.sendNotification({
      type: 'order_update',
      title: `Sipariş Güncellemesi #${orderId}`,
      message: `Sipariş ${orderId} durumu güncellendi: ${orderData.status}`,
      data: { orderId, orderData },
      priority: 'medium',
      recipientType: 'user',
      recipients
    });
  }

  async sendPaymentNotification(paymentId: string, paymentData: any, recipients: string[]): Promise<{
    success: boolean;
    notificationId?: string;
    error?: string;
  }> {
    const title = paymentData.success ? 'Ödeme Başarılı' : 'Ödeme Başarısız';
    const priority = paymentData.success ? 'medium' : 'high';

    return this.sendNotification({
      type: paymentData.success ? 'payment_success' : 'payment_failed',
      title,
      message: `Ödeme ${paymentId}: ${paymentData.amount} ${paymentData.currency}`,
      data: { paymentId, paymentData },
      priority,
      recipientType: 'user',
      recipients
    });
  }

  async sendInventoryAlert(productId: string, alertData: any, recipients: string[]): Promise<{
    success: boolean;
    notificationId?: string;
    error?: string;
  }> {
    return this.sendNotification({
      type: 'inventory_low',
      title: 'Düşük Stok Uyarısı',
      message: `Ürün ${productId} stok seviyesi düşük: ${alertData.currentStock}`,
      data: { productId, alertData },
      priority: alertData.critical ? 'critical' : 'high',
      recipientType: 'user',
      recipients
    });
  }

  async sendShipmentUpdateNotification(shipmentId: string, shipmentData: any, recipients: string[]): Promise<{
    success: boolean;
    notificationId?: string;
    error?: string;
  }> {
    return this.sendNotification({
      type: 'shipment_update',
      title: `Kargo Güncellemesi #${shipmentId}`,
      message: `Kargo durumu: ${shipmentData.status}`,
      data: { shipmentId, shipmentData },
      priority: 'medium',
      recipientType: 'user',
      recipients
    });
  }

  private async broadcastNotification(notification: WebSocketNotification): Promise<number> {
    let sentCount = 0;

    for (const [connectionId, connection] of this.connections) {
      try {
        // Check if connection should receive this notification
        if (this.shouldReceiveNotification(connection, notification)) {
          // Send via WebSocket (mock implementation)
          await this.sendToWebSocket(connection.socketId, {
            type: 'notification',
            data: notification
          });

          sentCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to send notification to connection ${connectionId}`, error);

        // Mark connection as inactive if it fails
        if (connection) {
          connection.lastPing = new Date(0); // Mark for cleanup
        }
      }
    }

    return sentCount;
  }

  private shouldReceiveNotification(connection: WebSocketConnection, notification: WebSocketNotification): boolean {
    // Check if connection has active subscriptions for this notification type
    const userSubscriptions = Array.from(this.subscriptions.values()).filter(sub =>
      sub.active &&
      (sub.userId === connection.userId ||
       sub.tenantId === connection.tenantId ||
       sub.role === connection.role ||
       (notification.recipientType === 'broadcast'))
    );

    // Check if any subscription matches the notification type
    for (const subscription of userSubscriptions) {
      if (subscription.eventTypes.includes(notification.type) ||
          subscription.eventTypes.includes('*')) {
        return true;
      }
    }

    // Default: if notification is broadcast, send to all
    if (notification.recipientType === 'broadcast') {
      return true;
    }

    // Check if user is in recipients list
    if (notification.recipientType === 'user' && connection.userId) {
      return notification.recipients.includes(connection.userId);
    }

    return false;
  }

  private async sendToWebSocket(socketId: string, data: any): Promise<void> {
    // Mock WebSocket implementation
    this.logger.log(`Sending WebSocket message to ${socketId}:`, data);

    // In real implementation, this would use Socket.IO or WebSocket
    // Example: this.socketServer.to(socketId).emit('notification', data);
  }

  private async saveConnectionToDB(connection: WebSocketConnection): Promise<void> {
    await this.db.execute(`
      INSERT INTO websocket_connections (id, user_id, tenant_id, role, socket_id, connected_at, last_ping, subscriptions)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      connection.id,
      connection.userId,
      connection.tenantId,
      connection.role,
      connection.socketId,
      connection.connectedAt,
      connection.lastPing,
      JSON.stringify(connection.subscriptions)
    ]);
  }

  private async updateConnectionInDB(connection: WebSocketConnection): Promise<void> {
    await this.db.execute(`
      UPDATE websocket_connections SET
        last_ping = $1,
        subscriptions = $2,
        updated_at = $3
      WHERE id = $4
    `, [connection.lastPing, JSON.stringify(connection.subscriptions), new Date(), connection.id]);
  }

  private async removeConnectionFromDB(connectionId: string): Promise<void> {
    await this.db.execute('DELETE FROM websocket_connections WHERE id = $1', [connectionId]);
  }

  private async loadUserSubscriptions(connection: WebSocketConnection): Promise<void> {
    try {
      const result = await this.db.execute(`
        SELECT * FROM notification_subscriptions
        WHERE active = true
        AND (user_id = $1 OR tenant_id = $2 OR role = $3)
      `, [connection.userId, connection.tenantId, connection.role]);

      for (const row of result.rows) {
        const subscription: NotificationSubscription = {
          ...row,
          eventTypes: JSON.parse(row.event_types || '[]'),
          channels: JSON.parse(row.channels || '[]'),
          filters: JSON.parse(row.filters || '{}'),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };

        this.subscriptions.set(subscription.id, subscription);
      }
    } catch (error) {
      this.logger.error('Failed to load user subscriptions', error);
    }
  }

  private async saveNotificationToDB(notification: WebSocketNotification): Promise<void> {
    await this.db.execute(`
      INSERT INTO websocket_notifications (id, type, title, message, data, priority, recipient_type, recipients, read, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      notification.id,
      notification.type,
      notification.title,
      notification.message,
      JSON.stringify(notification.data),
      notification.priority,
      notification.recipientType,
      JSON.stringify(notification.recipients),
      notification.read,
      notification.expiresAt,
      notification.createdAt
    ]);
  }

  private async saveSubscriptionToDB(subscription: NotificationSubscription): Promise<void> {
    await this.db.execute(`
      INSERT INTO notification_subscriptions (id, user_id, tenant_id, role, event_types, channels, filters, active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      subscription.id,
      subscription.userId,
      subscription.tenantId,
      subscription.role,
      JSON.stringify(subscription.eventTypes),
      JSON.stringify(subscription.channels),
      JSON.stringify(subscription.filters),
      subscription.active,
      subscription.createdAt,
      subscription.updatedAt
    ]);
  }

  private startNotificationProcessor(): void {
    // Process notification queue every 100ms
    setInterval(async () => {
      if (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        if (notification) {
          await this.broadcastNotification(notification);
        }
      }
    }, 100);

    // Clean up expired notifications every 5 minutes
    setInterval(async () => {
      await this.cleanupExpiredNotifications();
    }, 5 * 60 * 1000);
  }

  private async cleanupExpiredNotifications(): Promise<void> {
    try {
      const result = await this.db.execute(`
        DELETE FROM websocket_notifications
        WHERE expires_at IS NOT NULL AND expires_at < $1
      `, [new Date()]);

      if (parseInt(result.rowCount) > 0) {
        this.logger.log(`Cleaned up ${result.rowCount} expired notifications`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired notifications', error);
    }
  }

  private startConnectionCleanup(): void {
    // Clean up inactive connections every 30 seconds
    setInterval(async () => {
      const now = new Date();
      const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [connectionId, connection] of this.connections) {
        if (now.getTime() - connection.lastPing.getTime() > inactiveThreshold) {
          this.connections.delete(connectionId);
          await this.removeConnectionFromDB(connectionId);
          this.logger.log(`Cleaned up inactive connection: ${connectionId}`);
        }
      }
    }, 30 * 1000);
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        now.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        now.setDate(now.getDate() - dayOfWeek);
        now.setHours(0, 0, 0, 0);
        break;
      case 'month':
        now.setDate(1);
        now.setHours(0, 0, 0, 0);
        break;
    }
    return now;
  }
}
