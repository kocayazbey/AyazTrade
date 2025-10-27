import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { CACHE_OPTIONS, CacheOptions } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CacheService)
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheOptions = this.reflector.get<CacheOptions>(CACHE_OPTIONS, context.getHandler());

    if (!cacheOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request, cacheOptions);

    // Try to get from cache first
    const cachedResult = await this.cacheService.get(cacheKey);
    if (cachedResult) {
      return of(cachedResult);
    }

    // Execute the request
    return next.handle().pipe(
      tap(async (result) => {
        // Check if result should be cached
        if (this.shouldCache(result, cacheOptions, [request])) {
          await this.cacheService.set(cacheKey, result, cacheOptions.ttl || 300);

          // Set cache tags if provided
          if (cacheOptions.tags) {
            await this.setCacheTags(cacheKey, cacheOptions.tags);
          }
        }
      }),
    );
  }

  private generateCacheKey(request: any, options: CacheOptions): string {
    if (options.key) {
      return options.key;
    }

    const method = request.method;
    const url = request.url;
    const userId = request.user?.id;
    const queryParams = JSON.stringify(request.query);
    const bodyParams = JSON.stringify(request.body);

    return `cache:${method}:${url}:${userId || 'anonymous'}:${queryParams}:${bodyParams}`;
  }

  private shouldCache(result: any, options: CacheOptions, args: any[]): boolean {
    if (options.condition) {
      return options.condition(result, args);
    }

    // Don't cache error responses or empty results
    if (!result || (result.success === false)) {
      return false;
    }

    return true;
  }

  private async setCacheTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `cache:tag:${tag}`;
      const tagMembers = await this.cacheService.get(tagKey) || [];
      if (!tagMembers.includes(key)) {
        tagMembers.push(key);
        await this.cacheService.set(tagKey, tagMembers, 3600); // 1 hour TTL for tags
      }
    }
  }

  // Method to invalidate cache by tags
  async invalidateCacheTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `cache:tag:${tag}`;
      const tagMembers = await this.cacheService.get(tagKey) || [];

      for (const key of tagMembers) {
        await this.cacheService.del(key);
      }

      await this.cacheService.del(tagKey);
    }
  }
}