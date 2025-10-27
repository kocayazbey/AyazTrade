import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger, SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

export const CSRF_SKIP_KEY = 'csrf_skip';
export const RequireCsrfProtection = () => SetMetadata('requireCsrf', true);

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly csrfTokenHeader = 'x-csrf-token';
  private readonly csrfTokenBodyField = '_csrf';

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Check if CSRF protection is required for this endpoint
    const requireCsrf = this.reflector.getAllAndOverride<boolean>('requireCsrf', [
      context.getHandler(),
      context.getClass(),
    ]);

    // If CSRF protection is not explicitly required, skip it
    // Token-based authentication APIs typically don't need CSRF protection
    if (!requireCsrf) {
      return true;
    }

    // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // Get CSRF token from header or body
    const csrfToken = request.headers[this.csrfTokenHeader] || 
                      request.headers[this.csrfTokenHeader.toLowerCase()] ||
                      request.body?.[this.csrfTokenBodyField];

    // Get session token
    const sessionToken = request.session?.csrfToken || request.session?.csrf;

    // Validate CSRF token
    if (!csrfToken) {
      this.logger.warn('CSRF token missing', {
        path: request.path,
        method: request.method,
      });
      throw new ForbiddenException('CSRF token is required');
    }

    if (!sessionToken) {
      this.logger.warn('CSRF session token missing', {
        path: request.path,
        method: request.method,
      });
      throw new ForbiddenException('CSRF session token is missing');
    }

    if (csrfToken !== sessionToken) {
      this.logger.warn('CSRF token mismatch', {
        path: request.path,
        method: request.method,
      });
      throw new ForbiddenException('Invalid CSRF token');
    }

    this.logger.debug('CSRF token validated successfully', {
      path: request.path,
      method: request.method,
    });

    return true;
  }
}
