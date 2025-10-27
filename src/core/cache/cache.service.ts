import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: RedisClientType;

  constructor(private configService: ConfigService) {
    this.redis = createClient({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      database: this.configService.get('REDIS_DB', 0),
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis is ready');
    });

    this.redis.connect();
  }

  async onModuleDestroy() {
    if (this.redis && this.redis.isOpen) {
      await this.redis.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  async delPattern(pattern: string): Promise<boolean> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete cache pattern ${pattern}:`, error);
      return false;
    }
  }

  async batchInvalidate(patterns: string[]): Promise<{ successful: string[]; failed: string[] }> {
    const results = { successful: [], failed: [] };

    await Promise.allSettled(
      patterns.map(async (pattern) => {
        try {
          const success = await this.delPattern(pattern);
          if (success) {
            results.successful.push(pattern);
          } else {
            results.failed.push(pattern);
          }
        } catch (error) {
          this.logger.error(`Batch invalidation failed for pattern ${pattern}:`, error);
          results.failed.push(pattern);
        }
      })
    );

    this.logger.log(`Batch invalidation completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;
  }

  async getRedisInfo(): Promise<any> {
    try {
      const info = await this.redis.info();
      return {
        clusterEnabled: false,
        info: info,
        connected: this.redis.isOpen,
      };
    } catch (error) {
      this.logger.error('Failed to get Redis info:', error);
      return { clusterEnabled: false, error: error.message };
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for cache key ${key}:`, error);
      return -1;
    }
  }

  async flush(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      this.logger.error('Failed to flush cache:', error);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Response caching with TTL
   */
  async cacheResponse<T>(
    key: string, 
    data: T, 
    ttl: number = 300
  ): Promise<T> {
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * Get cached response or execute function
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Cache invalidation by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    await this.delPattern(pattern);
  }

  /**
   * Cache warming
   */
  async warmCache<T>(
    key: string,
    data: T,
    ttl: number = 300
  ): Promise<void> {
    await this.set(key, data, ttl);
  }

  /**
   * Cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    keys: number;
  }> {
    try {
      const info = await this.redis.info('stats');
      const keys = await this.redis.dbsize();

      // Parse Redis info for hits/misses
      const hits = info.match(/keyspace_hits:(\d+)/)?.[1] || '0';
      const misses = info.match(/keyspace_misses:(\d+)/)?.[1] || '0';

      return {
        hits: parseInt(hits),
        misses: parseInt(misses),
        keys
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return {
        hits: 0,
        misses: 0,
        keys: 0
      };
    }
  }

  /**
   * Redis Pub/Sub functionality
   */
  async publish(channel: string, message: any): Promise<boolean> {
    try {
      await this.redis.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      this.logger.error(`Failed to publish to channel ${channel}:`, error);
      return false;
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      const subscriber = this.redis.duplicate();

      subscriber.on('message', (channel, message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          this.logger.error(`Failed to parse message from channel ${channel}:`, error);
          callback(message);
        }
      });

      await subscriber.subscribe(channel);
      this.logger.log(`Subscribed to channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to channel ${channel}:`, error);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      const subscriber = this.redis.duplicate();
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
      this.logger.log(`Unsubscribed from channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from channel ${channel}:`, error);
    }
  }

  /**
   * Stream operations for real-time sync
   */
  async addToStream(stream: string, data: any): Promise<string | null> {
    try {
      const result = await this.redis.xadd(stream, '*', 'data', JSON.stringify(data));
      return result;
    } catch (error) {
      this.logger.error(`Failed to add to stream ${stream}:`, error);
      return null;
    }
  }

  async readFromStream(stream: string, count: number = 10): Promise<any[]> {
    try {
      const result = await this.redis.xread('STREAMS', stream, '0');
      if (result && result.length > 0) {
        const [, messages] = result[0];
        return messages.map(([id, fields]) => ({
          id,
          data: JSON.parse(fields[1])
        }));
      }
      return [];
    } catch (error) {
      this.logger.error(`Failed to read from stream ${stream}:`, error);
      return [];
    }
  }

  async createConsumerGroup(stream: string, groupName: string): Promise<boolean> {
    try {
      await this.redis.xgroup('CREATE', stream, groupName, '0', 'MKSTREAM');
      return true;
    } catch (error) {
      this.logger.error(`Failed to create consumer group ${groupName} for stream ${stream}:`, error);
      return false;
    }
  }

  async consumeFromGroup(stream: string, groupName: string, consumerName: string): Promise<any[]> {
    try {
      const result = await this.redis.xreadgroup(
        'GROUP', groupName, consumerName,
        'STREAMS', stream, '>'
      );

      if (result && result.length > 0) {
        const [, messages] = result[0];
        return messages.map(([id, fields]) => ({
          id,
          data: JSON.parse(fields[1])
        }));
      }
      return [];
    } catch (error) {
      this.logger.error(`Failed to consume from group ${groupName}:`, error);
      return [];
    }
  }
}