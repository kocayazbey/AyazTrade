import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);

  constructor(private readonly webSocketGateway: WebSocketGateway) {}

  // Order-related notifications
  notifyOrderUpdate(orderId: string, status: string, message?: string) {
    const data = {
      orderId,
      status,
      message,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToRoom(`order:${orderId}`, 'order_updated', data);
    this.webSocketGateway.sendToRole('admin', 'order_updated', data);
    
    this.logger.log(`Order ${orderId} update notification sent`);
  }

  notifyOrderCreated(orderId: string, customerId: string, totalAmount: number) {
    const data = {
      orderId,
      customerId,
      totalAmount,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToUser(customerId, 'order_created', data);
    this.webSocketGateway.sendToRole('admin', 'order_created', data);
    
    this.logger.log(`Order ${orderId} creation notification sent`);
  }

  notifyOrderCancelled(orderId: string, customerId: string, reason: string) {
    const data = {
      orderId,
      customerId,
      reason,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToUser(customerId, 'order_cancelled', data);
    this.webSocketGateway.sendToRole('admin', 'order_cancelled', data);
    
    this.logger.log(`Order ${orderId} cancellation notification sent`);
  }

  // Product-related notifications
  notifyProductUpdate(productId: string, action: string, data: any) {
    const updateData = {
      productId,
      action,
      data,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToRoom(`product:${productId}`, 'product_updated', updateData);
    this.webSocketGateway.sendToRole('admin', 'product_updated', updateData);
    
    this.logger.log(`Product ${productId} update notification sent`);
  }

  notifyInventoryAlert(productId: string, currentStock: number, threshold: number) {
    const alertData = {
      productId,
      currentStock,
      threshold,
      message: `Product stock is below threshold (${currentStock}/${threshold})`,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToRole('admin', 'inventory_alert', alertData);
    this.webSocketGateway.sendToRole('manager', 'inventory_alert', alertData);
    
    this.logger.log(`Inventory alert for product ${productId} sent`);
  }

  // User-related notifications
  notifyUser(userId: string, type: string, title: string, message: string, data?: any) {
    const notificationData = {
      id: Date.now().toString(),
      type,
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.webSocketGateway.sendToUser(userId, 'notification', notificationData);
    
    this.logger.log(`Notification sent to user ${userId}`);
  }

  notifyUserLogin(userId: string, email: string, ipAddress: string) {
    const data = {
      userId,
      email,
      ipAddress,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToRole('admin', 'user_login', data);
    
    this.logger.log(`User login notification sent for ${email}`);
  }

  notifyUserLogout(userId: string, email: string) {
    const data = {
      userId,
      email,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToRole('admin', 'user_logout', data);
    
    this.logger.log(`User logout notification sent for ${email}`);
  }

  // Payment-related notifications
  notifyPaymentUpdate(orderId: string, paymentId: string, status: string, amount: number) {
    const data = {
      orderId,
      paymentId,
      status,
      amount,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToRoom(`order:${orderId}`, 'payment_updated', data);
    this.webSocketGateway.sendToRole('admin', 'payment_updated', data);
    
    this.logger.log(`Payment update notification sent for order ${orderId}`);
  }

  notifyPaymentFailed(orderId: string, customerId: string, reason: string) {
    const data = {
      orderId,
      customerId,
      reason,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToUser(customerId, 'payment_failed', data);
    this.webSocketGateway.sendToRole('admin', 'payment_failed', data);
    
    this.logger.log(`Payment failure notification sent for order ${orderId}`);
  }

  // System notifications
  notifySystemMaintenance(message: string, scheduledTime?: string) {
    const data = {
      message,
      scheduledTime,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.broadcast('system_maintenance', data);
    
    this.logger.log('System maintenance notification sent');
  }

  notifySystemAlert(level: 'info' | 'warning' | 'error', message: string, details?: any) {
    const data = {
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToRole('admin', 'system_alert', data);
    
    this.logger.log(`System alert (${level}) notification sent`);
  }

  // Analytics notifications
  notifyAnalyticsUpdate(metric: string, value: number, change: number) {
    const data = {
      metric,
      value,
      change,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToRole('admin', 'analytics_update', data);
    
    this.logger.log(`Analytics update notification sent for ${metric}`);
  }

  // Chat/Support notifications
  notifySupportMessage(conversationId: string, from: string, message: string) {
    const data = {
      conversationId,
      from,
      message,
      timestamp: new Date().toISOString(),
    };

    this.webSocketGateway.sendToRoom(`conversation:${conversationId}`, 'support_message', data);
    this.webSocketGateway.sendToRole('admin', 'support_message', data);
    
    this.logger.log(`Support message notification sent for conversation ${conversationId}`);
  }

  // Generic notification method
  sendNotification(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    this.notifyUser(userId, notification.type, notification.title, notification.message, notification.data);
  }

  // Broadcast to all connected users
  broadcastNotification(notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    const data = {
      id: Date.now().toString(),
      ...notification,
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.webSocketGateway.broadcast('notification', data);
    
    this.logger.log('Broadcast notification sent');
  }

  // Get connection statistics
  getConnectionStats() {
    const connectedUsers = this.webSocketGateway.getConnectedUsers();
    return {
      totalConnections: connectedUsers.length,
      connectedUsers,
      timestamp: new Date().toISOString(),
    };
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.webSocketGateway.isUserConnected(userId);
  }
}
