import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  UnifiedErrorResponse,
  createUnifiedErrorResponse,
  ErrorCodes,
  ErrorMessages,
} from './unified-error-envelope';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
    let message = ErrorMessages.INTERNAL_SERVER_ERROR;
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        details = responseObj.details;
      }

      // Map HTTP status codes to error codes
      switch (status) {
        case HttpStatus.BAD_REQUEST:
          errorCode = ErrorCodes.INVALID_INPUT;
          message = ErrorMessages.VALIDATION_ERROR;
          break;
        case HttpStatus.UNAUTHORIZED:
          errorCode = ErrorCodes.UNAUTHORIZED;
          message = ErrorMessages.UNAUTHORIZED;
          break;
        case HttpStatus.FORBIDDEN:
          errorCode = ErrorCodes.INSUFFICIENT_PERMISSIONS;
          message = ErrorMessages.INSUFFICIENT_PERMISSIONS;
          break;
        case HttpStatus.NOT_FOUND:
          errorCode = ErrorCodes.RESOURCE_NOT_FOUND;
          message = ErrorMessages.RESOURCE_NOT_FOUND;
          break;
        case HttpStatus.CONFLICT:
          errorCode = ErrorCodes.RESOURCE_ALREADY_EXISTS;
          message = ErrorMessages.RESOURCE_ALREADY_EXISTS;
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          errorCode = ErrorCodes.RATE_LIMIT_EXCEEDED;
          message = ErrorMessages.RATE_LIMIT_EXCEEDED;
          break;
        case HttpStatus.SERVICE_UNAVAILABLE:
          errorCode = ErrorCodes.SERVICE_UNAVAILABLE;
          message = ErrorMessages.SERVICE_UNAVAILABLE;
          break;
      }
    } else if (exception instanceof Error) {
      message = exception.message;

      // Handle database errors generically
      if (exception.message?.includes('duplicate key')) {
        status = HttpStatus.CONFLICT;
        errorCode = ErrorCodes.RESOURCE_ALREADY_EXISTS;
        message = ErrorMessages.RESOURCE_ALREADY_EXISTS;
      } else if (exception.message?.includes('foreign key')) {
        status = HttpStatus.BAD_REQUEST;
        errorCode = ErrorCodes.INVALID_INPUT;
        message = 'Referenced record does not exist';
      } else if (exception.message?.includes('not found')) {
        status = HttpStatus.NOT_FOUND;
        errorCode = ErrorCodes.RESOURCE_NOT_FOUND;
        message = ErrorMessages.RESOURCE_NOT_FOUND;
      } else {
        errorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
        message = ErrorMessages.INTERNAL_SERVER_ERROR;
      }
    }

    const errorResponse = createUnifiedErrorResponse(
      status,
      errorCode,
      message,
      request,
      details,
      {
        originalError: exception instanceof Error ? exception.name : 'Unknown',
        stack: exception instanceof Error ? exception.stack : undefined,
      },
    );

    // Log error with appropriate level
    const logData = {
      requestId,
      path: request.url,
      method: request.method,
      status,
      errorCode,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.id,
    };

    if (status >= 500) {
      this.logger.error(
        `Exception caught: ${errorCode} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
        logData,
      );
    } else {
      this.logger.warn(
        `Exception caught: ${errorCode} - ${message}`,
        logData,
      );
    }

    response.status(status).json(errorResponse);
  }
}
