import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../core/database/database.module';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { IyzicoService } from './iyzico.service';

@Module({
  imports: [DatabaseModule],
  providers: [PaymentsService, StripeService, IyzicoService],
  exports: [PaymentsService, StripeService, IyzicoService],
})
export class PaymentsModule {}