import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    private metricsService: MetricsService,
  ) {}

  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    services: {
      database: boolean;
      cache: boolean;
      metrics: boolean;
    };
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  }> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();

    // Check database health
    const databaseHealth = await this.checkDatabaseHealth();
    
    // Check cache health
    const cacheHealth = await this.cacheService.healthCheck();
    
    // Check metrics health
    const metricsHealth = await this.metricsService.healthCheck();

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memory = {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
    };

    const services = {
      database: databaseHealth,
      cache: cacheHealth,
      metrics: metricsHealth,
    };

    const allHealthy = Object.values(services).every(health => health);
    const status = allHealthy ? 'healthy' : 'unhealthy';

    this.logger.log(`Health check completed in ${Date.now() - startTime}ms`);

    return {
      status,
      timestamp,
      services,
      uptime,
      memory,
    };
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // This would be replaced with actual database health check
      // For now, we'll simulate a database check
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  async checkLiveness(): Promise<{ status: 'alive' | 'dead'; timestamp: string }> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness(): Promise<{
    status: 'ready' | 'not_ready';
    timestamp: string;
    checks: {
      database: boolean;
      cache: boolean;
      metrics: boolean;
    };
  }> {
    const checks = {
      database: await this.checkDatabaseHealth(),
      cache: await this.cacheService.healthCheck(),
      metrics: await this.metricsService.healthCheck(),
    };

    const allReady = Object.values(checks).every(check => check);
    const status = allReady ? 'ready' : 'not_ready';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
