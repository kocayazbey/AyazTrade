import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AUDIT_KEY, AUDIT_OPTIONS_KEY } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService?: any // Inject audit service
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const isAuditEnabled = this.reflector.getAllAndOverride<boolean>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isAuditEnabled || !this.auditService) {
      return next.handle();
    }

    const auditOptions = this.reflector.getAllAndOverride<any>(AUDIT_OPTIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const startTime = Date.now();
    const auditId = this.generateAuditId();

    // Set audit headers
    response.setHeader('X-Audit-ID', auditId);
    response.setHeader('X-Audit-Level', (auditOptions as any)?.level || 'medium');

    return next.handle().pipe(
      tap((data) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.logAuditEvent({
          auditId,
          action: (auditOptions as any)?.action || 'unknown',
          resource: (auditOptions as any)?.resource || 'unknown',
          level: (auditOptions as any)?.level || 'medium',
          request: this.sanitizeRequest(request, auditOptions),
          response: this.sanitizeResponse(data, auditOptions),
          duration,
          timestamp: new Date().toISOString(),
          user: request.user,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          ...(auditOptions as any)?.customFields,
        });
      }),
      catchError((error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.logAuditEvent({
          auditId,
          action: (auditOptions as any)?.action || 'unknown',
          resource: (auditOptions as any)?.resource || 'unknown',
          level: (auditOptions as any)?.level || 'medium',
          request: this.sanitizeRequest(request, auditOptions),
          error: error.message,
          duration,
          timestamp: new Date().toISOString(),
          user: request.user,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          ...(auditOptions as any)?.customFields,
        });
        
        throw error;
      })
    );
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeRequest(request: any, options: any): any {
    const sanitized = {
      method: request.method,
      url: request.url,
      headers: options?.includeHeaders ? request.headers : {},
      body: options?.includeRequest ? request.body : {},
      query: request.query,
      params: request.params,
    };

    if (options?.maskFields) {
      this.maskFields(sanitized, options.maskFields);
    }

    return sanitized;
  }

  private sanitizeResponse(data: any, options: any): any {
    if (!options?.includeResponse) {
      return { masked: true };
    }

    const sanitized = { ...data };
    
    if (options?.maskFields) {
      this.maskFields(sanitized, options.maskFields);
    }

    return sanitized;
  }

  private maskFields(obj: any, fields: string[]): void {
    for (const field of fields) {
      if (obj[field]) {
        obj[field] = '***MASKED***';
      }
    }
  }

  private logAuditEvent(auditData: any): void {
    if (this.auditService) {
      this.auditService.log(auditData);
    } else {
      console.log('AUDIT:', JSON.stringify(auditData, null, 2));
    }
  }
}
