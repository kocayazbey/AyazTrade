import { Module } from '@nestjs/common';
import { AyazCommController } from './ayaz-comm.controller';
import { AyazCommService } from './ayaz-comm.service';
import { CacheModule } from '../../core/cache/cache.module';
import { LoggerModule } from '../../core/logger/logger.module';
import { EventsModule } from '../../core/events/events.module';
import { WMSModule } from '../wms/wms.module';

@Module({
  imports: [CacheModule, LoggerModule, EventsModule, WMSModule],
  controllers: [AyazCommController],
  providers: [AyazCommService],
  exports: [AyazCommService],
})
export class AyazCommModule {}