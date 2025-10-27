import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, desc, gte } from 'drizzle-orm';

export interface ProductRecommendation {
  productId: string;
  productName: string;
  sku: string;
  score: number;
  reason: string;
  type: 'collaborative' | 'content_based' | 'trending' | 'similar' | 'frequently_bought';
  metadata: Record<string, any>;
}

export interface RecommendationContext {
  customerId?: string;
  sessionId?: string;
  productIds?: string[]; // Products currently viewed/bought
  categoryIds?: string[];
  searchQuery?: string;
  priceRange?: { min: number; max: number };
  limit?: number;
  excludeProductIds?: string[];
}

export interface CollaborativeFilteringModel {
  userId: string;
  productId: string;
  rating: number;
  weight: number;
  timestamp: Date;
}

export interface ContentBasedSimilarity {
  productId: string;
  similarProductId: string;
  similarityScore: number;
  similarityFactors: {
    category: number;
    brand: number;
    price: number;
    attributes: number;
    description: number;
  };
}

@Injectable()
export class AIProductRecommendationsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async getProductRecommendations(
    context: RecommendationContext,
    tenantId: string = 'default'
  ): Promise<ProductRecommendation[]> {
    const cacheKey = `product_recommendations:${tenantId}:${JSON.stringify(context)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const recommendations: ProductRecommendation[] = [];
    const limit = context.limit || 10;

    try {
      // Collaborative filtering recommendations
      if (context.customerId) {
        const collaborativeRecs = await this.getCollaborativeRecommendations(context.customerId, tenantId, limit);
        recommendations.push(...collaborativeRecs);
      }

      // Content-based recommendations
      const contentBasedRecs = await this.getContentBasedRecommendations(context, tenantId, limit);
      recommendations.push(...contentBasedRecs);

      // Trending products
      const trendingRecs = await this.getTrendingProducts(tenantId, limit);
      recommendations.push(...trendingRecs);

      // Frequently bought together
      if (context.productIds && context.productIds.length > 0) {
        const togetherRecs = await this.getFrequentlyBoughtTogether(context.productIds, tenantId, limit);
        recommendations.push(...togetherRecs);
      }

      // Remove duplicates and excluded products
      const uniqueRecommendations = this.deduplicateRecommendations(recommendations, context.excludeProductIds);

      // Sort by score and limit
      const sortedRecommendations = uniqueRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      await this.cacheService.set(cacheKey, sortedRecommendations, 1800); // Cache for 30 minutes
      return sortedRecommendations;

    } catch (error) {
      this.loggerService.error('Error getting product recommendations', error, 'AIProductRecommendationsService');
      return [];
    }
  }

  async getCollaborativeRecommendations(
    customerId: string,
    tenantId: string,
    limit: number = 10
  ): Promise<ProductRecommendation[]> {
    try {
      // Get customer's purchase history and ratings
      const customerInteractions = await this.getCustomerInteractions(customerId, tenantId);

      if (customerInteractions.length === 0) {
        return [];
      }

      // Find similar customers based on purchase patterns
      const similarCustomers = await this.findSimilarCustomers(customerId, tenantId, 10);

      // Get products bought by similar customers but not by current customer
      const recommendedProducts = new Map<string, number>();

      for (const similarCustomer of similarCustomers) {
        const similarCustomerProducts = await this.getCustomerProducts(similarCustomer.customerId, tenantId);

        for (const product of similarCustomerProducts) {
          if (!customerInteractions.some(p => p.productId === product.productId)) {
            const currentScore = recommendedProducts.get(product.productId) || 0;
            recommendedProducts.set(product.productId, currentScore + product.weight);
          }
        }
      }

      // Convert to recommendation format
      const recommendations: ProductRecommendation[] = [];
      for (const [productId, score] of recommendedProducts) {
        if (recommendations.length >= limit) break;

        const product = await this.getProductDetails(productId);
        if (product) {
          recommendations.push({
            productId,
            productName: product.name,
            sku: product.sku,
            score: score / 100, // Normalize score
            reason: 'Customers with similar preferences also bought this',
            type: 'collaborative',
            metadata: {
              similarityScore: score / 100,
              basedOnCustomers: similarCustomers.length
            }
          });
        }
      }

      return recommendations;

    } catch (error) {
      this.loggerService.error('Error getting collaborative recommendations', error, 'AIProductRecommendationsService');
      return [];
    }
  }

  async getContentBasedRecommendations(
    context: RecommendationContext,
    tenantId: string,
    limit: number = 10
  ): Promise<ProductRecommendation[]> {
    try {
      let baseProducts: any[] = [];

      // Get base products from context
      if (context.productIds && context.productIds.length > 0) {
        baseProducts = await this.getProductsByIds(context.productIds, tenantId);
      } else if (context.categoryIds && context.categoryIds.length > 0) {
        baseProducts = await this.getProductsByCategories(context.categoryIds, tenantId);
      } else {
        // Get popular products as fallback
        baseProducts = await this.getPopularProducts(tenantId, 5);
      }

      const recommendations: ProductRecommendation[] = [];

      for (const baseProduct of baseProducts) {
        // Find similar products based on content similarity
        const similarProducts = await this.findSimilarProducts(baseProduct.id, tenantId, limit);

        for (const similar of similarProducts) {
          if (recommendations.length >= limit) break;

          // Check if already recommended
          const exists = recommendations.some(r => r.productId === similar.productId);
          if (exists) continue;

          recommendations.push({
            productId: similar.productId,
            productName: similar.name,
            sku: similar.sku,
            score: similar.similarityScore,
            reason: `Similar to ${baseProduct.name}`,
            type: 'content_based',
            metadata: {
              similarityFactors: similar.similarityFactors,
              baseProductId: baseProduct.id,
              baseProductName: baseProduct.name
            }
          });
        }

        if (recommendations.length >= limit) break;
      }

      return recommendations.slice(0, limit);

    } catch (error) {
      this.loggerService.error('Error getting content-based recommendations', error, 'AIProductRecommendationsService');
      return [];
    }
  }

  async getTrendingProducts(tenantId: string, limit: number = 10): Promise<ProductRecommendation[]> {
    const cacheKey = `trending_products:${tenantId}:${limit}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get products with highest sales velocity in last 7 days
      const trendingProducts = await this.databaseService.drizzleClient
        .select({
          productId: sql`oi.product_id`,
          productName: sql`p.name`,
          sku: sql`p.sku`,
          salesCount: sql<number>`count(*)`,
          totalRevenue: sql<number>`sum(oi.quantity * oi.price)`,
          velocityScore: sql<number>`count(*) / 7.0` // Sales per day
        })
        .from(sql`order_items oi`)
        .leftJoin(sql`products p`, sql`oi.product_id = p.id`)
        .where(and(
          sql`oi.created_at >= CURRENT_DATE - INTERVAL '7 days'`,
          sql`p.tenant_id = ${tenantId}`,
          sql`p.status = 'active'`
        ))
        .groupBy(sql`oi.product_id`, sql`p.name`, sql`p.sku`)
        .orderBy(sql`count(*) DESC`)
        .limit(limit);

      const recommendations: ProductRecommendation[] = trendingProducts.map(product => ({
        productId: product.productId,
        productName: product.productName,
        sku: product.sku,
        score: product.velocityScore,
        reason: 'Trending product',
        type: 'trending',
        metadata: {
          salesCount: product.salesCount,
          totalRevenue: product.totalRevenue,
          velocityScore: product.velocityScore
        }
      }));

      await this.cacheService.set(cacheKey, recommendations, 3600); // Cache for 1 hour
      return recommendations;

    } catch (error) {
      this.loggerService.error('Error getting trending products', error, 'AIProductRecommendationsService');
      return [];
    }
  }

  async getFrequentlyBoughtTogether(
    productIds: string[],
    tenantId: string,
    limit: number = 10
  ): Promise<ProductRecommendation[]> {
    try {
      // Find products frequently bought together with the given products
      const togetherProducts = await this.databaseService.drizzleClient
        .select({
          productId: sql`oi2.product_id`,
          productName: sql`p.name`,
          sku: sql`p.sku`,
          frequency: sql<number>`count(*)`,
          confidence: sql<number>`count(*)::float / (SELECT count(*) FROM order_items oi3 WHERE oi3.order_id = oi.order_id) * 100`
        })
        .from(sql`order_items oi`)
        .innerJoin(sql`order_items oi2`, sql`oi.order_id = oi2.order_id`)
        .leftJoin(sql`products p`, sql`oi2.product_id = p.id`)
        .where(and(
          sql`oi.product_id IN (${productIds.join(',')})`,
          sql`oi2.product_id NOT IN (${productIds.join(',')})`,
          sql`p.tenant_id = ${tenantId}`,
          sql`p.status = 'active'`,
          sql`oi.created_at >= CURRENT_DATE - INTERVAL '90 days'`
        ))
        .groupBy(sql`oi2.product_id`, sql`p.name`, sql`p.sku`, sql`oi.order_id`)
        .orderBy(sql`count(*) DESC`)
        .limit(limit);

      const recommendations: ProductRecommendation[] = togetherProducts.map(product => ({
        productId: product.productId,
        productName: product.productName,
        sku: product.sku,
        score: product.confidence / 100,
        reason: 'Frequently bought together',
        type: 'frequently_bought',
        metadata: {
          frequency: product.frequency,
          confidence: product.confidence
        }
      }));

      return recommendations;

    } catch (error) {
      this.loggerService.error('Error getting frequently bought together', error, 'AIProductRecommendationsService');
      return [];
    }
  }

  async getSimilarProducts(
    productId: string,
    tenantId: string,
    limit: number = 10
  ): Promise<ProductRecommendation[]> {
    const cacheKey = `similar_products:${tenantId}:${productId}:${limit}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const product = await this.getProductDetails(productId);
      if (!product) {
        return [];
      }

      // Find products in same category
      const categoryProducts = await this.databaseService.drizzleClient
        .select({
          productId: sql`p.id`,
          productName: sql`p.name`,
          sku: sql`p.sku`,
          similarityScore: sql`CASE
            WHEN p.brand_id = ${product.brandId} THEN 0.8
            WHEN p.category_id = ${product.categoryId} THEN 0.6
            ELSE 0.3
          END`,
          priceDifference: sql`ABS(p.price - ${product.price}) / GREATEST(p.price, ${product.price})`
        })
        .from(sql`products p`)
        .where(and(
          sql`p.id != ${productId}`,
          sql`p.tenant_id = ${tenantId}`,
          sql`p.status = 'active'`,
          sql`p.category_id = ${product.categoryId}`
        ))
        .orderBy(sql`p.price`)
        .limit(limit * 2); // Get more to filter later

      // Calculate final similarity scores
      const recommendations: ProductRecommendation[] = categoryProducts.map(p => ({
        productId: p.productId,
        productName: p.productName,
        sku: p.sku,
        score: Math.max(0, p.similarityScore - (p.priceDifference * 0.2)), // Penalize large price differences
        reason: `Similar to ${product.name}`,
        type: 'similar',
        metadata: {
          categoryMatch: true,
          priceDifference: p.priceDifference,
          brandMatch: p.brandId === product.brandId
        }
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

      await this.cacheService.set(cacheKey, recommendations, 3600); // Cache for 1 hour
      return recommendations;

    } catch (error) {
      this.loggerService.error('Error getting similar products', error, 'AIProductRecommendationsService');
      return [];
    }
  }

  async trainRecommendationModel(tenantId: string): Promise<void> {
    try {
      this.loggerService.log('Starting recommendation model training', 'AIProductRecommendationsService');

      // Build collaborative filtering model
      await this.buildCollaborativeFilteringModel(tenantId);

      // Build content-based similarity model
      await this.buildContentBasedSimilarityModel(tenantId);

      // Update trending products cache
      await this.updateTrendingProductsCache(tenantId);

      this.loggerService.log('Recommendation model training completed', 'AIProductRecommendationsService');

    } catch (error) {
      this.loggerService.error('Error training recommendation model', error, 'AIProductRecommendationsService');
    }
  }

  // Private helper methods
  private async getCustomerInteractions(customerId: string, tenantId: string): Promise<any[]> {
    // Get customer's order history and product interactions
    const interactions = await this.databaseService.drizzleClient
      .select({
        productId: sql`oi.product_id`,
        quantity: sql`oi.quantity`,
        price: sql`oi.price`,
        orderDate: sql`oi.created_at`,
        rating: sql`5.0` // Mock rating - would come from reviews
      })
      .from(sql`order_items oi`)
      .innerJoin(sql`orders o`, sql`oi.order_id = o.id`)
      .where(and(
        sql`o.customer_id = ${customerId}`,
        sql`o.tenant_id = ${tenantId}`,
        sql`o.status NOT IN ('cancelled', 'refunded')`,
        sql`oi.created_at >= CURRENT_DATE - INTERVAL '365 days'`
      ))
      .orderBy(desc(sql`oi.created_at`));

    return interactions;
  }

  private async findSimilarCustomers(customerId: string, tenantId: string, limit: number): Promise<any[]> {
    // Find customers with similar purchase patterns
    // This is a simplified implementation - real implementation would use ML algorithms

    const targetCustomerPurchases = await this.databaseService.drizzleClient
      .select({
        categoryId: sql`p.category_id`,
        categoryCount: sql<number>`count(*)`
      })
      .from(sql`order_items oi`)
      .innerJoin(sql`orders o`, sql`oi.order_id = o.id`)
      .innerJoin(sql`products p`, sql`oi.product_id = p.id`)
      .where(and(
        sql`o.customer_id = ${customerId}`,
        sql`o.tenant_id = ${tenantId}`,
        sql`o.status NOT IN ('cancelled', 'refunded')`
      ))
      .groupBy(sql`p.category_id`)
      .orderBy(sql`count(*) DESC`);

    // Find customers with similar category preferences
    const similarCustomers = await this.databaseService.drizzleClient
      .select({
        customerId: sql`o2.customer_id`,
        similarityScore: sql`SUM(CASE WHEN p2.category_id = p.category_id THEN 1 ELSE 0 END)`,
        totalPurchases: sql<number>`count(*)`
      })
      .from(sql`orders o2`)
      .innerJoin(sql`order_items oi2`, sql`oi2.order_id = o2.id`)
      .innerJoin(sql`products p2`, sql`oi2.product_id = p2.id`)
      .where(and(
        sql`o2.customer_id != ${customerId}`,
        sql`o2.tenant_id = ${tenantId}`,
        sql`o2.status NOT IN ('cancelled', 'refunded')`,
        sql`o2.created_at >= CURRENT_DATE - INTERVAL '365 days'`
      ))
      .groupBy(sql`o2.customer_id`)
      .having(sql`count(*) >= 3`) // Customers with at least 3 purchases
      .orderBy(sql`SUM(CASE WHEN p2.category_id = p.category_id THEN 1 ELSE 0 END) DESC`)
      .limit(limit);

    return similarCustomers;
  }

  private async getCustomerProducts(customerId: string, tenantId: string): Promise<any[]> {
    const products = await this.databaseService.drizzleClient
      .select({
        productId: sql`oi.product_id`,
        productName: sql`p.name`,
        sku: sql`p.sku`,
        categoryId: sql`p.category_id`,
        purchaseCount: sql<number>`count(*)`,
        totalQuantity: sql<number>`sum(oi.quantity)`,
        lastPurchase: sql`max(oi.created_at)`
      })
      .from(sql`order_items oi`)
      .innerJoin(sql`orders o`, sql`oi.order_id = o.id`)
      .innerJoin(sql`products p`, sql`oi.product_id = p.id`)
      .where(and(
        sql`o.customer_id = ${customerId}`,
        sql`o.tenant_id = ${tenantId}`,
        sql`o.status NOT IN ('cancelled', 'refunded')`
      ))
      .groupBy(sql`oi.product_id`, sql`p.name`, sql`p.sku`, sql`p.category_id`)
      .orderBy(sql`count(*) DESC`);

    return products;
  }

  private async findSimilarProducts(productId: string, tenantId: string, limit: number): Promise<any[]> {
    const product = await this.getProductDetails(productId);
    if (!product) return [];

    // Find products with similar attributes
    const similarProducts = await this.databaseService.drizzleClient
      .select({
        productId: sql`p.id`,
        name: sql`p.name`,
        sku: sql`p.sku`,
        categoryId: sql`p.category_id`,
        brandId: sql`p.brand_id`,
        price: sql`p.price`,
        similarityScore: sql`CASE
          WHEN p.brand_id = ${product.brandId} THEN 0.8
          WHEN p.category_id = ${product.categoryId} THEN 0.6
          ELSE 0.3
        END`,
        priceSimilarity: sql`1 - ABS(p.price - ${product.price}) / GREATEST(p.price, ${product.price})`
      })
      .from(sql`products p`)
      .where(and(
        sql`p.id != ${productId}`,
        sql`p.tenant_id = ${tenantId}`,
        sql`p.status = 'active'`
      ))
      .orderBy(sql`CASE
        WHEN p.brand_id = ${product.brandId} THEN 0.8
        WHEN p.category_id = ${product.categoryId} THEN 0.6
        ELSE 0.3
      END DESC`)
      .limit(limit * 2);

    // Calculate final similarity scores combining multiple factors
    return similarProducts.map(p => ({
      productId: p.productId,
      name: p.name,
      sku: p.sku,
      similarityScore: Math.min(1, p.similarityScore * (p.priceSimilarity * 0.5 + 0.5)),
      similarityFactors: {
        category: p.categoryId === product.categoryId ? 1 : 0,
        brand: p.brandId === product.brandId ? 1 : 0,
        price: p.priceSimilarity,
        attributes: 0.5, // Would calculate from actual attributes
        description: 0.3 // Would calculate from text similarity
      }
    }));
  }

  private async buildCollaborativeFilteringModel(tenantId: string): Promise<void> {
    // Build collaborative filtering model
    // This would create user-item interaction matrix and calculate similarities
    this.loggerService.log('Building collaborative filtering model', 'AIProductRecommendationsService');

    // In real implementation, this would:
    // 1. Create user-item interaction matrix
    // 2. Calculate user similarities using cosine similarity
    // 3. Generate product recommendations for each user
    // 4. Store in recommendation cache
  }

  private async buildContentBasedSimilarityModel(tenantId: string): Promise<void> {
    // Build content-based similarity model
    this.loggerService.log('Building content-based similarity model', 'AIProductRecommendationsService');

    // In real implementation, this would:
    // 1. Extract product features (category, brand, price, attributes)
    // 2. Calculate similarity scores between all product pairs
    // 3. Store similarity matrix for fast lookup
  }

  private async updateTrendingProductsCache(tenantId: string): Promise<void> {
    const trendingProducts = await this.getTrendingProducts(tenantId, 50);
    await this.cacheService.set(`trending_products:${tenantId}`, trendingProducts, 3600);
  }

  private deduplicateRecommendations(recommendations: ProductRecommendation[], excludeIds?: string[]): ProductRecommendation[] {
    const seenIds = new Set(excludeIds || []);
    const uniqueRecommendations: ProductRecommendation[] = [];

    for (const rec of recommendations) {
      if (!seenIds.has(rec.productId)) {
        seenIds.add(rec.productId);
        uniqueRecommendations.push(rec);
      }
    }

    return uniqueRecommendations;
  }

  private async getProductDetails(productId: string): Promise<any> {
    const products = await this.databaseService.drizzleClient
      .select()
      .from(sql`products`)
      .where(sql`id = ${productId}`)
      .limit(1);

    return products[0] || null;
  }

  private async getProductsByIds(productIds: string[], tenantId: string): Promise<any[]> {
    return await this.databaseService.drizzleClient
      .select()
      .from(sql`products`)
      .where(and(
        sql`id IN (${productIds.join(',')})`,
        sql`tenant_id = ${tenantId}`,
        sql`status = 'active'`
      ));
  }

  private async getProductsByCategories(categoryIds: string[], tenantId: string): Promise<any[]> {
    return await this.databaseService.drizzleClient
      .select()
      .from(sql`products`)
      .where(and(
        sql`category_id IN (${categoryIds.join(',')})`,
        sql`tenant_id = ${tenantId}`,
        sql`status = 'active'`
      ))
      .limit(20);
  }

  private async getPopularProducts(tenantId: string, limit: number): Promise<any[]> {
    return await this.databaseService.drizzleClient
      .select({
        productId: sql`p.id`,
        productName: sql`p.name`,
        sku: sql`p.sku`,
        categoryId: sql`p.category_id`,
        brandId: sql`p.brand_id`,
        price: sql`p.price`,
        popularityScore: sql<number>`count(oi.*) * 0.7 + (p.featured::int) * 0.3`
      })
      .from(sql`products p`)
      .leftJoin(sql`order_items oi`, sql`p.id = oi.product_id`)
      .where(and(
        sql`p.tenant_id = ${tenantId}`,
        sql`p.status = 'active'`,
        sql`oi.created_at >= CURRENT_DATE - INTERVAL '30 days'`
      ))
      .groupBy(sql`p.id`, sql`p.name`, sql`p.sku`, sql`p.category_id`, sql`p.brand_id`, sql`p.price`, sql`p.featured`)
      .orderBy(sql`count(oi.*) DESC`)
      .limit(limit);
  }
}
