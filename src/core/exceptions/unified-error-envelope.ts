export interface UnifiedErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
    statusCode: number;
  };
  meta?: {
    version: string;
    environment: string;
    service: string;
  };
}

export class ErrorCodes {
  // Validation errors
  static readonly VALIDATION_ERROR = 'VALIDATION_ERROR';
  static readonly INVALID_INPUT = 'INVALID_INPUT';
  static readonly MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD';
  
  // Authentication errors
  static readonly UNAUTHORIZED = 'UNAUTHORIZED';
  static readonly INVALID_TOKEN = 'INVALID_TOKEN';
  static readonly TOKEN_EXPIRED = 'TOKEN_EXPIRED';
  static readonly INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS';
  
  // Business logic errors
  static readonly RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND';
  static readonly RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS';
  static readonly OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED';
  static readonly BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION';
  
  // Rate limiting
  static readonly RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED';
  static readonly TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS';
  
  // System errors
  static readonly INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR';
  static readonly SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE';
  static readonly DATABASE_ERROR = 'DATABASE_ERROR';
  static readonly EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR';
  
  // Security errors
  static readonly SECURITY_VIOLATION = 'SECURITY_VIOLATION';
  static readonly DDOS_PROTECTION = 'DDOS_PROTECTION';
  static readonly SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY';
}

export class ErrorMessages {
  static readonly VALIDATION_ERROR = 'The request contains invalid data';
  static readonly UNAUTHORIZED = 'Authentication is required to access this resource';
  static readonly INVALID_TOKEN = 'The provided token is invalid';
  static readonly TOKEN_EXPIRED = 'The provided token has expired';
  static readonly INSUFFICIENT_PERMISSIONS = 'You do not have permission to perform this action';
  static readonly RESOURCE_NOT_FOUND = 'The requested resource was not found';
  static readonly RESOURCE_ALREADY_EXISTS = 'A resource with this information already exists';
  static readonly OPERATION_NOT_ALLOWED = 'This operation is not allowed';
  static readonly BUSINESS_RULE_VIOLATION = 'This action violates a business rule';
  static readonly RATE_LIMIT_EXCEEDED = 'Too many requests. Please try again later';
  static readonly INTERNAL_SERVER_ERROR = 'An internal server error occurred';
  static readonly SERVICE_UNAVAILABLE = 'The service is temporarily unavailable';
  static readonly DATABASE_ERROR = 'A database error occurred';
  static readonly EXTERNAL_SERVICE_ERROR = 'An external service error occurred';
  static readonly SECURITY_VIOLATION = 'A security violation was detected';
  static readonly DDOS_PROTECTION = 'Request blocked by DDoS protection';
  static readonly SUSPICIOUS_ACTIVITY = 'Suspicious activity detected';
}

export function createUnifiedErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  request: any,
  details?: any,
  meta?: any,
): UnifiedErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId: request.headers?.['x-request-id'] || 'unknown',
      path: request.url || 'unknown',
      method: request.method || 'unknown',
      statusCode,
    },
    meta: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      service: 'ayaztrade-api',
      ...meta,
    },
  };
}
