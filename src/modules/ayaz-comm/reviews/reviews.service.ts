import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

@Injectable()
export class ReviewsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createReview(createReviewDto: CreateReviewDto): Promise<any> {
    const { productId, customerId, rating, title, comment, images } = createReviewDto;

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check if customer purchased the product
    // const hasPurchased = await this.verifyPurchase(customerId, productId);
    // if (!hasPurchased) {
    //   throw new BadRequestException('You can only review products you have purchased');
    // }

    const review = {
      id: `REV${Date.now()}`,
      productId,
      customerId,
      rating,
      title,
      comment,
      images: images || [],
      status: ReviewStatus.PENDING,
      isVerifiedPurchase: true,
      helpfulCount: 0,
      notHelpfulCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.eventEmitter.emit('review.created', review);

    return review;
  }

  async updateReview(reviewId: string, updateReviewDto: UpdateReviewDto): Promise<any> {
    // In real implementation, fetch from database
    const review = { id: reviewId, status: ReviewStatus.APPROVED };

    Object.assign(review, updateReviewDto);
    review['updatedAt'] = new Date();

    await this.eventEmitter.emit('review.updated', review);

    return review;
  }

  async deleteReview(reviewId: string): Promise<void> {
    // In real implementation, soft delete from database
    await this.eventEmitter.emit('review.deleted', { reviewId });
  }

  async approveReview(reviewId: string): Promise<any> {
    const review = { id: reviewId, status: ReviewStatus.PENDING };

    review.status = ReviewStatus.APPROVED;
    review['approvedAt'] = new Date();
    review['updatedAt'] = new Date();

    await this.eventEmitter.emit('review.approved', review);

    return review;
  }

  async rejectReview(reviewId: string, reason: string): Promise<any> {
    const review = { id: reviewId, status: ReviewStatus.PENDING };

    review.status = ReviewStatus.REJECTED;
    review['rejectionReason'] = reason;
    review['rejectedAt'] = new Date();
    review['updatedAt'] = new Date();

    await this.eventEmitter.emit('review.rejected', review);

    return review;
  }

  async flagReview(reviewId: string, reason: string): Promise<any> {
    const review = { id: reviewId, status: ReviewStatus.APPROVED };

    review.status = ReviewStatus.FLAGGED;
    review['flagReason'] = reason;
    review['flaggedAt'] = new Date();
    review['updatedAt'] = new Date();

    await this.eventEmitter.emit('review.flagged', review);

    return review;
  }

  async getReviewById(reviewId: string): Promise<any> {
    // In real implementation, fetch from database
    throw new NotFoundException('Review not found');
  }

  async getProductReviews(productId: string, filters?: any): Promise<any> {
    // In real implementation, fetch from database with filters
    return {
      reviews: [],
      totalCount: 0,
      averageRating: 0,
      ratingDistribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
    };
  }

  async getCustomerReviews(customerId: string): Promise<any[]> {
    // In real implementation, fetch from database
    return [];
  }

  async markHelpful(reviewId: string, customerId: string): Promise<any> {
    const review = { id: reviewId, helpfulCount: 0 };

    review.helpfulCount += 1;

    await this.eventEmitter.emit('review.marked_helpful', { reviewId, customerId });

    return review;
  }

  async markNotHelpful(reviewId: string, customerId: string): Promise<any> {
    const review = { id: reviewId, notHelpfulCount: 0 };

    review.notHelpfulCount += 1;

    await this.eventEmitter.emit('review.marked_not_helpful', { reviewId, customerId });

    return review;
  }

  async getReviewStats(productId: string): Promise<any> {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
      verifiedPurchasePercentage: 0,
      recommendationPercentage: 0,
    };
  }

  async reportReview(reviewId: string, reportData: any): Promise<void> {
    const report = {
      id: `REP${Date.now()}`,
      reviewId,
      reportedBy: reportData.customerId,
      reason: reportData.reason,
      description: reportData.description,
      createdAt: new Date(),
    };

    await this.eventEmitter.emit('review.reported', report);
  }

  async respondToReview(reviewId: string, response: string, respondedBy: string): Promise<any> {
    const review = { id: reviewId };

    const reviewResponse = {
      id: `RESP${Date.now()}`,
      reviewId,
      response,
      respondedBy,
      createdAt: new Date(),
    };

    await this.eventEmitter.emit('review.responded', reviewResponse);

    return reviewResponse;
  }
}

