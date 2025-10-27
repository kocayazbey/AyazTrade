import { Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { QueueService } from './queue.service';
import { QUEUE_NAMES } from './queues.constants';

@Controller('api/v1/queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  async listQueues(): Promise<string[]> {
    return Object.values(QUEUE_NAMES);
  }

  @Get(':queue/jobs/:id')
  async getJob(@Param('queue') queue: string, @Param('id') id: string) {
    return this.queueService.getJob(queue, id);
  }

  @Post('dlq/retry')
  async retryDlq(@Query('limit') limit = '50', @Res() res: Response) {
    const num = parseInt(limit, 10) || 50;
    const result = await this.queueService.retryFromDlq(num);
    res.json(result);
  }
}


