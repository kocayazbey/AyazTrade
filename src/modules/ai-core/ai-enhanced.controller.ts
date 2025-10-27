import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { PredictiveAnalyticsService } from './services/predictive-analytics.service';
import { DemandForecastingService } from './services/demand-forecasting.service';
import { CustomerSegmentationService } from './services/customer-segmentation.service';
import { PriceOptimizationService } from './services/price-optimization.service';
import { InventoryOptimizationService } from './services/inventory-optimization.service';

@ApiTags('AI Enhanced - Advanced Analytics & Optimization')
@Controller({ path: 'ai-enhanced', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiEnhancedController {
  constructor(
    private readonly predictiveAnalytics: PredictiveAnalyticsService,
    private readonly demandForecasting: DemandForecastingService,
    private readonly customerSegmentation: CustomerSegmentationService,
    private readonly priceOptimization: PriceOptimizationService,
    private readonly inventoryOptimization: InventoryOptimizationService,
  ) {}

  // ==================== PREDICTIVE ANALYTICS ====================

  @Get('predictive/ltv/:customerId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Calculate customer LTV' })
  @ApiResponse({ status: 200, description: 'Customer LTV calculated' })
  async calculateCustomerLTV(@Param('customerId') customerId: string) {
    return this.predictiveAnalytics.calculateCustomerLTV(customerId);
  }

  @Post('predictive/segments')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create customer segment' })
  @ApiResponse({ status: 201, description: 'Customer segment created' })
  async createCustomerSegment(@Body() segment: any) {
    return this.predictiveAnalytics.createCustomerSegment(segment);
  }

  @Get('predictive/segments')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get customer segments' })
  @ApiResponse({ status: 200, description: 'Customer segments' })
  async getCustomerSegments() {
    return this.predictiveAnalytics.getCustomerSegments();
  }

  @Post('predictive/segments/analyze')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Perform customer segmentation' })
  @ApiResponse({ status: 200, description: 'Customer segmentation completed' })
  async segmentCustomers() {
    await this.predictiveAnalytics.segmentCustomers();
    return { success: true, message: 'Customer segmentation completed' };
  }

  @Get('predictive/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get predictive analytics summary' })
  @ApiResponse({ status: 200, description: 'Predictive analytics summary' })
  async getPredictiveAnalytics(@Query('period') period: string = '30d') {
    return this.predictiveAnalytics.getPredictiveAnalytics(period);
  }

  // ==================== DEMAND FORECASTING ====================

  @Post('forecasting/generate/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate demand forecast' })
  @ApiResponse({ status: 201, description: 'Demand forecast generated' })
  async generateDemandForecast(
    @Param('productId') productId: string,
    @Body() data: { period?: string; method?: string }
  ) {
    return this.demandForecasting.generateDemandForecast(
      productId,
      data.period || '30d',
      data.method as any || 'ml_model'
    );
  }

  @Get('forecasting/forecasts')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get demand forecasts' })
  @ApiResponse({ status: 200, description: 'Demand forecasts' })
  async getDemandForecasts(
    @Query('productId') productId?: string,
    @Query('method') method?: string
  ) {
    return this.demandForecasting.getDemandForecasts(productId, method);
  }

  @Post('forecasting/seasonal/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Detect seasonal pattern' })
  @ApiResponse({ status: 200, description: 'Seasonal pattern detected' })
  async detectSeasonalPattern(@Param('productId') productId: string) {
    return this.demandForecasting.detectSeasonalPattern(productId, []);
  }

  @Get('forecasting/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get demand forecasting analytics' })
  @ApiResponse({ status: 200, description: 'Demand forecasting analytics' })
  async getForecastAnalytics(@Query('period') period: string = '30d') {
    return this.demandForecasting.getForecastAnalytics(period);
  }

  // ==================== CUSTOMER SEGMENTATION ====================

  @Post('segmentation/rfm')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Perform RFM analysis' })
  @ApiResponse({ status: 200, description: 'RFM analysis completed' })
  async performRFMAnalysis() {
    return this.customerSegmentation.performRFMAnalysis();
  }

  @Post('segmentation/behavioral')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Perform behavioral segmentation' })
  @ApiResponse({ status: 200, description: 'Behavioral segmentation completed' })
  async performBehavioralSegmentation() {
    return this.customerSegmentation.performBehavioralSegmentation();
  }

  @Post('segmentation/kmeans')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Perform K-means segmentation' })
  @ApiResponse({ status: 200, description: 'K-means segmentation completed' })
  async performKMeansSegmentation(@Body() data: { k?: number }) {
    return this.customerSegmentation.performKMeansSegmentation(data.k || 5);
  }

  @Get('segmentation/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get segmentation analytics' })
  @ApiResponse({ status: 200, description: 'Segmentation analytics' })
  async getSegmentationAnalytics() {
    return this.customerSegmentation.getSegmentationAnalytics();
  }

  // ==================== PRICE OPTIMIZATION ====================

  @Post('pricing/optimize/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Optimize product price' })
  @ApiResponse({ status: 200, description: 'Price optimization completed' })
  async optimizeProductPrice(
    @Param('productId') productId: string,
    @Body() data: { method?: string }
  ) {
    return this.priceOptimization.optimizeProductPrice(
      productId,
      data.method as any || 'hybrid'
    );
  }

  @Post('pricing/elasticity/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Calculate price elasticity' })
  @ApiResponse({ status: 200, description: 'Price elasticity calculated' })
  async calculatePriceElasticity(@Param('productId') productId: string) {
    return this.priceOptimization.calculatePriceElasticity(productId);
  }

  @Post('pricing/competitors/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Analyze competitors' })
  @ApiResponse({ status: 200, description: 'Competitor analysis completed' })
  async analyzeCompetitors(@Param('productId') productId: string) {
    return this.priceOptimization.analyzeCompetitors(productId);
  }

  @Post('pricing/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create dynamic pricing rule' })
  @ApiResponse({ status: 201, description: 'Dynamic pricing rule created' })
  async createDynamicPricingRule(@Body() rule: any) {
    return this.priceOptimization.createDynamicPricingRule(rule);
  }

  @Get('pricing/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get dynamic pricing rules' })
  @ApiResponse({ status: 200, description: 'Dynamic pricing rules' })
  async getDynamicPricingRules(@Query('productId') productId?: string) {
    return this.priceOptimization.getDynamicPricingRules(productId);
  }

  @Post('pricing/apply/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Apply dynamic pricing' })
  @ApiResponse({ status: 200, description: 'Dynamic pricing applied' })
  async applyDynamicPricing(
    @Param('productId') productId: string,
    @Body() context: Record<string, any>
  ) {
    return this.priceOptimization.applyDynamicPricing(productId, context);
  }

  @Get('pricing/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get price optimization analytics' })
  @ApiResponse({ status: 200, description: 'Price optimization analytics' })
  async getPriceOptimizationAnalytics(@Query('period') period: string = '30d') {
    return this.priceOptimization.getPriceOptimizationAnalytics(period);
  }

  // ==================== INVENTORY OPTIMIZATION ====================

  @Post('inventory/optimize/:productId/:warehouseId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Optimize inventory' })
  @ApiResponse({ status: 200, description: 'Inventory optimization completed' })
  async optimizeInventory(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string
  ) {
    return this.inventoryOptimization.optimizeInventory(productId, warehouseId);
  }

  @Post('inventory/abc/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Perform ABC analysis' })
  @ApiResponse({ status: 200, description: 'ABC analysis completed' })
  async performABCAnalysis(@Param('productId') productId: string) {
    return this.inventoryOptimization.performABCAnalysis(productId);
  }

  @Post('inventory/reorder/:productId/:warehouseId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Calculate reorder point' })
  @ApiResponse({ status: 200, description: 'Reorder point calculated' })
  async calculateReorderPoint(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string
  ) {
    return this.inventoryOptimization.calculateReorderPoint(productId, warehouseId);
  }

  @Post('inventory/safety/:productId/:warehouseId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Calculate safety stock' })
  @ApiResponse({ status: 200, description: 'Safety stock calculated' })
  async calculateSafetyStock(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string
  ) {
    return this.inventoryOptimization.calculateSafetyStock(productId, warehouseId);
  }

  @Get('inventory/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get inventory analytics' })
  @ApiResponse({ status: 200, description: 'Inventory analytics' })
  async getInventoryAnalytics(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryOptimization.getInventoryAnalytics(warehouseId);
  }

  @Post('inventory/optimize-levels/:warehouseId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Optimize inventory levels' })
  @ApiResponse({ status: 200, description: 'Inventory levels optimized' })
  async optimizeInventoryLevels(@Param('warehouseId') warehouseId: string) {
    return this.inventoryOptimization.optimizeInventoryLevels(warehouseId);
  }

  // ==================== COMBINED ANALYTICS ====================

  @Get('analytics/dashboard')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get AI analytics dashboard' })
  @ApiResponse({ status: 200, description: 'AI analytics dashboard' })
  async getAiAnalyticsDashboard(@Query('period') period: string = '30d') {
    const [
      predictiveAnalytics,
      forecastAnalytics,
      segmentationAnalytics,
      priceAnalytics,
      inventoryAnalytics
    ] = await Promise.all([
      this.predictiveAnalytics.getPredictiveAnalytics(period),
      this.demandForecasting.getForecastAnalytics(period),
      this.customerSegmentation.getSegmentationAnalytics(),
      this.priceOptimization.getPriceOptimizationAnalytics(period),
      this.inventoryOptimization.getInventoryAnalytics()
    ]);

    return {
      predictiveAnalytics,
      forecastAnalytics,
      segmentationAnalytics,
      priceAnalytics,
      inventoryAnalytics,
      generatedAt: new Date(),
      period
    };
  }

  @Get('analytics/insights')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get AI insights and recommendations' })
  @ApiResponse({ status: 200, description: 'AI insights and recommendations' })
  async getAiInsights(@Query('period') period: string = '30d') {
    const analytics = await this.getAiAnalyticsDashboard(period);
    
    const insights = this.generateAiInsights(analytics);
    const recommendations = this.generateAiRecommendations(analytics);
    
    return {
      insights,
      recommendations,
      generatedAt: new Date(),
      period
    };
  }

  @Post('analytics/optimize-all')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Run comprehensive AI optimization' })
  @ApiResponse({ status: 200, description: 'Comprehensive AI optimization completed' })
  async runComprehensiveOptimization(@Body() data: { warehouseId?: string; productIds?: string[] }) {
    const results = {
      predictiveAnalytics: null,
      demandForecasting: null,
      customerSegmentation: null,
      priceOptimization: null,
      inventoryOptimization: null
    };

    try {
      // Run all optimizations in parallel
      const promises = [];

      if (data.productIds && data.productIds.length > 0) {
        for (const productId of data.productIds) {
          promises.push(
            this.predictiveAnalytics.calculateCustomerLTV('customer-1'),
            this.demandForecasting.generateDemandForecast(productId),
            this.priceOptimization.optimizeProductPrice(productId)
          );

          if (data.warehouseId) {
            promises.push(
              this.inventoryOptimization.optimizeInventory(productId, data.warehouseId)
            );
          }
        }
      }

      promises.push(
        this.customerSegmentation.performRFMAnalysis(),
        this.customerSegmentation.performBehavioralSegmentation()
      );

      await Promise.all(promises);

      return {
        success: true,
        message: 'Comprehensive AI optimization completed successfully',
        results,
        generatedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Comprehensive AI optimization failed',
        error: error.message,
        generatedAt: new Date()
      };
    }
  }

  private generateAiInsights(analytics: any): string[] {
    const insights = [];
    
    // Predictive Analytics Insights
    if (analytics.predictiveAnalytics.averageLTV > 1000) {
      insights.push('High-value customers detected - focus on retention strategies');
    }
    
    if (analytics.predictiveAnalytics.churnRate > 0.1) {
      insights.push('High churn rate detected - implement customer retention programs');
    }
    
    // Demand Forecasting Insights
    if (analytics.forecastAnalytics.averageAccuracy > 0.8) {
      insights.push('Demand forecasting models are performing well');
    }
    
    // Price Optimization Insights
    if (analytics.priceAnalytics.averageRevenueImpact > 0) {
      insights.push('Price optimization opportunities identified - potential revenue increase');
    }
    
    // Inventory Optimization Insights
    if (analytics.inventoryAnalytics.stockoutRisk.some(risk => risk.riskLevel === 'critical')) {
      insights.push('Critical stockout risks detected - immediate attention required');
    }
    
    return insights;
  }

  private generateAiRecommendations(analytics: any): string[] {
    const recommendations = [];
    
    // Predictive Analytics Recommendations
    recommendations.push('Implement customer lifetime value tracking for all customers');
    recommendations.push('Create targeted marketing campaigns based on customer segments');
    
    // Demand Forecasting Recommendations
    recommendations.push('Use ML models for products with sufficient historical data');
    recommendations.push('Implement seasonal adjustments for products with clear patterns');
    
    // Price Optimization Recommendations
    recommendations.push('Implement dynamic pricing rules for high-value products');
    recommendations.push('Monitor competitor prices regularly for price-sensitive products');
    
    // Inventory Optimization Recommendations
    recommendations.push('Implement ABC analysis for inventory classification');
    recommendations.push('Set up automated reorder points for critical products');
    
    return recommendations;
  }
}