import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface DeprecatedEndpoint {
  path: string;
  method: string;
  sunsetDate: string;
  replacement?: string;
  notice?: string;
}

@Injectable()
export class ApiSunsetMiddleware implements NestMiddleware {
  private readonly deprecatedEndpoints: DeprecatedEndpoint[];

  constructor(private configService: ConfigService) {
    this.deprecatedEndpoints = [
      {
        path: '/api/v1/legacy/products',
        method: 'GET',
        sunsetDate: '2024-12-31',
        replacement: '/api/v1/products',
        notice: 'This endpoint will be removed on 2024-12-31. Please use /api/v1/products instead.',
      },
      {
        path: '/api/v1/legacy/orders',
        method: 'GET',
        sunsetDate: '2024-12-31',
        replacement: '/api/v1/orders',
        notice: 'This endpoint will be removed on 2024-12-31. Please use /api/v1/orders instead.',
      },
      {
        path: '/api/v1/v1/users',
        method: 'GET',
        sunsetDate: '2024-06-30',
        replacement: '/api/v1/users',
        notice: 'This endpoint will be removed on 2024-06-30. Please use /api/v1/users instead.',
      },
    ];
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const { path, method } = req;
    
    // Check if the endpoint is deprecated
    const deprecatedEndpoint = this.deprecatedEndpoints.find(
      endpoint => endpoint.path === path && endpoint.method.toUpperCase() === method.toUpperCase()
    );

    if (deprecatedEndpoint) {
      const sunsetDate = new Date(deprecatedEndpoint.sunsetDate);
      const now = new Date();
      
      // Add Sunset header
      res.setHeader('Sunset', sunsetDate.toISOString());
      
      // Add Link header for replacement
      if (deprecatedEndpoint.replacement) {
        res.setHeader('Link', `<${deprecatedEndpoint.replacement}>; rel="successor-version"`);
      }
      
      // Add Deprecation header
      res.setHeader('Deprecation', 'true');
      
      // Add custom deprecation notice header
      if (deprecatedEndpoint.notice) {
        res.setHeader('X-Deprecation-Notice', deprecatedEndpoint.notice);
      }
      
      // Add API version header
      res.setHeader('API-Version', '1.0.0');
      
      // Add warning header if sunset date is approaching (within 30 days)
      const daysUntilSunset = Math.ceil((sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilSunset <= 30 && daysUntilSunset > 0) {
        res.setHeader('Warning', `299 - "This endpoint will be removed in ${daysUntilSunset} days"`);
      }
      
      // Log deprecation usage
      console.warn(`Deprecated endpoint accessed: ${method} ${path}`, {
        sunsetDate: deprecatedEndpoint.sunsetDate,
        replacement: deprecatedEndpoint.replacement,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
    }

    // Add general API version header for all requests
    res.setHeader('API-Version', '1.0.0');
    
    // Add API lifecycle status header
    res.setHeader('API-Lifecycle', 'active');
    
    // Add API support information
    res.setHeader('API-Support', 'https://docs.ayaztrade.com/support');
    
    // Add API documentation link
    res.setHeader('API-Docs', 'https://docs.ayaztrade.com/api');
    
    next();
  }

  // Method to add new deprecated endpoints dynamically
  addDeprecatedEndpoint(endpoint: DeprecatedEndpoint): void {
    this.deprecatedEndpoints.push(endpoint);
  }

  // Method to get all deprecated endpoints
  getDeprecatedEndpoints(): DeprecatedEndpoint[] {
    return [...this.deprecatedEndpoints];
  }

  // Method to check if an endpoint is deprecated
  isDeprecated(path: string, method: string): DeprecatedEndpoint | null {
    return this.deprecatedEndpoints.find(
      endpoint => endpoint.path === path && endpoint.method.toUpperCase() === method.toUpperCase()
    ) || null;
  }
}
