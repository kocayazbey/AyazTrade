import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrometheusService } from './prometheus.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly prometheusService: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, route } = request;
    const routePath = route?.path || request.url;
    
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap({
        next: (data) => {
          const status = context.switchToHttp().getResponse().statusCode || 200;
          const duration = (Date.now() - startTime) / 1000;
          this.prometheusService.recordHttpRequest(method, routePath, status, duration);
        },
        error: (error) => {
          const status = error.status || 500;
          const duration = (Date.now() - startTime) / 1000;
          this.prometheusService.recordHttpRequest(method, routePath, status, duration);
        },
      }),
    );
  }
}
