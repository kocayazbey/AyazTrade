import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Generate or use existing request ID
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    
    // Set request ID in request object
    (req as any).requestId = requestId;
    
    // Set request ID in response headers
    res.setHeader('X-Request-ID', requestId);
    
    // Set request ID in request headers for downstream services
    req.headers['x-request-id'] = requestId;
    
    next();
  }
}
