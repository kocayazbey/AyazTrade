import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelemetryService } from './telemetry.service';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [TelemetryService, CorrelationIdMiddleware],
  exports: [TelemetryService, CorrelationIdMiddleware],
})
export class TelemetryModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
