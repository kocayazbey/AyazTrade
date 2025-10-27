import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TelemetryService } from './telemetry.service';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(private telemetryService: TelemetryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Generate request ID
    const requestId = this.telemetryService.generateRequestId();
    
    // Set request ID in headers
    request.headers['x-request-id'] = requestId;
    response.setHeader('x-request-id', requestId);
    
    // Set request ID in context
    this.telemetryService.setRequestId(requestId);
    
    return next.handle().pipe(
      tap(() => {
        // Log request completion
        console.log(`Request ${requestId} completed`);
      })
    );
  }
}
