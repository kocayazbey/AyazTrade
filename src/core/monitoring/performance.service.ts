import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private performanceThresholds = {
    httpRequest: 1000, // 1 second
    dbQuery: 500, // 500ms
    memoryUsage: 80, // 80%
    cpuUsage: 80, // 80%
  };

  constructor(
    private configService: ConfigService,
    private metricsService: MetricsService,
  ) {
    this.initializeThresholds();
  }

  private initializeThresholds(): void {
    this.performanceThresholds = {
      httpRequest: this.configService.get('PERF_HTTP_THRESHOLD', 1000),
      dbQuery: this.configService.get('PERF_DB_THRESHOLD', 500),
      memoryUsage: this.configService.get('PERF_MEMORY_THRESHOLD', 80),
      cpuUsage: this.configService.get('PERF_CPU_THRESHOLD', 80),
    };
  }

  checkHttpPerformance(method: string, route: string, duration: number): boolean {
    const isSlow = duration > this.performanceThresholds.httpRequest;
    if (isSlow) {
      this.logger.warn(`Slow HTTP request: ${method} ${route} took ${duration}ms`);
    }
    return isSlow;
  }

  checkDbPerformance(operation: string, table: string, duration: number): boolean {
    const isSlow = duration > this.performanceThresholds.dbQuery;
    if (isSlow) {
      this.logger.warn(`Slow DB query: ${operation} on ${table} took ${duration}ms`);
    }
    return isSlow;
  }

  checkMemoryUsage(): boolean {
    const memoryUsage = process.memoryUsage();
    const usagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const isHigh = usagePercentage > this.performanceThresholds.memoryUsage;
    if (isHigh) {
      this.logger.warn(`High memory usage: ${usagePercentage.toFixed(2)}%`);
    }
    return isHigh;
  }

  checkCpuUsage(): boolean {
    const cpuUsage = process.cpuUsage();
    const usagePercentage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    const isHigh = usagePercentage > this.performanceThresholds.cpuUsage;
    if (isHigh) {
      this.logger.warn(`High CPU usage: ${usagePercentage.toFixed(2)}%`);
    }
    return isHigh;
  }

  async getPerformanceMetrics(): Promise<{
    http: {
      average: number;
      p95: number;
      p99: number;
    };
    database: {
      average: number;
      p95: number;
      p99: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      user: number;
      system: number;
      total: number;
    };
  }> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      http: {
        average: 0, // This would be calculated from actual metrics
        p95: 0,
        p99: 0,
      },
      database: {
        average: 0, // This would be calculated from actual metrics
        p95: 0,
        p99: 0,
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        total: cpuUsage.user + cpuUsage.system,
      },
    };
  }

  async getPerformanceAlerts(): Promise<Array<{
    type: 'http' | 'database' | 'memory' | 'cpu';
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }>> {
    const alerts = [];

    // Check HTTP performance
    const httpMetrics = await this.getPerformanceMetrics();
    if (httpMetrics.http.average > this.performanceThresholds.httpRequest) {
      alerts.push({
        type: 'http',
        message: `Average HTTP response time is ${httpMetrics.http.average}ms`,
        severity: 'high',
        timestamp: new Date().toISOString(),
      });
    }

    // Check database performance
    if (httpMetrics.database.average > this.performanceThresholds.dbQuery) {
      alerts.push({
        type: 'database',
        message: `Average database query time is ${httpMetrics.database.average}ms`,
        severity: 'high',
        timestamp: new Date().toISOString(),
      });
    }

    // Check memory usage
    if (httpMetrics.memory.percentage > this.performanceThresholds.memoryUsage) {
      alerts.push({
        type: 'memory',
        message: `Memory usage is ${httpMetrics.memory.percentage.toFixed(2)}%`,
        severity: 'high',
        timestamp: new Date().toISOString(),
      });
    }

    // Check CPU usage
    if (httpMetrics.cpu.total > this.performanceThresholds.cpuUsage) {
      alerts.push({
        type: 'cpu',
        message: `CPU usage is ${httpMetrics.cpu.total.toFixed(2)}%`,
        severity: 'high',
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }
}
