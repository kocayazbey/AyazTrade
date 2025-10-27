import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from './database.module';

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private drizzle: any,
  ) {}

  /**
   * Check for N+1 query problems
   */
  async checkNPlusOneQueries(queries: any[]): Promise<{
    hasNPlusOne: boolean;
    suggestions: string[];
  }> {
    const suggestions: string[] = [];
    let hasNPlusOne = false;

    // Analyze query patterns
    const queryPatterns = new Map<string, number>();
    
    for (const query of queries) {
      const pattern = this.extractQueryPattern(query);
      const count = queryPatterns.get(pattern) || 0;
      queryPatterns.set(pattern, count + 1);
    }

    // Check for repeated patterns (potential N+1)
    for (const [pattern, count] of queryPatterns) {
      if (count > 1) {
        hasNPlusOne = true;
        suggestions.push(`Potential N+1 query detected: ${pattern} executed ${count} times`);
        suggestions.push(`Consider using JOIN or batch loading for: ${pattern}`);
      }
    }

    return { hasNPlusOne, suggestions };
  }

  /**
   * Optimize query with proper indexing
   */
  async optimizeQuery(query: any): Promise<{
    optimized: boolean;
    suggestions: string[];
  }> {
    const suggestions: string[] = [];
    let optimized = false;

    // Check for missing indexes
    if (this.hasWhereClause(query)) {
      suggestions.push('Ensure WHERE clause columns are indexed');
    }

    if (this.hasOrderByClause(query)) {
      suggestions.push('Ensure ORDER BY columns are indexed');
    }

    if (this.hasGroupByClause(query)) {
      suggestions.push('Ensure GROUP BY columns are indexed');
    }

    if (this.hasJoinClause(query)) {
      suggestions.push('Ensure JOIN columns are indexed');
    }

    // Check for SELECT * usage
    if (this.hasSelectAll(query)) {
      suggestions.push('Avoid SELECT * - specify only needed columns');
      optimized = true;
    }

    // Check for LIMIT without ORDER BY
    if (this.hasLimitWithoutOrderBy(query)) {
      suggestions.push('Add ORDER BY clause when using LIMIT for consistent results');
      optimized = true;
    }

    return { optimized, suggestions };
  }

  /**
   * Implement keyset pagination
   */
  async implementKeysetPagination(
    table: string,
    cursor: string,
    limit: number = 20,
    orderBy: string = 'id'
  ): Promise<{
    data: any[];
    nextCursor: string | null;
  }> {
    try {
      // Parse cursor
      const cursorValue = cursor ? Buffer.from(cursor, 'base64').toString() : null;
      
      // Build query with cursor
      let query = this.drizzle.select().from(table);
      
      if (cursorValue) {
        query = query.where(this.drizzle.gt(orderBy, cursorValue));
      }
      
      query = query.orderBy(orderBy).limit(limit + 1);
      
      const results = await query;
      
      // Check if there are more results
      const hasMore = results.length > limit;
      const data = hasMore ? results.slice(0, limit) : results;
      
      // Generate next cursor
      const nextCursor = hasMore && data.length > 0 
        ? Buffer.from(data[data.length - 1][orderBy].toString()).toString('base64')
        : null;
      
      return { data, nextCursor };
    } catch (error) {
      this.logger.error('Keyset pagination failed:', error);
      throw error;
    }
  }

  /**
   * Analyze query performance
   */
  async analyzeQueryPerformance(query: any): Promise<{
    executionTime: number;
    rowsExamined: number;
    rowsReturned: number;
    suggestions: string[];
  }> {
    const startTime = Date.now();
    const suggestions: string[] = [];

    try {
      // Execute query with EXPLAIN
      const explainResult = await this.drizzle.execute(
        `EXPLAIN ANALYZE ${query.toString()}`
      );
      
      const executionTime = Date.now() - startTime;
      
      // Analyze EXPLAIN results
      const rowsExamined = this.extractRowsExamined(explainResult);
      const rowsReturned = this.extractRowsReturned(explainResult);
      
      // Generate suggestions based on analysis
      if (executionTime > 1000) {
        suggestions.push('Query execution time is high (>1s) - consider optimization');
      }
      
      if (rowsExamined > rowsReturned * 10) {
        suggestions.push('High ratio of examined to returned rows - check indexes');
      }
      
      if (this.hasFullTableScan(explainResult)) {
        suggestions.push('Full table scan detected - add appropriate indexes');
      }
      
      if (this.hasTemporaryTable(explainResult)) {
        suggestions.push('Temporary table usage detected - consider query optimization');
      }
      
      if (this.hasFilesort(explainResult)) {
        suggestions.push('Filesort detected - add ORDER BY indexes');
      }

      return {
        executionTime,
        rowsExamined,
        rowsReturned,
        suggestions
      };
    } catch (error) {
      this.logger.error('Query performance analysis failed:', error);
      return {
        executionTime: 0,
        rowsExamined: 0,
        rowsReturned: 0,
        suggestions: ['Failed to analyze query performance']
      };
    }
  }

  /**
   * Suggest indexes based on query patterns
   */
  async suggestIndexes(queries: any[]): Promise<{
    suggestedIndexes: Array<{
      table: string;
      columns: string[];
      type: 'btree' | 'hash' | 'gin' | 'gist';
      reason: string;
    }>;
  }> {
    const suggestedIndexes: Array<{
      table: string;
      columns: string[];
      type: 'btree' | 'hash' | 'gin' | 'gist';
      reason: string;
    }> = [];

    for (const query of queries) {
      const table = this.extractTableName(query);
      const whereColumns = this.extractWhereColumns(query);
      const orderByColumns = this.extractOrderByColumns(query);
      const joinColumns = this.extractJoinColumns(query);

      // Suggest indexes for WHERE clauses
      for (const column of whereColumns) {
        suggestedIndexes.push({
          table,
          columns: [column],
          type: 'btree',
          reason: `Frequently used in WHERE clause: ${column}`
        });
      }

      // Suggest composite indexes for WHERE + ORDER BY
      if (whereColumns.length > 0 && orderByColumns.length > 0) {
        const compositeColumns = [...whereColumns, ...orderByColumns];
        suggestedIndexes.push({
          table,
          columns: compositeColumns,
          type: 'btree',
          reason: `Composite index for WHERE + ORDER BY: ${compositeColumns.join(', ')}`
        });
      }

      // Suggest indexes for JOIN columns
      for (const column of joinColumns) {
        suggestedIndexes.push({
          table,
          columns: [column],
          type: 'btree',
          reason: `JOIN column: ${column}`
        });
      }
    }

    // Remove duplicates
    const uniqueIndexes = suggestedIndexes.filter((index, i, arr) => 
      arr.findIndex(other => 
        other.table === index.table && 
        other.columns.join(',') === index.columns.join(',')
      ) === i
    );

    return { suggestedIndexes: uniqueIndexes };
  }

  /**
   * Monitor slow queries
   */
  async monitorSlowQueries(threshold: number = 1000): Promise<{
    slowQueries: Array<{
      query: string;
      executionTime: number;
      timestamp: Date;
    }>;
  }> {
    // This would typically integrate with database slow query log
    // For now, return empty array
    return { slowQueries: [] };
  }

  // Helper methods
  private extractQueryPattern(query: any): string {
    // Extract the basic pattern from query
    return query.toString().replace(/\d+/g, '?').replace(/'[^']*'/g, '?');
  }

  private hasWhereClause(query: any): boolean {
    return query.toString().toLowerCase().includes('where');
  }

  private hasOrderByClause(query: any): boolean {
    return query.toString().toLowerCase().includes('order by');
  }

  private hasGroupByClause(query: any): boolean {
    return query.toString().toLowerCase().includes('group by');
  }

  private hasJoinClause(query: any): boolean {
    return query.toString().toLowerCase().includes('join');
  }

  private hasSelectAll(query: any): boolean {
    return query.toString().toLowerCase().includes('select *');
  }

  private hasLimitWithoutOrderBy(query: any): boolean {
    const queryStr = query.toString().toLowerCase();
    return queryStr.includes('limit') && !queryStr.includes('order by');
  }

  private extractTableName(query: any): string {
    // Extract table name from query
    const match = query.toString().match(/from\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  private extractWhereColumns(query: any): string[] {
    // Extract columns from WHERE clause
    const whereMatch = query.toString().match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|$)/i);
    if (!whereMatch) return [];
    
    const whereClause = whereMatch[1];
    const columnMatches = whereClause.match(/(\w+)\s*[=<>]/g);
    return columnMatches ? columnMatches.map(match => match.split(/\s*[=<>]/)[0]) : [];
  }

  private extractOrderByColumns(query: any): string[] {
    // Extract columns from ORDER BY clause
    const orderMatch = query.toString().match(/order\s+by\s+(.+?)(?:\s+limit|$)/i);
    if (!orderMatch) return [];
    
    const orderClause = orderMatch[1];
    return orderClause.split(',').map(col => col.trim().split(/\s+/)[0]);
  }

  private extractJoinColumns(query: any): string[] {
    // Extract columns from JOIN clauses
    const joinMatches = query.toString().match(/join\s+\w+\s+on\s+(\w+\.\w+)\s*=\s*(\w+\.\w+)/gi);
    if (!joinMatches) return [];
    
    const columns: string[] = [];
    for (const match of joinMatches) {
      const parts = match.split(/\s*=\s*/);
      columns.push(parts[0].split('.')[1]);
      columns.push(parts[1].split('.')[1]);
    }
    return columns;
  }

  private extractRowsExamined(explainResult: any): number {
    // Extract rows examined from EXPLAIN result
    return 0; // Implementation depends on database
  }

  private extractRowsReturned(explainResult: any): number {
    // Extract rows returned from EXPLAIN result
    return 0; // Implementation depends on database
  }

  private hasFullTableScan(explainResult: any): boolean {
    // Check if EXPLAIN result shows full table scan
    return false; // Implementation depends on database
  }

  private hasTemporaryTable(explainResult: any): boolean {
    // Check if EXPLAIN result shows temporary table usage
    return false; // Implementation depends on database
  }

  private hasFilesort(explainResult: any): boolean {
    // Check if EXPLAIN result shows filesort
    return false; // Implementation depends on database
  }
}