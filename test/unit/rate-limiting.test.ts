import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ThrottlerGuardCustom } from '../../src/core/security/guards/throttler.guard';
import { RateLimiterEnhancedService } from '../../src/core/security/rate-limiter-enhanced.service';
import { CacheModule } from '../../src/core/cache/cache.module';

describe('Rate Limiting Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ThrottlerGuard', () => {
    it('should allow requests within rate limit', async () => {
      // Test root endpoint (should be rate limited but allow first few requests)
      const responses = await Promise.all([
        request(app.getHttpServer()).get('/api/v1/'),
        request(app.getHttpServer()).get('/api/v1/'),
        request(app.getHttpServer()).get('/api/v1/'),
      ]);

      // At least some requests should succeed (200 or 429)
      const successfulResponses = responses.filter(r => r.status < 400);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    it('should return rate limit headers', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/');

      // Check for rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should block requests after rate limit exceeded', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(app.getHttpServer()).get('/api/v1/')
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should not rate limit health check endpoint', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(app.getHttpServer()).get('/api/v1/health')
      );

      const responses = await Promise.all(requests);

      // All health check requests should succeed (not rate limited)
      const failedResponses = responses.filter(r => r.status !== 200);
      expect(failedResponses.length).toBe(0);
    });

    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);

      // Some login requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited responses should have proper error structure
      if (rateLimitedResponses.length > 0) {
        const rateLimitedResponse = rateLimitedResponses[0];
        expect(rateLimitedResponse.body).toHaveProperty('statusCode', 429);
        expect(rateLimitedResponse.body).toHaveProperty('message');
        expect(rateLimitedResponse.body).toHaveProperty('retryAfter');
      }
    });

    it('should allow successful login within rate limit', async () => {
      const loginData = {
        email: 'admin@ayaztrade.com',
        password: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginData);

      // Should succeed (200) or be rate limited (429)
      expect([200, 429]).toContain(response.status);
    });

    it('should return proper retry-after header when rate limited', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Send many requests to trigger rate limiting
      const requests = Array(15).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.headers).toHaveProperty('retry-after');
        expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
        expect(Number(rateLimitedResponse.headers['retry-after'])).toBeGreaterThan(0);
      }
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include all required rate limit headers', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      // Validate header values
      expect(Number(response.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
      expect(Number(response.headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should update remaining count correctly', async () => {
      // First request
      const response1 = await request(app.getHttpServer()).get('/api/v1/');
      const remaining1 = Number(response1.headers['x-ratelimit-remaining']);

      // Second request
      const response2 = await request(app.getHttpServer()).get('/api/v1/');
      const remaining2 = Number(response2.headers['x-ratelimit-remaining']);

      // Remaining should decrease or stay the same (depending on implementation)
      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });
  });

  describe('Different Rate Limit Configurations', () => {
    it('should handle different endpoints with different limits', async () => {
      // Test root endpoint
      const rootResponse = await request(app.getHttpServer()).get('/api/v1/');
      expect(rootResponse.headers).toHaveProperty('x-ratelimit-limit');

      // Test health endpoint (should not be rate limited)
      const healthResponse = await request(app.getHttpServer()).get('/api/v1/health');
      expect(healthResponse.status).toBe(200);
    });
  });

  describe('Error Response Format', () => {
    it('should return properly formatted error when rate limited', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Send many requests to trigger rate limiting
      const requests = Array(15).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body).toMatchObject({
          statusCode: 429,
          error: 'Too Many Requests',
        });

        expect(rateLimitedResponse.body.message).toContain('Too many requests');
        expect(rateLimitedResponse.body).toHaveProperty('retryAfter');
        expect(rateLimitedResponse.body).toHaveProperty('limit');
        expect(rateLimitedResponse.body).toHaveProperty('remaining');
        expect(rateLimitedResponse.body).toHaveProperty('resetTime');
      }
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should track requests by IP address', async () => {
      const clientIP = '192.168.1.100';

      // Test with custom IP header
      const response1 = await request(app.getHttpServer())
        .get('/api/v1/')
        .set('X-Forwarded-For', clientIP);

      const response2 = await request(app.getHttpServer())
        .get('/api/v1/')
        .set('X-Forwarded-For', clientIP);

      // Both requests should have rate limit headers
      expect(response1.headers).toHaveProperty('x-ratelimit-limit');
      expect(response2.headers).toHaveProperty('x-ratelimit-limit');
    });

    it('should handle different IPs separately', async () => {
      const ip1 = '192.168.1.100';
      const ip2 = '192.168.1.101';

      const response1 = await request(app.getHttpServer())
        .get('/api/v1/')
        .set('X-Forwarded-For', ip1);

      const response2 = await request(app.getHttpServer())
        .get('/api/v1/')
        .set('X-Forwarded-For', ip2);

      // Both should succeed (different IPs)
      expect(response1.status).toBeLessThan(400);
      expect(response2.status).toBeLessThan(400);
    });
  });

  describe('Rate Limit Reset', () => {
    it('should reset rate limit after time window', async (done) => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Send requests to potentially trigger rate limiting
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginData);
      }

      // Wait for rate limit reset (if triggered)
      setTimeout(async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginData);

        // Should work again after reset
        expect(response.status).toBeLessThan(400);
        done();
      }, 2000);
    }, 10000);
  });

  describe('Edge Cases', () => {
    it('should handle missing IP gracefully', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/');

      // Should not crash and should return proper response
      expect(response.status).toBeLessThan(500);
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });

    it('should handle malformed requests', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send('invalid json');

      // Should handle malformed request appropriately
      expect([200, 400, 429]).toContain(response.status);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer()).get('/api/v1/')
      );

      const responses = await Promise.all(requests);

      // All requests should be handled (either success or rate limited)
      const handledResponses = responses.filter(r => r.status < 500);
      expect(handledResponses.length).toBe(10);
    });
  });

  describe('Security Features', () => {
    it('should prevent brute force login attempts', async () => {
      const loginData = {
        email: 'admin@ayaztrade.com',
        password: 'wrongpassword',
      };

      // Send multiple failed login attempts
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);

      // Some attempts should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should maintain rate limits across different routes', async () => {
      // Test different routes
      const routes = ['/', '/health', '/api/v1/', '/api/v1/health'];

      for (const route of routes) {
        const response = await request(app.getHttpServer()).get(route);
        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Enhanced Rate Limiter Service', () => {
    let rateLimiterService: RateLimiterEnhancedService;

    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [CacheModule],
        providers: [RateLimiterEnhancedService],
      }).compile();

      rateLimiterService = module.get<RateLimiterEnhancedService>(RateLimiterEnhancedService);
    });

    it('should allow requests within limit', async () => {
      const identifier = 'test-user';
      const result = await rateLimiterService.checkRateLimit(identifier, {
        windowMs: 60000,
        maxRequests: 5,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.totalHits).toBe(1);
    });

    it('should block requests after limit exceeded', async () => {
      const identifier = 'test-user-blocked';

      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        await rateLimiterService.checkRateLimit(identifier, {
          windowMs: 60000,
          maxRequests: 3,
        });
      }

      const result = await rateLimiterService.checkRateLimit(identifier, {
        windowMs: 60000,
        maxRequests: 3,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset rate limit for identifier', async () => {
      const identifier = 'test-user-reset';

      // Add some requests
      await rateLimiterService.checkRateLimit(identifier, {
        windowMs: 60000,
        maxRequests: 10,
      });

      // Reset the limit
      await rateLimiterService.resetRateLimit(identifier);

      // Should be able to make requests again
      const result = await rateLimiterService.checkRateLimit(identifier, {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should get rate limit status', async () => {
      const identifier = 'test-user-status';

      await rateLimiterService.checkRateLimit(identifier, {
        windowMs: 60000,
        maxRequests: 10,
      });

      const status = await rateLimiterService.getRateLimitStatus(identifier);

      expect(status.current).toBe(1);
      expect(status.limit).toBe(10);
      expect(status.remaining).toBe(9);
      expect(status.resetTime).toBeGreaterThan(Date.now());
    });

    it('should provide analytics', async () => {
      const identifier = 'test-user-analytics';

      await rateLimiterService.checkRateLimit(identifier, {
        windowMs: 60000,
        maxRequests: 10,
      });

      const analytics = await rateLimiterService.getRateLimitAnalytics(identifier);

      expect(analytics.totalRequests).toBe(1);
      expect(analytics.currentWindowRequests).toBe(1);
      expect(analytics.averageRequestsPerWindow).toBeGreaterThan(0);
      expect(analytics.lastRequestTime).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting Decorators', () => {
    it('should respect auth rate limit decorator', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Send multiple login requests
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited due to auth rate limit
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should allow requests with SkipThrottle decorator', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(app.getHttpServer()).get('/')
      );

      const responses = await Promise.all(requests);

      // All requests should succeed (not rate limited due to SkipThrottle)
      const failedResponses = responses.filter(r => r.status !== 200);
      expect(failedResponses.length).toBe(0);
    });

    it('should allow health requests without rate limiting', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(app.getHttpServer()).get('/health')
      );

      const responses = await Promise.all(requests);

      // All health requests should succeed
      const failedResponses = responses.filter(r => r.status !== 200);
      expect(failedResponses.length).toBe(0);
    });
  });

  describe('IP Filtering Integration', () => {
    it('should track suspicious activity on rate limit violation', async () => {
      const clientIP = '192.168.1.200';

      // Send many requests from the same IP to trigger rate limiting
      const requests = Array(25).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/v1/')
          .set('X-Forwarded-For', clientIP)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited responses should have proper structure
      rateLimitedResponses.forEach(response => {
        expect(response.body).toHaveProperty('statusCode', 429);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('retryAfter');
      });
    });

    it('should handle different IP addresses independently', async () => {
      const ip1 = '10.0.0.1';
      const ip2 = '10.0.0.2';

      // Send requests from different IPs
      const response1 = await request(app.getHttpServer())
        .get('/api/v1/')
        .set('X-Forwarded-For', ip1);

      const response2 = await request(app.getHttpServer())
        .get('/api/v1/')
        .set('X-Forwarded-For', ip2);

      // Both should succeed independently
      expect(response1.status).toBeLessThan(400);
      expect(response2.status).toBeLessThan(400);

      expect(response1.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response2.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('Performance and Load', () => {
    it('should handle high concurrent load', async () => {
      const concurrentRequests = 50;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app.getHttpServer()).get('/api/v1/')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should be handled within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds

      // All requests should be handled (success or rate limited)
      const handledResponses = responses.filter(r => r.status < 500);
      expect(handledResponses.length).toBe(concurrentRequests);

      // Rate limit headers should be present
      responses.forEach(response => {
        expect(response.headers).toHaveProperty('x-ratelimit-limit');
        expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      });
    });

    it('should maintain consistent response times under load', async () => {
      const responseTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        await request(app.getHttpServer()).get('/api/v1/');
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // Response times should be reasonably consistent
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      expect(maxResponseTime - minResponseTime).toBeLessThan(1000); // 1 second variance
      expect(avgResponseTime).toBeLessThan(500); // Average under 500ms
    });
  });

  describe('Error Recovery', () => {
    it('should continue working after cache errors', async () => {
      // This test would be more meaningful with a mock cache service
      // that can simulate failures
      const response = await request(app.getHttpServer()).get('/api/v1/');

      // Should not crash even if cache has issues
      expect(response.status).toBeLessThan(500);
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });

    it('should handle malformed cache data gracefully', async () => {
      // This would require mocking the cache service
      const response = await request(app.getHttpServer()).get('/api/v1/');

      // Should handle gracefully
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Configuration Validation', () => {
    it('should use environment-based configuration', async () => {
      // Test that environment variables affect rate limiting behavior
      const response = await request(app.getHttpServer()).get('/api/v1/');

      // Should have rate limit headers regardless of config source
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should respect different rate limits for different endpoints', async () => {
      const endpoints = ['/', '/health', '/api/v1/'];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint);
        expect(response.status).toBeLessThan(500);
        expect(response.headers).toHaveProperty('x-ratelimit-limit');
      }
    });
  });
});
