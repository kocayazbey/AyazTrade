import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@ApiTags('Reviews Management')
@Controller({ path: 'admin/reviews', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsManagementController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all reviews (admin)' })
  @ApiResponse({ status: 200, description: 'Returns paginated reviews list' })
  async getAllReviews(@Query() filters: any, @CurrentUser('tenantId') tenantId: string) {
    return this.reviewsService.getAllReviews(filters, tenantId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending reviews' })
  @ApiResponse({ status: 200, description: 'Returns pending reviews' })
  async getPendingReviews(@CurrentUser('tenantId') tenantId: string) {
    return this.reviewsService.getPendingReviews(tenantId);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve review' })
  @ApiResponse({ status: 200, description: 'Review approved successfully' })
  async approveReview(
    @Param('id') reviewId: string, 
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.reviewsService.moderateReview(reviewId, 'approve', tenantId, userId);
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Reject review' })
  @ApiResponse({ status: 200, description: 'Review rejected successfully' })
  async rejectReview(
    @Param('id') reviewId: string, 
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.reviewsService.moderateReview(reviewId, 'reject', tenantId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete review' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  async deleteReview(
    @Param('id') reviewId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.reviewsService.moderateReview(reviewId, 'delete', tenantId, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get review statistics' })
  @ApiResponse({ status: 200, description: 'Returns review statistics' })
  async getReviewStats(@CurrentUser('tenantId') tenantId: string) {
    return this.reviewsService.getReviewStats(tenantId);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get product reviews' })
  @ApiResponse({ status: 200, description: 'Returns product reviews' })
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('limit') limit: number,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.reviewsService.getProductReviews(productId, tenantId, limit);
  }

  @Get('product/:productId/stats')
  @ApiOperation({ summary: 'Get product review statistics' })
  @ApiResponse({ status: 200, description: 'Returns product review statistics' })
  async getProductReviewStats(
    @Param('productId') productId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.reviewsService.getReviewStats(productId, tenantId);
  }
}

