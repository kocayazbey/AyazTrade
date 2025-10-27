import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as prometheus from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private register: prometheus.Registry;

  // HTTP Metrics
  private httpRequestDuration: prometheus.Histogram<string>;
  private httpRequestTotal: prometheus.Counter<string>;
  private httpRequestErrors: prometheus.Counter<string>;

  // Database Metrics
  private dbQueryDuration: prometheus.Histogram<string>;
  private dbQueryTotal: prometheus.Counter<string>;
  private dbQueryErrors: prometheus.Counter<string>;

  // Business Metrics
  private ordersTotal: prometheus.Counter<string>;
  private revenueTotal: prometheus.Counter<string>;
  private activeUsers: prometheus.Gauge<string>;

  constructor(private configService: ConfigService) {
    this.register = new prometheus.Registry();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // HTTP Metrics
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    this.httpRequestTotal = new prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestErrors = new prometheus.Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.register],
    });

    // Database Metrics
    this.dbQueryDuration = new prometheus.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    this.dbQueryTotal = new prometheus.Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table'],
      registers: [this.register],
    });

    this.dbQueryErrors = new prometheus.Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table', 'error_type'],
      registers: [this.register],
    });

    // Business Metrics
    this.ordersTotal = new prometheus.Counter({
      name: 'orders_total',
      help: 'Total number of orders',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.revenueTotal = new prometheus.Counter({
      name: 'revenue_total',
      help: 'Total revenue',
      labelNames: ['currency'],
      registers: [this.register],
    });

    this.activeUsers = new prometheus.Gauge({
      name: 'active_users',
      help: 'Number of active users',
      registers: [this.register],
    });
  }

  // HTTP Metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration);
    
    this.httpRequestTotal
      .labels(method, route, statusCode.toString())
      .inc();
  }

  recordHttpError(method: string, route: string, errorType: string): void {
    this.httpRequestErrors
      .labels(method, route, errorType)
      .inc();
  }

  // Database Metrics
  recordDbQuery(operation: string, table: string, duration: number): void {
    this.dbQueryDuration
      .labels(operation, table)
      .observe(duration);
    
    this.dbQueryTotal
      .labels(operation, table)
      .inc();
  }

  recordDbError(operation: string, table: string, errorType: string): void {
    this.dbQueryErrors
      .labels(operation, table, errorType)
      .inc();
  }

  // Business Metrics
  recordOrder(status: string): void {
    this.ordersTotal
      .labels(status)
      .inc();
  }

  recordRevenue(amount: number, currency: string = 'USD'): void {
    this.revenueTotal
      .labels(currency)
      .inc(amount);
  }

  setActiveUsers(count: number): void {
    this.activeUsers.set(count);
  }

  // Get metrics
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.register.metrics();
      return true;
    } catch (error) {
      this.logger.error('Metrics health check failed:', error);
      return false;
    }
  }
}
