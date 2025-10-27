import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';

export interface AutocompleteSuggestion {
  text: string;
  score: number;
  type: 'product' | 'category' | 'brand' | 'tag' | 'customer' | 'order';
  payload?: {
    id: string;
    name?: string;
    sku?: string;
    count?: number;
    image?: string;
    price?: number;
  };
}

export interface SearchSuggestion {
  query: string;
  suggestions: AutocompleteSuggestion[];
  total: number;
  categories: Array<{
    name: string;
    count: number;
    suggestions: AutocompleteSuggestion[];
  }>;
  recentSearches: string[];
  trendingSearches: string[];
  popularProducts: AutocompleteSuggestion[];
}

export interface QueryCompletion {
  completed: string;
  original: string;
  confidence: number;
  suggestions: string[];
}

@Injectable()
export class ElasticsearchAutocompleteService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async getAutocompleteSuggestions(
    query: string,
    types: string[] = ['product', 'category', 'brand', 'tag'],
    tenantId: string = 'default',
    limit: number = 10
  ): Promise<AutocompleteSuggestion[]> {
    const cacheKey = `autocomplete:${tenantId}:${query}:${types.join(',')}:${limit}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      this.loggerService.log(`Getting autocomplete suggestions for: ${query}`, 'ElasticsearchAutocompleteService');

      const allSuggestions: AutocompleteSuggestion[] = [];

      // Product suggestions
      if (types.includes('product')) {
        const productSuggestions = await this.getProductAutocomplete(query, tenantId, Math.ceil(limit / 2));
        allSuggestions.push(...productSuggestions);
      }

      // Category suggestions
      if (types.includes('category')) {
        const categorySuggestions = await this.getCategoryAutocomplete(query, tenantId, Math.ceil(limit / 4));
        allSuggestions.push(...categorySuggestions);
      }

      // Brand suggestions
      if (types.includes('brand')) {
        const brandSuggestions = await this.getBrandAutocomplete(query, tenantId, Math.ceil(limit / 4));
        allSuggestions.push(...brandSuggestions);
      }

      // Tag suggestions
      if (types.includes('tag')) {
        const tagSuggestions = await this.getTagAutocomplete(query, tenantId, Math.ceil(limit / 4));
        allSuggestions.push(...tagSuggestions);
      }

      // Customer suggestions
      if (types.includes('customer')) {
        const customerSuggestions = await this.getCustomerAutocomplete(query, tenantId, Math.ceil(limit / 4));
        allSuggestions.push(...customerSuggestions);
      }

      // Sort by relevance score and limit
      const sortedSuggestions = allSuggestions
        .sort((a, b) => {
          // Prioritize exact matches
          if (a.text.toLowerCase() === query.toLowerCase()) return -1;
          if (b.text.toLowerCase() === query.toLowerCase()) return 1;

          // Then by score
          return b.score - a.score;
        })
        .slice(0, limit);

      await this.cacheService.set(cacheKey, sortedSuggestions, 1800); // Cache for 30 minutes
      return sortedSuggestions;

    } catch (error) {
      this.loggerService.error('Error getting autocomplete suggestions', error, 'ElasticsearchAutocompleteService');
      return [];
    }
  }

  async getSmartSearchSuggestions(
    query: string,
    context: {
      customerId?: string;
      recentSearches?: string[];
      categoryId?: string;
      priceRange?: { min: number; max: number };
    },
    tenantId: string = 'default'
  ): Promise<SearchSuggestion> {
    const cacheKey = `smart_suggestions:${tenantId}:${query}:${JSON.stringify(context)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get basic autocomplete suggestions
      const basicSuggestions = await this.getAutocompleteSuggestions(query, ['product', 'category', 'brand'], tenantId, 8);

      // Get query completions
      const completions = await this.getQueryCompletions(query, tenantId);

      // Get categorized suggestions
      const categories = await this.getCategorizedSuggestions(query, tenantId);

      // Get recent searches
      const recentSearches = context.recentSearches || await this.getRecentSearches(context.customerId, tenantId, 5);

      // Get trending searches
      const trendingSearches = await this.getTrendingSearches(tenantId, 10);

      // Get popular products
      const popularProducts = await this.getPopularProductsForSuggestions(query, tenantId, 4);

      const result: SearchSuggestion = {
        query,
        suggestions: basicSuggestions,
        total: basicSuggestions.length,
        categories,
        recentSearches,
        trendingSearches,
        popularProducts
      };

      await this.cacheService.set(cacheKey, result, 900); // Cache for 15 minutes
      return result;

    } catch (error) {
      this.loggerService.error('Error getting smart search suggestions', error, 'ElasticsearchAutocompleteService');
      return {
        query,
        suggestions: [],
        total: 0,
        categories: [],
        recentSearches: [],
        trendingSearches: [],
        popularProducts: []
      };
    }
  }

  async getQueryCompletions(query: string, tenantId: string): Promise<QueryCompletion[]> {
    const cacheKey = `query_completions:${tenantId}:${query}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get popular search queries that start with the input
      const completions = await this.databaseService.drizzleClient
        .select({
          completedQuery: sql`search_query`,
          frequency: sql<number>`count(*)`,
          avgResults: sql<number>`AVG(result_count)`
        })
        .from(sql`search_analytics`)
        .where(and(
          sql`tenant_id = ${tenantId}`,
          sql`search_query ILIKE ${`${query}%`}`,
          sql`created_at >= CURRENT_DATE - INTERVAL '30 days'`
        ))
        .groupBy(sql`search_query`)
        .orderBy(sql`count(*) DESC`)
        .limit(5);

      const results: QueryCompletion[] = completions.map(comp => ({
        completed: comp.completedQuery,
        original: query,
        confidence: Math.min(1, comp.frequency / 100), // Normalize confidence
        suggestions: comp.completedQuery.split(' ').slice(1) // Remaining words
      }));

      await this.cacheService.set(cacheKey, results, 3600); // Cache for 1 hour
      return results;

    } catch (error) {
      this.loggerService.error('Error getting query completions', error, 'ElasticsearchAutocompleteService');
      return [];
    }
  }

  async getPersonalizedSuggestions(
    customerId: string,
    context: {
      recentProducts?: string[];
      recentSearches?: string[];
      purchaseHistory?: string[];
      preferences?: Record<string, any>;
    },
    tenantId: string = 'default',
    limit: number = 10
  ): Promise<AutocompleteSuggestion[]> {
    const cacheKey = `personalized_suggestions:${tenantId}:${customerId}:${JSON.stringify(context)}:${limit}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const suggestions: AutocompleteSuggestion[] = [];

      // Get customer's recent searches
      const recentSearches = context.recentSearches || await this.getCustomerRecentSearches(customerId, tenantId, 5);

      // Get customer's purchase history based suggestions
      if (context.purchaseHistory && context.purchaseHistory.length > 0) {
        const purchaseBasedSuggestions = await this.getPurchaseBasedSuggestions(context.purchaseHistory, tenantId, limit);
        suggestions.push(...purchaseBasedSuggestions);
      }

      // Get customer's preferred category suggestions
      const preferredCategories = await this.getCustomerPreferredCategories(customerId, tenantId);
      if (preferredCategories.length > 0) {
        const categorySuggestions = await this.getCategoryBasedSuggestions(preferredCategories, tenantId, limit);
        suggestions.push(...categorySuggestions);
      }

      // Get trending products in customer's preferred categories
      if (preferredCategories.length > 0) {
        const trendingSuggestions = await this.getTrendingInCategories(preferredCategories, tenantId, limit);
        suggestions.push(...trendingSuggestions);
      }

      // Remove duplicates and limit
      const uniqueSuggestions = this.deduplicateSuggestions(suggestions, limit);

      await this.cacheService.set(cacheKey, uniqueSuggestions, 1800); // Cache for 30 minutes
      return uniqueSuggestions;

    } catch (error) {
      this.loggerService.error(`Error getting personalized suggestions: ${customerId}`, error, 'ElasticsearchAutocompleteService');
      return [];
    }
  }

  async getSearchSuggestionsWithContext(
    query: string,
    context: {
      customerId?: string;
      sessionId?: string;
      currentCategory?: string;
      currentFilters?: Record<string, any>;
      recentActions?: string[];
    },
    tenantId: string = 'default'
  ): Promise<SearchSuggestion> {
    try {
      // Get basic suggestions
      const basicSuggestions = await this.getAutocompleteSuggestions(query, ['product', 'category', 'brand'], tenantId, 6);

      // Get personalized suggestions if customer context available
      let personalizedSuggestions: AutocompleteSuggestion[] = [];
      if (context.customerId) {
        personalizedSuggestions = await this.getPersonalizedSuggestions(
          context.customerId,
          {
            recentProducts: context.recentActions?.filter(action => action.startsWith('view_product_')).map(action => action.replace('view_product_', '')),
            recentSearches: context.recentActions?.filter(action => action.startsWith('search_')).map(action => action.replace('search_', ''))
          },
          tenantId,
          4
        );
      }

      // Get contextual suggestions based on current category/filters
      const contextualSuggestions = await this.getContextualSuggestions(query, context, tenantId, 4);

      // Combine all suggestions
      const allSuggestions = [...basicSuggestions, ...personalizedSuggestions, ...contextualSuggestions];

      // Get categories
      const categories = await this.getCategorizedSuggestions(query, tenantId);

      // Get recent and trending searches
      const recentSearches = context.customerId
        ? await this.getCustomerRecentSearches(context.customerId, tenantId, 5)
        : await this.getRecentSearches(context.customerId, tenantId, 5);

      const trendingSearches = await this.getTrendingSearches(tenantId, 10);

      const result: SearchSuggestion = {
        query,
        suggestions: this.deduplicateSuggestions(allSuggestions, 10),
        total: allSuggestions.length,
        categories,
        recentSearches,
        trendingSearches,
        popularProducts: await this.getPopularProductsForSuggestions(query, tenantId, 4)
      };

      return result;

    } catch (error) {
      this.loggerService.error('Error getting search suggestions with context', error, 'ElasticsearchAutocompleteService');
      return {
        query,
        suggestions: [],
        total: 0,
        categories: [],
        recentSearches: [],
        trendingSearches: [],
        popularProducts: []
      };
    }
  }

  async trackSearchClick(
    query: string,
    productId: string,
    position: number,
    customerId?: string,
    sessionId?: string,
    tenantId: string = 'default'
  ): Promise<void> {
    try {
      // Track search click for analytics
      await this.databaseService.drizzleClient
        .insert(sql`search_clicks`)
        .values({
          search_query: query,
          product_id: productId,
          click_position: position,
          customer_id: customerId,
          session_id: sessionId,
          tenant_id: tenantId,
          created_at: new Date()
        });

      // Update search analytics
      await this.updateSearchClickThroughRate(query, tenantId);

      this.loggerService.log(`Search click tracked: ${query} -> ${productId} (position ${position})`, 'ElasticsearchAutocompleteService');

    } catch (error) {
      this.loggerService.error('Error tracking search click', error, 'ElasticsearchAutocompleteService');
    }
  }

  async trackSearchConversion(
    query: string,
    orderId: string,
    revenue: number,
    customerId?: string,
    tenantId: string = 'default'
  ): Promise<void> {
    try {
      // Track search conversion for analytics
      await this.databaseService.drizzleClient
        .insert(sql`search_conversions`)
        .values({
          search_query: query,
          order_id: orderId,
          revenue,
          customer_id: customerId,
          tenant_id: tenantId,
          created_at: new Date()
        });

      // Update search analytics
      await this.updateSearchConversionRate(query, tenantId);

    } catch (error) {
      this.loggerService.error('Error tracking search conversion', error, 'ElasticsearchAutocompleteService');
    }
  }

  // Private helper methods
  private async getProductAutocomplete(query: string, tenantId: string, limit: number): Promise<AutocompleteSuggestion[]> {
    // Get product autocomplete suggestions
    const products = await this.databaseService.drizzleClient
      .select({
        text: sql`name`,
        score: sql`1.0 + (featured::int * 0.5) + (stock_quantity / 1000.0)`,
        type: sql`'product'`,
        payload: sql`json_build_object(
          'id', id,
          'sku', sku,
          'name', name,
          'price', price,
          'image', (SELECT url FROM product_images WHERE product_id = products.id ORDER BY sort_order LIMIT 1)
        )`
      })
      .from(sql`products`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`status = 'active'`,
        sql`name ILIKE ${`%${query}%`}`
      ))
      .orderBy(sql`name`)
      .limit(limit);

    return products.map(p => ({
      text: p.text,
      score: Number(p.score) || 0,
      type: p.type as any,
      payload: p.payload as any
    }));
  }

  private async getCategoryAutocomplete(query: string, tenantId: string, limit: number): Promise<AutocompleteSuggestion[]> {
    // Get category autocomplete suggestions
    const categories = await this.databaseService.drizzleClient
      .select({
        text: sql`name`,
        score: sql`1.0 + (product_count / 100.0)`,
        type: sql`'category'`,
        payload: sql`json_build_object('id', id, 'name', name, 'count', product_count)`
      })
      .from(sql`categories`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`name ILIKE ${`%${query}%`}`
      ))
      .orderBy(sql`product_count DESC`)
      .limit(limit);

    return categories.map(c => ({
      text: c.text,
      score: Number(c.score) || 0,
      type: c.type as any,
      payload: c.payload as any
    }));
  }

  private async getBrandAutocomplete(query: string, tenantId: string, limit: number): Promise<AutocompleteSuggestion[]> {
    // Get brand autocomplete suggestions
    const brands = await this.databaseService.drizzleClient
      .select({
        text: sql`name`,
        score: sql`1.0 + (product_count / 100.0)`,
        type: sql`'brand'`,
        payload: sql`json_build_object('id', id, 'name', name, 'count', product_count)`
      })
      .from(sql`brands`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`name ILIKE ${`%${query}%`}`
      ))
      .orderBy(sql`product_count DESC`)
      .limit(limit);

    return brands.map(b => ({
      text: b.text,
      score: Number(b.score) || 0,
      type: b.type as any,
      payload: b.payload as any
    }));
  }

  private async getTagAutocomplete(query: string, tenantId: string, limit: number): Promise<AutocompleteSuggestion[]> {
    // Get tag autocomplete suggestions
    const tags = await this.databaseService.drizzleClient
      .select({
        text: sql`tag`,
        score: sql`usage_count`,
        type: sql`'tag'`,
        payload: sql`json_build_object('count', usage_count)`
      })
      .from(sql`product_tags`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`tag ILIKE ${`%${query}%`}`
      ))
      .orderBy(sql`usage_count DESC`)
      .limit(limit);

    return tags.map(t => ({
      text: t.text,
      score: Number(t.score) || 0,
      type: t.type as any,
      payload: t.payload as any
    }));
  }

  private async getCustomerAutocomplete(query: string, tenantId: string, limit: number): Promise<AutocompleteSuggestion[]> {
    // Get customer autocomplete suggestions
    const customers = await this.databaseService.drizzleClient
      .select({
        text: sql`CONCAT(first_name, ' ', last_name, ' (', email, ')')`,
        score: sql`1.0 + (total_orders / 10.0) + (total_spent / 1000.0)`,
        type: sql`'customer'`,
        payload: sql`json_build_object(
          'id', id,
          'name', CONCAT(first_name, ' ', last_name),
          'email', email,
          'totalOrders', total_orders,
          'totalSpent', total_spent
        )`
      })
      .from(sql`customers`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`status = 'active'`,
        or(
          sql`first_name ILIKE ${`%${query}%`}`,
          sql`last_name ILIKE ${`%${query}%`}`,
          sql`email ILIKE ${`%${query}%`}`,
          sql`customer_number ILIKE ${`%${query}%`}`
        )
      ))
      .orderBy(sql`total_spent DESC`)
      .limit(limit);

    return customers.map(c => ({
      text: c.text,
      score: Number(c.score) || 0,
      type: c.type as any,
      payload: c.payload as any
    }));
  }

  private async getCategorizedSuggestions(query: string, tenantId: string): Promise<Array<{
    name: string;
    count: number;
    suggestions: AutocompleteSuggestion[];
  }>> {
    // Get suggestions categorized by type
    const categories = [
      { name: 'Products', suggestions: await this.getProductAutocomplete(query, tenantId, 3) },
      { name: 'Categories', suggestions: await this.getCategoryAutocomplete(query, tenantId, 2) },
      { name: 'Brands', suggestions: await this.getBrandAutocomplete(query, tenantId, 2) }
    ];

    return categories.filter(cat => cat.suggestions.length > 0);
  }

  private async getRecentSearches(customerId: string | undefined, tenantId: string, limit: number): Promise<string[]> {
    // Get recent search queries
    let whereClause = sql`tenant_id = ${tenantId}`;

    if (customerId) {
      whereClause = and(whereClause, sql`customer_id = ${customerId}`);
    }

    const recentSearches = await this.databaseService.drizzleClient
      .select({ query: sql`search_query` })
      .from(sql`search_analytics`)
      .where(and(
        whereClause,
        sql`created_at >= CURRENT_DATE - INTERVAL '7 days'`
      ))
      .groupBy(sql`search_query`)
      .orderBy(sql`MAX(created_at) DESC`)
      .limit(limit);

    return recentSearches.map(s => s.query);
  }

  private async getTrendingSearches(tenantId: string, limit: number): Promise<string[]> {
    // Get trending search queries in last 24 hours
    const trendingSearches = await this.databaseService.drizzleClient
      .select({
        query: sql`search_query`,
        frequency: sql<number>`count(*)`
      })
      .from(sql`search_analytics`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= CURRENT_DATE - INTERVAL '24 hours'`
      ))
      .groupBy(sql`search_query`)
      .orderBy(sql`count(*) DESC`)
      .limit(limit);

    return trendingSearches.map(s => s.query);
  }

  private async getPopularProductsForSuggestions(query: string, tenantId: string, limit: number): Promise<AutocompleteSuggestion[]> {
    // Get popular products matching search query
    const products = await this.databaseService.drizzleClient
      .select({
        text: sql`name`,
        score: sql`1.0 + (featured::int * 0.3) + (stock_quantity / 1000.0)`,
        type: sql`'product'`,
        payload: sql`json_build_object(
          'id', id,
          'sku', sku,
          'name', name,
          'price', price,
          'image', (SELECT url FROM product_images WHERE product_id = products.id ORDER BY sort_order LIMIT 1)
        )`
      })
      .from(sql`products`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`status = 'active'`,
        sql`featured = true`,
        or(
          sql`name ILIKE ${`%${query}%`}`,
          sql`sku ILIKE ${`%${query}%`}`
        )
      ))
      .orderBy(sql`name`)
      .limit(limit);

    return products.map(p => ({
      text: p.text,
      score: Number(p.score) || 0,
      type: p.type as any,
      payload: p.payload as any
    }));
  }

  private async getCustomerRecentSearches(customerId: string, tenantId: string, limit: number): Promise<string[]> {
    // Get customer's recent searches
    const searches = await this.databaseService.drizzleClient
      .select({ query: sql`search_query` })
      .from(sql`search_analytics`)
      .where(and(
        sql`customer_id = ${customerId}`,
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= CURRENT_DATE - INTERVAL '30 days'`
      ))
      .groupBy(sql`search_query`)
      .orderBy(sql`MAX(created_at) DESC`)
      .limit(limit);

    return searches.map(s => s.query);
  }

  private async getPurchaseBasedSuggestions(purchaseHistory: string[], tenantId: string, limit: number): Promise<AutocompleteSuggestion[]> {
    // Get suggestions based on customer's purchase history
    const suggestions = await this.databaseService.drizzleClient
      .select({
        text: sql`p.name`,
        score: sql`1.0 + (COUNT(*) / 10.0)`,
        type: sql`'product'`,
        payload: sql`json_build_object('id', p.id, 'sku', p.sku, 'price', p.price)`
      })
      .from(sql`products p`)
      .innerJoin(sql`order_items oi`, sql`oi.product_id = p.id`)
      .innerJoin(sql`orders o`, sql`oi.order_id = o.id`)
      .where(and(
        sql`o.tenant_id = ${tenantId}`,
        sql`o.customer_id IN (${purchaseHistory.join(',')})`,
        sql`p.status = 'active'`,
        sql`p.id NOT IN (${purchaseHistory.join(',')})` // Exclude already purchased
      ))
      .groupBy(sql`p.id`, sql`p.name`, sql`p.sku`, sql`p.price`)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(limit);

    return suggestions.map(s => ({
      text: s.text,
      score: Number(s.score) || 0,
      type: s.type as any,
      payload: s.payload as any
    }));
  }

  private async getCategoryBasedSuggestions(categoryIds: string[], tenantId: string, limit: number): Promise<AutocompleteSuggestion[]> {
    // Get suggestions from customer's preferred categories
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
        sql`category_id IN (${categoryIds.join(',')})`,
        sql`status = 'active'`,
        sql`featured = true`
      ))
      .orderBy(sql`price`)
      .limit(limit);

    return suggestions.map(s => ({
      text: s.text,
      score: Number(s.score) || 0,
      type: s.type as any,
      payload: s.payload as any
    }));
  }

  private async getTrendingInCategories(categoryIds: string[], tenantId: string, limit: number): Promise<AutocompleteSuggestion[]> {
    // Get trending products in customer's preferred categories
    return await this.getCategoryBasedSuggestions(categoryIds, tenantId, limit);
  }

  private async getContextualSuggestions(
    query: string,
    context: any,
    tenantId: string,
    limit: number
  ): Promise<AutocompleteSuggestion[]> {
    // Get suggestions based on current context (category, filters, etc.)
    const suggestions: AutocompleteSuggestion[] = [];

    if (context.currentCategory) {
      const categoryProducts = await this.databaseService.drizzleClient
        .select({
          text: sql`name`,
          score: sql`1.0 + (featured::int * 0.2)`,
          type: sql`'product'`,
          payload: sql`json_build_object('id', id, 'sku', sku, 'price', price)`
        })
        .from(sql`products`)
        .where(and(
          sql`tenant_id = ${tenantId}`,
          sql`category_id = ${context.currentCategory}`,
          sql`status = 'active'`,
          sql`name ILIKE ${`%${query}%`}`
        ))
        .orderBy(sql`featured DESC`, sql`name`)
        .limit(limit);

      suggestions.push(...categoryProducts.map(p => ({
        text: p.text,
        score: Number(p.score) || 0,
        type: p.type as any,
        payload: p.payload as any
      })));
    }

    return suggestions.slice(0, limit);
  }

  private deduplicateSuggestions(suggestions: AutocompleteSuggestion[], limit: number): AutocompleteSuggestion[] {
    // Remove duplicate suggestions and limit results
    const seen = new Set();
    const uniqueSuggestions: AutocompleteSuggestion[] = [];

    for (const suggestion of suggestions) {
      if (!seen.has(suggestion.text) && uniqueSuggestions.length < limit) {
        seen.add(suggestion.text);
        uniqueSuggestions.push(suggestion);
      }
    }

    return uniqueSuggestions;
  }

  private async updateSearchClickThroughRate(query: string, tenantId: string): Promise<void> {
    // Update click-through rate for search query
    this.loggerService.log(`Updating CTR for query: ${query}`, 'ElasticsearchAutocompleteService');
  }

  private async updateSearchConversionRate(query: string, tenantId: string): Promise<void> {
    // Update conversion rate for search query
    this.loggerService.log(`Updating conversion rate for query: ${query}`, 'ElasticsearchAutocompleteService');
  }

  private async getCustomerPreferredCategories(customerId: string, tenantId: string): Promise<string[]> {
    // Get customer's preferred product categories based on purchase history
    const categories = await this.databaseService.drizzleClient
      .select({
        categoryId: sql`p.category_id`,
        purchaseCount: sql<number>`count(*)`,
        totalSpent: sql<number>`SUM(oi.price * oi.quantity)`
      })
      .from(sql`orders o`)
      .innerJoin(sql`order_items oi`, sql`oi.order_id = o.id`)
      .innerJoin(sql`products p`, sql`oi.product_id = p.id`)
      .where(and(
        sql`o.customer_id = ${customerId}`,
        sql`o.tenant_id = ${tenantId}`,
        sql`o.status NOT IN ('cancelled', 'refunded')`,
        sql`o.created_at >= CURRENT_DATE - INTERVAL '365 days'`
      ))
      .groupBy(sql`p.category_id`)
      .orderBy(sql`SUM(oi.price * oi.quantity) DESC`)
      .limit(3);

    return categories.map(c => c.categoryId);
  }
}
