import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Security Middleware (e2e)', () => {
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

  describe('Security Headers', () => {
    it('should include security headers', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.headers).toHaveProperty('x-frame-options', 'DENY');
          expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
          expect(res.headers).toHaveProperty('x-xss-protection', '1; mode=block');
          expect(res.headers).toHaveProperty('referrer-policy', 'strict-origin-when-cross-origin');
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('CORS', () => {
    it('should handle preflight requests', () => {
      return request(app.getHttpServer())
        .options('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.headers).toHaveProperty('access-control-allow-methods');
          expect(res.headers).toHaveProperty('access-control-allow-headers');
        });
    });
  });
});
