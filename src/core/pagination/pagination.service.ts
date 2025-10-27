import { Injectable, Logger } from '@nestjs/common';
import { SelectResult } from 'drizzle-orm';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string[];
  filters?: Record<string, any>;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage?: number;
    prevPage?: number;
  };
  sort: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  filters?: Record<string, any>;
}

export interface PaginatedQueryBuilder {
  limit(limit: number): PaginatedQueryBuilder;
  offset(offset: number): PaginatedQueryBuilder;
  orderBy(field: string, direction?: 'asc' | 'desc'): PaginatedQueryBuilder;
  where(condition: any): PaginatedQueryBuilder;
}

@Injectable()
export class PaginationService {
  private readonly logger = new Logger(PaginationService.name);

  /**
   * Create a paginated result from data and total count
   */
  createResult<T>(
    data: T[],
    total: number,
    options: PaginationOptions,
  ): PaginationResult<T> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page < totalPages ? page + 1 : undefined,
        prevPage: page > 1 ? page - 1 : undefined,
      },
      sort: {
        sortBy: options.sortBy || 'createdAt',
        sortOrder: options.sortOrder || 'desc',
      },
      filters: options.filters,
    };
  }

  /**
   * Get pagination parameters with defaults
   */
  getPaginationParams(options: PaginationOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10)); // Max 100 items per page
    const offset = (page - 1) * limit;

    return {
      page,
      limit,
      offset,
      sortBy: options.sortBy || 'createdAt',
      sortOrder: options.sortOrder || 'desc',
      search: options.search,
      searchFields: options.searchFields || [],
      filters: options.filters || {},
    };
  }

  /**
   * Build search condition for text search
   */
  buildSearchCondition(search: string, fields: string[], tableAlias?: string) {
    if (!search || !fields.length) return null;

    const prefix = tableAlias ? `${tableAlias}.` : '';
    const searchTerm = `%${search}%`;

    // Create OR conditions for each searchable field
    return fields.map(field =>
      `${prefix}${field}::text ILIKE '${searchTerm}'`
    ).join(' OR ');
  }

  /**
   * Build filter conditions
   */
  buildFilterConditions(filters: Record<string, any>, tableAlias?: string) {
    const conditions: string[] = [];

    Object.entries(filters).forEach(([field, value]) => {
      if (value === undefined || value === null || value === '') return;

      const prefix = tableAlias ? `${tableAlias}.` : '';
      const fieldName = `${prefix}${field}`;

      if (Array.isArray(value)) {
        // Handle array filters (IN clause)
        const inValues = value.map(v => `'${v}'`).join(',');
        conditions.push(`${fieldName} IN (${inValues})`);
      } else if (typeof value === 'string' && value.includes('*')) {
        // Handle wildcard filters
        const wildcardValue = value.replace(/\*/g, '%');
        conditions.push(`${fieldName}::text ILIKE '${wildcardValue}'`);
      } else if (typeof value === 'object' && value.from && value.to) {
        // Handle range filters
        conditions.push(`${fieldName} >= '${value.from}' AND ${fieldName} <= '${value.to}'`);
      } else {
        // Handle exact match
        conditions.push(`${fieldName} = '${value}'`);
      }
    });

    return conditions.length > 0 ? conditions.join(' AND ') : null;
  }

  /**
   * Validate and sanitize pagination options
   */
  sanitizeOptions(options: PaginationOptions = {}): PaginationOptions {
    return {
      page: Math.max(1, Math.min(1000, options.page || 1)), // Max 1000 pages
      limit: Math.max(1, Math.min(100, options.limit || 10)), // 1-100 items per page
      sortBy: options.sortBy || 'createdAt',
      sortOrder: (options.sortOrder === 'asc' || options.sortOrder === 'desc')
        ? options.sortOrder
        : 'desc',
      search: options.search?.trim() || undefined,
      searchFields: options.searchFields || [],
      filters: options.filters || {},
    };
  }

  /**
   * Generate cache key for pagination
   */
  generateCacheKey(
    baseKey: string,
    options: PaginationOptions,
    additionalParams: Record<string, any> = {},
  ): string {
    const params = this.getPaginationParams(options);
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key as keyof typeof params];
        return result;
      }, {} as Record<string, any>);

    const cacheData = {
      ...sortedParams,
      ...additionalParams,
    };

    return `${baseKey}:${Buffer.from(JSON.stringify(cacheData)).toString('base64')}`;
  }

  /**
   * Calculate cursor-based pagination
   */
  getCursorParams(cursor?: string, limit: number = 10) {
    let cursorData: { id: string; timestamp: string } | null = null;

    if (cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
      } catch (error) {
        this.logger.warn('Invalid cursor provided', error);
      }
    }

    return {
      cursorData,
      limit: Math.min(100, Math.max(1, limit)),
    };
  }

  /**
   * Generate next cursor for pagination
   */
  generateCursor(item: { id: string; createdAt: string | Date }): string {
    const cursorData = {
      id: item.id,
      timestamp: new Date(item.createdAt).toISOString(),
    };

    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * Create cursor-based pagination result
   */
  createCursorResult<T extends { id: string; createdAt: string | Date }>(
    data: T[],
    limit: number,
    hasMore: boolean,
  ): {
    data: T[];
    pagination: {
      limit: number;
      hasMore: boolean;
      nextCursor?: string;
      prevCursor?: string;
    };
  } {
    const nextCursor = hasMore && data.length > 0
      ? this.generateCursor(data[data.length - 1])
      : undefined;

    return {
      data,
      pagination: {
        limit,
        hasMore,
        nextCursor,
        prevCursor: data.length > 0 ? this.generateCursor(data[0]) : undefined,
      },
    };
  }

  /**
   * Get pagination info for API responses
   */
  getPaginationInfo(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };
  }

  /**
   * Format pagination metadata for API responses
   */
  formatPaginationMeta(
    page: number,
    limit: number,
    total: number,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    filters?: Record<string, any>,
  ) {
    return {
      pagination: this.getPaginationInfo(page, limit, total),
      sort: { sortBy, sortOrder },
      ...(filters && Object.keys(filters).length > 0 && { filters }),
    };
  }
}
