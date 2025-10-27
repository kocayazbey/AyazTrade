import { Controller, Get } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { AlertingService } from './alerting.service';

@Controller('performance')
export class PerformanceController {
  constructor(
    private performanceService: PerformanceService,
    private alertingService: AlertingService,
  ) {}

  @Get('metrics')
  async getPerformanceMetrics() {
    return this.performanceService.getPerformanceMetrics();
  }

  @Get('alerts')
  async getPerformanceAlerts() {
    return this.performanceService.getPerformanceAlerts();
  }

  @Get('health')
  async getPerformanceHealth() {
    const metrics = await this.performanceService.getPerformanceMetrics();
    const alerts = await this.performanceService.getPerformanceAlerts();
    
    return {
      status: alerts.length === 0 ? 'healthy' : 'unhealthy',
      metrics,
      alerts,
      timestamp: new Date().toISOString(),
    };
  }
}
