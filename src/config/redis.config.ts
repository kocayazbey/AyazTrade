import { RedisModuleOptions } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';

export const getRedisConfig = (configService: ConfigService): RedisModuleOptions => {
  return {
    config: {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD') || undefined,
      db: configService.get('REDIS_DB', 0),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      family: 4,
      keyPrefix: configService.get('REDIS_KEY_PREFIX', 'ayaztrade:'),
    },
  };
};
