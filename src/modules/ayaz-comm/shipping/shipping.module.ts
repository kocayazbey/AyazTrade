import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { ShippingRatesService } from './shipping-rates.service';
import { TrackingService } from './tracking.service';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, ShippingRatesService, TrackingService],
  exports: [ShippingService, ShippingRatesService],
})
export class ShippingModule {}
