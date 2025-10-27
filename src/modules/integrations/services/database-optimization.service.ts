import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface OptimizationRecommendation {
  id: string;
  type: 'index' | 'query' | 'table' | 'partition' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  table?: string;
  description: string;
  currentState: string;
  recommendedAction: string;
  estimatedImpact: {
    performance: number; // percentage improvement
    storage?: number; // MB change
    maintenance: 'low' | 'medium' | 'high';
  };
  implementation: {
    sql?: string;
    rollback?: string;
    steps: string[];
  };
  status: 'pending' | 'applied' | 'rejected' | 'failed';
  appliedAt?: Date;
  appliedBy?: string;
  result?: {
    before: any;
    after: any;
    improvement: number;
  };
  createdAt: Date;
  tenantId?: string;
}

interface PerformanceMetric {
  id: string;
  table: string;
  metric: 'query_time' | 'index_usage' | 'table_size' | 'row_count' | 'dead_tuples';
  value: number;
  unit: string;
  timestamp: Date;
  threshold?: number;
  status: 'normal' | 'warning' | 'critical';
  tenantId?: string;
}

interface QueryAnalysis {
  id: string;
  query: string;
  executionCount: number;
  averageTime: number;
  totalTime: number;
  lastExecuted: Date;
  tables: string[];
  indexes: string[];
  recommendations: string[];
  slowQuery: boolean;
  tenantId?: string;
}

interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  unique: boolean;
  partial: boolean;
  condition?: string;
  estimatedSize: number;
  estimatedImprovement: number;
}

@Injectable()
export class DatabaseOptimizationService {
  private readonly logger = new Logger(DatabaseOptimizationService.name);

  private performanceMetrics: Map<string, PerformanceMetric[]> = new Map();
  private queryCache: Map<string, QueryAnalysis> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {
    // Start monitoring
    this.startPerformanceMonitoring();
    this.startQueryAnalysis();
    this.startMaintenanceTasks();
  }

  async analyzePerformance(tenantId?: string): Promise<{
    recommendations: OptimizationRecommendation[];
    metrics: PerformanceMetric[];
    slowQueries: QueryAnalysis[];
    overallScore: number;
  }> {
    try {
      // Get current performance metrics
      const metrics = await this.getCurrentMetrics(tenantId);

      // Analyze tables for optimization opportunities
      const tableAnalysis = await this.analyzeTables(tenantId);

      // Analyze queries
      const queryAnalysis = await this.analyzeQueries(tenantId);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(tableAnalysis, queryAnalysis, tenantId);

      // Calculate overall performance score
      const overallScore = this.calculatePerformanceScore(metrics, recommendations);

      this.logger.log(`Performance analysis completed for tenant: ${tenantId || 'global'}`);
      return {
        recommendations,
        metrics,
        slowQueries: queryAnalysis.filter(q => q.slowQuery),
        overallScore
      };

    } catch (error) {
      this.logger.error('Failed to analyze performance', error);
      return {
        recommendations: [],
        metrics: [],
        slowQueries: [],
        overallScore: 0
      };
    }
  }

