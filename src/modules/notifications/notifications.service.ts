import { Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { notifications } from '../../database/schema/notifications.schema';
import { CacheService } from '../../core/cache/cache.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
    private readonly loggerService: LoggerService,
  ) {}

  async sendEmail(to: string, subject: string, template: string, data: any, tenantId: string) {
    try {
      // In real implementation, integrate with email service (SendGrid, AWS SES, etc.)
      const emailData = {
        to,
        subject,
        template,
        data,
        tenantId,
        sentAt: new Date()
      };

      // Emit email sent event
      await this.eventBusService.publish({
        eventType: 'email.sent',
        aggregateId: tenantId,
        aggregateType: 'Notification',
        eventData: emailData,
        timestamp: new Date(),
        version: 1,
      });

      this.loggerService.log(`Email sent to ${to}`, 'NotificationsService');
      return emailData;
    } catch (error) {
      this.loggerService.error('Error sending email', error);
      throw error;
    }
  }

  async sendSMS(to: string, message: string, tenantId: string) {
    try {
      // In real implementation, integrate with SMS service (Twilio, AWS SNS, etc.)
      const smsData = {
        to,
        message,
        tenantId,
        sentAt: new Date()
      };

      // Emit SMS sent event
      await this.eventBusService.publish({
        eventType: 'sms.sent',
        aggregateId: tenantId,
        aggregateType: 'Notification',
        eventData: smsData,
        timestamp: new Date(),
        version: 1,
      });

      this.loggerService.log(`SMS sent to ${to}`, 'NotificationsService');
      return smsData;
    } catch (error) {
      this.loggerService.error('Error sending SMS', error);
      throw error;
    }
  }

  async sendPushNotification(userId: number, title: string, body: string, data: any, tenantId: string) {
    try {
      const [notification] = await this.databaseService.drizzleClient
        .insert(notifications)
        .values({
          userId,
          title,
          message: body,
          data: data as any,
          type: 'push',
          tenantId,
          channel: 'push',
          recipient: userId.toString(),
          status: 'sent',
          sentAt: new Date(),
        })
        .returning();

      // Emit push notification sent event
      await this.eventBusService.publish({
        eventType: 'push.sent',
        aggregateId: tenantId,
        aggregateType: 'Notification',
        eventData: { userId, title, body, data, tenantId },
        timestamp: new Date(),
        version: 1,
      });

      return notification;
    } catch (error) {
      this.loggerService.error('Error sending push notification', error);
      throw error;
    }
  }

  async getNotifications(userId: number, tenantId: string, limit: number = 20) {
    try {
      return await this.databaseService.drizzleClient
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId as any), eq(notifications.tenantId, tenantId as any)))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    } catch (error) {
      this.loggerService.error('Error getting notifications', error);
      throw error;
    }
  }

  async markAsRead(notificationId: number, userId: number, tenantId: string) {
    try {
      const rows = await this.databaseService.drizzleClient
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, notificationId as any), eq(notifications.userId, userId as any), eq(notifications.tenantId, tenantId as any)))
        .limit(1);
      const notification = rows[0];

      if (notification) {
        await this.databaseService.drizzleClient
          .update(notifications)
          .set({ status: 'read', readAt: new Date() })
          .where(eq(notifications.id, notificationId as any));
      }

      return notification || null;
    } catch (error) {
      this.loggerService.error('Error marking notification as read', error);
      throw error;
    }
  }
}
