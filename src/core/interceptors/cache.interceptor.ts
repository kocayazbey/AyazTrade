import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_KEY, CACHE_OPTIONS_KEY } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private cacheService?: any // Inject cache service
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const isCacheEnabled = this.reflector.getAllAndOverride<boolean>(CACHE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isCacheEnabled || !this.cacheService) {
      return next.handle();
    }

    const cacheOptions = this.reflector.getAllAndOverride<any>(CACHE_OPTIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const cacheKey = this.generateCacheKey(request, cacheOptions);
    
    // Try to get from cache
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      response.setHeader('X-Cache-Status', 'HIT');
      response.setHeader('X-Cache-Key', cacheKey);
      return of(cachedData);
    }

    // Set cache headers
    response.setHeader('X-Cache-Status', 'MISS');
    response.setHeader('X-Cache-Key', cacheKey);

    return next.handle().pipe(
      tap(async (data) => {
        if (data && cacheOptions && typeof cacheOptions === 'object' && 'ttl' in cacheOptions) {
          await this.cacheService.set(cacheKey, data, (cacheOptions as any).ttl);
        }
      })
    );
  }

  private generateCacheKey(request: any, options: any): string {
    const baseKey = options?.key || `${request.method}:${request.url}`;
    const namespace = options?.namespace || 'default';
    const version = options?.version || '1';
    
    return `${namespace}:${version}:${baseKey}`;
  }
}
