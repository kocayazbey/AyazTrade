import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Observable } from 'rxjs';

@Injectable()
export class GlobalRateLimitGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (error) {
      if (error instanceof ThrottlerException) {
        throw new ThrottlerException('Too many requests, please try again later');
      }
      throw error;
    }
  }

  protected getTracker(req: Record<string, any>): string {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  }
}

