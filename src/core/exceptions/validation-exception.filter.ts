import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';
import {
  createUnifiedErrorResponse,
  ErrorCodes,
  ErrorMessages,
} from './unified-error-envelope';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string;

    const exceptionResponse = exception.getResponse();
    let validationErrors: any[] = [];
    let message = ErrorMessages.VALIDATION_ERROR;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;
      message = responseObj.message || message;

      if (Array.isArray(responseObj.message)) {
        validationErrors = responseObj.message.map((error: ValidationError) => ({
          field: error.property,
          message: Object.values(error.constraints || {})[0] || 'Invalid value',
          value: error.value,
          constraints: error.constraints,
        }));
      } else if (responseObj.message && typeof responseObj.message === 'string') {
        validationErrors = [{
          field: 'general',
          message: responseObj.message,
        }];
      }
    }

    const errorResponse = createUnifiedErrorResponse(
      400,
      ErrorCodes.VALIDATION_ERROR,
      message,
      request,
      { validationErrors },
    );

    this.logger.warn(
      `Validation failed: ${message}`,
      {
        requestId,
        path: request.url,
        method: request.method,
        validationErrors,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        userId: (request as any).user?.id,
      },
    );

    response.status(400).json(errorResponse);
  }
}