  async applyRecommendation(recommendationId: string, appliedBy: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const recommendation = await this.getRecommendation(recommendationId);
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      // Apply the recommendation
      await this.executeOptimization(recommendation);

      // Update recommendation status
      await this.updateRecommendationStatus(recommendationId, 'applied', appliedBy);

      this.logger.log(`Optimization applied: ${recommendationId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to apply recommendation', error);
      await this.updateRecommendationStatus(recommendationId, 'failed', appliedBy, error.message);
      return { success: false, error: error.message };
    }
  }

  async createIndex(table: string, columns: string[], type: 'btree' | 'hash' | 'gin' | 'gist' = 'btree', unique: boolean = false): Promise<{
    success: boolean;
    indexName?: string;
    error?: string;
  }> {
    try {
      const indexName = `idx_${table}_${columns.join('_')}_${Date.now()}`;

      let sql = `CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${indexName} ON ${table} `;

      if (type === 'gin' || type === 'gist') {
        sql += `USING ${type} (${columns.join(', ')})`;
      } else {
        sql += `(${columns.join(', ')})`;
      }

      await this.db.execute(sql);

      this.logger.log(`Index created: ${indexName} on ${table}`);
      return { success: true, indexName };

    } catch (error) {
      this.logger.error('Failed to create index', error);
      return { success: false, error: error.message };
    }
  }

  async optimizeQuery(query: string, parameters?: any[]): Promise<{
    optimized: boolean;
    originalPlan?: any;
    optimizedPlan?: any;
    suggestions?: string[];
  }> {
    try {
      // Analyze query execution plan
      const originalPlan = await this.getQueryPlan(query, parameters);

      // Generate optimization suggestions
      const suggestions = await this.analyzeQueryPerformance(query, originalPlan);

      // Apply optimizations if possible
      const optimizedQuery = await this.optimizeQueryStructure(query);

      let optimizedPlan;
      if (optimizedQuery !== query) {
        optimizedPlan = await this.getQueryPlan(optimizedQuery, parameters);
      }

      return {
        optimized: optimizedQuery !== query,
        originalPlan,
        optimizedPlan,
        suggestions
      };

    } catch (error) {
      this.logger.error('Failed to optimize query', error);
      return {
        optimized: false,
        suggestions: [`Error analyzing query: ${error.message}`]
      };
    }
  }

  async vacuumTable(table: string, full: boolean = false): Promise<{
    success: boolean;
    pagesRemoved?: number;
    tuplesRemoved?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      if (full) {
        await this.db.execute(`VACUUM FULL ${table}`);
      } else {
        await this.db.execute(`VACUUM ${table}`);
      }

      // Get table statistics after vacuum
      const stats = await this.getTableStats(table);

      this.logger.log(`Table vacuumed: ${table} (${full ? 'FULL' : 'ANALYZE'})`);
      return {
        success: true,
        pagesRemoved: stats.pagesRemoved,
        tuplesRemoved: stats.tuplesRemoved
      };

    } catch (error) {
      this.logger.error('Failed to vacuum table', error);
      return { success: false, error: error.message };
    }
  }

  async reindexTable(table: string): Promise<{
    success: boolean;
    indexesRebuilt?: number;
    error?: string;
  }> {
    try {
      // Get all indexes for the table
      const indexes = await this.getTableIndexes(table);

      let rebuilt = 0;
      for (const index of indexes) {
        await this.db.execute(`REINDEX INDEX ${index.name}`);
        rebuilt++;
      }

      this.logger.log(`Reindexed ${rebuilt} indexes for table: ${table}`);
      return { success: true, indexesRebuilt: rebuilt };

    } catch (error) {
      this.logger.error('Failed to reindex table', error);
      return { success: false, error: error.message };
    }
  }

  async getDatabaseStats(tenantId?: string): Promise<{
    totalTables: number;
    totalIndexes: number;
    totalSize: number;
    largestTables: Array<{
      table: string;
      size: number;
      rows: number;
    }>;
    unusedIndexes: Array<{
      table: string;
      index: string;
      size: number;
    }>;
    slowQueries: QueryAnalysis[];
  }> {
    try {
      // Get table statistics
      const tableStats = await this.getAllTableStats(tenantId);

      // Get index statistics
      const indexStats = await this.getAllIndexStats(tenantId);

      // Analyze unused indexes
      const unusedIndexes = await this.findUnusedIndexes();

      // Get slow queries
      const slowQueries = await this.getSlowQueries(tenantId);

      return {
        totalTables: tableStats.length,
        totalIndexes: indexStats.length,
        totalSize: tableStats.reduce((sum, table) => sum + table.size, 0),
        largestTables: tableStats
          .sort((a, b) => b.size - a.size)
          .slice(0, 10)
          .map(table => ({
            table: table.table,
            size: table.size,
            rows: table.rows
          })),
        unusedIndexes: unusedIndexes.slice(0, 10),
        slowQueries: slowQueries.slice(0, 10)
      };

    } catch (error) {
      this.logger.error('Failed to get database stats', error);
      return {
        totalTables: 0,
        totalIndexes: 0,
        totalSize: 0,
        largestTables: [],
        unusedIndexes: [],
        slowQueries: []
      };
    }
  }

  async getQueryPerformance(query: string, parameters?: any[]): Promise<{
    executionTime: number;
    rowsReturned: number;
    buffersUsed: number;
    plan: any;
  }> {
    try {
      const startTime = Date.now();
      const result = await this.db.execute(query, parameters || []);
      const executionTime = Date.now() - startTime;

      // Get query plan (this would require pg_stat_statements or similar)
      const plan = await this.getQueryPlan(query, parameters);

      return {
        executionTime,
        rowsReturned: result.rows?.length || 0,
        buffersUsed: plan?.buffers || 0,
        plan
      };

    } catch (error) {
      this.logger.error('Failed to get query performance', error);
      return {
        executionTime: 0,
        rowsReturned: 0,
        buffersUsed: 0,
        plan: null
      };
    }
  }

  private async getCurrentMetrics(tenantId?: string): Promise<PerformanceMetric[]> {
    try {
      const metrics: PerformanceMetric[] = [];

      // Get table sizes and row counts
      const tableStats = await this.getAllTableStats(tenantId);

      for (const table of tableStats) {
        metrics.push({
          id: `metric-${table.table}-${Date.now()}`,
          table: table.table,
          metric: 'table_size',
          value: table.size,
          unit: 'MB',
          timestamp: new Date(),
          threshold: table.size > 1000 ? 1000 : undefined, // Flag large tables
          status: table.size > 1000 ? 'warning' : 'normal',
          tenantId
        });

        metrics.push({
          id: `metric-${table.table}-rows-${Date.now()}`,
          table: table.table,
          metric: 'row_count',
          value: table.rows,
          unit: 'rows',
          timestamp: new Date(),
          threshold: table.rows > 1000000 ? 1000000 : undefined, // Flag large tables
          status: table.rows > 1000000 ? 'warning' : 'normal',
          tenantId
        });
      }

      // Get slow query metrics (mock data)
      const slowQueries = await this.getSlowQueries(tenantId);
      for (const query of slowQueries.slice(0, 5)) {
        metrics.push({
          id: `metric-slow-query-${Date.now()}`,
          table: query.tables.join(', '),
          metric: 'query_time',
          value: query.averageTime,
          unit: 'ms',
          timestamp: new Date(),
          threshold: 1000, // 1 second threshold
          status: query.averageTime > 1000 ? 'critical' : query.averageTime > 500 ? 'warning' : 'normal',
          tenantId
        });
      }

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get current metrics', error);
      return [];
    }
  }

  private async analyzeTables(tenantId?: string): Promise<Array<{
    table: string;
    size: number;
    rows: number;
    indexes: number;
    lastVacuum: Date;
    lastAnalyze: Date;
    recommendations: string[];
  }>> {
    try {
      const tables = await this.getAllTableStats(tenantId);

      const analysis = [];

      for (const table of tables) {
        const recommendations = [];

        // Check table size
        if (table.size > 1000) {
          recommendations.push(`Table ${table.table} is large (${table.size}MB). Consider partitioning or archiving old data.`);
        }

        // Check row count
        if (table.rows > 1000000) {
          recommendations.push(`Table ${table.table} has many rows (${table.rows}). Consider table partitioning.`);
        }

        // Check for missing indexes (simplified)
        if (table.rows > 10000 && !table.indexes) {
          recommendations.push(`Table ${table.table} may need indexes for better query performance.`);
        }

        analysis.push({
          table: table.table,
          size: table.size,
          rows: table.rows,
          indexes: table.indexes,
          lastVacuum: table.lastVacuum,
          lastAnalyze: table.lastAnalyze,
          recommendations
        });
      }

      return analysis;

    } catch (error) {
      this.logger.error('Failed to analyze tables', error);
      return [];
    }
  }

  private async analyzeQueries(tenantId?: string): Promise<QueryAnalysis[]> {
    try {
      // Get recent slow queries (mock implementation)
      const slowQueries = await this.getSlowQueries(tenantId);

      return slowQueries.map(query => ({
        ...query,
        recommendations: this.generateQueryRecommendations(query)
      }));

    } catch (error) {
      this.logger.error('Failed to analyze queries', error);
      return [];
    }
  }

  private async generateRecommendations(tableAnalysis: any[], queryAnalysis: QueryAnalysis[], tenantId?: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Table-based recommendations
    for (const table of tableAnalysis) {
      for (const rec of table.recommendations) {
        recommendations.push({
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'table',
          severity: 'medium',
          table: table.table,
          description: rec,
          currentState: `Table size: ${table.size}MB, Rows: ${table.rows}`,
          recommendedAction: 'Optimize table structure or add appropriate indexes',
          estimatedImpact: {
            performance: 25,
            maintenance: 'medium'
          },
          implementation: {
            steps: [
              'Analyze current table usage patterns',
              'Identify frequently queried columns',
              'Create appropriate indexes',
              'Consider table partitioning if needed'
            ]
          },
          status: 'pending',
          createdAt: new Date(),
          tenantId
        });
      }
    }

    // Query-based recommendations
    for (const query of queryAnalysis) {
      if (query.slowQuery) {
        recommendations.push({
          id: `rec-query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'query',
          severity: query.averageTime > 5000 ? 'critical' : 'high',
          description: `Slow query detected: ${query.averageTime}ms average execution time`,
          currentState: `Query executed ${query.executionCount} times`,
          recommendedAction: 'Optimize query structure and add missing indexes',
          estimatedImpact: {
            performance: 50,
            maintenance: 'low'
          },
          implementation: {
            steps: query.recommendations
          },
          status: 'pending',
          createdAt: new Date(),
          tenantId
        });
      }
    }

    // Add index recommendations
    const indexRecs = await this.generateIndexRecommendations(tenantId);
    for (const rec of indexRecs) {
      recommendations.push({
        id: `rec-index-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'index',
        severity: 'medium',
        table: rec.table,
        description: `Add ${rec.type} index on ${rec.columns.join(', ')}`,
        currentState: 'Missing index detected',
        recommendedAction: `CREATE ${rec.type.toUpperCase()} INDEX on ${rec.table}`,
        estimatedImpact: {
          performance: rec.estimatedImprovement,
          storage: rec.estimatedSize,
          maintenance: 'low'
        },
        implementation: {
          sql: `CREATE ${rec.unique ? 'UNIQUE ' : ''}INDEX idx_${rec.table}_${rec.columns.join('_')} ON ${rec.table} USING ${rec.type} (${rec.columns.join(', ')})${rec.partial ? ` WHERE ${rec.condition}` : ''}`,
          steps: [
            'Analyze current query patterns',
            'Execute CREATE INDEX statement',
            'Monitor index usage after creation'
          ]
        },
        status: 'pending',
        createdAt: new Date(),
        tenantId
      });
    }

    return recommendations;
  }

  private async generateIndexRecommendations(tenantId?: string): Promise<IndexRecommendation[]> {
    try {
      // Analyze query patterns and suggest indexes
      const recommendations: IndexRecommendation[] = [];

      // Common index patterns for e-commerce
      const commonIndexes = [
        {
          table: 'orders',
          columns: ['tenant_id', 'status', 'created_at'],
          type: 'btree' as const,
          unique: false,
          partial: false,
          estimatedSize: 50,
          estimatedImprovement: 40
        },
        {
          table: 'products',
          columns: ['tenant_id', 'sku'],
          type: 'btree' as const,
          unique: true,
          partial: false,
          estimatedSize: 20,
          estimatedImprovement: 60
        },
        {
          table: 'inventory_updates',
          columns: ['product_id', 'timestamp'],
          type: 'btree' as const,
          unique: false,
          partial: false,
          estimatedSize: 30,
          estimatedImprovement: 35
        },
        {
          table: 'analytics_events',
          columns: ['tenant_id', 'type', 'timestamp'],
          type: 'btree' as const,
          unique: false,
          partial: false,
          estimatedSize: 100,
          estimatedImprovement: 45
        }
      ];

      return recommendations.concat(commonIndexes);

    } catch (error) {
      this.logger.error('Failed to generate index recommendations', error);
      return [];
    }
  }

  private async getSlowQueries(tenantId?: string): Promise<QueryAnalysis[]> {
    try {
      // Mock slow query data - in real implementation, use pg_stat_statements
      const mockQueries = [
        {
          id: 'query-1',
          query: 'SELECT * FROM orders WHERE tenant_id = ? AND created_at >= ?',
          executionCount: 150,
          averageTime: 2500,
          totalTime: 375000,
          lastExecuted: new Date(),
          tables: ['orders'],
          indexes: [],
          recommendations: ['Add composite index on (tenant_id, created_at)', 'Consider query result pagination'],
          slowQuery: true,
          tenantId
        },
        {
          id: 'query-2',
          query: 'SELECT * FROM products WHERE name ILIKE ?',
          executionCount: 75,
          averageTime: 800,
          totalTime: 60000,
          lastExecuted: new Date(),
          tables: ['products'],
          indexes: [],
          recommendations: ['Add index on name column', 'Consider using full-text search instead of ILIKE'],
          slowQuery: false,
          tenantId
        }
      ];

      return mockQueries;

    } catch (error) {
      this.logger.error('Failed to get slow queries', error);
      return [];
    }
  }

  private async getAllTableStats(tenantId?: string): Promise<Array<{
    table: string;
    size: number;
    rows: number;
    indexes: number;
    lastVacuum: Date;
    lastAnalyze: Date;
  }>> {
    try {
      // Get table information from pg_stat_user_tables (mock implementation)
      const mockTables = [
        {
          table: 'orders',
          size: 150,
          rows: 50000,
          indexes: 3,
          lastVacuum: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastAnalyze: new Date(Date.now() - 1 * 60 * 60 * 1000)
        },
        {
          table: 'products',
          size: 80,
          rows: 10000,
          indexes: 2,
          lastVacuum: new Date(Date.now() - 4 * 60 * 60 * 1000),
          lastAnalyze: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          table: 'analytics_events',
          size: 500,
          rows: 200000,
          indexes: 1,
          lastVacuum: new Date(Date.now() - 6 * 60 * 60 * 1000),
          lastAnalyze: new Date(Date.now() - 3 * 60 * 60 * 1000)
        }
      ];

      return mockTables;

    } catch (error) {
      this.logger.error('Failed to get table stats', error);
      return [];
    }
  }

  private async getAllIndexStats(tenantId?: string): Promise<Array<{
    table: string;
    index: string;
    size: number;
    scans: number;
  }>> {
    try {
      // Mock index statistics
      const mockIndexes = [
        {
          table: 'orders',
          index: 'idx_orders_tenant_status',
          size: 25,
          scans: 15000
        },
        {
          table: 'products',
          index: 'idx_products_sku',
          size: 15,
          scans: 8000
        }
      ];

      return mockIndexes;

    } catch (error) {
      this.logger.error('Failed to get index stats', error);
      return [];
    }
  }

  private async getTableIndexes(table: string): Promise<Array<{
    name: string;
    columns: string[];
    type: string;
    unique: boolean;
  }>> {
    try {
      // Mock index information
      const mockIndexes = [
        {
          name: 'idx_orders_tenant_status',
          columns: ['tenant_id', 'status'],
          type: 'btree',
          unique: false
        }
      ];

      return mockIndexes.filter(idx => idx.name.includes(table));

    } catch (error) {
      this.logger.error('Failed to get table indexes', error);
      return [];
    }
  }

  private async getTableStats(table: string): Promise<{
    pagesRemoved: number;
    tuplesRemoved: number;
  }> {
    try {
      // Mock vacuum statistics
      return {
        pagesRemoved: Math.floor(Math.random() * 100),
        tuplesRemoved: Math.floor(Math.random() * 1000)
      };

    } catch (error) {
      this.logger.error('Failed to get table stats', error);
      return {
        pagesRemoved: 0,
        tuplesRemoved: 0
      };
    }
  }

  private async findUnusedIndexes(): Promise<Array<{
    table: string;
    index: string;
    size: number;
  }>> {
    try {
      // Mock unused indexes
      const mockUnused = [
        {
          table: 'products',
          index: 'idx_products_description',
          size: 30
        }
      ];

      return mockUnused;

    } catch (error) {
      this.logger.error('Failed to find unused indexes', error);
      return [];
    }
  }

  private async getQueryPlan(query: string, parameters?: any[]): Promise<any> {
    try {
      // Mock query plan
      return {
        buffers: Math.floor(Math.random() * 100),
        cost: Math.floor(Math.random() * 1000),
        rows: Math.floor(Math.random() * 1000)
      };

    } catch (error) {
      this.logger.error('Failed to get query plan', error);
      return null;
    }
  }

  private async analyzeQueryPerformance(query: string, plan: any): Promise<string[]> {
    const suggestions: string[] = [];

    if (plan?.cost > 1000) {
      suggestions.push('Query cost is high. Consider adding indexes or rewriting the query.');
    }

    if (plan?.buffers > 50) {
      suggestions.push('High buffer usage. Consider adding covering indexes.');
    }

    if (query.includes('ILIKE')) {
      suggestions.push('ILIKE is case-insensitive but slow. Consider using full-text search or normalized data.');
    }

    if (query.includes('SELECT *')) {
      suggestions.push('SELECT * is inefficient. Specify only required columns.');
    }

    return suggestions;
  }

  private async optimizeQueryStructure(query: string): Promise<string> {
    // Basic query optimization (simplified)
    let optimized = query;

    // Replace SELECT * with specific columns if possible
    if (optimized.includes('SELECT *')) {
      // This would require table schema analysis in real implementation
      optimized = optimized.replace('SELECT *', 'SELECT id, name, created_at');
    }

    return optimized;
  }

  private generateQueryRecommendations(query: QueryAnalysis): string[] {
    const recommendations: string[] = [];

    if (query.averageTime > 1000) {
      recommendations.push('Add appropriate indexes for the queried columns');
      recommendations.push('Consider query result pagination');
    }

    if (query.executionCount > 100 && query.averageTime > 100) {
      recommendations.push('This query runs frequently and is slow. Consider caching results');
    }

    return recommendations;
  }

  private calculatePerformanceScore(metrics: PerformanceMetric[], recommendations: OptimizationRecommendation[]): number {
    // Simple scoring algorithm
    let score = 100;

    // Deduct points for critical metrics
    const criticalMetrics = metrics.filter(m => m.status === 'critical').length;
    score -= criticalMetrics * 10;

    // Deduct points for warning metrics
    const warningMetrics = metrics.filter(m => m.status === 'warning').length;
    score -= warningMetrics * 5;

    // Deduct points for high-severity recommendations
    const highSeverityRecs = recommendations.filter(r => r.severity === 'high' || r.severity === 'critical').length;
    score -= highSeverityRecs * 3;

    return Math.max(0, Math.min(100, score));
  }

  private async executeOptimization(recommendation: OptimizationRecommendation): Promise<void> {
    try {
      switch (recommendation.type) {
        case 'index':
          if (recommendation.implementation.sql) {
            await this.db.execute(recommendation.implementation.sql);
          }
          break;
        case 'query':
          // Query optimizations would be applied at the application level
          break;
        case 'table':
          // Table optimizations
          break;
        case 'configuration':
          // Database configuration changes
          break;
      }
    } catch (error) {
      this.logger.error('Failed to execute optimization', error);
      throw error;
    }
  }

  private async getRecommendation(recommendationId: string): Promise<OptimizationRecommendation | null> {
    try {
      const result = await this.db.execute(
        'SELECT * FROM optimization_recommendations WHERE id = $1',
        [recommendationId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        estimatedImpact: JSON.parse(row.estimated_impact || '{}'),
        implementation: JSON.parse(row.implementation || '{}'),
        createdAt: row.created_at
      };

    } catch (error) {
      this.logger.error('Failed to get recommendation', error);
      return null;
    }
  }

  private async updateRecommendationStatus(
    recommendationId: string,
    status: string,
    appliedBy?: string,
    error?: string
  ): Promise<void> {
    await this.db.execute(`
      UPDATE optimization_recommendations SET
        status = $1,
        applied_by = $2,
        applied_at = $3,
        error = $4
      WHERE id = $5
    `, [status, appliedBy, new Date(), error, recommendationId]);
  }

  private startPerformanceMonitoring(): void {
    // Monitor performance every 5 minutes
    setInterval(async () => {
      await this.collectPerformanceMetrics();
    }, 5 * 60 * 1000);
  }

  private startQueryAnalysis(): void {
    // Analyze queries every 10 minutes
    setInterval(async () => {
      await this.analyzeCurrentQueries();
    }, 10 * 60 * 1000);
  }

  private startMaintenanceTasks(): void {
    // Run maintenance tasks daily
    setInterval(async () => {
      await this.runMaintenanceTasks();
    }, 24 * 60 * 60 * 1000);
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();

      for (const metric of metrics) {
        await this.savePerformanceMetric(metric);
      }
    } catch (error) {
      this.logger.error('Failed to collect performance metrics', error);
    }
  }

  private async analyzeCurrentQueries(): Promise<void> {
    try {
      const slowQueries = await this.getSlowQueries();

      for (const query of slowQueries) {
        await this.saveQueryAnalysis(query);
      }
    } catch (error) {
      this.logger.error('Failed to analyze current queries', error);
    }
  }

  private async runMaintenanceTasks(): Promise<void> {
    try {
      // Run VACUUM ANALYZE on all tables
      const tables = await this.getAllTableStats();

      for (const table of tables) {
        await this.vacuumTable(table.table, false);
      }

      // Update table statistics
      await this.db.execute('ANALYZE');

      this.logger.log('Daily maintenance tasks completed');
    } catch (error) {
      this.logger.error('Failed to run maintenance tasks', error);
    }
  }

  private async savePerformanceMetric(metric: PerformanceMetric): Promise<void> {
    await this.db.execute(`
      INSERT INTO performance_metrics (id, table_name, metric, value, unit, timestamp, threshold, status, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      metric.id,
      metric.table,
      metric.metric,
      metric.value,
      metric.unit,
      metric.timestamp,
      metric.threshold,
      metric.status,
      metric.tenantId
    ]);
  }

  private async saveQueryAnalysis(query: QueryAnalysis): Promise<void> {
    await this.db.execute(`
      INSERT INTO query_analysis (id, query, execution_count, average_time, total_time, last_executed, tables, indexes, recommendations, slow_query, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      query.id,
      query.query,
      query.executionCount,
      query.averageTime,
      query.totalTime,
      query.lastExecuted,
      JSON.stringify(query.tables),
      JSON.stringify(query.indexes),
      JSON.stringify(query.recommendations),
      query.slowQuery,
      query.tenantId
    ]);
  }
}

