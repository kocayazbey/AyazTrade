import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';

@Module({
  imports: [EventEmitterModule],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventsModule {}
