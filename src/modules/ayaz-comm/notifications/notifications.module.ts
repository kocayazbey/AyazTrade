import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { WebPushService } from '../../notifications/web-push.service';
import { WebPushController } from '../../notifications/web-push.controller';

@Module({
  providers: [EmailService, SmsService, PushNotificationService, NotificationsService, WebPushService],
  controllers: [NotificationsController, WebPushController],
  exports: [EmailService, SmsService, PushNotificationService, NotificationsService, WebPushService],
})
export class NotificationsModule {}