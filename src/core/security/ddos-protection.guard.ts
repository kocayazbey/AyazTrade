import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DDoSProtectionEnhancedService } from './ddos-protection-enhanced.service';
import { Request } from 'express';

@Injectable()
export class DDoSProtectionGuard implements CanActivate {
  private readonly logger = new Logger(DDoSProtectionGuard.name);

  constructor(
    private readonly ddosProtectionService: DDoSProtectionEnhancedService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'];
    const path = request.url;

    const result = await this.ddosProtectionService.checkDDoSProtection(
      ip,
      userAgent,
      path,
    );

    if (!result.allowed) {
      this.logger.warn(`DDoS protection blocked request`, {
        ip,
        userAgent,
        path,
        reason: result.reason,
        severity: result.severity,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Request blocked by DDoS protection',
          error: 'Too Many Requests',
          retryAfter: result.blockDuration ? Math.ceil(result.blockDuration / 1000) : 900, // 15 minutes default
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
