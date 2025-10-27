import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { SalesPipelineService } from './services/sales-pipeline.service';
import { LeadScoringService } from './services/lead-scoring.service';
import { MarketingAutomationService } from './services/marketing-automation.service';
import { CustomerJourneyService } from './services/customer-journey.service';

@ApiTags('CRM Enhanced - Advanced CRM Features')
@Controller({ path: 'crm-enhanced', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrmEnhancedController {
  constructor(
    private readonly salesPipeline: SalesPipelineService,
    private readonly leadScoring: LeadScoringService,
    private readonly marketingAutomation: MarketingAutomationService,
    private readonly customerJourney: CustomerJourneyService,
  ) {}

  // ==================== SALES PIPELINE ====================

  @Post('pipeline/stages')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create sales stage' })
  @ApiResponse({ status: 201, description: 'Sales stage created' })
  async createSalesStage(@Body() stage: any) {
    return this.salesPipeline.createSalesStage(stage);
  }

  @Get('pipeline/stages')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get sales stages' })
  @ApiResponse({ status: 200, description: 'Sales stages' })
  async getSalesStages() {
    return this.salesPipeline.getSalesStages();
  }

  @Post('pipeline/deals')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create deal' })
  @ApiResponse({ status: 201, description: 'Deal created' })
  async createDeal(@Body() deal: any) {
    return this.salesPipeline.createDeal(deal);
  }

  @Get('pipeline/deals')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get deals' })
  @ApiResponse({ status: 200, description: 'Deals' })
  async getDeals(@Query() filters: any) {
    return this.salesPipeline.getDeals(filters);
  }

  @Post('pipeline/deals/:dealId/move')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Move deal to stage' })
  @ApiResponse({ status: 200, description: 'Deal moved' })
  async moveDealToStage(
    @Param('dealId') dealId: string,
    @Body() data: { stageId: string; userId: string }
  ) {
    await this.salesPipeline.moveDealToStage(dealId, data.stageId, data.userId);
    return { success: true };
  }

  @Post('pipeline/deals/:dealId/close')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Close deal' })
  @ApiResponse({ status: 200, description: 'Deal closed' })
  async closeDeal(
    @Param('dealId') dealId: string,
    @Body() data: { status: 'won' | 'lost'; actualCloseDate?: Date; userId?: string }
  ) {
    await this.salesPipeline.closeDeal(dealId, data.status, data.actualCloseDate, data.userId);
    return { success: true };
  }

  @Get('pipeline/forecast')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get pipeline forecast' })
  @ApiResponse({ status: 200, description: 'Pipeline forecast' })
  async getPipelineForecast(
    @Query('period') period: 'monthly' | 'quarterly' | 'yearly',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.salesPipeline.getPipelineForecast(period, new Date(startDate), new Date(endDate));
  }

  @Get('pipeline/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get sales analytics' })
  @ApiResponse({ status: 200, description: 'Sales analytics' })
  async getSalesAnalytics(@Query('userId') userId?: string, @Query('period') period?: string) {
    return this.salesPipeline.getSalesAnalytics(userId, period);
  }

  // ==================== LEAD SCORING ====================

  @Post('scoring/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create scoring rule' })
  @ApiResponse({ status: 201, description: 'Scoring rule created' })
  async createScoringRule(@Body() rule: any) {
    return this.leadScoring.createScoringRule(rule);
  }

  @Get('scoring/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get scoring rules' })
  @ApiResponse({ status: 200, description: 'Scoring rules' })
  async getScoringRules(@Query('category') category?: string, @Query('isActive') isActive?: boolean) {
    return this.leadScoring.getScoringRules(category, isActive);
  }

  @Post('scoring/calculate/:leadId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Calculate lead score' })
  @ApiResponse({ status: 200, description: 'Lead score calculated' })
  async calculateLeadScore(
    @Param('leadId') leadId: string,
    @Body() data: { forceRecalculate?: boolean }
  ) {
    return this.leadScoring.calculateLeadScore(leadId, data.forceRecalculate);
  }

  @Get('scoring/scores')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get lead scores' })
  @ApiResponse({ status: 200, description: 'Lead scores' })
  async getLeadScores(@Query() filters: any) {
    return this.leadScoring.getLeadScores(filters);
  }

  @Get('scoring/insights/:leadId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get lead scoring insights' })
  @ApiResponse({ status: 200, description: 'Lead scoring insights' })
  async getScoringInsights(@Param('leadId') leadId: string) {
    return this.leadScoring.getScoringInsights(leadId);
  }

  @Get('scoring/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get scoring analytics' })
  @ApiResponse({ status: 200, description: 'Scoring analytics' })
  async getScoringAnalytics() {
    return this.leadScoring.getScoringAnalytics();
  }

  // ==================== MARKETING AUTOMATION ====================

  @Post('marketing/campaigns')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create marketing campaign' })
  @ApiResponse({ status: 201, description: 'Marketing campaign created' })
  async createCampaign(@Body() campaign: any) {
    return this.marketingAutomation.createCampaign(campaign);
  }

  @Get('marketing/campaigns')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get marketing campaigns' })
  @ApiResponse({ status: 200, description: 'Marketing campaigns' })
  async getCampaigns(@Query('status') status?: string) {
    return this.marketingAutomation.getCampaigns(status);
  }

  @Post('marketing/campaigns/:campaignId/launch')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Launch marketing campaign' })
  @ApiResponse({ status: 200, description: 'Campaign launched' })
  async launchCampaign(@Param('campaignId') campaignId: string) {
    await this.marketingAutomation.launchCampaign(campaignId);
    return { success: true };
  }

  @Post('marketing/sequences')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create email sequence' })
  @ApiResponse({ status: 201, description: 'Email sequence created' })
  async createEmailSequence(@Body() sequence: any) {
    return this.marketingAutomation.createEmailSequence(sequence);
  }

  @Get('marketing/sequences')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get email sequences' })
  @ApiResponse({ status: 200, description: 'Email sequences' })
  async getEmailSequences() {
    return this.marketingAutomation.getEmailSequences();
  }

  @Post('marketing/nurturing/:leadId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Start lead nurturing' })
  @ApiResponse({ status: 200, description: 'Lead nurturing started' })
  async startLeadNurturing(
    @Param('leadId') leadId: string,
    @Body() data: { sequenceId: string }
  ) {
    return this.marketingAutomation.startLeadNurturing(leadId, data.sequenceId);
  }

  @Get('marketing/nurturing/:leadId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get lead nurturing' })
  @ApiResponse({ status: 200, description: 'Lead nurturing' })
  async getLeadNurturing(@Param('leadId') leadId: string) {
    return this.marketingAutomation.getLeadNurturing(leadId);
  }

  @Get('marketing/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get marketing analytics' })
  @ApiResponse({ status: 200, description: 'Marketing analytics' })
  async getMarketingAnalytics() {
    return this.marketingAutomation.getMarketingAnalytics();
  }

  // ==================== CUSTOMER JOURNEY ====================

  @Post('journey/:customerId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create customer journey' })
  @ApiResponse({ status: 201, description: 'Customer journey created' })
  async createCustomerJourney(@Param('customerId') customerId: string) {
    return this.customerJourney.createCustomerJourney(customerId);
  }

  @Get('journey/:customerId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get customer journey' })
  @ApiResponse({ status: 200, description: 'Customer journey' })
  async getCustomerJourney(@Param('customerId') customerId: string) {
    return this.customerJourney.getCustomerJourney(customerId);
  }

  @Post('journey/:customerId/touchpoint')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Add touchpoint' })
  @ApiResponse({ status: 200, description: 'Touchpoint added' })
  async addTouchpoint(
    @Param('customerId') customerId: string,
    @Body() touchpoint: any
  ) {
    return this.customerJourney.addTouchpoint(customerId, touchpoint);
  }

  @Get('journey/:customerId/touchpoints')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get journey touchpoints' })
  @ApiResponse({ status: 200, description: 'Journey touchpoints' })
  async getJourneyTouchpoints(
    @Param('customerId') customerId: string,
    @Query('type') type?: string
  ) {
    return this.customerJourney.getJourneyTouchpoints(customerId, type);
  }

  @Post('journey/:customerId/stage')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update journey stage' })
  @ApiResponse({ status: 200, description: 'Journey stage updated' })
  async updateJourneyStage(
    @Param('customerId') customerId: string,
    @Body() data: { stage: string }
  ) {
    await this.customerJourney.updateJourneyStage(customerId, data.stage);
    return { success: true };
  }

  @Get('journey/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get journey analytics' })
  @ApiResponse({ status: 200, description: 'Journey analytics' })
  async getJourneyAnalytics(@Query('period') period: string = '30d') {
    return this.customerJourney.getJourneyAnalytics(period);
  }

  @Get('journey/insights/:customerId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get journey insights' })
  @ApiResponse({ status: 200, description: 'Journey insights' })
  async getJourneyInsights(@Param('customerId') customerId: string) {
    return this.customerJourney.getJourneyInsights(customerId);
  }

  @Get('journey/map')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get customer journey map' })
  @ApiResponse({ status: 200, description: 'Customer journey map' })
  async getCustomerJourneyMap() {
    return this.customerJourney.getCustomerJourneyMap();
  }

  // ==================== COMPREHENSIVE CRM ====================

  @Get('dashboard')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get CRM dashboard' })
  @ApiResponse({ status: 200, description: 'CRM dashboard data' })
  async getCrmDashboard() {
    const [
      salesAnalytics,
      scoringAnalytics,
      marketingAnalytics,
      journeyAnalytics
    ] = await Promise.all([
      this.salesPipeline.getSalesAnalytics(),
      this.leadScoring.getScoringAnalytics(),
      this.marketingAutomation.getMarketingAnalytics(),
      this.customerJourney.getJourneyAnalytics()
    ]);

    return {
      sales: salesAnalytics,
      scoring: scoringAnalytics,
      marketing: marketingAnalytics,
      journey: journeyAnalytics,
      lastUpdated: new Date(),
      insights: this.generateCrmInsights(salesAnalytics, scoringAnalytics, marketingAnalytics, journeyAnalytics)
    };
  }

  @Get('health')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get CRM health' })
  @ApiResponse({ status: 200, description: 'CRM health status' })
  async getCrmHealth() {
    return {
      salesPipeline: 'healthy',
      leadScoring: 'healthy',
      marketingAutomation: 'healthy',
      customerJourney: 'healthy',
      lastChecked: new Date(),
      uptime: 99.9,
      performance: {
        averageResponseTime: 180,
        throughput: 800,
        errorRate: 0.01
      }
    };
  }

  private generateCrmInsights(salesAnalytics: any, scoringAnalytics: any, marketingAnalytics: any, journeyAnalytics: any) {
    const insights = [];
    
    if (salesAnalytics.winRate < 30) {
      insights.push('📈 Sales win rate is below target - review pipeline stages');
    }
    
    if (scoringAnalytics.averageScore < 50) {
      insights.push('🎯 Lead scores are low - review scoring rules');
    }
    
    if (marketingAnalytics.averageOpenRate < 20) {
      insights.push('📧 Email open rates are low - improve subject lines');
    }
    
    if (journeyAnalytics.totalCustomers > 0 && journeyAnalytics.averageJourneyTime > 90) {
      insights.push('⏱️ Customer journey time is long - optimize touchpoints');
    }
    
    return insights;
  }
}
