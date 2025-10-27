import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ComprehensiveValidation, ValidateError } from './validation.decorator';
import { ComprehensiveCache } from './cache.decorator';
import { ComprehensiveRateLimit } from './rate-limit.decorator';
import { ComprehensiveAudit } from './audit.decorator';
import { ComprehensivePerformance } from './performance.decorator';
import { ComprehensiveSecurity } from './security.decorator';

export interface ComprehensiveOptions {
  // Validation options
  bodyDto?: any;
  queryDto?: any;
  paramDto?: any;
  responseDto?: any;
  validationOptions?: any;
  
  // Cache options
  cacheTtl?: number;
  cacheTags?: string[];
  cacheNamespace?: string;
  cacheVersion?: string;
  cacheOptions?: any;
  
  // Rate limit options
  rateLimitWindow?: number;
  rateLimitMax?: number;
  rateLimitMessage?: string;
  rateLimitOptions?: any;
  
  // Audit options
  auditAction?: string;
  auditResource?: string;
  auditLevel?: 'low' | 'medium' | 'high' | 'critical';
  auditOptions?: any;
  
  // Performance options
  performanceThreshold?: number;
  performanceAlertThreshold?: number;
  performanceOptions?: any;
  
  // Security options
  securityLevel?: 'low' | 'medium' | 'high' | 'critical';
  securityOptions?: any;
  
  // General options
  tags?: string[];
  summary?: string;
  description?: string;
  requireAuth?: boolean;
  version?: string;
}

export const Comprehensive = (options: ComprehensiveOptions = {}) => {
  const {
    bodyDto,
    queryDto,
    paramDto,
    responseDto,
    validationOptions,
    cacheTtl = 300,
    cacheTags = ['default'],
    cacheNamespace,
    cacheVersion,
    cacheOptions,
    rateLimitWindow = 60000,
    rateLimitMax = 100,
    rateLimitMessage,
    rateLimitOptions,
    auditAction = 'access',
    auditResource = 'endpoint',
    auditLevel = 'medium',
    auditOptions,
    performanceThreshold = 1000,
    performanceAlertThreshold = 5000,
    performanceOptions,
    securityLevel = 'medium',
    securityOptions,
    tags = ['comprehensive'],
    summary = 'Comprehensive endpoint',
    description = 'This endpoint has comprehensive validation, caching, rate limiting, audit logging, performance monitoring, and security measures',
    requireAuth = true,
    version = '1',
  } = options;

  const decorators = [
    SetMetadata('comprehensive', {
      ...options,
      auditAction,
      auditResource,
      auditLevel,
      cacheTtl,
      rateLimitMax,
      securityLevel,
      tags,
      summary,
      description,
      requireAuth,
      version,
    }),
    ApiTags(tags.join(', ')),
    ApiOperation({ 
      summary, 
      description,
      tags,
    }),
  ];

  // Add authentication if required
  if (requireAuth) {
    decorators.push(ApiBearerAuth());
  }

  // Add comprehensive validation
  decorators.push(
    ComprehensiveValidation(
      bodyDto,
      queryDto,
      paramDto,
      responseDto,
      validationOptions
    )
  );

  // Add comprehensive caching
  decorators.push(
    ComprehensiveCache(
      cacheTtl,
      cacheTags,
      cacheNamespace,
      cacheVersion,
      cacheOptions
    )
  );

  // Add comprehensive rate limiting
  decorators.push(
    ComprehensiveRateLimit(
      rateLimitWindow,
      rateLimitMax,
      rateLimitMessage,
      rateLimitOptions
    )
  );

  // Add comprehensive audit logging
  decorators.push(
    ComprehensiveAudit(
      auditAction,
      auditResource,
      auditLevel,
      auditOptions
    )
  );

  // Add comprehensive performance monitoring
  decorators.push(
    ComprehensivePerformance(
      performanceThreshold,
      performanceAlertThreshold,
      performanceOptions
    )
  );

  // Add comprehensive security
  decorators.push(
    ComprehensiveSecurity(
      securityLevel,
      securityOptions
    )
  );

  // Add common error responses
  decorators.push(
    ValidateError(400, 'Bad Request - Validation failed'),
    ValidateError(401, 'Unauthorized'),
    ValidateError(403, 'Forbidden'),
    ValidateError(404, 'Not Found'),
    ValidateError(429, 'Too Many Requests'),
    ValidateError(500, 'Internal Server Error'),
  );

  return applyDecorators(...decorators);
};

export const ComprehensiveGet = (options: ComprehensiveOptions = {}) => {
  return Comprehensive({
    ...options,
    auditAction: 'read',
    auditResource: options.auditResource || 'resource',
    summary: options.summary || 'Comprehensive GET endpoint',
    description: options.description || 'GET endpoint with comprehensive features',
  });
};

export const ComprehensivePost = (options: ComprehensiveOptions = {}) => {
  return Comprehensive({
    ...options,
    auditAction: 'create',
    auditResource: options.auditResource || 'resource',
    summary: options.summary || 'Comprehensive POST endpoint',
    description: options.description || 'POST endpoint with comprehensive features',
  });
};

export const ComprehensivePut = (options: ComprehensiveOptions = {}) => {
  return Comprehensive({
    ...options,
    auditAction: 'update',
    auditResource: options.auditResource || 'resource',
    summary: options.summary || 'Comprehensive PUT endpoint',
    description: options.description || 'PUT endpoint with comprehensive features',
  });
};

export const ComprehensivePatch = (options: ComprehensiveOptions = {}) => {
  return Comprehensive({
    ...options,
    auditAction: 'update',
    auditResource: options.auditResource || 'resource',
    summary: options.summary || 'Comprehensive PATCH endpoint',
    description: options.description || 'PATCH endpoint with comprehensive features',
  });
};

export const ComprehensiveDelete = (options: ComprehensiveOptions = {}) => {
  return Comprehensive({
    ...options,
    auditAction: 'delete',
    auditResource: options.auditResource || 'resource',
    summary: options.summary || 'Comprehensive DELETE endpoint',
    description: options.description || 'DELETE endpoint with comprehensive features',
  });
};

export const ComprehensiveAdmin = (options: ComprehensiveOptions = {}) => {
  return Comprehensive({
    ...options,
    auditAction: 'admin',
    auditResource: options.auditResource || 'admin',
    auditLevel: 'high',
    securityLevel: 'high',
    tags: ['admin', 'comprehensive'],
    summary: options.summary || 'Comprehensive Admin endpoint',
    description: options.description || 'Admin endpoint with comprehensive features',
  });
};

export const ComprehensivePublic = (options: ComprehensiveOptions = {}) => {
  return Comprehensive({
    ...options,
    auditAction: 'public',
    auditResource: options.auditResource || 'public',
    auditLevel: 'low',
    securityLevel: 'low',
    requireAuth: false,
    tags: ['public', 'comprehensive'],
    summary: options.summary || 'Comprehensive Public endpoint',
    description: options.description || 'Public endpoint with comprehensive features',
  });
};
