import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Job, JobOptions, Queue } from 'bull';
import { QUEUE_NAMES, JOB_NAMES, JobName } from './queues.constants';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.email) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.sms) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.webhook) private readonly webhookQueue: Queue,
    @InjectQueue(QUEUE_NAMES.indexing) private readonly indexingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.payments) private readonly paymentsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.dlq) private readonly dlqQueue: Queue,
  ) {}

  private queueByName(name: string): Queue {
    switch (name) {
      case QUEUE_NAMES.email:
        return this.emailQueue;
      case QUEUE_NAMES.sms:
        return this.smsQueue;
      case QUEUE_NAMES.webhook:
        return this.webhookQueue;
      case QUEUE_NAMES.indexing:
        return this.indexingQueue;
      case QUEUE_NAMES.payments:
        return this.paymentsQueue;
      case QUEUE_NAMES.dlq:
        return this.dlqQueue;
      default:
        throw new Error(`Unknown queue: ${name}`);
    }
  }

  async addJob(queueName: string, jobName: JobName, data: any, options?: JobOptions): Promise<Job> {
    const queue = this.queueByName(queueName);
    const job = await queue.add(jobName, data, options);
    return job;
  }

  async getJob(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.queueByName(queueName);
    return queue.getJob(jobId);
  }

  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.queueByName(queueName);
    const job = await queue.getJob(jobId);
    if (job) await job.remove();
  }

  async moveToDlq(originalQueue: string, jobName: JobName, data: any, attemptsMade: number, failedReason: string): Promise<void> {
    await this.dlqQueue.add(JOB_NAMES.deadLetter, { originalQueue, jobName, data, attemptsMade, failedReason });
  }

  async retryFromDlq(limit = 50): Promise<{ retried: number }> {
    const failed = await this.dlqQueue.getWaiting();
    let retried = 0;
    for (const job of failed.slice(0, limit)) {
      const payload = job.data as { originalQueue: string; jobName: JobName; data: any };
      await this.addJob(payload.originalQueue, payload.jobName, payload.data);
      await job.remove();
      retried += 1;
    }
    return { retried };
  }
}

