import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingManagementController } from './shipping-management.controller';
import { DatabaseModule } from '../../core/database/database.module';
import { CacheModule } from '../../core/cache/cache.module';
import { EventsModule } from '../../core/events/events.module';
import { LoggerModule } from '../../core/logger/logger.module';

@Module({
  imports: [DatabaseModule, CacheModule, EventsModule, LoggerModule],
  controllers: [ShippingManagementController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
