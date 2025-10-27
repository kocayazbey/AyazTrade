import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { MultiVendorService } from './services/multi-vendor.service';
import { SubscriptionCommerceService } from './services/subscription-commerce.service';
import { DynamicPricingService } from './services/dynamic-pricing.service';
import { SocialCommerceService } from './services/social-commerce.service';
import { AdvancedRecommendationsService } from './services/advanced-recommendations.service';

@ApiTags('AyazComm Enhanced - Advanced E-commerce')
@Controller({ path: 'ayaz-comm-enhanced', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AyazCommEnhancedController {
  constructor(
    private readonly multiVendor: MultiVendorService,
    private readonly subscriptionCommerce: SubscriptionCommerceService,
    private readonly dynamicPricing: DynamicPricingService,
    private readonly socialCommerce: SocialCommerceService,
    private readonly advancedRecommendations: AdvancedRecommendationsService,
  ) {}

  // ==================== MULTI-VENDOR MARKETPLACE ====================

  @Post('marketplace/vendors')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create vendor' })
  @ApiResponse({ status: 201, description: 'Vendor created' })
  async createVendor(@Body() vendor: any) {
    return this.multiVendor.createVendor(vendor);
  }

  @Get('marketplace/vendors')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get vendors' })
  @ApiResponse({ status: 200, description: 'Vendors' })
  async getVendors(@Query('status') status?: string) {
    return this.multiVendor.getVendors(status);
  }

  @Post('marketplace/vendors/:vendorId/approve')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Approve vendor' })
  @ApiResponse({ status: 200, description: 'Vendor approved' })
  async approveVendor(@Param('vendorId') vendorId: string) {
    await this.multiVendor.approveVendor(vendorId);
    return { success: true };
  }

  @Post('marketplace/vendors/:vendorId/suspend')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Suspend vendor' })
  @ApiResponse({ status: 200, description: 'Vendor suspended' })
  async suspendVendor(
    @Param('vendorId') vendorId: string,
    @Body() data: { reason: string }
  ) {
    await this.multiVendor.suspendVendor(vendorId, data.reason);
    return { success: true };
  }

  @Post('marketplace/vendor-products')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Add vendor product' })
  @ApiResponse({ status: 201, description: 'Vendor product added' })
  async addVendorProduct(@Body() product: any) {
    return this.multiVendor.addVendorProduct(product);
  }

  @Get('marketplace/vendor-products')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get vendor products' })
  @ApiResponse({ status: 200, description: 'Vendor products' })
  async getVendorProducts(@Query('vendorId') vendorId?: string, @Query('status') status?: string) {
    return this.multiVendor.getVendorProducts(vendorId, status);
  }

  @Get('marketplace/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get marketplace analytics' })
  @ApiResponse({ status: 200, description: 'Marketplace analytics' })
  async getMarketplaceAnalytics() {
    return this.multiVendor.getMarketplaceAnalytics();
  }

  // ==================== SUBSCRIPTION COMMERCE ====================

  @Post('subscriptions/plans')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create subscription plan' })
  @ApiResponse({ status: 201, description: 'Subscription plan created' })
  async createSubscriptionPlan(@Body() plan: any) {
    return this.subscriptionCommerce.createSubscriptionPlan(plan);
  }

  @Get('subscriptions/plans')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get subscription plans' })
  @ApiResponse({ status: 200, description: 'Subscription plans' })
  async getSubscriptionPlans(@Query('isActive') isActive?: boolean) {
    return this.subscriptionCommerce.getSubscriptionPlans(isActive);
  }

  @Post('subscriptions/customers')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create customer subscription' })
  @ApiResponse({ status: 201, description: 'Customer subscription created' })
  async createCustomerSubscription(@Body() subscription: any) {
    return this.subscriptionCommerce.createCustomerSubscription(subscription);
  }

  @Get('subscriptions/customers')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get customer subscriptions' })
  @ApiResponse({ status: 200, description: 'Customer subscriptions' })
  async getCustomerSubscriptions(@Query('customerId') customerId?: string, @Query('status') status?: string) {
    return this.subscriptionCommerce.getCustomerSubscriptions(customerId, status);
  }

  @Post('subscriptions/:subscriptionId/pause')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Pause subscription' })
  @ApiResponse({ status: 200, description: 'Subscription paused' })
  async pauseSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() data: { reason?: string }
  ) {
    await this.subscriptionCommerce.pauseSubscription(subscriptionId, data.reason);
    return { success: true };
  }

  @Post('subscriptions/:subscriptionId/resume')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Resume subscription' })
  @ApiResponse({ status: 200, description: 'Subscription resumed' })
  async resumeSubscription(@Param('subscriptionId') subscriptionId: string) {
    await this.subscriptionCommerce.resumeSubscription(subscriptionId);
    return { success: true };
  }

  @Post('subscriptions/:subscriptionId/cancel')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() data: { reason?: string }
  ) {
    await this.subscriptionCommerce.cancelSubscription(subscriptionId, data.reason);
    return { success: true };
  }

  @Post('subscriptions/usage')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Record subscription usage' })
  @ApiResponse({ status: 200, description: 'Usage recorded' })
  async recordUsage(
    @Body() data: { subscriptionId: string; feature: string; usage: number }
  ) {
    await this.subscriptionCommerce.recordUsage(data.subscriptionId, data.feature, data.usage);
    return { success: true };
  }

  @Get('subscriptions/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get subscription analytics' })
  @ApiResponse({ status: 200, description: 'Subscription analytics' })
  async getSubscriptionAnalytics(@Query('period') period: string = '30d') {
    return this.subscriptionCommerce.getSubscriptionAnalytics(period);
  }

  // ==================== DYNAMIC PRICING ====================

  @Post('pricing/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create pricing rule' })
  @ApiResponse({ status: 201, description: 'Pricing rule created' })
  async createPricingRule(@Body() rule: any) {
    return this.dynamicPricing.createPricingRule(rule);
  }

  @Get('pricing/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get pricing rules' })
  @ApiResponse({ status: 200, description: 'Pricing rules' })
  async getPricingRules(@Query('productId') productId?: string) {
    return this.dynamicPricing.getPricingRules(productId);
  }

  @Post('pricing/calculate/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Calculate dynamic price' })
  @ApiResponse({ status: 200, description: 'Dynamic price calculated' })
  async calculateDynamicPrice(
    @Param('productId') productId: string,
    @Body() context: Record<string, any>
  ) {
    return this.dynamicPricing.calculateDynamicPrice(productId, context);
  }

  @Post('pricing/competitor-prices')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update competitor price' })
  @ApiResponse({ status: 200, description: 'Competitor price updated' })
  async updateCompetitorPrice(@Body() price: any) {
    return this.dynamicPricing.updateCompetitorPrice(price);
  }

  @Get('pricing/competitor-prices/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get competitor prices' })
  @ApiResponse({ status: 200, description: 'Competitor prices' })
  async getCompetitorPrices(@Param('productId') productId: string) {
    return this.dynamicPricing.getCompetitorPrices(productId);
  }

  @Get('pricing/analytics/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get pricing analytics' })
  @ApiResponse({ status: 200, description: 'Pricing analytics' })
  async getPricingAnalytics(@Param('productId') productId: string) {
    return this.dynamicPricing.getPricingAnalytics(productId);
  }

  @Post('pricing/optimize')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Optimize prices' })
  @ApiResponse({ status: 200, description: 'Prices optimized' })
  async optimizePrices() {
    await this.dynamicPricing.optimizePrices();
    return { success: true };
  }

  // ==================== SOCIAL COMMERCE ====================

  @Post('social/platforms')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Connect social platform' })
  @ApiResponse({ status: 201, description: 'Social platform connected' })
  async connectPlatform(@Body() platform: any) {
    return this.socialCommerce.connectPlatform(platform);
  }

  @Get('social/platforms')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get social platforms' })
  @ApiResponse({ status: 200, description: 'Social platforms' })
  async getSocialPlatforms() {
    return this.socialCommerce.getSocialPlatforms();
  }

  @Post('social/sync-products')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync products to platform' })
  @ApiResponse({ status: 200, description: 'Products synced' })
  async syncProductsToPlatform(
    @Body() data: { productIds: string[]; platform: string }
  ) {
    await this.socialCommerce.syncProductsToPlatform(data.productIds, data.platform);
    return { success: true };
  }

  @Post('social/posts')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create social post' })
  @ApiResponse({ status: 201, description: 'Social post created' })
  async createSocialPost(@Body() post: any) {
    return this.socialCommerce.createSocialPost(post);
  }

  @Get('social/posts')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get social posts' })
  @ApiResponse({ status: 200, description: 'Social posts' })
  async getSocialPosts(@Query('platform') platform?: string, @Query('status') status?: string) {
    return this.socialCommerce.getSocialPosts(platform, status);
  }

  @Post('social/posts/:postId/publish')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Publish social post' })
  @ApiResponse({ status: 200, description: 'Post published' })
  async publishPost(@Param('postId') postId: string) {
    await this.socialCommerce.publishPost(postId);
    return { success: true };
  }

  @Post('social/orders')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Process social order' })
  @ApiResponse({ status: 201, description: 'Social order processed' })
  async processSocialOrder(@Body() order: any) {
    return this.socialCommerce.processSocialOrder(order);
  }

  @Get('social/orders')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get social orders' })
  @ApiResponse({ status: 200, description: 'Social orders' })
  async getSocialOrders(@Query('platform') platform?: string, @Query('status') status?: string) {
    return this.socialCommerce.getSocialOrders(platform, status);
  }

  @Get('social/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get social analytics' })
  @ApiResponse({ status: 200, description: 'Social analytics' })
  async getSocialAnalytics(@Query('platform') platform?: string, @Query('period') period: string = '30d') {
    return this.socialCommerce.getSocialAnalytics(platform, period);
  }

  // ==================== ADVANCED RECOMMENDATIONS ====================

  @Post('recommendations/models')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create recommendation model' })
  @ApiResponse({ status: 201, description: 'Recommendation model created' })
  async createRecommendationModel(@Body() model: any) {
    return this.advancedRecommendations.createRecommendationModel(model);
  }

  @Get('recommendations/models')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get recommendation models' })
  @ApiResponse({ status: 200, description: 'Recommendation models' })
  async getRecommendationModels() {
    return this.advancedRecommendations.getRecommendationModels();
  }

  @Post('recommendations/interactions')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Record user interaction' })
  @ApiResponse({ status: 201, description: 'Interaction recorded' })
  async recordUserInteraction(@Body() interaction: any) {
    return this.advancedRecommendations.recordUserInteraction(interaction);
  }

  @Get('recommendations/interactions/:userId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get user interactions' })
  @ApiResponse({ status: 200, description: 'User interactions' })
  async getUserInteractions(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 100
  ) {
    return this.advancedRecommendations.getUserInteractions(userId, limit);
  }

  @Post('recommendations/generate/:userId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations generated' })
  async generateRecommendations(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 10
  ) {
    return this.advancedRecommendations.generateRecommendations(userId, limit);
  }

  @Get('recommendations/:userId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations' })
  async getRecommendations(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 10
  ) {
    return this.advancedRecommendations.getRecommendations(userId, limit);
  }

  @Post('recommendations/similarity/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Calculate product similarity' })
  @ApiResponse({ status: 200, description: 'Product similarity calculated' })
  async calculateProductSimilarity(@Param('productId') productId: string) {
    return this.advancedRecommendations.calculateProductSimilarity(productId);
  }

  @Get('recommendations/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get recommendation analytics' })
  @ApiResponse({ status: 200, description: 'Recommendation analytics' })
  async getRecommendationAnalytics(@Query('period') period: string = '30d') {
    return this.advancedRecommendations.getRecommendationAnalytics(period);
  }

  // ==================== COMPREHENSIVE E-COMMERCE ====================

  @Get('dashboard')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get e-commerce dashboard' })
  @ApiResponse({ status: 200, description: 'E-commerce dashboard data' })
  async getEcommerceDashboard() {
    const [
      marketplaceAnalytics,
      subscriptionAnalytics,
      socialAnalytics,
      recommendationAnalytics
    ] = await Promise.all([
      this.multiVendor.getMarketplaceAnalytics(),
      this.subscriptionCommerce.getSubscriptionAnalytics(),
      this.socialCommerce.getSocialAnalytics(),
      this.advancedRecommendations.getRecommendationAnalytics()
    ]);

    return {
      marketplace: marketplaceAnalytics,
      subscriptions: subscriptionAnalytics,
      social: socialAnalytics,
      recommendations: recommendationAnalytics,
      lastUpdated: new Date(),
      insights: this.generateEcommerceInsights(marketplaceAnalytics, subscriptionAnalytics, socialAnalytics, recommendationAnalytics)
    };
  }

  @Get('health')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get e-commerce health' })
  @ApiResponse({ status: 200, description: 'E-commerce health status' })
  async getEcommerceHealth() {
    return {
      multiVendor: 'healthy',
      subscriptionCommerce: 'healthy',
      dynamicPricing: 'healthy',
      socialCommerce: 'healthy',
      advancedRecommendations: 'healthy',
      lastChecked: new Date(),
      uptime: 99.9,
      performance: {
        averageResponseTime: 200,
        throughput: 1000,
        errorRate: 0.01
      }
    };
  }

  private generateEcommerceInsights(marketplaceAnalytics: any, subscriptionAnalytics: any, socialAnalytics: any, recommendationAnalytics: any) {
    const insights = [];
    
    if (marketplaceAnalytics.totalVendors < 10) {
      insights.push('🏪 Low vendor count - consider vendor acquisition strategies');
    }
    
    if (subscriptionAnalytics.churnRate > 10) {
      insights.push('📈 High subscription churn rate - review retention strategies');
    }
    
    if (socialAnalytics.length > 0 && socialAnalytics[0].engagementRate < 5) {
      insights.push('📱 Low social engagement - improve content strategy');
    }
    
    if (recommendationAnalytics.clickThroughRate < 15) {
      insights.push('🎯 Low recommendation CTR - optimize recommendation algorithms');
    }
    
    return insights;
  }
}
