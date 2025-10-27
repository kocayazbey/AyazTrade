import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        password: configService.get<string>('REDIS_PASSWORD'),
        db: configService.get<number>('REDIS_DB', 0),
        ttl: configService.get<number>('CACHE_TTL', 300), // 5 minutes default
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService, CacheInterceptor],
  exports: [CacheService, CacheInterceptor, NestCacheModule],
})
export class CacheModule {}