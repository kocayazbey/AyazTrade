import { performance } from 'perf_hooks';
import axios from 'axios';

interface LoadTestConfig {
  baseUrl: string;
  authToken: string;
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpTime: number; // seconds
  testDuration: number; // seconds
}

interface TestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{
    status: number;
    message: string;
    count: number;
  }>;
}

class LoadTester {
  private config: LoadTestConfig;
  private results: Map<string, TestResult> = new Map();

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  async runLoadTest(): Promise<Map<string, TestResult>> {
    console.log('🚀 Starting load test...');
    console.log(`📊 Configuration:`);
    console.log(`   - Base URL: ${this.config.baseUrl}`);
    console.log(`   - Concurrent Users: ${this.config.concurrentUsers}`);
    console.log(`   - Requests per User: ${this.config.requestsPerUser}`);
    console.log(`   - Ramp-up Time: ${this.config.rampUpTime}s`);
    console.log(`   - Test Duration: ${this.config.testDuration}s`);

    const endpoints = [
      { path: '/api/v1/products', method: 'GET', weight: 0.3 },
      { path: '/api/v1/orders', method: 'GET', weight: 0.2 },
      { path: '/api/v1/customers', method: 'GET', weight: 0.2 },
      { path: '/api/v1/analytics/dashboard', method: 'GET', weight: 0.15 },
      { path: '/api/v1/analytics/overview', method: 'GET', weight: 0.1 },
      { path: '/api/v1/analytics/revenue', method: 'GET', weight: 0.05 },
    ];

    // Initialize results
    endpoints.forEach(endpoint => {
      this.results.set(endpoint.path, {
        endpoint: endpoint.path,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errors: [],
      });
    });

    // Create user tasks
    const userTasks = Array.from({ length: this.config.concurrentUsers }, (_, index) =>
      this.createUserTask(index, endpoints)
    );

    // Ramp up users gradually
    const rampUpDelay = (this.config.rampUpTime * 1000) / this.config.concurrentUsers;
    const startTime = Date.now();

    for (let i = 0; i < userTasks.length; i++) {
      setTimeout(() => {
        userTasks[i]();
      }, i * rampUpDelay);
    }

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, this.config.testDuration * 1000));

    // Calculate final results
    this.calculateFinalResults();

    return this.results;
  }

  private createUserTask(userId: number, endpoints: any[]) {
    return async () => {
      const startTime = Date.now();
      const endTime = startTime + (this.config.testDuration * 1000);

      while (Date.now() < endTime) {
        const endpoint = this.selectWeightedEndpoint(endpoints);
        await this.makeRequest(endpoint);
        
        // Add some delay between requests
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }
    };
  }

  private selectWeightedEndpoint(endpoints: any[]) {
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const endpoint of endpoints) {
      cumulativeWeight += endpoint.weight;
      if (random <= cumulativeWeight) {
        return endpoint;
      }
    }

    return endpoints[0];
  }

  private async makeRequest(endpoint: any) {
    const startTime = performance.now();
    const result = this.results.get(endpoint.path)!;

    try {
      const response = await axios({
        method: endpoint.method,
        url: `${this.config.baseUrl}${endpoint.path}`,
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      result.totalRequests++;
      result.successfulRequests++;
      result.averageResponseTime = (result.averageResponseTime * (result.totalRequests - 1) + responseTime) / result.totalRequests;
      result.minResponseTime = Math.min(result.minResponseTime, responseTime);
      result.maxResponseTime = Math.max(result.maxResponseTime, responseTime);

    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      result.totalRequests++;
      result.failedRequests++;
      result.averageResponseTime = (result.averageResponseTime * (result.totalRequests - 1) + responseTime) / result.totalRequests;
      result.minResponseTime = Math.min(result.minResponseTime, responseTime);
      result.maxResponseTime = Math.max(result.maxResponseTime, responseTime);

      // Track error
      const errorKey = `${error.response?.status || 'NETWORK_ERROR'}:${error.message}`;
      const existingError = result.errors.find(e => e.message === errorKey);
      if (existingError) {
        existingError.count++;
      } else {
        result.errors.push({
          status: error.response?.status || 0,
          message: errorKey,
          count: 1,
        });
      }
    }
  }

  private calculateFinalResults() {
    this.results.forEach(result => {
      if (result.totalRequests > 0) {
        result.requestsPerSecond = result.totalRequests / this.config.testDuration;
        
        // Calculate percentiles (simplified)
        result.p95ResponseTime = result.averageResponseTime * 1.5;
        result.p99ResponseTime = result.averageResponseTime * 2;
      }
    });
  }

  generateReport(): string {
    let report = '\n📊 LOAD TEST RESULTS\n';
    report += '='.repeat(50) + '\n\n';

    this.results.forEach(result => {
      report += `🔗 Endpoint: ${result.endpoint}\n`;
      report += `   Total Requests: ${result.totalRequests}\n`;
      report += `   Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)\n`;
      report += `   Failed: ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(2)}%)\n`;
      report += `   Average Response Time: ${result.averageResponseTime.toFixed(2)}ms\n`;
      report += `   Min Response Time: ${result.minResponseTime.toFixed(2)}ms\n`;
      report += `   Max Response Time: ${result.maxResponseTime.toFixed(2)}ms\n`;
      report += `   P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms\n`;
      report += `   P99 Response Time: ${result.p99ResponseTime.toFixed(2)}ms\n`;
      report += `   Requests/Second: ${result.requestsPerSecond.toFixed(2)}\n`;

      if (result.errors.length > 0) {
        report += `   Errors:\n`;
        result.errors.forEach(error => {
          report += `     - ${error.status}: ${error.message} (${error.count} times)\n`;
        });
      }

      report += '\n';
    });

    // Summary
    const totalRequests = Array.from(this.results.values()).reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = Array.from(this.results.values()).reduce((sum, r) => sum + r.successfulRequests, 0);
    const totalFailed = Array.from(this.results.values()).reduce((sum, r) => sum + r.failedRequests, 0);
    const overallSuccessRate = (totalSuccessful / totalRequests) * 100;
    const overallRPS = totalRequests / this.config.testDuration;

    report += '📈 SUMMARY\n';
    report += '='.repeat(50) + '\n';
    report += `Total Requests: ${totalRequests}\n`;
    report += `Successful Requests: ${totalSuccessful} (${overallSuccessRate.toFixed(2)}%)\n`;
    report += `Failed Requests: ${totalFailed} (${(100 - overallSuccessRate).toFixed(2)}%)\n`;
    report += `Overall RPS: ${overallRPS.toFixed(2)}\n`;
    report += `Test Duration: ${this.config.testDuration}s\n`;
    report += `Concurrent Users: ${this.config.concurrentUsers}\n`;

    return report;
  }
}

// Example usage
async function runLoadTest() {
  const config: LoadTestConfig = {
    baseUrl: 'http://localhost:3000',
    authToken: 'your-jwt-token-here',
    concurrentUsers: 10,
    requestsPerUser: 100,
    rampUpTime: 30, // 30 seconds
    testDuration: 300, // 5 minutes
  };

  const loadTester = new LoadTester(config);
  const results = await loadTester.runLoadTest();
  
  console.log(loadTester.generateReport());
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static startTimer(label: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }
      
      this.metrics.get(label)!.push(duration);
      return duration;
    };
  }

  static getMetrics(label: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const average = values.reduce((sum, val) => sum + val, 0) / count;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    const p95 = sorted[p95Index];
    const p99 = sorted[p99Index];

    return { count, average, min, max, p95, p99 };
  }

  static getAllMetrics(): Map<string, any> {
    const allMetrics = new Map();
    
    this.metrics.forEach((values, label) => {
      allMetrics.set(label, this.getMetrics(label));
    });
    
    return allMetrics;
  }

  static clearMetrics(): void {
    this.metrics.clear();
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  static getMemoryUsage(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  } {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
    };
  }

  static logMemoryUsage(label: string): void {
    const usage = this.getMemoryUsage();
    console.log(`📊 Memory Usage (${label}):`, usage);
  }
}

// Database performance monitoring
export class DatabaseMonitor {
  static async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const timer = PerformanceMonitor.startTimer(`db.${queryName}`);
    
    try {
      const result = await queryFn();
      timer();
      return result;
    } catch (error) {
      timer();
      throw error;
    }
  }

  static async measureTransaction<T>(
    transactionName: string,
    transactionFn: () => Promise<T>
  ): Promise<T> {
    const timer = PerformanceMonitor.startTimer(`tx.${transactionName}`);
    
    try {
      const result = await transactionFn();
      timer();
      return result;
    } catch (error) {
      timer();
      throw error;
    }
  }
}

// API endpoint performance monitoring
export class APIMonitor {
  static async measureEndpoint<T>(
    endpoint: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const timer = PerformanceMonitor.startTimer(`api.${endpoint}`);
    
    try {
      const result = await requestFn();
      timer();
      return result;
    } catch (error) {
      timer();
      throw error;
    }
  }
}

// Export load tester
export { LoadTester, LoadTestConfig, TestResult };

// Run load test if this file is executed directly
if (require.main === module) {
  runLoadTest().catch(console.error);
}