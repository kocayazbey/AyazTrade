import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PERFORMANCE_KEY, PERFORMANCE_OPTIONS_KEY } from '../decorators/performance.decorator';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private metricsService?: any // Inject metrics service
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const isPerformanceEnabled = this.reflector.getAllAndOverride<boolean>(PERFORMANCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPerformanceEnabled) {
      return next.handle();
    }

    const performanceOptions = this.reflector.getAllAndOverride<any>(PERFORMANCE_OPTIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();

    return next.handle().pipe(
      tap((data) => {
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage(startCpu);

        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
        const cpuUsed = endCpu.user + endCpu.system;

        // Set performance headers
        response.setHeader('X-Performance-Time', duration.toString());
        response.setHeader('X-Performance-Memory', (memoryUsed / 1024 / 1024).toString());
        response.setHeader('X-Performance-CPU', cpuUsed.toString());

        // Log performance metrics
        this.logPerformanceMetrics({
          method: request.method,
          url: request.url,
          duration,
          memoryUsed,
          cpuUsed,
          threshold: (performanceOptions as any)?.threshold,
          alertThreshold: (performanceOptions as any)?.alertThreshold,
          tags: (performanceOptions as any)?.tags,
          category: (performanceOptions as any)?.category,
          timestamp: new Date().toISOString(),
        });

        // Check for performance alerts
        this.checkPerformanceAlerts(duration, memoryUsed, cpuUsed, performanceOptions);
      }),
      catchError((error) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;

        this.logPerformanceMetrics({
          method: request.method,
          url: request.url,
          duration,
          error: error.message,
          threshold: (performanceOptions as any)?.threshold,
          alertThreshold: (performanceOptions as any)?.alertThreshold,
          tags: (performanceOptions as any)?.tags,
          category: (performanceOptions as any)?.category,
          timestamp: new Date().toISOString(),
        });

        throw error;
      })
    );
  }

  private logPerformanceMetrics(metrics: any): void {
    if (this.metricsService) {
      this.metricsService.record(metrics);
    } else {
      console.log('PERFORMANCE:', JSON.stringify(metrics, null, 2));
    }
  }

  private checkPerformanceAlerts(duration: number, memoryUsed: number, cpuUsed: number, options: any): void {
    const alerts = [];

    if (options?.threshold && duration > options.threshold) {
      alerts.push(`Performance threshold exceeded: ${duration}ms > ${options.threshold}ms`);
    }

    if (options?.alertThreshold && duration > options.alertThreshold) {
      alerts.push(`Performance alert threshold exceeded: ${duration}ms > ${options.alertThreshold}ms`);
    }

    if (options?.memoryThreshold && memoryUsed > options.memoryThreshold * 1024 * 1024) {
      alerts.push(`Memory threshold exceeded: ${memoryUsed / 1024 / 1024}MB > ${options.memoryThreshold}MB`);
    }

    if (options?.cpuThreshold && cpuUsed > options.cpuThreshold) {
      alerts.push(`CPU threshold exceeded: ${cpuUsed}% > ${options.cpuThreshold}%`);
    }

    if (alerts.length > 0) {
      console.warn('PERFORMANCE ALERTS:', alerts.join(', '));
    }
  }
}
