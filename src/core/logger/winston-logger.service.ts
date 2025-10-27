import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
        const logObject = {
          timestamp,
          level,
          message,
          context: context || 'Application',
          ...(trace && { trace }),
          ...meta,
        };
        return JSON.stringify(logObject);
      }),
    );

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ];

    // Add file transports in production
    if (nodeEnv === 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      transports,
      exitOnError: false,
    });
  }

  log(message: string, context?: string, meta?: any): void {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: any): void {
    this.logger.error(message, { context, trace, ...meta });
  }

  warn(message: string, context?: string, meta?: any): void {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: any): void {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: any): void {
    this.logger.verbose(message, { context, ...meta });
  }

  // Custom methods for structured logging
  logRequest(req: any, res: any, responseTime: number): void {
    this.logger.info('HTTP Request', {
      context: 'HTTP',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user?.id,
      requestId: req.headers['x-request-id'],
    });
  }

  logDatabaseQuery(query: string, duration: number, context?: string): void {
    this.logger.debug('Database Query', {
      context: context || 'Database',
      query,
      duration: `${duration}ms`,
    });
  }

  logBusinessEvent(event: string, data: any, context?: string): void {
    this.logger.info('Business Event', {
      context: context || 'Business',
      event,
      data,
    });
  }

  logSecurityEvent(event: string, data: any, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.logger[level]('Security Event', {
      context: 'Security',
      event,
      severity,
      data,
    });
  }

  logPerformanceMetric(metric: string, value: number, unit: string, context?: string): void {
    this.logger.info('Performance Metric', {
      context: context || 'Performance',
      metric,
      value,
      unit,
    });
  }
}
