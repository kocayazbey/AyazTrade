import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);

  constructor() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || 'development',
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
        ],
      });
      this.logger.log('Sentry initialized');
    }
  }

  captureException(error: Error, context?: Record<string, any>): void {
    Sentry.captureException(error, { extra: context });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email: string; username?: string }): void {
    Sentry.setUser(user);
  }

  addBreadcrumb(breadcrumb: { message: string; category?: string; level?: Sentry.SeverityLevel; data?: any }): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  startTransaction(name: string, op: string): any {
    return Sentry.startTransaction({ name, op });
  }
}

