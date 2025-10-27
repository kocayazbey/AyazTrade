import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES, JOB_NAMES } from '../queues.constants';
import { SendGridService } from '../../../core/integrations/email/sendgrid.service';

@Processor(QUEUE_NAMES.email)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: SendGridService) {}

  @Process(JOB_NAMES.sendEmail)
  async handleSendEmail(job: Job<{ to: string; subject: string; template: string; variables?: Record<string, any> }>) {
    const { to, subject, template, variables } = job.data;
    await this.emailService.sendTemplateEmail(to, subject, template, variables || {});
  }

  @OnQueueFailed()
  async handleFailed(job: Job, error: Error) {
    this.logger.error(`Email job ${job.id} failed: ${error.message}`, error.stack);
  }
}


