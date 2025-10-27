import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES, JobName, JOB_NAMES } from '../queues.constants';

@Processor(QUEUE_NAMES.dlq)
export class DlqProcessor {
  @Process(JOB_NAMES.deadLetter)
  async handleDeadLetter(job: Job<{ originalQueue: string; jobName: JobName; data: any; attemptsMade: number; failedReason: string }>) {
    // DLQ entries are stored for inspection. No-op processing.
    return job.data;
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error) {
    // This hook catches failures inside the DLQ as well
    // Intentionally minimal: metrics/logging can be added if needed
  }
}


