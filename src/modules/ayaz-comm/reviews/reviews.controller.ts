import { Controller, Post, Get, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async createReview(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.createReview(createReviewDto);
  }

  @Put(':id')
  async updateReview(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewsService.updateReview(id, updateReviewDto);
  }

  @Delete(':id')
  async deleteReview(@Param('id') id: string) {
    await this.reviewsService.deleteReview(id);
    return { message: 'Review deleted successfully' };
  }

  @Get(':id')
  async getReview(@Param('id') id: string) {
    return this.reviewsService.getReviewById(id);
  }

  @Get('product/:productId')
  async getProductReviews(@Param('productId') productId: string, @Query() filters: any) {
    return this.reviewsService.getProductReviews(productId, filters);
  }

  @Get('customer/:customerId')
  async getCustomerReviews(@Param('customerId') customerId: string) {
    return this.reviewsService.getCustomerReviews(customerId);
  }

  @Post(':id/approve')
  async approveReview(@Param('id') id: string) {
    return this.reviewsService.approveReview(id);
  }

  @Post(':id/reject')
  async rejectReview(@Param('id') id: string, @Body('reason') reason: string) {
    return this.reviewsService.rejectReview(id, reason);
  }

  @Post(':id/flag')
  async flagReview(@Param('id') id: string, @Body('reason') reason: string) {
    return this.reviewsService.flagReview(id, reason);
  }

  @Post(':id/helpful')
  async markHelpful(@Param('id') id: string, @Body('customerId') customerId: string) {
    return this.reviewsService.markHelpful(id, customerId);
  }

  @Post(':id/not-helpful')
  async markNotHelpful(@Param('id') id: string, @Body('customerId') customerId: string) {
    return this.reviewsService.markNotHelpful(id, customerId);
  }

  @Post(':id/report')
  async reportReview(@Param('id') id: string, @Body() reportData: any) {
    await this.reviewsService.reportReview(id, reportData);
    return { message: 'Review reported successfully' };
  }

  @Post(':id/respond')
  async respondToReview(@Param('id') id: string, @Body() data: any) {
    return this.reviewsService.respondToReview(id, data.response, data.respondedBy);
  }

  @Get('product/:productId/stats')
  async getReviewStats(@Param('productId') productId: string) {
    return this.reviewsService.getReviewStats(productId);
  }
}

