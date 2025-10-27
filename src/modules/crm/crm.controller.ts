import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CRMService } from './services/crm.service';
import { ConversionTrackingService } from './services/conversion-tracking.service';
import { SalesPipelineService } from './services/sales-pipeline.service';
import { FrontendCRMDashboardService } from './frontend-crm-dashboard.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { CreateLeadDto, UpdateLeadDto } from './dto/create-lead.dto';
import {
  ComprehensiveGet,
  ComprehensivePost,
  ComprehensivePut,
  ComprehensiveDelete
} from '../../core/decorators';

@ApiTags('CRM - Customer Relationship Management')
@Controller({ path: 'crm', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CRMController {
  constructor(
    private readonly crmService: CRMService,
    private readonly conversionTrackingService: ConversionTrackingService,
    private readonly salesPipelineService: SalesPipelineService,
    private readonly crmDashboardService: FrontendCRMDashboardService,
  ) {}

  // ==================== CUSTOMERS ====================

  @Get('customers')
  @ComprehensiveGet({
    auditAction: 'read',
    auditResource: 'customers',
    auditLevel: 'medium',
    cacheTtl: 300,
    cacheTags: ['customers', 'crm'],
    summary: 'Get customers',
    description: 'Retrieve customers with comprehensive caching and audit logging',
    tags: ['customers', 'crm']
  })
  async getCustomers(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.crmService.getCustomers(tenantId, query);
  }

  @Get('customers/stats')
  @ApiOperation({ summary: 'Get customer statistics' })
  @ApiResponse({ status: 200, description: 'Returns customer statistics' })
  async getCustomerStats(@CurrentUser('tenantId') tenantId: string) {
    return this.crmService.getCustomerStats(tenantId);
  }

  @Post('customers')
  @ComprehensivePost({
    auditAction: 'create',
    auditResource: 'customer',
    auditLevel: 'high',
    securityLevel: 'high',
    cacheTtl: 0, // No cache for create operations
    rateLimitMax: 20, // Moderate rate limit for create operations
    summary: 'Create customer',
    description: 'Create a new customer with comprehensive security and audit logging',
    tags: ['customers', 'crm', 'admin']
  })
  async createCustomer(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.crmService.createCustomer(data, tenantId, userId);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Returns customer details with activities' })
  async getCustomerById(@Param('id') customerId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.getCustomerById(customerId, tenantId);
  }

  @Put('customers/:id')
  @ApiOperation({ summary: 'Update customer' })
  async updateCustomer(@Param('id') customerId: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.updateCustomer(customerId, data, tenantId);
  }

  // ==================== LEADS ====================

  @Get('leads')
  @ApiOperation({ summary: 'Get leads' })
  @ApiResponse({ status: 200, description: 'Returns list of leads' })
  async getLeads(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.crmService.getLeads(tenantId, query);
  }

  @Get('leads/stats')
  @ApiOperation({ summary: 'Get lead statistics' })
  @ApiResponse({ status: 200, description: 'Returns lead statistics' })
  async getLeadStats(@CurrentUser('tenantId') tenantId: string) {
    return this.crmService.getLeadStats(tenantId);
  }

  @Post('leads')
  @ApiOperation({ summary: 'Create lead' })
  async createLead(@Body() data: CreateLeadDto, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.crmService.createLead(data, tenantId, userId);
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiResponse({ status: 200, description: 'Returns lead details with activities' })
  async getLeadById(@Param('id') leadId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.getLeadById(leadId, tenantId);
  }

  @Put('leads/:id')
  @ApiOperation({ summary: 'Update lead' })
  async updateLead(@Param('id') leadId: string, @Body() data: UpdateLeadDto, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.updateLead(leadId, data, tenantId);
  }

  @Delete('leads/:id')
  @ApiOperation({ summary: 'Delete lead' })
  async deleteLead(@Param('id') leadId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.deleteLead(leadId, tenantId);
  }

  @Post('leads/:id/convert')
  @ApiOperation({ summary: 'Convert lead to customer' })
  @ApiResponse({ status: 200, description: 'Returns converted customer and updated lead' })
  async convertLead(@Param('id') leadId: string, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.crmService.convertLeadToCustomer(leadId, tenantId, userId);
  }

  // ==================== DEALERS ====================

  @Get('dealers')
  @ApiOperation({ summary: 'Get dealers' })
  async getDealers(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.crmService.getDealers(tenantId, filters);
  }

  @Post('dealers')
  @ApiOperation({ summary: 'Create dealer' })
  async createDealer(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.crmService.createDealer(data, tenantId, userId);
  }

  // ==================== ACTIVITIES ====================

  @Get('activities')
  @ApiOperation({ summary: 'Get activities' })
  async getActivities(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.crmService.getActivities(tenantId, filters);
  }

  @Post('activities')
  @ApiOperation({ summary: 'Create activity' })
  async createActivity(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.crmService.createActivity(data, tenantId, userId);
  }

  @Put('activities/:id')
  @ApiOperation({ summary: 'Update activity' })
  async updateActivity(@Param('id') activityId: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.updateActivity(activityId, data, tenantId);
  }

  @Delete('activities/:id')
  @ApiOperation({ summary: 'Delete activity' })
  async deleteActivity(@Param('id') activityId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.deleteActivity(activityId, tenantId);
  }

  // ==================== CONVERSION TRACKING ====================

  @Get('conversion/metrics')
  @ApiOperation({ summary: 'Get conversion metrics' })
  @ApiResponse({ status: 200, description: 'Returns conversion metrics' })
  async getConversionMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('days') days: number
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.conversionTrackingService.getConversionMetrics(tenantId, start, end);
  }

  @Get('conversion/journey/:leadId')
  @ApiOperation({ summary: 'Get conversion journey for a lead' })
  @ApiResponse({ status: 200, description: 'Returns conversion journey details' })
  async getConversionJourney(
    @Param('leadId') leadId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.conversionTrackingService.getConversionJourney(leadId, tenantId);
  }

  @Get('conversion/insights')
  @ApiOperation({ summary: 'Get conversion insights and recommendations' })
  @ApiResponse({ status: 200, description: 'Returns conversion insights' })
  async getConversionInsights(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days') days: number = 30
  ) {
    return this.conversionTrackingService.getConversionInsights(tenantId, days);
  }

  @Get('conversion/lead-scoring-impact')
  @ApiOperation({ summary: 'Get lead scoring impact analysis' })
  @ApiResponse({ status: 200, description: 'Returns lead scoring impact analysis' })
  async getLeadScoringImpact(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days') days: number = 90
  ) {
    return this.conversionTrackingService.getLeadScoringImpact(tenantId, days);
  }

  // ==================== SALES PIPELINE ====================

  @Get('pipeline/stages')
  @ApiOperation({ summary: 'Get sales pipeline stages' })
  @ApiResponse({ status: 200, description: 'Returns sales pipeline stages' })
  async getPipelineStages(@CurrentUser('tenantId') tenantId: string) {
    return this.salesPipelineService.getSalesStages();
  }

  @Get('pipeline/deals')
  @ApiOperation({ summary: 'Get deals in pipeline' })
  @ApiResponse({ status: 200, description: 'Returns deals in sales pipeline' })
  async getPipelineDeals(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: any
  ) {
    return this.salesPipelineService.getDeals(tenantId, filters);
  }

  @Get('pipeline/forecast')
  @ApiOperation({ summary: 'Get pipeline forecast' })
  @ApiResponse({ status: 200, description: 'Returns pipeline forecast' })
  async getPipelineForecast(
    @CurrentUser('tenantId') tenantId: string,
    @Query('period') period: 'monthly' | 'quarterly' | 'yearly',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.salesPipelineService.getPipelineForecast(period, start, end);
  }

  @Post('pipeline/deals')
  @ApiOperation({ summary: 'Create new deal in pipeline' })
  @ApiResponse({ status: 201, description: 'Deal created successfully' })
  async createDeal(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.salesPipelineService.createDeal(data, tenantId, userId);
  }

  @Put('pipeline/deals/:dealId')
  @ApiOperation({ summary: 'Update deal in pipeline' })
  @ApiResponse({ status: 200, description: 'Deal updated successfully' })
  async updateDeal(
    @Param('dealId') dealId: string,
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.salesPipelineService.updateDeal(dealId, data, tenantId, userId);
  }

  @Post('pipeline/deals/:dealId/close')
  @ApiOperation({ summary: 'Close deal (won/lost)' })
  @ApiResponse({ status: 200, description: 'Deal closed successfully' })
  async closeDeal(
    @Param('dealId') dealId: string,
    @Body() data: { status: 'won' | 'lost'; actualCloseDate?: Date },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.salesPipelineService.closeDeal(dealId, data.status, data.actualCloseDate, userId);
  }

  @Get('pipeline/statistics')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  @ApiResponse({ status: 200, description: 'Returns pipeline statistics' })
  async getPipelineStatistics(@CurrentUser('tenantId') tenantId: string) {
    return this.salesPipelineService.getPipelineStatistics(tenantId);
  }

  // ==================== QUOTES ====================

  @Get('quotes')
  @ApiOperation({ summary: 'Get quotes' })
  @ApiResponse({ status: 200, description: 'Returns quotes' })
  async getQuotes(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: any
  ) {
    return this.crmService.getQuotes(tenantId, filters);
  }

  @Post('quotes')
  @ApiOperation({ summary: 'Create quote' })
  @ApiResponse({ status: 201, description: 'Quote created successfully' })
  async createQuote(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.crmService.createQuote(data, tenantId, userId);
  }

  @Get('quotes/:quoteId')
  @ApiOperation({ summary: 'Get quote details' })
  @ApiResponse({ status: 200, description: 'Returns quote details' })
  async getQuote(
    @Param('quoteId') quoteId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.crmService.getQuote(quoteId, tenantId);
  }

  @Put('quotes/:quoteId')
  @ApiOperation({ summary: 'Update quote' })
  @ApiResponse({ status: 200, description: 'Quote updated successfully' })
  async updateQuote(
    @Param('quoteId') quoteId: string,
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.crmService.updateQuote(quoteId, data, tenantId, userId);
  }

  @Post('quotes/:quoteId/send')
  @ApiOperation({ summary: 'Send quote to customer' })
  @ApiResponse({ status: 200, description: 'Quote sent successfully' })
  async sendQuote(
    @Param('quoteId') quoteId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.crmService.sendQuote(quoteId, tenantId, userId);
  }

  @Get('quotes/statistics')
  @ApiOperation({ summary: 'Get quotes statistics' })
  @ApiResponse({ status: 200, description: 'Returns quotes statistics' })
  async getQuotesStatistics(@CurrentUser('tenantId') tenantId: string) {
    return this.crmService.getQuotesStatistics(tenantId);
  }

  @Delete('quotes/:quoteId')
  @ApiOperation({ summary: 'Delete quote' })
  async deleteQuote(@Param('quoteId') quoteId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.deleteContract(quoteId, tenantId);
  }

  // ==================== CONTRACTS ====================

  @Get('contracts')
  @ApiOperation({ summary: 'Get contracts' })
  async getContracts(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.crmService.getContracts(tenantId, filters);
  }

  @Post('contracts')
  @ApiOperation({ summary: 'Create contract' })
  async createContract(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.crmService.createContract(data, tenantId, userId);
  }

  @Get('contracts/:contractId')
  @ApiOperation({ summary: 'Get contract details' })
  async getContract(@Param('contractId') contractId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.getContract(contractId, tenantId);
  }

  @Put('contracts/:contractId')
  @ApiOperation({ summary: 'Update contract' })
  async updateContract(@Param('contractId') contractId: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.crmService.updateContract(contractId, data, tenantId, userId);
  }

  @Delete('contracts/:contractId')
  @ApiOperation({ summary: 'Delete contract' })
  async deleteContract(@Param('contractId') contractId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.deleteContract(contractId, tenantId);
  }

  // ==================== FRONTEND CRM DASHBOARD ====================

  @Get('dashboard/metrics')
  @ApiOperation({ summary: 'Get CRM dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Returns CRM dashboard metrics' })
  async getDashboardMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days') days: number = 30
  ) {
    return this.crmDashboardService.getDashboardMetrics(tenantId, days);
  }

  @Get('dashboard/leads')
  @ApiOperation({ summary: 'Get leads dashboard' })
  @ApiResponse({ status: 200, description: 'Returns leads dashboard data' })
  async getLeadsDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: any
  ) {
    return this.crmDashboardService.getLeadsDashboard(tenantId, filters);
  }

  @Get('dashboard/opportunities')
  @ApiOperation({ summary: 'Get opportunities dashboard' })
  @ApiResponse({ status: 200, description: 'Returns opportunities dashboard data' })
  async getOpportunitiesDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: any
  ) {
    return this.crmDashboardService.getOpportunitiesDashboard(tenantId, filters);
  }

  @Get('dashboard/activities')
  @ApiOperation({ summary: 'Get activities dashboard' })
  @ApiResponse({ status: 200, description: 'Returns activities dashboard data' })
  async getActivitiesDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: any
  ) {
    return this.crmDashboardService.getActivitiesDashboard(tenantId, filters);
  }

  @Get('dashboard/sales-funnel')
  @ApiOperation({ summary: 'Get sales funnel analysis' })
  @ApiResponse({ status: 200, description: 'Returns sales funnel data' })
  async getSalesFunnel(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days') days: number = 90
  ) {
    return this.crmDashboardService.getSalesFunnel(tenantId, days);
  }
}
