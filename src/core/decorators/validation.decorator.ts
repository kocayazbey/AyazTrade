import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

export const VALIDATION_KEY = 'validation';
export const VALIDATION_OPTIONS_KEY = 'validationOptions';

export interface ValidationOptions {
  strict?: boolean;
  sanitize?: boolean;
  transform?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  skipMissingProperties?: boolean;
  skipNullProperties?: boolean;
  skipUndefinedProperties?: boolean;
  errorHttpStatusCode?: number;
  exceptionFactory?: (errors: any[]) => any;
  groups?: string[];
  dismissDefaultMessages?: boolean;
  validationError?: {
    target?: boolean;
    value?: boolean;
  };
  stopAtFirstError?: boolean;
}

export const Validation = (options?: ValidationOptions) => {
  return applyDecorators(
    SetMetadata(VALIDATION_KEY, true),
    SetMetadata(VALIDATION_OPTIONS_KEY, options || {}),
  );
};

export const ValidateBody = (dto: any, options?: ValidationOptions) => {
  return applyDecorators(
    Validation(options),
    ApiBody({ type: dto }),
  );
};

export const ValidateQuery = (dto: any, options?: ValidationOptions) => {
  return applyDecorators(
    Validation(options),
    ApiQuery({ type: dto }),
  );
};

export const ValidateParam = (dto: any, options?: ValidationOptions) => {
  return applyDecorators(
    Validation(options),
    ApiParam({ name: 'id', type: dto }),
  );
};

export const ValidateResponse = (dto: any, statusCode: number = 200) => {
  return applyDecorators(
    ApiResponse({ 
      status: statusCode, 
      type: dto,
      description: 'Success response'
    }),
  );
};

export const ValidateError = (statusCode: number, description: string) => {
  return applyDecorators(
    ApiResponse({ 
      status: statusCode, 
      description,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: statusCode },
          message: { type: 'string', example: description },
          error: { type: 'string', example: 'Bad Request' },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string', example: '/api/v1/endpoint' },
        },
      },
    }),
  );
};

export const ComprehensiveValidation = (
  bodyDto?: any,
  queryDto?: any,
  paramDto?: any,
  responseDto?: any,
  options?: ValidationOptions
) => {
  const decorators = [
    Validation(options),
    ApiOperation({ 
      summary: 'Comprehensive validation endpoint',
      description: 'Endpoint with full validation support'
    }),
  ];

  if (bodyDto) {
    decorators.push(ApiBody({ type: bodyDto }));
  }

  if (queryDto) {
    decorators.push(ApiQuery({ type: queryDto }));
  }

  if (paramDto) {
    decorators.push(ApiParam({ name: 'id', type: paramDto }));
  }

  if (responseDto) {
    decorators.push(ValidateResponse(responseDto));
  }

  // Add common error responses
  decorators.push(
    ValidateError(400, 'Bad Request - Validation failed'),
    ValidateError(401, 'Unauthorized'),
    ValidateError(403, 'Forbidden'),
    ValidateError(404, 'Not Found'),
    ValidateError(500, 'Internal Server Error'),
  );

  return applyDecorators(...decorators);
};
