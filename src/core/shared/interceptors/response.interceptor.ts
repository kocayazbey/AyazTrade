import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface Response<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string || this.generateRequestId();
    
    return next.handle().pipe(
      map((data) => {
        // If data already has success property, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
              version: '1.0.0',
            },
          };
        }

        // Wrap data in standard response format
        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            version: '1.0.0',
          },
        };
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
