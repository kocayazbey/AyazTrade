import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || this.generateRequestId();

    // Add request ID to headers
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Log request start
    this.logger.log(
      `Incoming Request: ${req.method} ${req.url}`,
      {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        userId: (req as any).user?.id,
      },
    );

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any) {
      const responseTime = Date.now() - startTime;
      
      // Log response
      const logger = new Logger('HTTP');
      logger.log(
        `Response: ${req.method} ${req.url} - ${res.statusCode}`,
        {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime: `${responseTime}ms`,
          contentLength: res.getHeader('content-length'),
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          userId: (req as any).user?.id,
        },
      );

      // Call original end method
      originalEnd.call(this, chunk, encoding);
    };

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
