import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { PaginationOptions } from '../pagination/pagination.service';

export const PaginationParams = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationOptions => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const query = request.query;

    return {
      page: query.page ? parseInt(query.page as string, 10) : 1,
      limit: query.limit ? parseInt(query.limit as string, 10) : 10,
      sortBy: query.sortBy as string,
      sortOrder: query.sortOrder as 'asc' | 'desc',
      search: query.search as string,
      searchFields: query.searchFields ? (query.searchFields as string).split(',') : undefined,
      filters: query.filters as Record<string, any>,
    };
  },
);
