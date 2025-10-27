import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';

    // Content Security Policy (CSP) with nonce support
    const nonce = crypto.randomBytes(16).toString('base64');
    const cspDirectives = [
      "default-src 'self'",
      isProduction 
        ? `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net https://unpkg.com`
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https: http:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https: wss: ws:",
      "frame-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ];

    if (isProduction) {
      res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    } else {
      // More relaxed CSP for development
      res.setHeader('Content-Security-Policy-Report-Only', cspDirectives.join('; '));
    }

    // HTTP Strict Transport Security (HSTS)
    if (isProduction) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    const permissionsPolicy = [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ];
    res.setHeader('Permissions-Policy', permissionsPolicy.join(', '));

    // Cross-Origin Policies - Relaxed for development
    if (isProduction) {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }

    // Feature Policy (deprecated but still supported)
    const featurePolicy = [
      'camera "none"',
      'microphone "none"',
      'geolocation "self"',
      'payment "self"',
      'usb "none"',
    ];
    res.setHeader('Feature-Policy', featurePolicy.join('; '));

    // Cache Control for sensitive endpoints
    if (req.path.includes('/api/') && req.method !== 'GET') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Add custom security headers
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // API-specific headers
    if (req.path.startsWith('/api/')) {
      res.setHeader('X-API-Version', '1.0.0');
      res.setHeader('X-Request-ID', req.headers['x-request-id'] || 'unknown');
    }

    // Add nonce to response for frontend use
    if (isProduction) {
      res.setHeader('X-Nonce', nonce);
    }

    next();
  }
}
