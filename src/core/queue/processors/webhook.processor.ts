import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES, JOB_NAMES } from '../queues.constants';
import axios from 'axios';

@Processor(QUEUE_NAMES.webhook)
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  @Process(JOB_NAMES.deliverWebhook)
  async handleDeliverWebhook(job: Job<{ url: string; payload: any; headers?: Record<string, string> }>) {
    const { url, payload, headers } = job.data;
    await axios.post(url, payload, { headers });
  }

  @OnQueueFailed()
  async handleFailed(job: Job, error: Error) {
    this.logger.error(`Webhook job ${job.id} failed: ${error.message}`, error.stack);
  }
}


