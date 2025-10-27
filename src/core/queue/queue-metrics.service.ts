import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrometheusService } from '../metrics/prometheus.service';

@Injectable()
export class QueueMetricsService implements OnModuleInit {
  private readonly queueMetrics = new Map<string, any>();

  constructor(
    private readonly prometheusService: PrometheusService,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('sms') private smsQueue: Queue,
    @InjectQueue('webhook') private webhookQueue: Queue,
    @InjectQueue('indexing') private indexingQueue: Queue,
    @InjectQueue('payments') private paymentsQueue: Queue,
    @InjectQueue('dlq') private dlqQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.initializeMetrics();
    this.startMetricsCollection();
  }

  private async initializeMetrics() {
    // Queue size metrics
    this.queueMetrics.set('queue_size', this.prometheusService.register.registerMetric(
      new this.prometheusService.register.Metric({
        name: 'bull_queue_size',
        help: 'Number of jobs in queue',
        labelNames: ['queue_name', 'status'],
        type: 'gauge',
      })
    ));

    // Queue processing time metrics
    this.queueMetrics.set('processing_time', this.prometheusService.register.registerMetric(
      new this.prometheusService.register.Metric({
        name: 'bull_job_processing_duration_seconds',
        help: 'Time spent processing jobs',
        labelNames: ['queue_name', 'job_name'],
        type: 'histogram',
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
      })
    ));

    // Queue failure metrics
    this.queueMetrics.set('failures', this.prometheusService.register.registerMetric(
      new this.prometheusService.register.Metric({
        name: 'bull_job_failures_total',
        help: 'Total number of job failures',
        labelNames: ['queue_name', 'job_name', 'error_type'],
        type: 'counter',
      })
    ));

    // Queue completion metrics
    this.queueMetrics.set('completions', this.prometheusService.register.registerMetric(
      new this.prometheusService.register.Metric({
        name: 'bull_job_completions_total',
        help: 'Total number of job completions',
        labelNames: ['queue_name', 'job_name'],
        type: 'counter',
      })
    ));

    // Queue waiting time metrics
    this.queueMetrics.set('waiting_time', this.prometheusService.register.registerMetric(
      new this.prometheusService.register.Metric({
        name: 'bull_job_waiting_duration_seconds',
        help: 'Time jobs spend waiting in queue',
        labelNames: ['queue_name'],
        type: 'histogram',
        buckets: [1, 5, 10, 30, 60, 300, 600, 1800],
      })
    ));
  }

  private startMetricsCollection() {
    // Collect metrics every 30 seconds
    setInterval(async () => {
      await this.collectQueueMetrics();
    }, 30000);
  }

  private async collectQueueMetrics() {
    const queues = [
      { name: 'email', queue: this.emailQueue },
      { name: 'sms', queue: this.smsQueue },
      { name: 'webhook', queue: this.webhookQueue },
      { name: 'indexing', queue: this.indexingQueue },
      { name: 'payments', queue: this.paymentsQueue },
      { name: 'dlq', queue: this.dlqQueue },
    ];

    for (const { name, queue } of queues) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
        ]);

        // Update queue size metrics
        this.queueMetrics.get('queue_size').set({ queue_name: name, status: 'waiting' }, waiting.length);
        this.queueMetrics.get('queue_size').set({ queue_name: name, status: 'active' }, active.length);
        this.queueMetrics.get('queue_size').set({ queue_name: name, status: 'completed' }, completed.length);
        this.queueMetrics.get('queue_size').set({ queue_name: name, status: 'failed' }, failed.length);
        this.queueMetrics.get('queue_size').set({ queue_name: name, status: 'delayed' }, delayed.length);

        // Set up event listeners for real-time metrics
        queue.on('completed', (job) => {
          this.queueMetrics.get('completions').inc({ queue_name: name, job_name: job.name });
          
          const processingTime = (Date.now() - job.processedOn) / 1000;
          this.queueMetrics.get('processing_time').observe(
            { queue_name: name, job_name: job.name },
            processingTime
          );
        });

        queue.on('failed', (job, err) => {
          this.queueMetrics.get('failures').inc({
            queue_name: name,
            job_name: job.name,
            error_type: err.name || 'UnknownError',
          });
        });

        queue.on('waiting', (job) => {
          const waitingTime = (Date.now() - job.timestamp) / 1000;
          this.queueMetrics.get('waiting_time').observe(
            { queue_name: name },
            waitingTime
          );
        });

      } catch (error) {
        console.error(`Error collecting metrics for queue ${name}:`, error);
      }
    }
  }

  async getQueueHealthStatus() {
    const queues = [
      { name: 'email', queue: this.emailQueue },
      { name: 'sms', queue: this.smsQueue },
      { name: 'webhook', queue: this.webhookQueue },
      { name: 'indexing', queue: this.indexingQueue },
      { name: 'payments', queue: this.paymentsQueue },
      { name: 'dlq', queue: this.dlqQueue },
    ];

    const healthStatus = {};

    for (const { name, queue } of queues) {
      try {
        const [waiting, active, failed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getFailed(),
        ]);

        const totalJobs = waiting.length + active.length;
        const failureRate = failed.length / (totalJobs + failed.length) || 0;

        healthStatus[name] = {
          status: failureRate > 0.1 ? 'unhealthy' : totalJobs > 1000 ? 'warning' : 'healthy',
          waiting: waiting.length,
          active: active.length,
          failed: failed.length,
          failureRate: Math.round(failureRate * 100) / 100,
        };
      } catch (error) {
        healthStatus[name] = {
          status: 'error',
          error: error.message,
        };
      }
    }

    return healthStatus;
  }
}
