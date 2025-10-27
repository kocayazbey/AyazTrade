import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';

export interface SearchQuery {
  query: string;
  filters?: {
    categoryIds?: string[];
    brandIds?: string[];
    priceRange?: { min: number; max: number };
    stockStatus?: string[];
    tags?: string[];
    attributes?: Record<string, any>;
    rating?: { min: number; max: number };
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  facets?: string[];
  page?: number;
  limit?: number;
  includeAggregations?: boolean;
  searchType?: 'product' | 'customer' | 'order';
}

export interface SearchResult {
  hits: Array<{
    id: string;
    score: number;
    source: any;
    highlights?: Record<string, string[]>;
  }>;
  total: number;
  page: number;
  totalPages: number;
  aggregations?: Record<string, any>;
  suggestions?: string[];
  took: number;
}

export interface AutocompleteResult {
  suggestions: Array<{
    text: string;
    score: number;
    type: 'product' | 'category' | 'brand' | 'tag';
    payload?: any;
  }>;
  total: number;
}

export interface FacetResult {
  field: string;
  buckets: Array<{
    key: string;
    doc_count: number;
    selected?: boolean;
  }>;
}

export interface SearchAnalytics {
  query: string;
  resultCount: number;
  clickThroughRate: number;
  conversionRate: number;
  averageTime: number;
  popularFilters: Record<string, number>;
  zeroResultQueries: string[];
  topPerformingProducts: string[];
}

@Injectable()
export class ElasticsearchSearchService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async searchProducts(query: SearchQuery, tenantId: string): Promise<SearchResult> {
    const cacheKey = `search_products:${tenantId}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      this.loggerService.log(`Searching products: ${query.query}`, 'ElasticsearchSearchService');

      // Build Elasticsearch query
      const esQuery = this.buildProductSearchQuery(query, tenantId);

      // Execute search
      const searchResult = await this.executeSearch(`products_${tenantId}`, esQuery);

      // Process results
      const result: SearchResult = {
        hits: searchResult.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlights: hit.highlight
        })),
        total: searchResult.hits.total.value,
        page: query.page || 1,
        totalPages: Math.ceil(searchResult.hits.total.value / (query.limit || 20)),
        aggregations: searchResult.aggregations,
        suggestions: searchResult.suggest?.product_suggest?.[0]?.options?.map(opt => opt.text) || [],
        took: searchResult.took
      };

      // Cache search results for 10 minutes
      await this.cacheService.set(cacheKey, result, 600);

      // Log search analytics
      await this.logSearchAnalytics(query, result, tenantId);

      return result;

    } catch (error) {
      this.loggerService.error('Error searching products', error, 'ElasticsearchSearchService');
      return {
        hits: [],
        total: 0,
        page: 1,
        totalPages: 0,
        took: 0
      };
    }
  }

  async searchCustomers(query: SearchQuery, tenantId: string): Promise<SearchResult> {
    const cacheKey = `search_customers:${tenantId}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const esQuery = this.buildCustomerSearchQuery(query, tenantId);
      const searchResult = await this.executeSearch(`customers_${tenantId}`, esQuery);

