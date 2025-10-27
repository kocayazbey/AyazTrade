import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';

@Controller('health')
export class HealthController {
  constructor(
    private healthService: HealthService,
    private metricsService: MetricsService,
  ) {}

  @Get()
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Get('liveness')
  async getLiveness() {
    return this.healthService.checkLiveness();
  }

  @Get('readiness')
  async getReadiness() {
    return this.healthService.checkReadiness();
  }

  @Get('metrics')
  async getMetrics() {
    return this.metricsService.getMetrics();
  }
}
