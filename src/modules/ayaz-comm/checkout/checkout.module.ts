import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { StripeService } from '../payments/stripe.service';
import { IyzicoService } from '../payments/iyzico.service';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, StripeService, IyzicoService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
