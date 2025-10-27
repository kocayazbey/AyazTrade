import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface RecommendationModel {
  id: string;
  name: string;
  type: 'collaborative' | 'content_based' | 'hybrid' | 'deep_learning';
  algorithm: string;
  parameters: Record<string, any>;
  accuracy: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserInteraction {
  id: string;
  userId: string;
  productId: string;
  interactionType: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'like' | 'share';
  timestamp: Date;
  metadata: Record<string, any>;
}

interface ProductSimilarity {
  id: string;
  productId: string;
  similarProductId: string;
  similarity: number;
  algorithm: string;
  createdAt: Date;
}

interface Recommendation {
  id: string;
  userId: string;
  productId: string;
  score: number;
  reason: string;
  model: string;
  createdAt: Date;
}

interface RecommendationAnalytics {
  totalRecommendations: number;
  clickThroughRate: number;
  conversionRate: number;
  averageScore: number;
  topPerformingModels: Array<{
    model: string;
    performance: number;
  }>;
  userEngagement: {
    totalUsers: number;
    activeUsers: number;
    averageInteractions: number;
  };
}

@Injectable()
export class AdvancedRecommendationsService {
  private readonly logger = new Logger(AdvancedRecommendationsService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createRecommendationModel(model: Omit<RecommendationModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecommendationModel> {
    const modelId = `model-${Date.now()}`;
    
    const newModel: RecommendationModel = {
      id: modelId,
      ...model,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveRecommendationModel(newModel);
    
    this.logger.log(`Created recommendation model: ${modelId}`);
    return newModel;
  }

  async getRecommendationModels(): Promise<RecommendationModel[]> {
    const result = await this.db.execute(`
      SELECT * FROM recommendation_models
      ORDER BY accuracy DESC, created_at DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      parameters: JSON.parse(row.parameters || '{}')
    }));
  }

  async recordUserInteraction(interaction: Omit<UserInteraction, 'id' | 'timestamp'>): Promise<UserInteraction> {
    const interactionId = `interaction-${Date.now()}`;
    
    const newInteraction: UserInteraction = {
      id: interactionId,
      ...interaction,
      timestamp: new Date()
    };

    await this.saveUserInteraction(newInteraction);
    
    this.logger.log(`Recorded user interaction: ${interactionId}`);
    return newInteraction;
  }

  async getUserInteractions(userId: string, limit: number = 100): Promise<UserInteraction[]> {
    const result = await this.db.execute(`
      SELECT * FROM user_interactions
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `, [userId, limit]);
    
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async generateRecommendations(userId: string, limit: number = 10): Promise<Recommendation[]> {
    const models = await this.getActiveRecommendationModels();
    const recommendations: Recommendation[] = [];
    
    for (const model of models) {
      try {
        const modelRecommendations = await this.generateModelRecommendations(userId, model, limit);
        recommendations.push(...modelRecommendations);
      } catch (error) {
        this.logger.error(`Failed to generate recommendations with model ${model.id}:`, error);
      }
    }
    
    // Sort by score and remove duplicates
    const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
    const topRecommendations = uniqueRecommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    // Save recommendations
    for (const recommendation of topRecommendations) {
      await this.saveRecommendation(recommendation);
    }
    
    this.logger.log(`Generated ${topRecommendations.length} recommendations for user ${userId}`);
    return topRecommendations;
  }

  async getRecommendations(userId: string, limit: number = 10): Promise<Recommendation[]> {
    const result = await this.db.execute(`
      SELECT * FROM recommendations
      WHERE user_id = $1
      ORDER BY score DESC, created_at DESC
      LIMIT $2
    `, [userId, limit]);
    
    return result.rows;
  }

  async generateCollaborativeRecommendations(userId: string, limit: number): Promise<Recommendation[]> {
    // Mock collaborative filtering - in real implementation, this would use matrix factorization
    this.logger.log(`Generating collaborative recommendations for user ${userId}`);
    
    const recommendations: Recommendation[] = [];
    
    // Simulate collaborative filtering
    const similarUsers = await this.findSimilarUsers(userId);
    const userInteractions = await this.getUserInteractions(userId);
    const interactedProducts = new Set(userInteractions.map(i => i.productId));
    
    for (const similarUser of similarUsers) {
      const similarUserInteractions = await this.getUserInteractions(similarUser.userId);
      
      for (const interaction of similarUserInteractions) {
        if (!interactedProducts.has(interaction.productId)) {
          recommendations.push({
            id: `rec-${Date.now()}`,
            userId,
            productId: interaction.productId,
            score: similarUser.similarity * this.getInteractionWeight(interaction.interactionType),
            reason: `Users like you also ${interaction.interactionType}`,
            model: 'collaborative',
            createdAt: new Date()
          });
        }
      }
    }
    
    return recommendations;
  }

  async generateContentBasedRecommendations(userId: string, limit: number): Promise<Recommendation[]> {
    // Mock content-based filtering - in real implementation, this would use TF-IDF, embeddings, etc.
    this.logger.log(`Generating content-based recommendations for user ${userId}`);
    
    const recommendations: Recommendation[] = [];
    const userInteractions = await this.getUserInteractions(userId);
    const userPreferences = this.extractUserPreferences(userInteractions);
    
    // Find similar products based on content features
    const similarProducts = await this.findSimilarProducts(userPreferences);
    
    for (const product of similarProducts) {
      recommendations.push({
        id: `rec-${Date.now()}`,
        userId,
        productId: product.productId,
        score: product.similarity,
        reason: `Similar to products you've liked`,
        model: 'content_based',
        createdAt: new Date()
      });
    }
    
    return recommendations;
  }

  async generateHybridRecommendations(userId: string, limit: number): Promise<Recommendation[]> {
    // Mock hybrid approach - combines collaborative and content-based
    this.logger.log(`Generating hybrid recommendations for user ${userId}`);
    
    const collaborativeRecs = await this.generateCollaborativeRecommendations(userId, limit);
    const contentBasedRecs = await this.generateContentBasedRecommendations(userId, limit);
    
    // Combine and re-rank recommendations
    const allRecommendations = [...collaborativeRecs, ...contentBasedRecs];
    const hybridRecommendations = this.combineRecommendations(allRecommendations);
    
    return hybridRecommendations.slice(0, limit);
  }

  async calculateProductSimilarity(productId: string): Promise<ProductSimilarity[]> {
    const product = await this.getProduct(productId);
    const allProducts = await this.getAllProducts();
    
    const similarities: ProductSimilarity[] = [];
    
    for (const otherProduct of allProducts) {
      if (otherProduct.id !== productId) {
        const similarity = this.calculateSimilarityScore(product, otherProduct);
        
        if (similarity > 0.3) { // Threshold for similarity
          similarities.push({
            id: `similarity-${Date.now()}`,
            productId,
            similarProductId: otherProduct.id,
            similarity,
            algorithm: 'content_based',
            createdAt: new Date()
          });
        }
      }
    }
    
    // Save similarities
    for (const similarity of similarities) {
      await this.saveProductSimilarity(similarity);
    }
    
    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  async getRecommendationAnalytics(period: string = '30d'): Promise<RecommendationAnalytics> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_recommendations,
        AVG(score) as avg_score,
        COUNT(CASE WHEN clicked = true THEN 1 END) as clicked_recommendations,
        COUNT(CASE WHEN converted = true THEN 1 END) as converted_recommendations
      FROM recommendations
      WHERE created_at >= NOW() - INTERVAL '${period}'
    `);
    
    const stats = result.rows[0];
    const totalRecommendations = parseInt(stats.total_recommendations) || 0;
    const clickedRecommendations = parseInt(stats.clicked_recommendations) || 0;
    const convertedRecommendations = parseInt(stats.converted_recommendations) || 0;
    
    const clickThroughRate = totalRecommendations > 0 ? (clickedRecommendations / totalRecommendations) * 100 : 0;
    const conversionRate = clickedRecommendations > 0 ? (convertedRecommendations / clickedRecommendations) * 100 : 0;
    
    // Get top performing models
    const modelResult = await this.db.execute(`
      SELECT 
        model,
        AVG(score) as avg_performance,
        COUNT(*) as recommendation_count
      FROM recommendations
      WHERE created_at >= NOW() - INTERVAL '${period}'
      GROUP BY model
      ORDER BY avg_performance DESC
    `);
    
    const topPerformingModels = modelResult.rows.map(row => ({
      model: row.model,
      performance: parseFloat(row.avg_performance) || 0
    }));
    
    // Get user engagement
    const userResult = await this.db.execute(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT CASE WHEN interaction_count > 0 THEN user_id END) as active_users,
        AVG(interaction_count) as avg_interactions
      FROM (
        SELECT 
          user_id,
          COUNT(*) as interaction_count
        FROM user_interactions
        WHERE timestamp >= NOW() - INTERVAL '${period}'
        GROUP BY user_id
      ) user_stats
    `);
    
    const userStats = userResult.rows[0];
    
    return {
      totalRecommendations,
      clickThroughRate,
      conversionRate,
      averageScore: parseFloat(stats.avg_score) || 0,
      topPerformingModels,
      userEngagement: {
        totalUsers: parseInt(userStats.total_users) || 0,
        activeUsers: parseInt(userStats.active_users) || 0,
        averageInteractions: parseFloat(userStats.avg_interactions) || 0
      }
    };
  }

  private async getActiveRecommendationModels(): Promise<RecommendationModel[]> {
    const result = await this.db.execute(`
      SELECT * FROM recommendation_models
      WHERE is_active = true
      ORDER BY accuracy DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      parameters: JSON.parse(row.parameters || '{}')
    }));
  }

  private async generateModelRecommendations(userId: string, model: RecommendationModel, limit: number): Promise<Recommendation[]> {
    switch (model.type) {
      case 'collaborative':
        return this.generateCollaborativeRecommendations(userId, limit);
      case 'content_based':
        return this.generateContentBasedRecommendations(userId, limit);
      case 'hybrid':
        return this.generateHybridRecommendations(userId, limit);
      default:
        return [];
    }
  }

  private deduplicateRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.userId}-${rec.productId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async findSimilarUsers(userId: string): Promise<Array<{ userId: string; similarity: number }>> {
    // Mock similar users - in real implementation, this would use collaborative filtering
    return [
      { userId: 'user-2', similarity: 0.8 },
      { userId: 'user-3', similarity: 0.7 },
      { userId: 'user-4', similarity: 0.6 }
    ];
  }

  private getInteractionWeight(interactionType: string): number {
    const weights = {
      'view': 0.1,
      'click': 0.3,
      'add_to_cart': 0.5,
      'purchase': 1.0,
      'like': 0.4,
      'share': 0.6
    };
    
    return weights[interactionType] || 0.1;
  }

  private extractUserPreferences(interactions: UserInteraction[]): Record<string, any> {
    // Mock preference extraction - in real implementation, this would analyze user behavior
    return {
      categories: ['electronics', 'books'],
      priceRange: [50, 200],
      brands: ['brand1', 'brand2']
    };
  }

  private async findSimilarProducts(preferences: Record<string, any>): Promise<Array<{ productId: string; similarity: number }>> {
    // Mock similar products - in real implementation, this would use content-based filtering
    return [
      { productId: 'product-1', similarity: 0.9 },
      { productId: 'product-2', similarity: 0.8 },
      { productId: 'product-3', similarity: 0.7 }
    ];
  }

  private combineRecommendations(recommendations: Recommendation[]): Recommendation[] {
    // Mock hybrid combination - in real implementation, this would use ensemble methods
    const combined = new Map<string, Recommendation>();
    
    for (const rec of recommendations) {
      const key = `${rec.userId}-${rec.productId}`;
      if (combined.has(key)) {
        const existing = combined.get(key);
        existing.score = (existing.score + rec.score) / 2; // Average scores
      } else {
        combined.set(key, rec);
      }
    }
    
    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }

  private async getProduct(productId: string): Promise<any> {
    const result = await this.db.execute(`
      SELECT * FROM products WHERE id = $1
    `, [productId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    return result.rows[0];
  }

  private async getAllProducts(): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT * FROM products WHERE status = 'active'
    `);
    
    return result.rows;
  }

  private calculateSimilarityScore(product1: any, product2: any): number {
    // Mock similarity calculation - in real implementation, this would use cosine similarity, Jaccard, etc.
    return Math.random() * 0.8 + 0.2; // Random similarity between 0.2 and 1.0
  }

  private async saveRecommendationModel(model: RecommendationModel): Promise<void> {
    await this.db.execute(`
      INSERT INTO recommendation_models (id, name, type, algorithm, parameters, accuracy, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      model.id,
      model.name,
      model.type,
      model.algorithm,
      JSON.stringify(model.parameters),
      model.accuracy,
      model.isActive,
      model.createdAt,
      model.updatedAt
    ]);
  }

  private async saveUserInteraction(interaction: UserInteraction): Promise<void> {
    await this.db.execute(`
      INSERT INTO user_interactions (id, user_id, product_id, interaction_type, timestamp, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      interaction.id,
      interaction.userId,
      interaction.productId,
      interaction.interactionType,
      interaction.timestamp,
      JSON.stringify(interaction.metadata)
    ]);
  }

  private async saveRecommendation(recommendation: Recommendation): Promise<void> {
    await this.db.execute(`
      INSERT INTO recommendations (id, user_id, product_id, score, reason, model, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, product_id) DO UPDATE SET
        score = EXCLUDED.score,
        reason = EXCLUDED.reason,
        model = EXCLUDED.model,
        created_at = EXCLUDED.created_at
    `, [
      recommendation.id,
      recommendation.userId,
      recommendation.productId,
      recommendation.score,
      recommendation.reason,
      recommendation.model,
      recommendation.createdAt
    ]);
  }

  private async saveProductSimilarity(similarity: ProductSimilarity): Promise<void> {
    await this.db.execute(`
      INSERT INTO product_similarities (id, product_id, similar_product_id, similarity, algorithm, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (product_id, similar_product_id) DO UPDATE SET
        similarity = EXCLUDED.similarity,
        algorithm = EXCLUDED.algorithm,
        created_at = EXCLUDED.created_at
    `, [
      similarity.id,
      similarity.productId,
      similarity.similarProductId,
      similarity.similarity,
      similarity.algorithm,
      similarity.createdAt
    ]);
  }
}
