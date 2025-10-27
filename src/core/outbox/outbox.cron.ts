import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxCronJobs {
  constructor(private readonly outbox: OutboxService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publish() {
    await this.outbox.publishPending();
  }
}


