import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as DOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

@Injectable()
export class RequestSanitizerMiddleware implements NestMiddleware {
  private readonly window: any;
  private readonly purify: any;

  constructor(private configService: ConfigService) {
    // Initialize DOMPurify for server-side sanitization
    const window = new JSDOM('').window;
    this.window = window;
    this.purify = DOMPurify(window);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = this.sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = this.sanitizeObject(req.params);
    }

    // Sanitize headers
    this.sanitizeHeaders(req);

    next();
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key
        const sanitizedKey = this.sanitizeString(key);
        
        // Sanitize value
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }

    // Remove null bytes
    str = str.replace(/\0/g, '');

    // Remove control characters except newlines and tabs
    str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Sanitize HTML content
    str = this.purify.sanitize(str, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });

    // SQL injection protection is handled at the database layer with parameterized queries

    // Remove potential XSS patterns
    str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    str = str.replace(/javascript:/gi, '');
    str = str.replace(/on\w+\s*=/gi, '');

    // Trim whitespace
    str = str.trim();

    // Limit length
    const maxLength = this.configService.get<number>('MAX_INPUT_LENGTH', 10000);
    if (str.length > maxLength) {
      str = str.substring(0, maxLength);
    }

    return str;
  }

  private sanitizeHeaders(req: Request): void {
    const dangerousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-forwarded-proto',
      'x-forwarded-host',
    ];

    dangerousHeaders.forEach(header => {
      if (req.headers[header]) {
        const value = Array.isArray(req.headers[header]) 
          ? req.headers[header][0] 
          : req.headers[header];
        
        if (typeof value === 'string') {
          req.headers[header] = this.sanitizeString(value);
        }
      }
    });
  }
}
