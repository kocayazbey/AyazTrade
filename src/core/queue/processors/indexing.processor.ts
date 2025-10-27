import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES, JOB_NAMES } from '../queues.constants';
import { ElasticsearchService } from '../../elasticsearch/elasticsearch.service';

@Processor(QUEUE_NAMES.indexing)
export class IndexingProcessor {
  private readonly logger = new Logger(IndexingProcessor.name);

  constructor(private readonly esService: ElasticsearchService) {}

  @Process(JOB_NAMES.indexDocument)
  async handleIndexDocument(job: Job<{ index: string; id: string; document: any }>) {
    const { index, id, document } = job.data;
    await this.esService.index(index, id, document);
  }

  @OnQueueFailed()
  async handleFailed(job: Job, error: Error) {
    this.logger.error(`Indexing job ${job.id} failed: ${error.message}`, error.stack);
  }
}


