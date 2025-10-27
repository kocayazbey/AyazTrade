import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RecommendationRequest {
  customerId?: string;
  productId?: string;
  categoryId?: string;
  limit?: number;
  type?: 'similar' | 'frequently_bought_together' | 'recently_viewed' | 'personalized' | 'trending';
}

interface RecommendationResult {
  productId: string;
  score: number;
  reason: string;
  metadata?: Record<string, any>;
}

interface CustomerBehavior {
  customerId: string;
  viewedProducts: string[];
  purchasedProducts: string[];
  cartProducts: string[];
  searchQueries: string[];
  categoryPreferences: Record<string, number>;
  brandPreferences: Record<string, number>;
  priceRange: { min: number; max: number };
}

@Injectable()
export class ProductRecommendationsService {
  private readonly logger = new Logger(ProductRecommendationsService.name);
  private customerBehaviors: Map<string, CustomerBehavior> = new Map();
  private productSimilarity: Map<string, Map<string, number>> = new Map();
  private coOccurrenceMatrix: Map<string, Map<string, number>> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeRecommendationEngine();
  }

  private initializeRecommendationEngine(): void {
    this.logger.log('Initializing AI recommendation engine');
  }

  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult[]> {
    const type = request.type || 'personalized';

    switch (type) {
      case 'similar':
        return this.getSimilarProducts(request.productId, request.limit);
      case 'frequently_bought_together':
        return this.getFrequentlyBoughtTogether(request.productId, request.limit);
      case 'recently_viewed':
        return this.getRecentlyViewedRecommendations(request.customerId, request.limit);
      case 'personalized':
        return this.getPersonalizedRecommendations(request.customerId, request.limit);
      case 'trending':
        return this.getTrendingProducts(request.categoryId, request.limit);
      default:
        return this.getPersonalizedRecommendations(request.customerId, request.limit);
    }
  }

  private async getSimilarProducts(productId: string, limit: number = 10): Promise<RecommendationResult[]> {
    const similarities = this.productSimilarity.get(productId) || new Map();
    const results: RecommendationResult[] = [];

    for (const [similarProductId, score] of similarities.entries()) {
      results.push({
        productId: similarProductId,
        score,
        reason: 'Similar product based on attributes and customer behavior',
      });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async getFrequentlyBoughtTogether(productId: string, limit: number = 5): Promise<RecommendationResult[]> {
    const coOccurrences = this.coOccurrenceMatrix.get(productId) || new Map();
    const results: RecommendationResult[] = [];

    for (const [relatedProductId, count] of coOccurrences.entries()) {
      const score = this.calculateCoOccurrenceScore(count);
      results.push({
        productId: relatedProductId,
        score,
        reason: 'Frequently bought together',
        metadata: { coOccurrenceCount: count },
      });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async getRecentlyViewedRecommendations(customerId: string, limit: number = 10): Promise<RecommendationResult[]> {
    const behavior = this.customerBehaviors.get(customerId);
    if (!behavior || behavior.viewedProducts.length === 0) {
      return this.getTrendingProducts(undefined, limit);
    }

    const viewedProducts = behavior.viewedProducts.slice(-5);
    const recommendations = new Map<string, number>();

    for (const viewedProductId of viewedProducts) {
      const similar = await this.getSimilarProducts(viewedProductId, 20);
      for (const rec of similar) {
        const currentScore = recommendations.get(rec.productId) || 0;
        recommendations.set(rec.productId, currentScore + rec.score);
      }
    }

    const results: RecommendationResult[] = [];
    for (const [productId, score] of recommendations.entries()) {
      if (!viewedProducts.includes(productId)) {
        results.push({
          productId,
          score: score / viewedProducts.length,
          reason: 'Based on your recently viewed products',
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async getPersonalizedRecommendations(customerId: string, limit: number = 10): Promise<RecommendationResult[]> {
    const behavior = this.customerBehaviors.get(customerId);
    if (!behavior) {
      return this.getTrendingProducts(undefined, limit);
    }

    const categoryScores = new Map<string, number>();
    const brandScores = new Map<string, number>();

    for (const [category, score] of Object.entries(behavior.categoryPreferences)) {
      categoryScores.set(category, score);
    }

    for (const [brand, score] of Object.entries(behavior.brandPreferences)) {
      brandScores.set(brand, score);
    }

    const results: RecommendationResult[] = [];

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async getTrendingProducts(categoryId?: string, limit: number = 10): Promise<RecommendationResult[]> {
    const results: RecommendationResult[] = [];

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async trackProductView(customerId: string, productId: string, metadata?: any): Promise<void> {
    let behavior = this.customerBehaviors.get(customerId);

    if (!behavior) {
      behavior = {
        customerId,
        viewedProducts: [],
        purchasedProducts: [],
        cartProducts: [],
        searchQueries: [],
        categoryPreferences: {},
        brandPreferences: {},
        priceRange: { min: 0, max: Infinity },
      };
      this.customerBehaviors.set(customerId, behavior);
    }

    if (!behavior.viewedProducts.includes(productId)) {
      behavior.viewedProducts.push(productId);
      if (behavior.viewedProducts.length > 100) {
        behavior.viewedProducts.shift();
      }
    }

    if (metadata?.categoryId) {
      behavior.categoryPreferences[metadata.categoryId] = 
        (behavior.categoryPreferences[metadata.categoryId] || 0) + 1;
    }

    if (metadata?.brandId) {
      behavior.brandPreferences[metadata.brandId] = 
        (behavior.brandPreferences[metadata.brandId] || 0) + 1;
    }

    this.logger.debug(`Tracked product view: ${productId} for customer ${customerId}`);
  }

  async trackProductPurchase(customerId: string, productId: string, metadata?: any): Promise<void> {
    let behavior = this.customerBehaviors.get(customerId);

    if (!behavior) {
      behavior = {
        customerId,
        viewedProducts: [],
        purchasedProducts: [],
        cartProducts: [],
        searchQueries: [],
        categoryPreferences: {},
        brandPreferences: {},
        priceRange: { min: 0, max: Infinity },
      };
      this.customerBehaviors.set(customerId, behavior);
    }

    if (!behavior.purchasedProducts.includes(productId)) {
      behavior.purchasedProducts.push(productId);
    }

    if (metadata?.categoryId) {
      behavior.categoryPreferences[metadata.categoryId] = 
        (behavior.categoryPreferences[metadata.categoryId] || 0) + 5;
    }

    if (metadata?.brandId) {
      behavior.brandPreferences[metadata.brandId] = 
        (behavior.brandPreferences[metadata.brandId] || 0) + 5;
    }

    this.logger.debug(`Tracked product purchase: ${productId} for customer ${customerId}`);
  }

  async trackCartAddition(customerId: string, productId: string): Promise<void> {
    let behavior = this.customerBehaviors.get(customerId);

    if (!behavior) {
      behavior = {
        customerId,
        viewedProducts: [],
        purchasedProducts: [],
        cartProducts: [],
        searchQueries: [],
        categoryPreferences: {},
        brandPreferences: {},
        priceRange: { min: 0, max: Infinity },
      };
      this.customerBehaviors.set(customerId, behavior);
    }

    if (!behavior.cartProducts.includes(productId)) {
      behavior.cartProducts.push(productId);
    }

    this.logger.debug(`Tracked cart addition: ${productId} for customer ${customerId}`);
  }

  async trackSearch(customerId: string, query: string, categoryId?: string): Promise<void> {
    let behavior = this.customerBehaviors.get(customerId);

    if (!behavior) {
      behavior = {
        customerId,
        viewedProducts: [],
        purchasedProducts: [],
        cartProducts: [],
        searchQueries: [],
        categoryPreferences: {},
        brandPreferences: {},
        priceRange: { min: 0, max: Infinity },
      };
      this.customerBehaviors.set(customerId, behavior);
    }

    behavior.searchQueries.push(query);
    if (behavior.searchQueries.length > 50) {
      behavior.searchQueries.shift();
    }

    if (categoryId) {
      behavior.categoryPreferences[categoryId] = 
        (behavior.categoryPreferences[categoryId] || 0) + 2;
    }

    this.logger.debug(`Tracked search: "${query}" for customer ${customerId}`);
  }

  async updateProductSimilarity(productId: string, similarProducts: Map<string, number>): Promise<void> {
    this.productSimilarity.set(productId, similarProducts);
    this.logger.debug(`Updated similarity matrix for product: ${productId}`);
  }

  async updateCoOccurrence(productId1: string, productId2: string): Promise<void> {
    if (!this.coOccurrenceMatrix.has(productId1)) {
      this.coOccurrenceMatrix.set(productId1, new Map());
    }

    const matrix = this.coOccurrenceMatrix.get(productId1);
    const currentCount = matrix.get(productId2) || 0;
    matrix.set(productId2, currentCount + 1);

    if (!this.coOccurrenceMatrix.has(productId2)) {
      this.coOccurrenceMatrix.set(productId2, new Map());
    }

    const reverseMatrix = this.coOccurrenceMatrix.get(productId2);
    const reverseCount = reverseMatrix.get(productId1) || 0;
    reverseMatrix.set(productId1, reverseCount + 1);

    this.logger.debug(`Updated co-occurrence: ${productId1} <-> ${productId2}`);
  }

  private calculateCoOccurrenceScore(count: number): number {
    return Math.min(1.0, Math.log(count + 1) / Math.log(100));
  }

  async calculateProductSimilarity(product1: any, product2: any): Promise<number> {
    let score = 0;

    if (product1.categoryId === product2.categoryId) {
      score += 0.3;
    }

    if (product1.brandId === product2.brandId) {
      score += 0.2;
    }

    const priceDiff = Math.abs(product1.price - product2.price);
    const avgPrice = (product1.price + product2.price) / 2;
    const priceScore = Math.max(0, 1 - (priceDiff / avgPrice));
    score += priceScore * 0.2;

    const tags1 = new Set(product1.tags || []);
    const tags2 = new Set(product2.tags || []);
    const commonTags = new Set([...tags1].filter(x => tags2.has(x)));
    const tagScore = commonTags.size / Math.max(tags1.size, tags2.size, 1);
    score += tagScore * 0.3;

    return Math.min(1.0, score);
  }

  async trainModel(orderHistory: any[]): Promise<void> {
    this.logger.log('Training recommendation model with order history');

    for (const order of orderHistory) {
      const productIds = order.items.map((item: any) => item.productId);

      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          await this.updateCoOccurrence(productIds[i], productIds[j]);
        }
      }
    }

    this.logger.log(`Model trained with ${orderHistory.length} orders`);
  }

  async getCustomerProfile(customerId: string): Promise<CustomerBehavior | null> {
    return this.customerBehaviors.get(customerId) || null;
  }

  async clearCustomerHistory(customerId: string): Promise<void> {
    this.customerBehaviors.delete(customerId);
    this.logger.log(`Cleared history for customer: ${customerId}`);
  }
}

