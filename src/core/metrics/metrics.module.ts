import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrometheusService } from './prometheus.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [MetricsController],
  providers: [PrometheusService, MetricsInterceptor],
  exports: [PrometheusService, MetricsInterceptor],
})
export class MetricsModule {}