import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly logger = new Logger(PrometheusService.name);
  
  // HTTP Metrics
  private httpRequestDuration: Histogram<string>;
  private httpRequestTotal: Counter<string>;
  private httpRequestErrors: Counter<string>;
  
  // Database Metrics
  private dbQueryDuration: Histogram<string>;
  private dbQueryTotal: Counter<string>;
  private dbQueryErrors: Counter<string>;
  private dbConnectionsActive: Gauge<string>;
  private dbConnectionsIdle: Gauge<string>;
  
  // Cache Metrics
  private cacheHitTotal: Counter<string>;
  private cacheMissTotal: Counter<string>;
  private cacheOperationDuration: Histogram<string>;
  private cacheSize: Gauge<string>;
  
  // Business Metrics
  private ordersTotal: Counter<string>;
  private ordersValue: Counter<string>;
  private productsTotal: Gauge<string>;
  private customersTotal: Gauge<string>;
  
  // System Metrics
  private memoryUsage: Gauge<string>;
  private cpuUsage: Gauge<string>;
  private diskUsage: Gauge<string>;

  constructor(private configService: ConfigService) {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    try {
      // Collect default metrics
      collectDefaultMetrics({
        register,
        prefix: 'ayaztrade_',
      });

      // HTTP Metrics
      this.httpRequestDuration = new Histogram({
        name: 'ayaztrade_http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
        register,
      });

      this.httpRequestTotal = new Counter({
        name: 'ayaztrade_http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'],
        register,
      });

      this.httpRequestErrors = new Counter({
        name: 'ayaztrade_http_requests_errors_total',
        help: 'Total number of HTTP request errors',
        labelNames: ['method', 'route', 'status_code'],
        register,
      });

      // Database Metrics
      this.dbQueryDuration = new Histogram({
        name: 'ayaztrade_db_query_duration_seconds',
        help: 'Duration of database queries in seconds',
        labelNames: ['operation', 'table'],
        buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
        register,
      });

      this.dbQueryTotal = new Counter({
        name: 'ayaztrade_db_queries_total',
        help: 'Total number of database queries',
        labelNames: ['operation', 'table'],
        register,
      });

      this.dbQueryErrors = new Counter({
        name: 'ayaztrade_db_queries_errors_total',
        help: 'Total number of database query errors',
        labelNames: ['operation', 'table'],
        register,
      });

      this.dbConnectionsActive = new Gauge({
        name: 'ayaztrade_db_connections_active',
        help: 'Number of active database connections',
        register,
      });

      this.dbConnectionsIdle = new Gauge({
        name: 'ayaztrade_db_connections_idle',
        help: 'Number of idle database connections',
        register,
      });

      // Cache Metrics
      this.cacheHitTotal = new Counter({
        name: 'ayaztrade_cache_hits_total',
        help: 'Total number of cache hits',
        labelNames: ['cache_type', 'key_pattern'],
        register,
      });

      this.cacheMissTotal = new Counter({
        name: 'ayaztrade_cache_misses_total',
        help: 'Total number of cache misses',
        labelNames: ['cache_type', 'key_pattern'],
        register,
      });

      this.cacheOperationDuration = new Histogram({
        name: 'ayaztrade_cache_operation_duration_seconds',
        help: 'Duration of cache operations in seconds',
        labelNames: ['operation', 'cache_type'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
        register,
      });

      this.cacheSize = new Gauge({
        name: 'ayaztrade_cache_size_bytes',
        help: 'Size of cache in bytes',
        labelNames: ['cache_type'],
        register,
      });

      // Business Metrics
      this.ordersTotal = new Counter({
        name: 'ayaztrade_orders_total',
        help: 'Total number of orders',
        labelNames: ['status', 'payment_method'],
        register,
      });

      this.ordersValue = new Counter({
        name: 'ayaztrade_orders_value_total',
        help: 'Total value of orders',
        labelNames: ['currency', 'status'],
        register,
      });

      this.productsTotal = new Gauge({
        name: 'ayaztrade_products_total',
        help: 'Total number of products',
        labelNames: ['status', 'category'],
        register,
      });

      this.customersTotal = new Gauge({
        name: 'ayaztrade_customers_total',
        help: 'Total number of customers',
        labelNames: ['status', 'segment'],
        register,
      });

      // System Metrics
      this.memoryUsage = new Gauge({
        name: 'ayaztrade_memory_usage_bytes',
        help: 'Memory usage in bytes',
        labelNames: ['type'],
        register,
      });

      this.cpuUsage = new Gauge({
        name: 'ayaztrade_cpu_usage_percent',
        help: 'CPU usage percentage',
        register,
      });

      this.diskUsage = new Gauge({
        name: 'ayaztrade_disk_usage_bytes',
        help: 'Disk usage in bytes',
        labelNames: ['mountpoint'],
        register,
      });

      this.logger.log('Prometheus metrics initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Prometheus metrics:', error);
    }
  }

  // HTTP Metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
    this.httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });
    
    if (statusCode >= 400) {
      this.httpRequestErrors.inc({ method, route, status_code: statusCode.toString() });
    }
  }

  // Database Metrics
  recordDbQuery(operation: string, table: string, duration: number, success: boolean = true): void {
    this.dbQueryDuration.observe({ operation, table }, duration);
    this.dbQueryTotal.inc({ operation, table });
    
    if (!success) {
      this.dbQueryErrors.inc({ operation, table });
    }
  }

  setDbConnections(active: number, idle: number): void {
    this.dbConnectionsActive.set(active);
    this.dbConnectionsIdle.set(idle);
  }

  // Cache Metrics
  recordCacheHit(cacheType: string, keyPattern: string): void {
    this.cacheHitTotal.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  recordCacheMiss(cacheType: string, keyPattern: string): void {
    this.cacheMissTotal.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  recordCacheOperation(operation: string, cacheType: string, duration: number): void {
    this.cacheOperationDuration.observe({ operation, cache_type: cacheType }, duration);
  }

  setCacheSize(cacheType: string, size: number): void {
    this.cacheSize.set({ cache_type: cacheType }, size);
  }

  // Business Metrics
  recordOrder(status: string, paymentMethod: string, value?: number, currency?: string): void {
    this.ordersTotal.inc({ status, payment_method: paymentMethod });
    
    if (value && currency) {
      this.ordersValue.inc({ currency, status }, value);
    }
  }

  setProductsTotal(status: string, category: string, count: number): void {
    this.productsTotal.set({ status, category }, count);
  }

  setCustomersTotal(status: string, segment: string, count: number): void {
    this.customersTotal.set({ status, segment }, count);
  }

  // System Metrics
  setMemoryUsage(type: string, usage: number): void {
    this.memoryUsage.set({ type }, usage);
  }

  setCpuUsage(usage: number): void {
    this.cpuUsage.set(usage);
  }

  setDiskUsage(mountpoint: string, usage: number): void {
    this.diskUsage.set({ mountpoint }, usage);
  }

  // RED Metrics (Rate, Errors, Duration)
  getRedMetrics(): {
    rate: number;
    errors: number;
    duration: number;
  } {
    // This would typically be calculated from the metrics
    // For now, return mock values
    return {
      rate: 0,
      errors: 0,
      duration: 0,
    };
  }

  // Get all metrics as string
  async getMetrics(): Promise<string> {
    try {
      return await register.metrics();
    } catch (error) {
      this.logger.error('Failed to get metrics:', error);
      return '';
    }
  }

  // Clear all metrics
  clearMetrics(): void {
    register.clear();
  }

  // Get metrics for specific endpoint
  async getMetricsForEndpoint(endpoint: string): Promise<string> {
    try {
      const metrics = await register.metrics();
      const lines = metrics.split('\n');
      const filteredLines = lines.filter(line => 
        line.includes(endpoint) || line.startsWith('#') || line === ''
      );
      return filteredLines.join('\n');
    } catch (error) {
      this.logger.error('Failed to get metrics for endpoint:', error);
      return '';
    }
  }

  // Health check for metrics
  async healthCheck(): Promise<boolean> {
    try {
      await register.metrics();
      return true;
    } catch (error) {
      this.logger.error('Metrics health check failed:', error);
      return false;
    }
  }
}
