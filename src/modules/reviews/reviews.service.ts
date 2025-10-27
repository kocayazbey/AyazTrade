import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { reviews } from '../../database/schema/reviews.schema';
import { CacheService } from '../../core/cache/cache.service';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async createReview(reviewData: any, tenantId: string, userId: string) {
    try {
      const [savedReview] = await this.databaseService.drizzleClient
        .insert(reviews)
        .values({
          ...reviewData,
          tenantId,
          customerId: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      // Clear product cache
      await this.cacheService.del(`product:${reviewData.productId}:${tenantId}`);
      
      this.loggerService.log(`Review created: ${savedReview.id}`, 'ReviewsService');
      return savedReview;
    } catch (error) {
      this.loggerService.error('Error creating review', error);
      throw error;
    }
  }

  async getProductReviews(productId: string, tenantId: string, limit: number = 20) {
    try {
      const cacheKey = `product_reviews:${productId}:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      const reviewsList = await this.databaseService.drizzleClient
        .select()
        .from(reviews)
        .where(and(
          eq(reviews.productId, productId),
          eq(reviews.tenantId, tenantId),
          eq(reviews.status, 'approved')
        ))
        .orderBy(desc(reviews.createdAt))
        .limit(limit);

      await this.cacheService.set(cacheKey, JSON.stringify(reviewsList), 1800);
      return reviewsList;
    } catch (error) {
      this.loggerService.error('Error getting product reviews', error);
      throw error;
    }
  }

  async getReviewStats(productId: string, tenantId: string) {
    try {
      const cacheKey = `review_stats:${productId}:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      const stats = await this.databaseService.drizzleClient
        .select({
          averageRating: sql<number>`avg(${reviews.rating})::numeric`,
          totalReviews: sql<number>`count(*)`,
          fiveStar: sql<number>`count(*) filter (where ${reviews.rating} = 5)`,
          fourStar: sql<number>`count(*) filter (where ${reviews.rating} = 4)`,
          threeStar: sql<number>`count(*) filter (where ${reviews.rating} = 3)`,
          twoStar: sql<number>`count(*) filter (where ${reviews.rating} = 2)`,
          oneStar: sql<number>`count(*) filter (where ${reviews.rating} = 1)`,
        })
        .from(reviews)
        .where(and(
          eq(reviews.productId, productId),
          eq(reviews.tenantId, tenantId),
          eq(reviews.status, 'approved')
        ));

      const stat = stats[0];
      const result = {
        averageRating: parseFloat(stat?.averageRating.toString() || '0'),
        totalReviews: Number(stat?.totalReviews || 0),
        distribution: {
          5: Number(stat?.fiveStar || 0),
          4: Number(stat?.fourStar || 0),
          3: Number(stat?.threeStar || 0),
          2: Number(stat?.twoStar || 0),
          1: Number(stat?.oneStar || 0)
        }
      };

      await this.cacheService.set(cacheKey, JSON.stringify(result), 3600);
      return result;
    } catch (error) {
      this.loggerService.error('Error getting review stats', error);
      throw error;
    }
  }

  async moderateReview(reviewId: string, action: string, tenantId: string, userId: string) {
    try {
      const [review] = await this.databaseService.drizzleClient
        .select()
        .from(reviews)
        .where(and(eq(reviews.id, reviewId), eq(reviews.tenantId, tenantId)))
        .limit(1);

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      const updateData: any = {
        moderatedBy: userId,
        moderatedAt: new Date(),
        updatedAt: new Date()
      };

      switch (action) {
        case 'approve':
          updateData.status = 'approved';
          break;
        case 'reject':
          updateData.status = 'rejected';
          break;
        case 'delete':
          updateData.isActive = false;
          break;
      }

      const [updatedReview] = await this.databaseService.drizzleClient
        .update(reviews)
        .set(updateData)
        .where(eq(reviews.id, reviewId))
        .returning();
      
      // Clear caches
      await this.cacheService.del(`product_reviews:${review.productId}:${tenantId}`);
      await this.cacheService.del(`review_stats:${review.productId}:${tenantId}`);

      return updatedReview;
    } catch (error) {
      this.loggerService.error('Error moderating review', error);
      throw error;
    }
  }

  async getAllReviews(filters: any, tenantId: string) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = Math.min(parseInt(filters.limit) || 20, 100);
      const offset = (page - 1) * limit;
      
      const conditions = [eq(reviews.tenantId, tenantId)];
      
      if (filters.status) {
        conditions.push(eq(reviews.status, filters.status));
      }
      
      if (filters.productId) {
        conditions.push(eq(reviews.productId, filters.productId));
      }
      
      if (filters.rating) {
        conditions.push(eq(reviews.rating, parseInt(filters.rating)));
      }

      const whereClause = and(...conditions);

      const results = await this.databaseService.drizzleClient
        .select()
        .from(reviews)
        .where(whereClause)
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResults = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(whereClause);

      return {
        data: results,
        total: Number(totalResults[0].count),
        page,
        limit,
        totalPages: Math.ceil(Number(totalResults[0].count) / limit)
      };
    } catch (error) {
      this.loggerService.error('Error getting all reviews', error);
      throw error;
    }
  }

  async getPendingReviews(tenantId: string) {
    try {
      const results = await this.databaseService.drizzleClient
        .select()
        .from(reviews)
        .where(and(
          eq(reviews.tenantId, tenantId),
          eq(reviews.status, 'pending')
        ))
        .orderBy(desc(reviews.createdAt));

      return {
        data: results,
        total: results.length
      };
    } catch (error) {
      this.loggerService.error('Error getting pending reviews', error);
      throw error;
    }
  }

  async getReviewStats(tenantId: string) {
    try {
      const cacheKey = `review_stats_all:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const stats = await this.databaseService.drizzleClient
        .select({
          total: sql<number>`count(*)`,
          approved: sql<number>`count(*) filter (where ${reviews.status} = 'approved')`,
          pending: sql<number>`count(*) filter (where ${reviews.status} = 'pending')`,
          rejected: sql<number>`count(*) filter (where ${reviews.status} = 'rejected')`,
          averageRating: sql<number>`avg(${reviews.rating})::numeric`
        })
        .from(reviews)
        .where(eq(reviews.tenantId, tenantId));

      const result = {
        total: Number(stats[0]?.total || 0),
        approved: Number(stats[0]?.approved || 0),
        pending: Number(stats[0]?.pending || 0),
        rejected: Number(stats[0]?.rejected || 0),
        averageRating: parseFloat(stats[0]?.averageRating?.toString() || '0')
      };

      await this.cacheService.set(cacheKey, JSON.stringify(result), 3600);
      return result;
    } catch (error) {
      this.loggerService.error('Error getting review stats', error);
      throw error;
    }
  }
}
