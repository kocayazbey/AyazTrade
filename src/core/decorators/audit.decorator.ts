import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const AUDIT_KEY = 'audit';
export const AUDIT_OPTIONS_KEY = 'auditOptions';

export interface AuditOptions {
  action?: string; // Audit action name
  resource?: string; // Resource being audited
  level?: 'low' | 'medium' | 'high' | 'critical'; // Audit level
  sensitive?: boolean; // Contains sensitive data
  maskFields?: string[]; // Fields to mask in logs
  includeRequest?: boolean; // Include request data
  includeResponse?: boolean; // Include response data
  includeHeaders?: boolean; // Include headers
  includeUser?: boolean; // Include user info
  includeIP?: boolean; // Include IP address
  includeUserAgent?: boolean; // Include user agent
  customFields?: Record<string, any>; // Custom audit fields
  tags?: string[]; // Audit tags
  category?: string; // Audit category
  subcategory?: string; // Audit subcategory
  metadata?: Record<string, any>; // Additional metadata
}

export const Audit = (options?: AuditOptions) => {
  return applyDecorators(
    SetMetadata(AUDIT_KEY, true),
    SetMetadata(AUDIT_OPTIONS_KEY, options || {}),
  );
};

export const AuditAction = (action: string, options?: Omit<AuditOptions, 'action'>) => {
  return Audit({ ...options, action });
};

export const AuditResource = (resource: string, options?: Omit<AuditOptions, 'resource'>) => {
  return Audit({ ...options, resource });
};

export const AuditLevel = (level: 'low' | 'medium' | 'high' | 'critical', options?: Omit<AuditOptions, 'level'>) => {
  return Audit({ ...options, level });
};

export const AuditSensitive = (options?: Omit<AuditOptions, 'sensitive'>) => {
  return Audit({ ...options, sensitive: true });
};

export const AuditMaskFields = (fields: string[], options?: Omit<AuditOptions, 'maskFields'>) => {
  return Audit({ ...options, maskFields: fields });
};

export const AuditIncludeRequest = (options?: Omit<AuditOptions, 'includeRequest'>) => {
  return Audit({ ...options, includeRequest: true });
};

export const AuditIncludeResponse = (options?: Omit<AuditOptions, 'includeResponse'>) => {
  return Audit({ ...options, includeResponse: true });
};

export const AuditIncludeUser = (options?: Omit<AuditOptions, 'includeUser'>) => {
  return Audit({ ...options, includeUser: true });
};

export const AuditTags = (tags: string[], options?: Omit<AuditOptions, 'tags'>) => {
  return Audit({ ...options, tags });
};

export const AuditCategory = (category: string, options?: Omit<AuditOptions, 'category'>) => {
  return Audit({ ...options, category });
};

export const ComprehensiveAudit = (
  action: string,
  resource: string,
  level: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  additionalOptions?: AuditOptions
) => {
  return applyDecorators(
    Audit({
      action,
      resource,
      level,
      includeRequest: true,
      includeResponse: true,
      includeHeaders: true,
      includeUser: true,
      includeIP: true,
      includeUserAgent: true,
      ...additionalOptions,
    }),
    ApiOperation({ 
      summary: 'Audited endpoint',
      description: `This endpoint is audited for ${action} on ${resource}`
    }),
    ApiResponse({ 
      status: 200, 
      description: 'Success - Audit logged',
      headers: {
        'X-Audit-ID': {
          description: 'Audit log ID',
          schema: { type: 'string' }
        },
        'X-Audit-Level': {
          description: 'Audit level',
          schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
        },
      },
    }),
  );
};

export const NoAudit = () => {
  return applyDecorators(
    SetMetadata(AUDIT_KEY, false),
    ApiOperation({ 
      summary: 'Non-audited endpoint',
      description: 'This endpoint is not audited'
    }),
  );
};
