# Rate Limiting Implementation Guide

## Overview

This document describes the comprehensive rate limiting implementation for the AyazTrade platform. The system provides multiple layers of protection against abuse, including IP-based filtering, endpoint-specific limits, and advanced analytics.

## Architecture

### Core Components

1. **RateLimiterEnhancedService** - Main rate limiting service with advanced features
2. **EnhancedThrottlerGuard** - Global guard that applies rate limiting to all endpoints
3. **RateLimitGuard** - Decorator-based guard for endpoint-specific limits
4. **RateLimitMiddleware** - Middleware for legacy compatibility and additional filtering
5. **IPFilterService** - IP-based access control and suspicious activity tracking

### Service Hierarchy

```
┌─────────────────────────────────────────┐
│           SecurityModule                │
│  ┌─────────────────────────────────────┐ │
│  │      EnhancedThrottlerGuard        │ │  ← Global Guard
│  │  ┌─────────────────────────────────┐ │ │
│  │  │   RateLimiterEnhancedService   │ │ │  ← Core Logic
│  │  │  ┌─────────────────────────────┐ │ │ │
│  │  │  │    Cache/Redis Backend     │ │ │ │
│  │  │  └─────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────┘ │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# Enhanced Rate Limiting Configuration
RATE_LIMIT_DEFAULT_WINDOW_MS=60000
RATE_LIMIT_DEFAULT_MAX=100
RATE_LIMIT_DEFAULT_BLOCK_MS=60000
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_AUTH_BLOCK_MS=900000
RATE_LIMIT_API_WINDOW_MS=60000
RATE_LIMIT_API_MAX=100
RATE_LIMIT_API_BLOCK_MS=300000
RATE_LIMIT_ADMIN_WINDOW_MS=300000
RATE_LIMIT_ADMIN_MAX=50
RATE_LIMIT_ADMIN_BLOCK_MS=600000
RATE_LIMIT_UPLOAD_WINDOW_MS=3600000
RATE_LIMIT_UPLOAD_MAX=20
RATE_LIMIT_UPLOAD_BLOCK_MS=1800000
RATE_LIMIT_SEARCH_WINDOW_MS=60000
RATE_LIMIT_SEARCH_MAX=30
RATE_LIMIT_SEARCH_BLOCK_MS=120000
RATE_LIMIT_PASSWORD_RESET_WINDOW_MS=3600000
RATE_LIMIT_PASSWORD_RESET_MAX=3
RATE_LIMIT_PASSWORD_RESET_BLOCK_MS=3600000
RATE_LIMIT_EMAIL_VERIFICATION_WINDOW_MS=60000
RATE_LIMIT_EMAIL_VERIFICATION_MAX=1
RATE_LIMIT_EMAIL_VERIFICATION_BLOCK_MS=900000

# IP Filtering Configuration
IP_FILTER_ENABLED=true
IP_WHITELIST=
IP_BLACKLIST=
IP_FILTER_TRACK_SUSPICIOUS=true
```

### Configuration Structure

The rate limiting configuration is defined in `src/config/security.config.ts`:

```typescript
rateLimiting: {
  // Default rate limits
  default: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    blockDuration: 60000, // 1 minute
  },
  // Authentication endpoints
  auth: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5,
    blockDuration: 900000, // 15 minutes
  },
  // API endpoints
  api: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    blockDuration: 300000, // 5 minutes
  },
  // Add more endpoint-specific configurations...
}
```

## Usage

### 1. Global Rate Limiting

All endpoints are automatically protected by the global `EnhancedThrottlerGuard`. No additional configuration is required.

```typescript
@Controller('products')
export class ProductsController {
  @Get()
  async getProducts() {
    // Automatically rate limited
    return this.productsService.findAll();
  }
}
```

### 2. Decorator-Based Rate Limiting

Use decorators for endpoint-specific rate limiting:

```typescript
import { AuthRateLimit, ApiRateLimit, SkipThrottle } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  @AuthRateLimit() // 5 requests per 15 minutes
  async login(@Body() loginDto: LoginDto) {
    // Login logic
  }

  @Get('status')
  @SkipThrottle() // Skip rate limiting
  async getStatus() {
    // Health check logic
  }
}
```