      const result: SearchResult = {
        hits: searchResult.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlights: hit.highlight
        })),
        total: searchResult.hits.total.value,
        page: query.page || 1,
        totalPages: Math.ceil(searchResult.hits.total.value / (query.limit || 20)),
        aggregations: searchResult.aggregations,
        suggestions: searchResult.suggest?.customer_suggest?.[0]?.options?.map(opt => opt.text) || [],
        took: searchResult.took
      };

      await this.cacheService.set(cacheKey, result, 600);
      return result;

    } catch (error) {
      this.loggerService.error('Error searching customers', error, 'ElasticsearchSearchService');
      return {
        hits: [],
        total: 0,
        page: 1,
        totalPages: 0,
        took: 0
      };
    }
  }

  async searchOrders(query: SearchQuery, tenantId: string): Promise<SearchResult> {
    const cacheKey = `search_orders:${tenantId}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const esQuery = this.buildOrderSearchQuery(query, tenantId);
      const searchResult = await this.executeSearch(`orders_${tenantId}`, esQuery);

      const result: SearchResult = {
        hits: searchResult.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlights: hit.highlight
        })),
        total: searchResult.hits.total.value,
        page: query.page || 1,
        totalPages: Math.ceil(searchResult.hits.total.value / (query.limit || 20)),
        aggregations: searchResult.aggregations,
        suggestions: searchResult.suggest?.order_suggest?.[0]?.options?.map(opt => opt.text) || [],
        took: searchResult.took
      };

      await this.cacheService.set(cacheKey, result, 600);
      return result;

    } catch (error) {
      this.loggerService.error('Error searching orders', error, 'ElasticsearchSearchService');
      return {
        hits: [],
        total: 0,
        page: 1,
        totalPages: 0,
        took: 0
      };
    }
  }

  async getAutocompleteSuggestions(
    query: string,
    types: string[] = ['product', 'category', 'brand'],
    tenantId: string,
    limit: number = 10
  ): Promise<AutocompleteResult> {
    const cacheKey = `autocomplete:${tenantId}:${query}:${types.join(',')}:${limit}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const suggestions: any[] = [];

      // Get product suggestions
      if (types.includes('product')) {
        const productSuggest = await this.getProductSuggestions(query, tenantId, limit);
        suggestions.push(...productSuggest);
      }

      // Get category suggestions
      if (types.includes('category')) {
        const categorySuggest = await this.getCategorySuggestions(query, tenantId, limit);
        suggestions.push(...categorySuggest);
      }

      // Get brand suggestions
      if (types.includes('brand')) {
        const brandSuggest = await this.getBrandSuggestions(query, tenantId, limit);
        suggestions.push(...brandSuggest);
      }

      // Get tag suggestions
      if (types.includes('tag')) {
        const tagSuggest = await this.getTagSuggestions(query, tenantId, limit);
        suggestions.push(...tagSuggest);
      }

      // Sort by score and limit
      const sortedSuggestions = suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      const result: AutocompleteResult = {
        suggestions: sortedSuggestions,
        total: sortedSuggestions.length
      };

      await this.cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
      return result;

    } catch (error) {
      this.loggerService.error('Error getting autocomplete suggestions', error, 'ElasticsearchSearchService');
      return {
        suggestions: [],
        total: 0
      };
    }
  }

  async getSearchAnalytics(tenantId: string, days: number = 7): Promise<SearchAnalytics> {
    const cacheKey = `search_analytics:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get search analytics from database
      const analytics = await this.databaseService.drizzleClient
        .select({
          query: sql`search_query`,
          resultCount: sql`result_count`,
          clickThroughRate: sql`click_through_rate`,
          conversionRate: sql`conversion_rate`,
          averageTime: sql`search_time`,
          filters: sql`applied_filters`
        })
        .from(sql`search_analytics`)
        .where(and(
          sql`tenant_id = ${tenantId}`,
          sql`created_at >= ${startDate}`
        ))
        .orderBy(desc(sql`created_at`))
        .limit(1000);

      // Process analytics data
      const queryStats = new Map();
      let totalSearches = 0;
      let totalClicks = 0;
      let totalConversions = 0;
      let totalTime = 0;

      for (const analytic of analytics) {
        const key = analytic.query;
        const current = queryStats.get(key) || {
          count: 0,
          totalResults: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalTime: 0
        };

        current.count++;
        current.totalResults += analytic.resultCount;
        current.totalClicks += analytic.clickThroughRate * analytic.resultCount;
        current.totalConversions += analytic.conversionRate * analytic.resultCount;
        current.totalTime += analytic.averageTime;

        queryStats.set(key, current);

        totalSearches++;
        totalClicks += analytic.clickThroughRate * analytic.resultCount;
        totalConversions += analytic.conversionRate * analytic.resultCount;
        totalTime += analytic.averageTime;
      }

      // Find zero result queries
      const zeroResultQueries = Array.from(queryStats.entries())
        .filter(([, stats]) => stats.totalResults === 0)
        .map(([query]) => query);

      // Find top performing products
      const topProducts = await this.getTopPerformingProductsFromSearch(tenantId, startDate);

      const result: SearchAnalytics = {
        query: 'aggregate',
        resultCount: totalSearches,
        clickThroughRate: totalSearches > 0 ? totalClicks / totalSearches : 0,
        conversionRate: totalSearches > 0 ? totalConversions / totalSearches : 0,
        averageTime: totalSearches > 0 ? totalTime / totalSearches : 0,
        popularFilters: {}, // Would calculate from filter usage
        zeroResultQueries,
        topPerformingProducts: topProducts
      };

      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;

    } catch (error) {
      this.loggerService.error('Error getting search analytics', error, 'ElasticsearchSearchService');
      return {
        query: '',
        resultCount: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        averageTime: 0,
        popularFilters: {},
        zeroResultQueries: [],
        topPerformingProducts: []
      };
    }
  }

  async getSimilarProducts(productId: string, tenantId: string, limit: number = 10): Promise<SearchResult> {
    const cacheKey = `similar_products:${tenantId}:${productId}:${limit}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Use Elasticsearch more_like_this query
      const esQuery = {
        query: {
          more_like_this: {
            fields: ['name', 'description', 'tags', 'categoryName', 'brandName'],
            like: [
              {
                _index: `products_${tenantId}`,
                _id: productId
              }
            ],
            min_term_freq: 2,
            max_query_terms: 12,
            min_doc_freq: 1
          }
        },
        size: limit,
        sort: [{ _score: { order: 'desc' } }]
      };

      const searchResult = await this.executeSearch(`products_${tenantId}`, esQuery);

      const result: SearchResult = {
        hits: searchResult.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlights: hit.highlight
        })),
        total: searchResult.hits.total.value,
        page: 1,
        totalPages: 1,
        took: searchResult.took
      };

      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;

    } catch (error) {
      this.loggerService.error(`Error getting similar products: ${productId}`, error, 'ElasticsearchSearchService');
      return {
        hits: [],
        total: 0,
        page: 1,
        totalPages: 1,
        took: 0
      };
    }
  }

  async getProductRecommendations(
    customerId: string,
    context: {
      recentProducts?: string[];
      categoryIds?: string[];
      priceRange?: { min: number; max: number };
    },
    tenantId: string,
    limit: number = 10
  ): Promise<SearchResult> {
    const cacheKey = `product_recommendations:${tenantId}:${customerId}:${JSON.stringify(context)}:${limit}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Build recommendation query
      const esQuery = {
        query: {
          bool: {
            should: [
              // Recently viewed categories
              ...(context.categoryIds || []).map(categoryId => ({
                term: { categoryId }
              })),
              // Price range
              ...(context.priceRange ? [{
                range: {
                  price: {
                    gte: context.priceRange.min,
                    lte: context.priceRange.max
                  }
                }
              }] : []),
              // Similar to recent products
              ...(context.recentProducts || []).map(productId => ({
                more_like_this: {
                  fields: ['name', 'description', 'tags'],
                  like: [{ _index: `products_${tenantId}`, _id: productId }],
                  min_term_freq: 1,
                  max_query_terms: 5
                }
              }))
            ],
            minimum_should_match: 1,
            filter: [
              { term: { status: 'active' } },
              { term: { visibility: 'public' } },
              ...(context.recentProducts || []).map(productId => ({
                bool: {
                  must_not: {
                    term: { id: productId }
                  }
                }
              }))
            ]
          }
        },
        size: limit,
        sort: [
          { featured: { order: 'desc' } },
          { _score: { order: 'desc' } },
          { price: { order: 'asc' } }
        ]
      };

      const searchResult = await this.executeSearch(`products_${tenantId}`, esQuery);

      const result: SearchResult = {
        hits: searchResult.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlights: hit.highlight
        })),
        total: searchResult.hits.total.value,
        page: 1,
        totalPages: 1,
        took: searchResult.took
      };

      await this.cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
      return result;

    } catch (error) {
      this.loggerService.error(`Error getting product recommendations: ${customerId}`, error, 'ElasticsearchSearchService');
      return {
        hits: [],
        total: 0,
        page: 1,
        totalPages: 1,
        took: 0
      };
    }
  }

  async searchWithFilters(query: SearchQuery, tenantId: string): Promise<SearchResult> {
    try {
      let searchResult: SearchResult;

      switch (query.searchType) {
        case 'product':
          searchResult = await this.searchProducts(query, tenantId);
          break;
        case 'customer':
          searchResult = await this.searchCustomers(query, tenantId);
          break;
        case 'order':
          searchResult = await this.searchOrders(query, tenantId);
          break;
        default:
          searchResult = await this.searchProducts(query, tenantId);
      }

      return searchResult;

    } catch (error) {
      this.loggerService.error('Error in search with filters', error, 'ElasticsearchSearchService');
      return {
        hits: [],
        total: 0,
        page: 1,
        totalPages: 0,
        took: 0
      };
    }
  }

  // Private helper methods
  private buildProductSearchQuery(query: SearchQuery, tenantId: string): any {
    const mustClauses = [];
    const filterClauses = [
      { term: { status: 'active' } },
      { term: { visibility: 'public' } },
      { term: { tenantId } }
    ];

    // Text search
    if (query.query && query.query.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.query,
          fields: ['name^3', 'description^2', 'sku^2', 'tags', 'categoryName', 'brandName'],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'or'
        }
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    // Filters
    if (query.filters) {
      if (query.filters.categoryIds?.length) {
        filterClauses.push({ terms: { categoryId: query.filters.categoryIds } });
      }

      if (query.filters.brandIds?.length) {
        filterClauses.push({ terms: { brandId: query.filters.brandIds } });
      }

      if (query.filters.priceRange) {
        filterClauses.push({
          range: {
            price: {
              gte: query.filters.priceRange.min,
              lte: query.filters.priceRange.max
            }
          }
        });
      }

      if (query.filters.stockStatus?.length) {
        filterClauses.push({ terms: { stockStatus: query.filters.stockStatus } });
      }

      if (query.filters.tags?.length) {
        filterClauses.push({ terms: { tags: query.filters.tags } });
      }
    }

    // Sorting
    let sortClause = [{ _score: { order: 'desc' } }];
    if (query.sort) {
      sortClause = [{ [query.sort.field]: { order: query.sort.order } }, ...sortClause];
    } else {
      sortClause = [{ featured: { order: 'desc' } }, ...sortClause];
    }

    // Aggregations
    const aggregations = query.includeAggregations ? this.buildProductAggregations() : undefined;

    return {
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses
        }
      },
      sort: sortClause,
      size: query.limit || 20,
      from: ((query.page || 1) - 1) * (query.limit || 20),
      highlight: {
        fields: {
          name: {},
          description: {},
          tags: {}
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      },
      suggest: {
        product_suggest: {
          prefix: query.query,
          completion: {
            field: 'name.suggest',
            size: 5
          }
        }
      },
      ...(aggregations && { aggs: aggregations })
    };
  }

  private buildCustomerSearchQuery(query: SearchQuery, tenantId: string): any {
    const mustClauses = [];
    const filterClauses = [
      { term: { status: 'active' } },
      { term: { tenantId } }
    ];

    // Text search
    if (query.query && query.query.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.query,
          fields: ['firstName^2', 'lastName^2', 'companyName^2', 'email', 'customerNumber'],
          type: 'best_fields'
        }
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    // Filters
    if (query.filters) {
      if (query.filters.tags?.length) {
        filterClauses.push({ terms: { tags: query.filters.tags } });
      }
    }

    // Sorting
    let sortClause = [{ _score: { order: 'desc' } }];
    if (query.sort) {
      sortClause = [{ [query.sort.field]: { order: query.sort.order } }, ...sortClause];
    } else {
      sortClause = [{ totalSpent: { order: 'desc' } }, ...sortClause];
    }

    return {
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses
        }
      },
      sort: sortClause,
      size: query.limit || 20,
      from: ((query.page || 1) - 1) * (query.limit || 20),
      highlight: {
        fields: {
          firstName: {},
          lastName: {},
          companyName: {}
        }
      },
      suggest: {
        customer_suggest: {
          prefix: query.query,
          completion: {
            field: 'firstName.suggest',
            size: 5
          }
        }
      }
    };
  }

  private buildOrderSearchQuery(query: SearchQuery, tenantId: string): any {
    const mustClauses = [];
    const filterClauses = [
      { term: { tenantId } }
    ];

    // Text search
    if (query.query && query.query.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.query,
          fields: ['orderNumber^3', 'customerName^2', 'customerEmail', 'items.productName', 'items.sku'],
          type: 'best_fields'
        }
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    // Filters
    if (query.filters) {
      if (query.filters.tags?.length) {
        filterClauses.push({ terms: { tags: query.filters.tags } });
      }
    }

    // Sorting
    let sortClause = [{ _score: { order: 'desc' } }];
    if (query.sort) {
      sortClause = [{ [query.sort.field]: { order: query.sort.order } }, ...sortClause];
    } else {
      sortClause = [{ createdAt: { order: 'desc' } }];
    }

    return {
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses
        }
      },
      sort: sortClause,
      size: query.limit || 20,
      from: ((query.page || 1) - 1) * (query.limit || 20),
      highlight: {
        fields: {
          orderNumber: {},
          customerName: {},
          'items.productName': {}
        }
      }
    };
  }

  private buildProductAggregations(): any {
    return {
      categories: {
        terms: {
          field: 'categoryName.keyword',
          size: 20
        }
      },
      brands: {
        terms: {
          field: 'brandName.keyword',
          size: 20
        }
      },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { key: '0-50', from: 0, to: 50 },
            { key: '50-100', from: 50, to: 100 },
            { key: '100-200', from: 100, to: 200 },
            { key: '200-500', from: 200, to: 500 },
            { key: '500+', from: 500 }
          ]
        }
      },
      stock_status: {
        terms: {
          field: 'stockStatus',
          size: 10
        }
      },
      tags: {
        terms: {
          field: 'tags',
          size: 20
        }
      }
    };
  }

  private async executeSearch(index: string, query: any): Promise<any> {
    // In real implementation, this would use Elasticsearch client
    this.loggerService.log(`Executing search on index: ${index}`, 'ElasticsearchSearchService');

    // Mock implementation - would use Elasticsearch client
    // return await this.elasticsearchService.search({
    //   index,
    //   body: query
    // });

    // For now, return mock data
    return {
      hits: {
        total: { value: 0 },
        hits: []
      },
      aggregations: {},
      suggest: {},
      took: 0
    };
  }

  private async getProductSuggestions(query: string, tenantId: string, limit: number): Promise<any[]> {
    // Get product autocomplete suggestions
    const suggestions = await this.databaseService.drizzleClient
      .select({
        text: sql`name`,
        score: sql`1.0`,
        type: sql`'product'`,
        payload: sql`json_build_object('id', id, 'sku', sku, 'price', price)`
      })
      .from(sql`products`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`status = 'active'`,
        sql`name ILIKE ${`%${query}%`}`
      ))
      .limit(limit);

    return suggestions;
  }

  private async getCategorySuggestions(query: string, tenantId: string, limit: number): Promise<any[]> {
    // Get category autocomplete suggestions
    const suggestions = await this.databaseService.drizzleClient
      .select({
        text: sql`name`,
        score: sql`1.0`,
        type: sql`'category'`,
        payload: sql`json_build_object('id', id, 'productCount', product_count)`
      })
      .from(sql`categories`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`name ILIKE ${`%${query}%`}`
      ))
      .limit(limit);

    return suggestions;
  }

  private async getBrandSuggestions(query: string, tenantId: string, limit: number): Promise<any[]> {
    // Get brand autocomplete suggestions
    const suggestions = await this.databaseService.drizzleClient
      .select({
        text: sql`name`,
        score: sql`1.0`,
        type: sql`'brand'`,
        payload: sql`json_build_object('id', id, 'productCount', product_count)`
      })
      .from(sql`brands`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`name ILIKE ${`%${query}%`}`
      ))
      .limit(limit);

    return suggestions;
  }

  private async getTagSuggestions(query: string, tenantId: string, limit: number): Promise<any[]> {
    // Get tag autocomplete suggestions
    const suggestions = await this.databaseService.drizzleClient
      .select({
        text: sql`tag`,
        score: sql`1.0`,
        type: sql`'tag'`,
        payload: sql`json_build_object('usageCount', usage_count)`
      })
      .from(sql`product_tags`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`tag ILIKE ${`%${query}%`}`
      ))
      .limit(limit);

    return suggestions;
  }

  private async logSearchAnalytics(query: SearchQuery, result: SearchResult, tenantId: string): Promise<void> {
    try {
      // Log search analytics to database
      await this.databaseService.drizzleClient
        .insert(sql`search_analytics`)
        .values({
          search_query: query.query,
          search_type: query.searchType || 'product',
          result_count: result.total,
          applied_filters: JSON.stringify(query.filters),
          search_time: result.took,
          click_through_rate: 0, // Would be updated when clicks are tracked
          conversion_rate: 0, // Would be updated when conversions are tracked
          tenant_id: tenantId,
          created_at: new Date()
        });

    } catch (error) {
      this.loggerService.error('Error logging search analytics', error, 'ElasticsearchSearchService');
    }
  }

  private async getTopPerformingProductsFromSearch(tenantId: string, startDate: Date): Promise<string[]> {
    // Get top performing products from search data
    const topProducts = await this.databaseService.drizzleClient
      .select({
        productId: sql`product_id`,
        clickCount: sql<number>`SUM(clicks)`,
        conversionCount: sql<number>`SUM(conversions)`
      })
      .from(sql`search_clicks`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= ${startDate}`
      ))
      .groupBy(sql`product_id`)
      .orderBy(sql`SUM(conversions) DESC`)
      .limit(10);

    return topProducts.map(p => p.productId);
  }
}
