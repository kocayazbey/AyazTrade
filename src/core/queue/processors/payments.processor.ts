import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES, JOB_NAMES } from '../queues.constants';
import { StripeService } from '../../../core/integrations/payment/stripe.service';
import { IyzicoService } from '../../../core/integrations/payment/iyzico.service';

type PaymentJob = {
  provider: 'stripe' | 'iyzico';
  payload: any;
};

@Processor(QUEUE_NAMES.payments)
export class PaymentsProcessor {
  private readonly logger = new Logger(PaymentsProcessor.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly iyzico: IyzicoService,
  ) {}

  @Process(JOB_NAMES.processPayment)
  async handleProcessPayment(job: Job<PaymentJob>) {
    const { provider, payload } = job.data;
    if (provider === 'stripe') {
      await this.stripe.createPaymentIntent(payload);
    } else if (provider === 'iyzico') {
      await this.iyzico.createPayment(payload);
    }
  }

  @OnQueueFailed()
  async handleFailed(job: Job, error: Error) {
    this.logger.error(`Payment job ${job.id} failed: ${error.message}`, error.stack);
  }
}


