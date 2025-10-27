import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  createUnifiedErrorResponse,
  ErrorCodes,
  ErrorMessages,
} from './unified-error-envelope';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string;

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[] = exception.message;
    let errorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
    let details: any = undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;
      message = responseObj.message || message;
      details = responseObj.details;
    }

    // Map HTTP status codes to error codes
    switch (status) {
      case 400:
        errorCode = ErrorCodes.INVALID_INPUT;
        message = ErrorMessages.VALIDATION_ERROR;
        break;
      case 401:
        errorCode = ErrorCodes.UNAUTHORIZED;
        message = ErrorMessages.UNAUTHORIZED;
        break;
      case 403:
        errorCode = ErrorCodes.INSUFFICIENT_PERMISSIONS;
        message = ErrorMessages.INSUFFICIENT_PERMISSIONS;
        break;
      case 404:
        errorCode = ErrorCodes.RESOURCE_NOT_FOUND;
        message = ErrorMessages.RESOURCE_NOT_FOUND;
        break;
      case 409:
        errorCode = ErrorCodes.RESOURCE_ALREADY_EXISTS;
        message = ErrorMessages.RESOURCE_ALREADY_EXISTS;
        break;
      case 429:
        errorCode = ErrorCodes.RATE_LIMIT_EXCEEDED;
        message = ErrorMessages.RATE_LIMIT_EXCEEDED;
        break;
      case 503:
        errorCode = ErrorCodes.SERVICE_UNAVAILABLE;
        message = ErrorMessages.SERVICE_UNAVAILABLE;
        break;
      default:
        errorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
        message = ErrorMessages.INTERNAL_SERVER_ERROR;
    }

    const errorResponse = createUnifiedErrorResponse(
      status,
      errorCode,
      message,
      request,
      details,
      {
        originalError: exception.name,
      },
    );

    // Log based on status code
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
        `HTTP Exception: ${errorCode} - ${message}`,
        exception.stack,
        logData,
      );
    } else {
      this.logger.warn(
        `HTTP Exception: ${errorCode} - ${message}`,
        logData,
      );
    }

    response.status(status).json(errorResponse);
  }
}
