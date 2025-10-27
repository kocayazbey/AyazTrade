import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';

export const SECURITY_KEY = 'security';
export const SECURITY_OPTIONS_KEY = 'securityOptions';

export interface SecurityOptions {
  requireAuth?: boolean; // Require authentication
  requireRoles?: string[]; // Required roles
  requirePermissions?: string[]; // Required permissions
  requireScopes?: string[]; // Required OAuth scopes
  requireApiKey?: boolean; // Require API key
  requireIpWhitelist?: boolean; // Require IP whitelist
  requireRateLimit?: boolean; // Require rate limiting
  requireAudit?: boolean; // Require audit logging
  requireEncryption?: boolean; // Require encryption
  requireHttps?: boolean; // Require HTTPS
  requireCors?: boolean; // Require CORS
  requireCsrf?: boolean; // Require CSRF protection
  requireXss?: boolean; // Require XSS protection
  requireSqlInjection?: boolean; // Require SQL injection protection
  requireInputValidation?: boolean; // Require input validation
  requireOutputSanitization?: boolean; // Require output sanitization
  requireHeaders?: Record<string, string>; // Required headers
  requireQueryParams?: string[]; // Required query parameters
  requireBodyFields?: string[]; // Required body fields
  customSecurity?: string[]; // Custom security measures
  tags?: string[]; // Security tags
  category?: string; // Security category
  level?: 'low' | 'medium' | 'high' | 'critical'; // Security level
  metadata?: Record<string, any>; // Additional metadata
}

export const Security = (options?: SecurityOptions) => {
  return applyDecorators(
    SetMetadata(SECURITY_KEY, true),
    SetMetadata(SECURITY_OPTIONS_KEY, options || {}),
  );
};

export const RequireAuth = (options?: Omit<SecurityOptions, 'requireAuth'>) => {
  return Security({ ...options, requireAuth: true });
};

export const RequireRoles = (roles: string[], options?: Omit<SecurityOptions, 'requireRoles'>) => {
  return Security({ ...options, requireRoles: roles });
};

export const RequirePermissions = (permissions: string[], options?: Omit<SecurityOptions, 'requirePermissions'>) => {
  return Security({ ...options, requirePermissions: permissions });
};

export const RequireScopes = (scopes: string[], options?: Omit<SecurityOptions, 'requireScopes'>) => {
  return Security({ ...options, requireScopes: scopes });
};

export const RequireApiKey = (options?: Omit<SecurityOptions, 'requireApiKey'>) => {
  return Security({ ...options, requireApiKey: true });
};

export const RequireIpWhitelist = (options?: Omit<SecurityOptions, 'requireIpWhitelist'>) => {
  return Security({ ...options, requireIpWhitelist: true });
};

export const RequireRateLimit = (options?: Omit<SecurityOptions, 'requireRateLimit'>) => {
  return Security({ ...options, requireRateLimit: true });
};

export const RequireAudit = (options?: Omit<SecurityOptions, 'requireAudit'>) => {
  return Security({ ...options, requireAudit: true });
};

export const RequireEncryption = (options?: Omit<SecurityOptions, 'requireEncryption'>) => {
  return Security({ ...options, requireEncryption: true });
};

export const RequireHttps = (options?: Omit<SecurityOptions, 'requireHttps'>) => {
  return Security({ ...options, requireHttps: true });
};

export const RequireCors = (options?: Omit<SecurityOptions, 'requireCors'>) => {
  return Security({ ...options, requireCors: true });
};

export const RequireCsrf = (options?: Omit<SecurityOptions, 'requireCsrf'>) => {
  return applyDecorators(
    SetMetadata('requireCsrf', true),
    Security({ ...options, requireCsrf: true }),
  );
};

export const RequireXss = (options?: Omit<SecurityOptions, 'requireXss'>) => {
  return Security({ ...options, requireXss: true });
};

export const RequireSqlInjection = (options?: Omit<SecurityOptions, 'requireSqlInjection'>) => {
  return Security({ ...options, requireSqlInjection: true });
};

export const RequireInputValidation = (options?: Omit<SecurityOptions, 'requireInputValidation'>) => {
  return Security({ ...options, requireInputValidation: true });
};

export const RequireOutputSanitization = (options?: Omit<SecurityOptions, 'requireOutputSanitization'>) => {
  return Security({ ...options, requireOutputSanitization: true });
};

export const RequireHeaders = (headers: Record<string, string>, options?: Omit<SecurityOptions, 'requireHeaders'>) => {
  return Security({ ...options, requireHeaders: headers });
};

export const RequireQueryParams = (params: string[], options?: Omit<SecurityOptions, 'requireQueryParams'>) => {
  return Security({ ...options, requireQueryParams: params });
};

export const RequireBodyFields = (fields: string[], options?: Omit<SecurityOptions, 'requireBodyFields'>) => {
  return Security({ ...options, requireBodyFields: fields });
};

export const ComprehensiveSecurity = (
  level: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  additionalOptions?: SecurityOptions
) => {
  const baseOptions = {
    requireAuth: true,
    requireInputValidation: true,
    requireOutputSanitization: true,
    requireHttps: true,
    requireCors: true,
    requireCsrf: true,
    requireXss: true,
    requireSqlInjection: true,
    requireRateLimit: true,
    requireAudit: true,
    requireEncryption: true,
    level,
    ...additionalOptions,
  };

  return applyDecorators(
    Security(baseOptions),
    ApiSecurity('bearer'),
    ApiOperation({ 
      summary: 'Secured endpoint',
      description: `This endpoint has comprehensive security measures (${level} level)`
    }),
    ApiResponse({ 
      status: 200, 
      description: 'Success - Security validated',
      headers: {
        'X-Security-Level': {
          description: 'Security level',
          schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
        },
        'X-Security-Timestamp': {
          description: 'Security validation timestamp',
          schema: { type: 'string', format: 'date-time' }
        },
      },
    }),
  );
};

export const NoSecurity = () => {
  return applyDecorators(
    SetMetadata(SECURITY_KEY, false),
    ApiOperation({ 
      summary: 'Non-secured endpoint',
      description: 'This endpoint has no security measures'
    }),
  );
};
