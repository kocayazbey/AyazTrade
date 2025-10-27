import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DatabaseModule } from '../../core/database/database.module';
import { ShippingService } from './services/shipping.service';
import { ArasCargoService } from './services/providers/aras-cargo.service';
import { YurticiCargoService } from './services/providers/yurtici-cargo.service';
import { MngCargoService } from './services/providers/mng-cargo.service';
import { UpsService } from './services/providers/ups.service';
import { DhlService } from './services/providers/dhl.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    ShippingService,
    ArasCargoService,
    YurticiCargoService,
    MngCargoService,
    UpsService,
    DhlService,
  ],
  exports: [OrdersService, ShippingService],
})
export class OrdersModule {}