### 3. Custom Rate Limiting

Use the `RateLimit` decorator for custom configurations:

```typescript
import { RateLimit } from '@nestjs/common';

@Controller('api')
export class ApiController {
  @Get('data')
  @RateLimit({
    points: 50,        // 50 requests
    duration: 60,      // per 60 seconds
    blockDuration: 300 // block for 5 minutes if exceeded
  })
  async getData() {
    // API logic
  }
}
```

### 4. Programmatic Rate Limiting

Use the service directly in your business logic:

```typescript
import { RateLimiterEnhancedService } from '../security/rate-limiter-enhanced.service';

@Injectable()
export class CustomService {
  constructor(
    private rateLimiterService: RateLimiterEnhancedService,
  ) {}

  async processRequest(userId: string) {
    const result = await this.rateLimiterService.checkRateLimit(
      `custom:${userId}`,
      {
        windowMs: 60000,
        maxRequests: 10,
      }
    );

    if (!result.allowed) {
      throw new Error('Rate limit exceeded');
    }

    // Continue processing
  }
}
```

## Available Decorators

### Predefined Decorators

- `@AuthRateLimit()` - Authentication endpoints (5 requests/15 minutes)
- `@ApiRateLimit()` - General API endpoints (100 requests/minute)
- `@StrictRateLimit()` - Strict limits (10 requests/minute)
- `@UploadRateLimit()` - File uploads (20 uploads/hour)
- `@SearchRateLimit()` - Search endpoints (30 searches/minute)
- `@SkipThrottle()` - Skip rate limiting for specific endpoints

### Custom Decorator

```typescript
@RateLimit({
  points: 100,        // Number of requests
  duration: 60,       // Time window in seconds
  blockDuration: 300, // Block duration in seconds (optional)
  keyGenerator: (context) => {
    // Custom key generation logic
    const request = context.switchToHttp().getRequest();
    return `${request.user.id}:${request.ip}`;
  }
})
```

## Response Headers

All rate-limited responses include standard headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-01-27T10:30:00.000Z
X-RateLimit-Window: 60
Retry-After: 300 (when rate limited)
```

## Advanced Features

### 1. IP Filtering

The system includes IP-based filtering with whitelist/blacklist support:

```typescript
// Enable IP filtering
IP_FILTER_ENABLED=true

// Whitelist specific IPs (comma-separated)
IP_WHITELIST=192.168.1.1,10.0.0.1

// Blacklist malicious IPs (comma-separated)
IP_BLACKLIST=192.168.1.100,10.0.0.100
```

### 2. Suspicious Activity Tracking

The system automatically tracks and responds to suspicious behavior:

- Multiple rate limit violations from the same IP
- Rapid successive requests
- Attempts to bypass rate limits

### 3. Analytics and Monitoring

Get detailed analytics for any rate limit key:

```typescript
const analytics = await rateLimiterService.getRateLimitAnalytics('user:123');

console.log(analytics);
// {
//   totalRequests: 150,
//   currentWindowRequests: 5,
//   averageRequestsPerWindow: 2.5,
//   peakRequests: 10,
//   lastRequestTime: 1706352000000,
//   blockedCount: 2
// }
```

### 4. Dynamic Configuration

Update rate limiting configuration at runtime:

```typescript
// Update default configuration
rateLimiterService.updateDefaultConfig({
  windowMs: 30000,  // 30 seconds
  maxRequests: 50,
  blockDuration: 60000,
});

// Get current configuration
const config = rateLimiterService.getDefaultConfig();
```

## Error Handling

### Rate Limit Exceeded Response

When rate limits are exceeded, the API returns:

```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in 300 seconds.",
  "error": "Too Many Requests",
  "retryAfter": 300,
  "limit": 100,
  "remaining": 0,
  "resetTime": "2025-01-27T10:35:00.000Z"
}
```

### Fail-Safe Behavior

The rate limiting system is designed to fail open:
- If the cache service is unavailable, requests are allowed
- If configuration is invalid, default limits apply
- All errors are logged but don't break the application

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
npm run test:unit -- --testPathPattern=rate-limiting
```

### Integration Tests

Test rate limiting behavior:

```bash
npm run test:e2e -- --testPathPattern=rate-limiting
```

