import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { VALIDATION_KEY, VALIDATION_OPTIONS_KEY } from '../decorators/validation.decorator';

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const isValidationEnabled = this.reflector.getAllAndOverride<boolean>(VALIDATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isValidationEnabled) {
      return next.handle();
    }

    const validationOptions = this.reflector.getAllAndOverride<any>(VALIDATION_OPTIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Add validation metadata to request
    request.validationOptions = validationOptions || {};
    request.validationEnabled = true;

    return next.handle().pipe(
      tap((data) => {
        // Post-processing validation if needed
        if (validationOptions && typeof validationOptions === 'object' && 'postValidation' in validationOptions) {
          this.performPostValidation(data, validationOptions);
        }
      })
    );
  }

  private performPostValidation(data: any, options: any) {
    // Implement post-validation logic
    if (options.sanitize && data) {
      this.sanitizeData(data);
    }
  }

  private sanitizeData(data: any) {
    // Implement data sanitization
    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        if (typeof data[key] === 'string') {
          data[key] = data[key].trim();
        }
      }
    }
  }
}
