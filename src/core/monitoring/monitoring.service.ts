import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { EventBusService } from '../events/event-bus.service';

interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface Alert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  currentValue: number;
  status: 'ok' | 'warning' | 'critical';
  triggeredAt?: Date;
  resolvedAt?: Date;
}

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private alerts: Map<string, Alert> = new Map();

  constructor(
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService
  ) {
    this.setupAlerts();
  }

  private setupAlerts() {
    // Response time alert
    this.alerts.set('response_time', {
      id: 'response_time',
      name: 'High Response Time',
      condition: 'response_time > 1000',
      threshold: 1000,
      currentValue: 0,
      status: 'ok',
    });

    // Error rate alert
    this.alerts.set('error_rate', {
      id: 'error_rate',
      name: 'High Error Rate',
      condition: 'error_rate > 5',
      threshold: 5,
      currentValue: 0,
      status: 'ok',
    });

    // Memory usage alert
    this.alerts.set('memory_usage', {
      id: 'memory_usage',
      name: 'High Memory Usage',
      condition: 'memory_usage > 80',
      threshold: 80,
      currentValue: 0,
      status: 'ok',
    });
  }

  async recordMetric(metric: Metric): Promise<void> {
    try {
      // Store metric in cache
      await this.cacheService.set(
        `metric:${metric.name}:${metric.timestamp.getTime()}`,
        JSON.stringify(metric),
        24 * 60 * 60 // 24 hours
      );

      // Update alerts
      await this.updateAlerts(metric);

      this.logger.debug(`Metric recorded: ${metric.name} = ${metric.value}`);
    } catch (error) {
      this.logger.error('Error recording metric:', error);
    }
  }

  async getMetrics(name: string, startTime: Date, endTime: Date): Promise<Metric[]> {
    const metrics: Metric[] = [];
    const startTimestamp = startTime.getTime();
    const endTimestamp = endTime.getTime();

    // In a real implementation, this would query a time-series database
    // For now, we'll return mock data
    for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += 60000) {
      metrics.push({
        name,
        value: Math.random() * 100,
        timestamp: new Date(timestamp),
      });
    }

    return metrics;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return {
      responseTime: Math.random() * 1000,
      throughput: Math.random() * 1000,
      errorRate: Math.random() * 10,
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
    };
  }

  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.status !== 'ok');
  }

  async checkAlert(alertId: string): Promise<Alert | null> {
    return this.alerts.get(alertId) || null;
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'ok';
      alert.resolvedAt = new Date();
      this.alerts.set(alertId, alert);

      this.logger.log(`Alert resolved: ${alert.name}`);
    }
  }

  async getDashboardData(): Promise<any> {
    const performance = await this.getPerformanceMetrics();
    const alerts = await this.getAlerts();
    const activeAlerts = await this.getActiveAlerts();

    return {
      performance,
      alerts: {
        total: alerts.length,
        active: activeAlerts.length,
        critical: activeAlerts.filter(a => a.status === 'critical').length,
        warning: activeAlerts.filter(a => a.status === 'warning').length,
      },
      uptime: {
        current: '99.9%',
        last24h: '99.8%',
        last7d: '99.7%',
      },
      requests: {
        total: 1000000,
        successful: 995000,
        failed: 5000,
        rate: 1000, // requests per minute
      },
    };
  }

  async generateReport(startTime: Date, endTime: Date): Promise<any> {
    const report = {
      period: {
        start: startTime,
        end: endTime,
        duration: endTime.getTime() - startTime.getTime(),
      },
      performance: await this.getPerformanceMetrics(),
      alerts: await this.getAlerts(),
      recommendations: await this.generateRecommendations(),
    };

    return report;
  }

  async logError(error: Error, context?: any): Promise<void> {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
    };

    // Store error
    await this.cacheService.set(
      `error:${Date.now()}`,
      JSON.stringify(errorData),
      7 * 24 * 60 * 60 // 7 days
    );

    // Emit error event
    await this.eventBusService.publish({
      eventType: 'monitoring.error',
      aggregateId: 'monitoring',
      aggregateType: 'Monitoring',
      eventData: errorData,
      timestamp: new Date(),
      version: 1,
    });

    this.logger.error('Error logged:', error);
  }

  async logPerformance(operation: string, duration: number, metadata?: any): Promise<void> {
    const performanceData = {
      operation,
      duration,
      metadata,
      timestamp: new Date(),
    };

    // Store performance data
    await this.cacheService.set(
      `performance:${operation}:${Date.now()}`,
      JSON.stringify(performanceData),
      24 * 60 * 60 // 24 hours
    );

    // Record metric
    await this.recordMetric({
      name: 'performance',
      value: duration,
      timestamp: new Date(),
      tags: { operation },
    });
  }

  private async updateAlerts(metric: Metric): Promise<void> {
    for (const [alertId, alert] of this.alerts.entries()) {
      if (metric.name === alertId) {
        alert.currentValue = metric.value;

        if (this.evaluateAlertCondition(alert, metric)) {
          if (alert.status === 'ok') {
            alert.status = metric.value > alert.threshold ? 'critical' : 'warning';
            alert.triggeredAt = new Date();
            this.alerts.set(alertId, alert);

            this.logger.warn(`Alert triggered: ${alert.name}`);
          }
        } else {
          if (alert.status !== 'ok') {
            alert.status = 'ok';
            alert.resolvedAt = new Date();
            this.alerts.set(alertId, alert);

            this.logger.log(`Alert resolved: ${alert.name}`);
          }
        }
      }
    }
  }

  private evaluateAlertCondition(alert: Alert, metric: Metric): boolean {
    switch (alert.condition) {
      case 'response_time > 1000':
        return metric.value > 1000;
      case 'error_rate > 5':
        return metric.value > 5;
      case 'memory_usage > 80':
        return metric.value > 80;
      default:
        return false;
    }
  }

  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const performance = await this.getPerformanceMetrics();

    if (performance.responseTime > 500) {
      recommendations.push('Consider optimizing database queries');
    }

    if (performance.errorRate > 2) {
      recommendations.push('Investigate and fix error sources');
    }

    if (performance.memoryUsage > 70) {
      recommendations.push('Consider scaling up memory resources');
    }

    if (performance.cpuUsage > 80) {
      recommendations.push('Consider scaling up CPU resources');
    }

    return recommendations;
  }
}
