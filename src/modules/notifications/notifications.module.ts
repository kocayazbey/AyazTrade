import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { WebPushController } from './web-push.controller';
import { WebPushService } from './web-push.service';
import { DatabaseModule } from '../../core/database/database.module';
import { CacheModule } from '../../core/cache/cache.module';
import { EventsModule } from '../../core/events/events.module';
import { LoggerModule } from '../../core/logger/logger.module';

@Module({
  imports: [DatabaseModule, CacheModule, EventsModule, LoggerModule],
  controllers: [WebPushController],
  providers: [NotificationsService, PushNotificationService, WebPushService],
  exports: [NotificationsService, PushNotificationService, WebPushService],
})
export class NotificationsModule {}
