import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const allowedOriginsStr = this.configService.get<string>('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5001,http://localhost:5002,https://admin.ayaztrade.com,https://ayaztrade.com,https://b2b.ayaztrade.com');
    const allowedOrigins = allowedOriginsStr.split(',').map(origin => origin.trim());

    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV === 'development') {
      // Allow all origins in development
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'Cache-Control',
      'Pragma',
    ].join(', '));
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  }
}
