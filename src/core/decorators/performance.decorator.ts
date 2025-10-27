import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const PERFORMANCE_KEY = 'performance';
export const PERFORMANCE_OPTIONS_KEY = 'performanceOptions';

export interface PerformanceOptions {
  threshold?: number; // Performance threshold in milliseconds
  enableMetrics?: boolean; // Enable performance metrics
  enableProfiling?: boolean; // Enable performance profiling
  enableMemoryTracking?: boolean; // Enable memory tracking
  enableCpuTracking?: boolean; // Enable CPU tracking
  enableNetworkTracking?: boolean; // Enable network tracking
  enableDatabaseTracking?: boolean; // Enable database tracking
  enableCacheTracking?: boolean; // Enable cache tracking
  enableExternalApiTracking?: boolean; // Enable external API tracking
  alertThreshold?: number; // Alert threshold in milliseconds
  slowQueryThreshold?: number; // Slow query threshold in milliseconds
  memoryThreshold?: number; // Memory threshold in MB
  cpuThreshold?: number; // CPU threshold percentage
  customMetrics?: string[]; // Custom metrics to track
  tags?: string[]; // Performance tags
  category?: string; // Performance category
  subcategory?: string; // Performance subcategory
  metadata?: Record<string, any>; // Additional metadata
}

export const Performance = (options?: PerformanceOptions) => {
  return applyDecorators(
    SetMetadata(PERFORMANCE_KEY, true),
    SetMetadata(PERFORMANCE_OPTIONS_KEY, options || {}),
  );
};

export const PerformanceThreshold = (threshold: number, options?: Omit<PerformanceOptions, 'threshold'>) => {
  return Performance({ ...options, threshold });
};

export const PerformanceMetrics = (options?: Omit<PerformanceOptions, 'enableMetrics'>) => {
  return Performance({ ...options, enableMetrics: true });
};

export const PerformanceProfiling = (options?: Omit<PerformanceOptions, 'enableProfiling'>) => {
  return Performance({ ...options, enableProfiling: true });
};

export const PerformanceMemoryTracking = (options?: Omit<PerformanceOptions, 'enableMemoryTracking'>) => {
  return Performance({ ...options, enableMemoryTracking: true });
};

export const PerformanceCpuTracking = (options?: Omit<PerformanceOptions, 'enableCpuTracking'>) => {
  return Performance({ ...options, enableCpuTracking: true });
};

export const PerformanceNetworkTracking = (options?: Omit<PerformanceOptions, 'enableNetworkTracking'>) => {
  return Performance({ ...options, enableNetworkTracking: true });
};

export const PerformanceDatabaseTracking = (options?: Omit<PerformanceOptions, 'enableDatabaseTracking'>) => {
  return Performance({ ...options, enableDatabaseTracking: true });
};

export const PerformanceCacheTracking = (options?: Omit<PerformanceOptions, 'enableCacheTracking'>) => {
  return Performance({ ...options, enableCacheTracking: true });
};

export const PerformanceExternalApiTracking = (options?: Omit<PerformanceOptions, 'enableExternalApiTracking'>) => {
  return Performance({ ...options, enableExternalApiTracking: true });
};

export const PerformanceAlert = (alertThreshold: number, options?: Omit<PerformanceOptions, 'alertThreshold'>) => {
  return Performance({ ...options, alertThreshold });
};

export const PerformanceSlowQuery = (slowQueryThreshold: number, options?: Omit<PerformanceOptions, 'slowQueryThreshold'>) => {
  return Performance({ ...options, slowQueryThreshold });
};

export const PerformanceMemory = (memoryThreshold: number, options?: Omit<PerformanceOptions, 'memoryThreshold'>) => {
  return Performance({ ...options, memoryThreshold });
};

export const PerformanceCpu = (cpuThreshold: number, options?: Omit<PerformanceOptions, 'cpuThreshold'>) => {
  return Performance({ ...options, cpuThreshold });
};

export const PerformanceTags = (tags: string[], options?: Omit<PerformanceOptions, 'tags'>) => {
  return Performance({ ...options, tags });
};

export const PerformanceCategory = (category: string, options?: Omit<PerformanceOptions, 'category'>) => {
  return Performance({ ...options, category });
};

export const ComprehensivePerformance = (
  threshold: number = 1000,
  alertThreshold: number = 5000,
  additionalOptions?: PerformanceOptions
) => {
  return applyDecorators(
    Performance({
      threshold,
      alertThreshold,
      enableMetrics: true,
      enableProfiling: true,
      enableMemoryTracking: true,
      enableCpuTracking: true,
      enableNetworkTracking: true,
      enableDatabaseTracking: true,
      enableCacheTracking: true,
      enableExternalApiTracking: true,
      slowQueryThreshold: 1000,
      memoryThreshold: 100,
      cpuThreshold: 80,
      ...additionalOptions,
    }),
    ApiOperation({ 
      summary: 'Performance monitored endpoint',
      description: 'This endpoint has comprehensive performance monitoring'
    }),
    ApiResponse({ 
      status: 200, 
      description: 'Success - Performance metrics collected',
      headers: {
        'X-Performance-Time': {
          description: 'Request processing time in milliseconds',
          schema: { type: 'number' }
        },
        'X-Performance-Memory': {
          description: 'Memory usage in MB',
          schema: { type: 'number' }
        },
        'X-Performance-CPU': {
          description: 'CPU usage percentage',
          schema: { type: 'number' }
        },
      },
    }),
  );
};

export const NoPerformance = () => {
  return applyDecorators(
    SetMetadata(PERFORMANCE_KEY, false),
    ApiOperation({ 
      summary: 'Non-performance monitored endpoint',
      description: 'This endpoint has no performance monitoring'
    }),
  );
};
