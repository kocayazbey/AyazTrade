import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache/cache.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  dependencies: Record<string, string>;
  errors?: string[];
}

interface ReadinessStatus {
  status: 'ready' | 'not ready';
  timestamp: string;
  checks: HealthCheck[];
}

interface LivenessStatus {
  status: 'alive';
  timestamp: string;
  uptime: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const checks = await this.performHealthChecks();
    const dependencies: Record<string, string> = {};
    const errors: string[] = [];

    checks.forEach(check => {
      dependencies[check.name] = check.status;
      if (check.status === 'unhealthy') {
        errors.push(`${check.name}: ${check.error || 'Unknown error'}`);
      }
    });

    const overallStatus = errors.length === 0 ? 'ok' : 'error';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: this.configService.get<string>('APP_VERSION', '1.0.0'),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      dependencies,
      ...(errors.length > 0 && { errors }),
    };
  }

  async getReadinessStatus(): Promise<ReadinessStatus> {
    const checks = await this.performHealthChecks();
    const allReady = checks.every(check => check.status === 'healthy');

    return {
      status: allReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  async getLivenessStatus(): Promise<LivenessStatus> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  private async performHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Database check
    checks.push(await this.checkDatabase());
    
    // Redis check
    checks.push(await this.checkRedis());
    
    // Elasticsearch check
    checks.push(await this.checkElasticsearch());

    return checks;
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple query to check database connectivity
      await this.databaseService.client.execute('SELECT 1');
      
      return {
        name: 'database',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          type: 'PostgreSQL',
          host: this.configService.get<string>('DATABASE_HOST'),
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      await this.cacheService.get('health-check');
      
      return {
        name: 'redis',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          type: 'Redis',
          host: this.configService.get<string>('REDIS_HOST'),
        },
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        name: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async checkElasticsearch(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple search to check Elasticsearch connectivity
      await this.elasticsearchService.search('health-check', { query: { match_all: {} } });
      
      return {
        name: 'elasticsearch',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          type: 'Elasticsearch',
          node: this.configService.get<string>('ELASTICSEARCH_NODE'),
        },
      };
    } catch (error) {
      this.logger.error('Elasticsearch health check failed', error);
      return {
        name: 'elasticsearch',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }
}
