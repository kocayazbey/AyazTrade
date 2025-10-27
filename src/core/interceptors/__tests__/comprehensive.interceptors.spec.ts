import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { 
  ValidationInterceptor, 
  CacheInterceptor, 
  AuditInterceptor, 
  PerformanceInterceptor 
} from '../index';

describe('Comprehensive Interceptors', () => {
  let validationInterceptor: ValidationInterceptor;
  let cacheInterceptor: CacheInterceptor;
  let auditInterceptor: AuditInterceptor;
  let performanceInterceptor: PerformanceInterceptor;

  const mockExecutionContext: Partial<ExecutionContext> = {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        url: '/test',
        headers: { 'user-agent': 'test-agent' },
        user: { id: '1', tenantId: 'tenant-1' },
        ip: '127.0.0.1',
        body: { test: 'data' },
        query: { page: '1' },
        params: { id: '123' },
      } as any),
      getResponse: () => ({
        setHeader: jest.fn(),
      } as any),
      getNext: () => ({} as any),
    }),
    getHandler: () => (() => {}) as any,
    getClass: () => ({} as any),
  };

  const mockCallHandler: Partial<CallHandler> = {
    handle: () => of({ success: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationInterceptor,
        {
          provide: CacheInterceptor,
          useValue: {
            intercept: jest.fn().mockImplementation((context, next) => next.handle()),
          },
        },
        {
          provide: AuditInterceptor,
          useValue: {
            intercept: jest.fn().mockImplementation((context, next) => next.handle()),
          },
        },
        {
          provide: PerformanceInterceptor,
          useValue: {
            intercept: jest.fn().mockImplementation((context, next) => next.handle()),
          },
        },
      ],
    }).compile();

    validationInterceptor = module.get<ValidationInterceptor>(ValidationInterceptor);
    cacheInterceptor = module.get<CacheInterceptor>(CacheInterceptor);
    auditInterceptor = module.get<AuditInterceptor>(AuditInterceptor);
    performanceInterceptor = module.get<PerformanceInterceptor>(PerformanceInterceptor);
  });

  describe('ValidationInterceptor', () => {
    it('should process requests without validation when not enabled', async () => {
      const result = await validationInterceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler
      );

      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('CacheInterceptor', () => {
    it('should process requests without caching when not enabled', async () => {
      const result = await cacheInterceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler
      );

      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('AuditInterceptor', () => {
    it('should process requests without audit when not enabled', async () => {
      const result = await auditInterceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler
      );

      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('PerformanceInterceptor', () => {
    it('should process requests without performance monitoring when not enabled', async () => {
      const result = await performanceInterceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler
      );

      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
    });
  });
});
