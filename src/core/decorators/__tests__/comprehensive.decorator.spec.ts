import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { 
  Comprehensive, 
  ComprehensiveGet, 
  ComprehensivePost, 
  ComprehensivePut,
  ComprehensiveDelete,
  ComprehensiveAdmin,
  ComprehensivePublic 
} from '../comprehensive.decorator';

describe('Comprehensive Decorators', () => {
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Reflector],
    }).compile();

    reflector = module.get<Reflector>(Reflector);
  });

  describe('Comprehensive', () => {
    it('should apply comprehensive decorators with default options', () => {
      class TestController {
        @Comprehensive()
        testMethod() {}
      }

      const metadata = reflector.get('comprehensive', TestController.prototype.testMethod);
      expect(metadata).toBeDefined();
    });

    it('should apply comprehensive decorators with custom options', () => {
      class TestController {
        @Comprehensive({
          auditAction: 'test',
          auditResource: 'test-resource',
          auditLevel: 'high',
          cacheTtl: 600,
          rateLimitMax: 50,
          securityLevel: 'high',
          tags: ['test', 'comprehensive'],
          summary: 'Test endpoint',
          description: 'Test endpoint description',
        })
        testMethod() {}
      }

      const metadata = reflector.get('comprehensive', TestController.prototype.testMethod);
      expect(metadata).toBeDefined();
    });
  });

  describe('ComprehensiveGet', () => {
    it('should apply GET-specific comprehensive decorators', () => {
      class TestController {
        @ComprehensiveGet({
          auditAction: 'read',
          auditResource: 'resource',
          cacheTtl: 300,
        })
        testMethod() {}
      }

      const metadata = reflector.get('comprehensive', TestController.prototype.testMethod);
      expect(metadata).toBeDefined();
      expect(metadata.auditAction).toBe('read');
    });
  });

  describe('ComprehensivePost', () => {
    it('should apply POST-specific comprehensive decorators', () => {
      class TestController {
        @ComprehensivePost({
          auditAction: 'create',
          auditResource: 'resource',
          cacheTtl: 0,
          rateLimitMax: 10,
        })
        testMethod() {}
      }

      const metadata = reflector.get('comprehensive', TestController.prototype.testMethod);
      expect(metadata).toBeDefined();
      expect(metadata.auditAction).toBe('create');
      expect(metadata.cacheTtl).toBe(0);
    });
  });

  describe('ComprehensivePut', () => {
    it('should apply PUT-specific comprehensive decorators', () => {
      class TestController {
        @ComprehensivePut({
          auditAction: 'update',
          auditResource: 'resource',
        })
        testMethod() {}
      }

      const metadata = reflector.get('comprehensive', TestController.prototype.testMethod);
      expect(metadata).toBeDefined();
      expect(metadata.auditAction).toBe('update');
    });
  });

  describe('ComprehensiveDelete', () => {
    it('should apply DELETE-specific comprehensive decorators', () => {
      class TestController {
        @ComprehensiveDelete({
          auditAction: 'delete',
          auditResource: 'resource',
        })
        testMethod() {}
      }

      const metadata = reflector.get('comprehensive', TestController.prototype.testMethod);
      expect(metadata).toBeDefined();
      expect(metadata.auditAction).toBe('delete');
    });
  });

  describe('ComprehensiveAdmin', () => {
    it('should apply admin-specific comprehensive decorators', () => {
      class TestController {
        @ComprehensiveAdmin({
          auditAction: 'admin',
          auditResource: 'admin-resource',
        })
        testMethod() {}
      }

      const metadata = reflector.get('comprehensive', TestController.prototype.testMethod);
      expect(metadata).toBeDefined();
      expect(metadata.auditAction).toBe('admin');
      expect(metadata.auditLevel).toBe('high');
      expect(metadata.securityLevel).toBe('high');
    });
  });

  describe('ComprehensivePublic', () => {
    it('should apply public-specific comprehensive decorators', () => {
      class TestController {
        @ComprehensivePublic({
          auditAction: 'public',
          auditResource: 'public-resource',
        })
        testMethod() {}
      }

      const metadata = reflector.get('comprehensive', TestController.prototype.testMethod);
      expect(metadata).toBeDefined();
      expect(metadata.auditAction).toBe('public');
      expect(metadata.auditLevel).toBe('low');
      expect(metadata.securityLevel).toBe('low');
      expect(metadata.requireAuth).toBe(false);
    });
  });
});