### Load Testing

Test performance under load:

```bash
npm run test:performance
```

## Monitoring and Alerts

### Metrics

The system exposes Prometheus metrics:

```
# Rate limiting metrics
rate_limit_requests_total{endpoint="/api/v1/products",status="allowed"}
rate_limit_requests_total{endpoint="/api/v1/products",status="blocked"}
rate_limit_current_requests{endpoint="/api/v1/products"}
rate_limit_blocked_ips_total
```

### Logging

All rate limiting events are logged:

```json
{
  "level": "warn",
  "message": "Rate limit exceeded",
  "identifier": "192.168.1.100:user:123",
  "requests": 105,
  "limit": 100,
  "windowMs": 60000,
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### Health Checks

Monitor rate limiting health:

```typescript
// Check if rate limiting is working
const isHealthy = await cacheService.healthCheck();

// Get system statistics
const stats = await rateLimiterService.getSystemStats();
```

## Security Considerations

### 1. IP Spoofing Protection

The system validates and sanitizes IP addresses:
- Supports X-Forwarded-For, X-Real-IP headers
- Falls back to socket remote address
- Handles IPv4 and IPv6 addresses

### 2. Key Generation

Rate limit keys are generated using:
- Client IP address
- User ID (when authenticated)
- Endpoint and method
- Custom key generators for special cases

### 3. Cache Security

Rate limiting data is stored in Redis with:
- TTL-based expiration
- Encrypted connections (when configured)
- Proper key namespacing

## Performance Optimization

### 1. Caching Strategy

- Uses Redis for distributed rate limiting
- Implements sliding window algorithm
- Optimizes cache key structure

### 2. Connection Pooling

- Redis connection pooling for performance
- Proper connection management
- Health checks and reconnection logic

### 3. Memory Management

- Automatic cleanup of expired rate limits
- Configurable cache TTL
- Memory-efficient data structures

## Troubleshooting

### Common Issues

1. **Rate limits not working**
   - Check Redis connectivity
   - Verify configuration values
   - Review cache key generation

2. **High memory usage**
   - Adjust cache TTL values
   - Implement cleanup jobs
   - Monitor Redis memory usage

3. **False positives**
   - Review IP detection logic
   - Check key generation
   - Verify user authentication

### Debug Mode

Enable debug logging:

```typescript
// Set in environment
LOG_LEVEL=debug

// Or programmatically
rateLimiterService.updateDefaultConfig({
  debug: true
});
```

## Migration Guide

### From Basic Throttler

If migrating from `@nestjs/throttler`:

1. Update imports:
```typescript
// Before
import { Throttle } from '@nestjs/throttler';

// After
import { AuthRateLimit, ApiRateLimit } from './security/decorators/rate-limit.decorator';
```

2. Update decorators:
```typescript
// Before
@Throttle(5, 60) // 5 requests per 60 seconds

// After
@AuthRateLimit() // Uses predefined configuration
```

3. Update configuration:
```typescript
// Before
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 10,
})

// After
// Configuration handled in security.config.ts
```

## Best Practices

1. **Use appropriate limits** for different endpoint types
2. **Implement gradual blocking** rather than immediate bans
3. **Monitor and adjust** limits based on usage patterns
4. **Provide clear error messages** to clients
5. **Test thoroughly** under various load conditions
6. **Document rate limits** in your API documentation
7. **Monitor for abuse** and adjust limits accordingly

## API Documentation

Include rate limiting information in your Swagger documentation:

```typescript
@ApiTags('Authentication')
@ApiResponse({
  status: 429,
  description: 'Too many requests',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 429 },
      message: { type: 'string', example: 'Rate limit exceeded' },
      retryAfter: { type: 'number', example: 300 },
    },
  },
})
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @AuthRateLimit()
  async login() {
    // Implementation
  }
}
```

## Support and Maintenance

For issues or questions regarding rate limiting:

1. Check the logs for rate limiting events
2. Monitor Redis performance and memory usage
3. Review configuration and adjust as needed
4. Test changes in a staging environment first
5. Keep dependencies updated for security fixes

---

*This rate limiting implementation provides enterprise-grade protection against abuse while maintaining excellent performance and user experience.*
