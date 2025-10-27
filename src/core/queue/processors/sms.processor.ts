import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES, JOB_NAMES } from '../queues.constants';
import { NetgsmService } from '../../../core/integrations/sms/netgsm.service';

@Processor(QUEUE_NAMES.sms)
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly smsService: NetgsmService) {}

  @Process(JOB_NAMES.sendSms)
  async handleSendSms(job: Job<{ to: string; message: string }>) {
    const { to, message } = job.data;
    await this.smsService.sendSms(to, message);
  }

  @OnQueueFailed()
  async handleFailed(job: Job, error: Error) {
    this.logger.error(`SMS job ${job.id} failed: ${error.message}`, error.stack);
  }
}


