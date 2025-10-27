import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { getQueueConfig } from '../../config/queue.config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueMetricsService } from './queue-metrics.service';
import { EmailProcessor } from './processors/email.processor';
import { SmsProcessor } from './processors/sms.processor';
import { WebhookProcessor } from './processors/webhook.processor';
import { IndexingProcessor } from './processors/indexing.processor';
import { PaymentsProcessor } from './processors/payments.processor';
import { DlqProcessor } from './processors/dlq.processor';
import { QUEUE_NAMES } from './queues.constants';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const cfg = getQueueConfig(configService);
        return {
          redis: cfg.redis,
          defaultJobOptions: cfg.bull.defaultJobOptions,
          settings: cfg.bull.settings,
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.email },
      { name: QUEUE_NAMES.sms },
      { name: QUEUE_NAMES.webhook },
      { name: QUEUE_NAMES.indexing },
      { name: QUEUE_NAMES.payments },
      { name: QUEUE_NAMES.dlq },
    ),
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    QueueMetricsService,
    EmailProcessor,
    SmsProcessor,
    WebhookProcessor,
    IndexingProcessor,
    PaymentsProcessor,
    DlqProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}

