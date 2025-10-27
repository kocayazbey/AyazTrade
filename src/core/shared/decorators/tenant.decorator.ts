import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request['tenantId'] || request.user?.tenantId;
  },
);
