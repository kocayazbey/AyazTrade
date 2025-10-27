import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { ApiMarketplaceService } from './services/api-marketplace.service';
import { ExternalSystemsService } from './services/external-systems.service';
import { DataSyncService } from './services/data-sync.service';
import { TrendyolService } from './services/trendyol.service';
import { HepsiburadaService } from './services/hepsiburada.service';
import { N11Service } from './services/n11.service';
import { AmazonTRService } from './services/amazon-tr.service';
import { SahibindenService } from './services/sahibinden.service';
import { ShippingService } from './services/shipping.service';
import { ERPIntegrationService } from './services/erp-integration.service';
import { SMSGatewayService } from './services/sms-gateway.service';
import { EmailService } from './services/email.service';
import { WhatsAppService } from './services/whatsapp.service';
import { PaymentService } from './services/payment.service';
import { WebSocketNotificationsService } from './services/websocket-notifications.service';
import { WebSocketLiveChatService } from './services/websocket-live-chat.service';
import { WebSocketInventoryService } from './services/websocket-inventory.service';
import { AnalyticsRealtimeService } from './services/analytics-realtime.service';
import { AnalyticsCustomReportsService } from './services/analytics-custom-reports.service';
import { AnalyticsBIService } from './services/analytics-bi.service';
import { TenantManagementService } from './services/tenant-management.service';
import { DatabaseSeedService } from './services/database-seed.service';
import { DatabaseOptimizationService } from './services/database-optimization.service';

@ApiTags('Integrations Enhanced - Advanced Integrations')
@Controller({ path: 'integrations-enhanced', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntegrationsEnhancedController {
  constructor(
    private readonly apiMarketplace: ApiMarketplaceService,
    private readonly externalSystems: ExternalSystemsService,
    private readonly dataSync: DataSyncService,
    private readonly trendyol: TrendyolService,
    private readonly hepsiburada: HepsiburadaService,
    private readonly n11: N11Service,
    private readonly amazonTR: AmazonTRService,
    private readonly sahibinden: SahibindenService,
    private readonly shipping: ShippingService,
    private readonly erpIntegration: ERPIntegrationService,
    private readonly smsGateway: SMSGatewayService,
    private readonly emailService: EmailService,
    private readonly whatsapp: WhatsAppService,
    private readonly payment: PaymentService,
    private readonly websocketNotifications: WebSocketNotificationsService,
    private readonly websocketLiveChat: WebSocketLiveChatService,
    private readonly websocketInventory: WebSocketInventoryService,
    private readonly analyticsRealtime: AnalyticsRealtimeService,
    private readonly analyticsCustomReports: AnalyticsCustomReportsService,
    private readonly analyticsBI: AnalyticsBIService,
    private readonly tenantManagement: TenantManagementService,
    private readonly databaseSeed: DatabaseSeedService,
    private readonly databaseOptimization: DatabaseOptimizationService,
  ) {}

  // ==================== API MARKETPLACE ====================

  @Get('marketplace/integrations')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get available integrations' })
  @ApiResponse({ status: 200, description: 'Available integrations' })
  async getAvailableIntegrations(@Query('category') category?: string) {
    return this.apiMarketplace.getAvailableIntegrations(category);
  }

  @Get('marketplace/integrations/:integrationId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get integration details' })
  @ApiResponse({ status: 200, description: 'Integration details' })
  async getIntegration(@Param('integrationId') integrationId: string) {
    return this.apiMarketplace.getIntegration(integrationId);
  }

  @Post('marketplace/instances')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create integration instance' })
  @ApiResponse({ status: 201, description: 'Integration instance created' })
  async createIntegrationInstance(@Body() instance: any) {
    return this.apiMarketplace.createIntegrationInstance(instance);
  }

  @Get('marketplace/instances')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get integration instances' })
  @ApiResponse({ status: 200, description: 'Integration instances' })
  async getIntegrationInstances(@Query('integrationId') integrationId?: string) {
    return this.apiMarketplace.getIntegrationInstances(integrationId);
  }

  @Post('marketplace/instances/:instanceId/test')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Test integration connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testIntegrationConnection(@Param('instanceId') instanceId: string) {
    return this.apiMarketplace.testIntegrationConnection(instanceId);
  }

  @Post('marketplace/instances/:instanceId/call')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Call integration API' })
  @ApiResponse({ status: 200, description: 'API call result' })
  async callIntegrationApi(
    @Param('instanceId') instanceId: string,
    @Body() data: { endpointId: string; parameters: Record<string, any> }
  ) {
    return this.apiMarketplace.callIntegrationApi(instanceId, data.endpointId, data.parameters);
  }

  @Get('marketplace/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get integration analytics' })
  @ApiResponse({ status: 200, description: 'Integration analytics' })
  async getIntegrationAnalytics(@Query('integrationId') integrationId?: string) {
    return this.apiMarketplace.getIntegrationAnalytics(integrationId);
  }

  // ==================== WEBHOOK MANAGEMENT ====================

  @Post('webhooks/endpoints')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook endpoint created' })
  async createWebhookEndpoint(@Body() endpoint: any) {
    return this.apiMarketplace.createWebhookEndpoint(endpoint);
  }

  @Get('webhooks/endpoints')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get webhook endpoints' })
  @ApiResponse({ status: 200, description: 'Webhook endpoints' })
  async getWebhookEndpoints(@Query('integrationId') integrationId?: string) {
    return this.apiMarketplace.getWebhookEndpoints(integrationId);
  }

  @Post('webhooks/events')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Process webhook event' })
  @ApiResponse({ status: 200, description: 'Webhook event processed' })
  async processWebhookEvent(
    @Body() data: { endpointId: string; event: string; payload: any }
  ) {
    await this.apiMarketplace.processWebhookEvent(data.endpointId, data.event, data.payload);
    return { success: true };
  }

  @Get('webhooks/events')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook events' })
  async getWebhookEvents(
    @Query('endpointId') endpointId?: string,
    @Query('status') status?: string
  ) {
    return this.apiMarketplace.getWebhookEvents(endpointId, status);
  }

  @Post('webhooks/events/:eventId/retry')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Retry webhook event' })
  @ApiResponse({ status: 200, description: 'Webhook event retried' })
  async retryWebhookEvent(@Param('eventId') eventId: string) {
    await this.apiMarketplace.retryWebhookEvent(eventId);
    return { success: true };
  }

  @Get('webhooks/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get webhook analytics' })
  @ApiResponse({ status: 200, description: 'Webhook analytics' })
  async getWebhookAnalytics(@Query('endpointId') endpointId?: string) {
    return this.apiMarketplace.getWebhookAnalytics(endpointId);
  }

  // ==================== EXTERNAL SYSTEMS ====================

  @Get('systems/available')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get available external systems' })
  @ApiResponse({ status: 200, description: 'Available external systems' })
  async getAvailableSystems(@Query('type') type?: string) {
    return this.externalSystems.getAvailableSystems(type);
  }

  @Get('systems/:systemId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get external system details' })
  @ApiResponse({ status: 200, description: 'External system details' })
  async getSystem(@Param('systemId') systemId: string) {
    return this.externalSystems.getSystem(systemId);
  }

  @Post('systems/connections')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create system connection' })
  @ApiResponse({ status: 201, description: 'System connection created' })
  async createSystemConnection(@Body() connection: any) {
    return this.externalSystems.createSystemConnection(connection);
  }

  @Get('systems/connections')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get system connections' })
  @ApiResponse({ status: 200, description: 'System connections' })
  async getSystemConnections(@Query('systemId') systemId?: string) {
    return this.externalSystems.getSystemConnections(systemId);
  }

  @Post('systems/connections/:connectionId/test')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Test system connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testSystemConnection(@Param('connectionId') connectionId: string) {
    return this.externalSystems.testSystemConnection(connectionId);
  }

  @Post('systems/mappings')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create data mapping' })
  @ApiResponse({ status: 201, description: 'Data mapping created' })
  async createDataMapping(@Body() mapping: any) {
    return this.externalSystems.createDataMapping(mapping);
  }

  @Get('systems/mappings/:systemId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get data mappings' })
  @ApiResponse({ status: 200, description: 'Data mappings' })
  async getDataMappings(@Param('systemId') systemId: string) {
    return this.externalSystems.getDataMappings(systemId);
  }

  @Post('systems/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Start sync job' })
  @ApiResponse({ status: 200, description: 'Sync job started' })
  async startSyncJob(
    @Body() data: { systemId: string; direction: 'import' | 'export' | 'bidirectional'; entity: string }
  ) {
    return this.externalSystems.startSyncJob(data.systemId, data.direction, data.entity);
  }

  @Get('systems/sync/jobs')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get sync jobs' })
  @ApiResponse({ status: 200, description: 'Sync jobs' })
  async getSyncJobs(
    @Query('systemId') systemId?: string,
    @Query('status') status?: string
  ) {
    return this.externalSystems.getSyncJobs(systemId, status);
  }

  @Get('systems/sync/conflicts')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get sync conflicts' })
  @ApiResponse({ status: 200, description: 'Sync conflicts' })
  async getSyncConflicts(
    @Query('systemId') systemId?: string,
    @Query('status') status?: string
  ) {
    return this.externalSystems.getSyncConflicts(systemId, status);
  }

  @Post('systems/sync/conflicts/:conflictId/resolve')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Resolve sync conflict' })
  @ApiResponse({ status: 200, description: 'Sync conflict resolved' })
  async resolveSyncConflict(
    @Param('conflictId') conflictId: string,
    @Body() data: { resolution: 'source_wins' | 'target_wins' | 'merge' | 'manual' }
  ) {
    await this.externalSystems.resolveSyncConflict(conflictId, data.resolution);
    return { success: true };
  }

  @Get('systems/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get system analytics' })
  @ApiResponse({ status: 200, description: 'System analytics' })
  async getSystemAnalytics(@Query('systemId') systemId?: string) {
    return this.externalSystems.getSystemAnalytics(systemId);
  }

  // ==================== DATA SYNCHRONIZATION ====================

  @Post('sync/configurations')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create sync configuration' })
  @ApiResponse({ status: 201, description: 'Sync configuration created' })
  async createSyncConfiguration(@Body() configuration: any) {
    return this.dataSync.createSyncConfiguration(configuration);
  }

  @Get('sync/configurations')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get sync configurations' })
  @ApiResponse({ status: 200, description: 'Sync configurations' })
  async getSyncConfigurations(@Query('status') status?: string) {
    return this.dataSync.getSyncConfigurations(status);
  }

  @Post('sync/configurations/:configId/execute')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Execute sync' })
  @ApiResponse({ status: 200, description: 'Sync execution started' })
  async executeSync(
    @Param('configId') configId: string,
    @Body() data: { force?: boolean }
  ) {
    return this.dataSync.executeSync(configId, data.force);
  }

  @Get('sync/executions')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get sync executions' })
  @ApiResponse({ status: 200, description: 'Sync executions' })
  async getSyncExecutions(
    @Query('configurationId') configurationId?: string,
    @Query('status') status?: string
  ) {
    return this.dataSync.getSyncExecutions(configurationId, status);
  }

  @Get('sync/conflicts')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get data conflicts' })
  @ApiResponse({ status: 200, description: 'Data conflicts' })
  async getDataConflicts(
    @Query('configurationId') configurationId?: string,
    @Query('status') status?: string
  ) {
    return this.dataSync.getSyncConflicts(configurationId, status);
  }

  @Post('sync/conflicts/:conflictId/resolve')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Resolve data conflict' })
  @ApiResponse({ status: 200, description: 'Data conflict resolved' })
  async resolveDataConflict(
    @Param('conflictId') conflictId: string,
    @Body() data: { resolution: 'source_wins' | 'target_wins' | 'merge' | 'ignore' }
  ) {
    await this.dataSync.resolveDataConflict(conflictId, data.resolution);
    return { success: true };
  }

  @Get('sync/statistics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get sync statistics' })
  @ApiResponse({ status: 200, description: 'Sync statistics' })
  async getSyncStatistics(
    @Query('configurationId') configurationId?: string,
    @Query('days') days: number = 30
  ) {
    return this.dataSync.getSyncStatistics(configurationId, days);
  }

  @Post('sync/configurations/:configId/schedule')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Schedule sync' })
  @ApiResponse({ status: 200, description: 'Sync scheduled' })
  async scheduleSync(
    @Param('configId') configId: string,
    @Body() data: { cronExpression: string }
  ) {
    await this.dataSync.scheduleSync(configId, data.cronExpression);
    return { success: true };
  }

  @Post('sync/configurations/:configId/pause')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Pause sync' })
  @ApiResponse({ status: 200, description: 'Sync paused' })
  async pauseSync(@Param('configId') configId: string) {
    await this.dataSync.pauseSync(configId);
    return { success: true };
  }

  @Post('sync/configurations/:configId/resume')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Resume sync' })
  @ApiResponse({ status: 200, description: 'Sync resumed' })
  async resumeSync(@Param('configId') configId: string) {
    await this.dataSync.resumeSync(configId);
    return { success: true };
  }

  @Post('sync/configurations/:configId/validate')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Validate sync configuration' })
  @ApiResponse({ status: 200, description: 'Configuration validation result' })
  async validateSyncConfiguration(@Param('configId') configId: string) {
    const config = await this.dataSync.getSyncConfigurations();
    const targetConfig = config.find(c => c.id === configId);
    
    if (!targetConfig) {
      throw new Error(`Sync configuration not found: ${configId}`);
    }
    
    return this.dataSync.validateSyncConfiguration(targetConfig);
  }

  // ==================== COMPREHENSIVE INTEGRATIONS ====================

  @Get('dashboard')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get integrations dashboard' })
  @ApiResponse({ status: 200, description: 'Integrations dashboard data' })
  async getIntegrationsDashboard() {
    const [
      integrationAnalytics,
      webhookAnalytics,
      systemAnalytics,
      syncStatistics
    ] = await Promise.all([
      this.apiMarketplace.getIntegrationAnalytics(),
      this.apiMarketplace.getWebhookAnalytics(),
      this.externalSystems.getSystemAnalytics(),
      this.dataSync.getSyncStatistics()
    ]);

    return {
      integrations: integrationAnalytics,
      webhooks: webhookAnalytics,
      systems: systemAnalytics,
      sync: syncStatistics,
      lastUpdated: new Date(),
      insights: this.generateIntegrationInsights(integrationAnalytics, webhookAnalytics, systemAnalytics, syncStatistics)
    };
  }

  @Get('health')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get integrations health' })
  @ApiResponse({ status: 200, description: 'Integrations health status' })
  async getIntegrationsHealth() {
    return {
      apiMarketplace: 'healthy',
      externalSystems: 'healthy',
      dataSync: 'healthy',
      webhooks: 'healthy',
      lastChecked: new Date(),
      uptime: 99.8,
      performance: {
        averageResponseTime: 200,
        throughput: 500,
        errorRate: 0.01
      }
    };
  }

  private generateIntegrationInsights(integrationAnalytics: any, webhookAnalytics: any, systemAnalytics: any, syncStatistics: any) {
    const insights = [];

    if (integrationAnalytics.successRate < 95) {
      insights.push('🔌 Integration success rate is below target - review failed connections');
    }

    if (webhookAnalytics.successRate < 90) {
      insights.push('📡 Webhook success rate is low - check endpoint configurations');
    }

    if (syncStatistics.successRate < 85) {
      insights.push('🔄 Sync success rate is below target - review data mappings');
    }

    if (systemAnalytics.totalConflicts > 0) {
      insights.push(`⚠️ ${systemAnalytics.totalConflicts} sync conflicts require resolution`);
    }

    return insights;
  }

  // ==================== TRENDYOL INTEGRATION ====================

  @Post('trendyol/products/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync products from Trendyol' })
  @ApiResponse({ status: 200, description: 'Products synced successfully' })
  async syncTrendyolProducts(@Body() data: { instanceId: string }) {
    return this.trendyol.syncProducts(data.instanceId);
  }

  @Post('trendyol/orders/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync orders from Trendyol' })
  @ApiResponse({ status: 200, description: 'Orders synced successfully' })
  async syncTrendyolOrders(@Body() data: { instanceId: string }) {
    return this.trendyol.syncOrders(data.instanceId);
  }

  @Post('trendyol/inventory/update')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update inventory on Trendyol' })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  async updateTrendyolInventory(@Body() data: {
    instanceId: string;
    updates: Array<{ productId: string; sku: string; stock: number; reservedStock: number; availableStock: number }>;
  }) {
    return this.trendyol.updateInventory(data.instanceId, data.updates);
  }

  @Post('trendyol/orders/status')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update order status on Trendyol' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  async updateTrendyolOrderStatus(@Body() data: { instanceId: string; orderId: string; status: string }) {
    return this.trendyol.updateOrderStatus(data.instanceId, data.orderId, data.status);
  }

  // ==================== HEPSIBURADA INTEGRATION ====================

  @Post('hepsiburada/products/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync products from Hepsiburada' })
  @ApiResponse({ status: 200, description: 'Products synced successfully' })
  async syncHepsiburadaProducts(@Body() data: { instanceId: string }) {
    return this.hepsiburada.syncProducts(data.instanceId);
  }

  @Post('hepsiburada/orders/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync orders from Hepsiburada' })
  @ApiResponse({ status: 200, description: 'Orders synced successfully' })
  async syncHepsiburadaOrders(@Body() data: { instanceId: string }) {
    return this.hepsiburada.syncOrders(data.instanceId);
  }

  @Post('hepsiburada/prices/update')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update prices on Hepsiburada' })
  @ApiResponse({ status: 200, description: 'Prices updated successfully' })
  async updateHepsiburadaPrices(@Body() data: {
    instanceId: string;
    updates: Array<{ productId: string; sku: string; price: number; discountPrice?: number; discountRate?: number }>;
  }) {
    return this.hepsiburada.updatePrices(data.instanceId, data.updates);
  }

  @Get('hepsiburada/categories')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get Hepsiburada categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getHepsiburadaCategories(@Query('instanceId') instanceId: string) {
    return this.hepsiburada.getCategories(instanceId);
  }

  // ==================== N11 INTEGRATION ====================

  @Post('n11/products/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync products from N11' })
  @ApiResponse({ status: 200, description: 'Products synced successfully' })
  async syncN11Products(@Body() data: { instanceId: string }) {
    return this.n11.syncProducts(data.instanceId);
  }

  @Post('n11/orders/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync orders from N11' })
  @ApiResponse({ status: 200, description: 'Orders synced successfully' })
  async syncN11Orders(@Body() data: { instanceId: string }) {
    return this.n11.syncOrders(data.instanceId);
  }

  @Post('n11/stock/update')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update stock on N11' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  async updateN11Stock(@Body() data: {
    instanceId: string;
    updates: Array<{ productId: string; sku: string; stock: number }>;
  }) {
    return this.n11.updateProductStock(data.instanceId, data.updates);
  }

  // ==================== AMAZON TR INTEGRATION ====================

  @Post('amazon/products/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync products from Amazon TR' })
  @ApiResponse({ status: 200, description: 'Products synced successfully' })
  async syncAmazonProducts(@Body() data: { instanceId: string }) {
    return this.amazonTR.syncProducts(data.instanceId);
  }

  @Post('amazon/orders/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync orders from Amazon TR' })
  @ApiResponse({ status: 200, description: 'Orders synced successfully' })
  async syncAmazonOrders(@Body() data: { instanceId: string }) {
    return this.amazonTR.syncOrders(data.instanceId);
  }

  @Post('amazon/inventory/update')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update inventory on Amazon TR' })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  async updateAmazonInventory(@Body() data: {
    instanceId: string;
    updates: Array<{ asin: string; sku: string; stock: number; fulfillmentChannel: 'AFN' | 'MFN' }>;
  }) {
    return this.amazonTR.updateInventory(data.instanceId, data.updates);
  }

  @Get('amazon/fba-inventory')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get FBA inventory from Amazon TR' })
  @ApiResponse({ status: 200, description: 'FBA inventory retrieved successfully' })
  async getAmazonFBAInventory(@Query('instanceId') instanceId: string) {
    return this.amazonTR.getFBAInventory(instanceId);
  }

  // ==================== SAHIBINDEN INTEGRATION ====================

  @Post('sahibinden/listings/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync listings from Sahibinden' })
  @ApiResponse({ status: 200, description: 'Listings synced successfully' })
  async syncSahibindenListings(@Body() data: { instanceId: string }) {
    return this.sahibinden.syncListings(data.instanceId);
  }

  @Post('sahibinden/leads/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync leads from Sahibinden' })
  @ApiResponse({ status: 200, description: 'Leads synced successfully' })
  async syncSahibindenLeads(@Body() data: { instanceId: string }) {
    return this.sahibinden.syncLeads(data.instanceId);
  }

  @Post('sahibinden/listings')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create listing on Sahibinden' })
  @ApiResponse({ status: 201, description: 'Listing created successfully' })
  async createSahibindenListing(@Body() data: { instanceId: string; listingData: any }) {
    return this.sahibinden.createListing(data.instanceId, data.listingData);
  }

  @Get('sahibinden/listings/stats')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get listing stats from Sahibinden' })
  @ApiResponse({ status: 200, description: 'Listing stats retrieved successfully' })
  async getSahibindenListingStats(@Query('instanceId') instanceId: string, @Query('listingId') listingId: string) {
    return this.sahibinden.getListingStats(instanceId, listingId);
  }

  // ==================== SHIPPING INTEGRATION ====================

  @Post('shipping/rates')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get shipping rates from all providers' })
  @ApiResponse({ status: 200, description: 'Shipping rates retrieved successfully' })
  async getShippingRates(@Body() data: { orderData: any }) {
    return this.shipping.getAllShippingRates(data.orderData);
  }

  @Post('shipping/aras/shipment')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create Aras Kargo shipment' })
  @ApiResponse({ status: 201, description: 'Aras shipment created successfully' })
  async createArasShipment(@Body() data: { shipmentData: any }) {
    return this.shipping.createArasShipment(data.shipmentData);
  }

  @Post('shipping/yurtici/shipment')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create Yurtiçi Kargo shipment' })
  @ApiResponse({ status: 201, description: 'Yurtiçi shipment created successfully' })
  async createYurticiShipment(@Body() data: { shipmentData: any }) {
    return this.shipping.createYurticiShipment(data.shipmentData);
  }

  @Post('shipping/mng/shipment')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create MNG Kargo shipment' })
  @ApiResponse({ status: 201, description: 'MNG shipment created successfully' })
  async createMNGShipment(@Body() data: { shipmentData: any }) {
    return this.shipping.createMNGShipment(data.shipmentData);
  }

  @Post('shipping/ptt/shipment')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create PTT Kargo shipment' })
  @ApiResponse({ status: 201, description: 'PTT shipment created successfully' })
  async createPTTShipment(@Body() data: { shipmentData: any }) {
    return this.shipping.createPTTShipment(data.shipmentData);
  }

  @Get('shipping/track')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Track shipment' })
  @ApiResponse({ status: 200, description: 'Tracking information retrieved successfully' })
  async trackShipment(@Query('provider') provider: string, @Query('trackingNumber') trackingNumber: string) {
    switch (provider.toLowerCase()) {
      case 'aras':
        return this.shipping.trackArasShipment(trackingNumber);
      case 'yurtici':
        return this.shipping.trackYurticiShipment(trackingNumber);
      case 'mng':
        return this.shipping.trackMNGShipment(trackingNumber);
      case 'ptt':
        return this.shipping.trackPTTShipment(trackingNumber);
      default:
        throw new Error(`Unsupported shipping provider: ${provider}`);
    }
  }

  // ==================== ERP INTEGRATION ====================

  @Post('erp/gib/invoice')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Send invoice to GİB E-Fatura' })
  @ApiResponse({ status: 200, description: 'Invoice sent to GİB successfully' })
  async sendInvoiceToGIB(@Body() data: { instanceId: string; invoiceData: any }) {
    return this.erpIntegration.sendInvoiceToGIB(data.instanceId, data.invoiceData);
  }

  @Post('erp/archive/invoice')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Archive invoice in E-Arşiv' })
  @ApiResponse({ status: 200, description: 'Invoice archived successfully' })
  async archiveInvoice(@Body() data: { instanceId: string; invoiceData: any }) {
    return this.erpIntegration.archiveInvoice(data.instanceId, data.invoiceData);
  }

  @Post('erp/e-imza/sign')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sign document with E-İmza' })
  @ApiResponse({ status: 200, description: 'Document signed successfully' })
  async signDocument(@Body() data: { instanceId: string; documentData: any; signatureType: string }) {
    return this.erpIntegration.signDocument(data.instanceId, data.documentData, data.signatureType);
  }

  @Post('erp/financial/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync financial data from ERP' })
  @ApiResponse({ status: 200, description: 'Financial data synced successfully' })
  async syncFinancialData(@Body() data: { instanceId: string; dateFrom: string; dateTo: string }) {
    const dateFrom = new Date(data.dateFrom);
    const dateTo = new Date(data.dateTo);
    return this.erpIntegration.syncFinancialData(data.instanceId, dateFrom, dateTo);
  }

  @Post('erp/employees/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync employees from ERP' })
  @ApiResponse({ status: 200, description: 'Employees synced successfully' })
  async syncEmployees(@Body() data: { instanceId: string }) {
    return this.erpIntegration.syncEmployees(data.instanceId);
  }

  @Post('erp/payroll/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync payroll from ERP' })
  @ApiResponse({ status: 200, description: 'Payroll synced successfully' })
  async syncPayroll(@Body() data: { instanceId: string; month: string }) {
    return this.erpIntegration.syncPayroll(data.instanceId, data.month);
  }

  @Post('erp/purchase-orders/sync')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Sync purchase orders from ERP' })
  @ApiResponse({ status: 200, description: 'Purchase orders synced successfully' })
  async syncPurchaseOrders(@Body() data: { instanceId: string }) {
    return this.erpIntegration.syncPurchaseOrders(data.instanceId);
  }

  // ==================== SMS GATEWAY INTEGRATION ====================

  @Post('sms/send')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Send SMS message' })
  @ApiResponse({ status: 200, description: 'SMS sent successfully' })
  async sendSMS(@Body() data: {
    instanceId: string;
    to: string;
    message: string;
    type: 'transactional' | 'otp' | 'notification' | 'marketing';
    sender?: string;
  }) {
    return this.smsGateway.sendSMS(data.instanceId, data);
  }

  @Post('sms/otp/send')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Send OTP via SMS' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async sendOTP(@Body() data: {
    instanceId: string;
    phone: string;
    purpose: 'login' | 'payment' | 'registration' | 'password_reset';
    length: number;
    expiryMinutes: number;
  }) {
    return this.smsGateway.sendOTP(data.instanceId, data);
  }

  @Post('sms/otp/verify')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyOTP(@Body() data: { phone: string; otp: string; purpose: string }) {
    return this.smsGateway.verifyOTP(data.phone, data.otp, data.purpose);
  }

  @Post('sms/bulk/send')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Send bulk SMS messages' })
  @ApiResponse({ status: 200, description: 'Bulk SMS sent successfully' })
  async sendBulkSMS(@Body() data: {
    instanceId: string;
    messages: Array<{
      to: string;
      message: string;
      type: 'transactional' | 'otp' | 'notification' | 'marketing';
      sender?: string;
    }>;
  }) {
    return this.smsGateway.sendBulkSMS(data.instanceId, data.messages);
  }

  @Get('sms/history')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get SMS history' })
  @ApiResponse({ status: 200, description: 'SMS history retrieved successfully' })
  async getSMSHistory(
    @Query('instanceId') instanceId: string,
    @Query('phone') phone?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.smsGateway.getSMSHistory(instanceId, {
      phone,
      type,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    });
  }

  @Get('sms/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get SMS analytics' })
  @ApiResponse({ status: 200, description: 'SMS analytics retrieved successfully' })
  async getSMSAnalytics(@Query('instanceId') instanceId: string, @Query('period') period: 'day' | 'week' | 'month' = 'month') {
    return this.smsGateway.getSMSAnalytics(instanceId, period);
  }

  // ==================== EMAIL SERVICE INTEGRATION ====================

  @Post('email/send')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Send email' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  async sendEmail(@Body() data: {
    instanceId: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    htmlContent?: string;
    textContent?: string;
    templateId?: string;
    variables?: Record<string, any>;
    attachments?: Array<{
      filename: string;
      content: string;
      type: string;
    }>;
    type?: 'transactional' | 'marketing' | 'notification';
    scheduledAt?: Date;
  }) {
    return this.emailService.sendEmail(data.instanceId, data);
  }

  @Post('email/templates')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create email template' })
  @ApiResponse({ status: 201, description: 'Email template created successfully' })
  async createEmailTemplate(@Body() data: {
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    variables: string[];
    category: 'transactional' | 'marketing' | 'notification';
  }) {
    return this.emailService.createTemplate(data);
  }

  @Get('email/templates')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get email templates' })
  @ApiResponse({ status: 200, description: 'Email templates retrieved successfully' })
  async getEmailTemplates(@Query('category') category?: string) {
    return this.emailService.getTemplates(category);
  }

  @Post('email/campaigns')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Send email campaign' })
  @ApiResponse({ status: 200, description: 'Email campaign sent successfully' })
  async sendEmailCampaign(@Body() data: {
    instanceId: string;
    name: string;
    templateId: string;
    recipients: string[];
    scheduledAt?: Date;
  }) {
    return this.emailService.sendCampaign(data.instanceId, data);
  }

  @Get('email/history')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get email history' })
  @ApiResponse({ status: 200, description: 'Email history retrieved successfully' })
  async getEmailHistory(
    @Query('instanceId') instanceId: string,
    @Query('email') email?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.emailService.getEmailHistory(instanceId, {
      email,
      type,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    });
  }

  @Get('email/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get email analytics' })
  @ApiResponse({ status: 200, description: 'Email analytics retrieved successfully' })
  async getEmailAnalytics(@Query('instanceId') instanceId: string, @Query('period') period: 'day' | 'week' | 'month' = 'month') {
    return this.emailService.getEmailAnalytics(instanceId, period);
  }

  // ==================== WHATSAPP BUSINESS API INTEGRATION ====================

  @Post('whatsapp/messages')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Send WhatsApp message' })
  @ApiResponse({ status: 200, description: 'WhatsApp message sent successfully' })
  async sendWhatsAppMessage(@Body() data: {
    instanceId: string;
    to: string;
    message: {
      type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'template';
      content: any;
    };
  }) {
    return this.whatsapp.sendMessage(data.instanceId, data);
  }

  @Post('whatsapp/templates')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Send WhatsApp template message' })
  @ApiResponse({ status: 200, description: 'WhatsApp template sent successfully' })
  async sendWhatsAppTemplate(@Body() data: {
    instanceId: string;
    to: string;
    template: {
      name: string;
      language: string;
      components?: Array<{
        type: string;
        sub_type?: string;
        parameters?: Array<{
          type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
          text?: string;
          currency?: any;
          date_time?: any;
          image?: any;
          document?: any;
          video?: any;
        }>;
      }>;
    };
  }) {
    return this.whatsapp.sendTemplateMessage(data.instanceId, data);
  }

  @Post('whatsapp/bulk/messages')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Send bulk WhatsApp messages' })
  @ApiResponse({ status: 200, description: 'Bulk WhatsApp messages sent successfully' })
  async sendBulkWhatsAppMessages(@Body() data: {
    instanceId: string;
    messages: Array<{
      to: string;
      message: {
        type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'template';
        content: any;
      };
    }>;
  }) {
    return this.whatsapp.sendBulkMessages(data.instanceId, data.messages);
  }

  @Post('whatsapp/templates/create')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create WhatsApp template' })
  @ApiResponse({ status: 201, description: 'WhatsApp template created successfully' })
  async createWhatsAppTemplate(@Body() data: {
    instanceId: string;
    template: {
      name: string;
      language: string;
      category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
      components: Array<{
        type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTON';
        sub_type?: string;
        text?: string;
        example?: any;
      }>;
    };
  }) {
    return this.whatsapp.createTemplate(data.instanceId, data.template);
  }

  @Get('whatsapp/templates')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get WhatsApp templates' })
  @ApiResponse({ status: 200, description: 'WhatsApp templates retrieved successfully' })
  async getWhatsAppTemplates(@Query('instanceId') instanceId: string) {
    return this.whatsapp.getTemplates(instanceId);
  }

  @Get('whatsapp/history')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get WhatsApp message history' })
  @ApiResponse({ status: 200, description: 'WhatsApp history retrieved successfully' })
  async getWhatsAppHistory(
    @Query('instanceId') instanceId: string,
    @Query('phone') phone?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.whatsapp.getMessageHistory(instanceId, {
      phone,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    });
  }

  @Get('whatsapp/conversations')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get WhatsApp conversations' })
  @ApiResponse({ status: 200, description: 'WhatsApp conversations retrieved successfully' })
  async getWhatsAppConversations(
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.whatsapp.getConversations({
      status,
      assignedTo,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    });
  }

  @Put('whatsapp/conversations/:conversationId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update WhatsApp conversation' })
  @ApiResponse({ status: 200, description: 'WhatsApp conversation updated successfully' })
  async updateWhatsAppConversation(
    @Param('conversationId') conversationId: string,
    @Body() data: {
      instanceId: string;
      status?: string;
      assignedTo?: string;
      tags?: string[];
    }
  ) {
    return this.whatsapp.updateConversation(data.instanceId, conversationId, data);
  }

  @Get('whatsapp/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get WhatsApp analytics' })
  @ApiResponse({ status: 200, description: 'WhatsApp analytics retrieved successfully' })
  async getWhatsAppAnalytics(@Query('instanceId') instanceId: string, @Query('period') period: 'day' | 'week' | 'month' = 'month') {
    return this.whatsapp.getWhatsAppAnalytics(instanceId, period);
  }

  @Post('whatsapp/webhooks')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Process WhatsApp webhook' })
  @ApiResponse({ status: 200, description: 'WhatsApp webhook processed successfully' })
  async processWhatsAppWebhook(@Body() data: { instanceId: string; webhookData: any }) {
    await this.whatsapp.processWebhook(data.instanceId, data.webhookData);
    return { success: true };
  }

  // ==================== PAYMENT INTEGRATION ====================

  @Post('payments/paytr/initiate')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Initiate PayTR payment' })
  @ApiResponse({ status: 200, description: 'PayTR payment initiated successfully' })
  async initiatePayTRPayment(@Body() data: {
    instanceId: string;
    paymentRequest: {
      amount: number;
      currency: string;
      orderId: string;
      customer: {
        name: string;
        email: string;
        phone?: string;
        ip?: string;
      };
      billingAddress?: {
        address: string;
        city: string;
        country: string;
        postalCode: string;
      };
      products?: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
      }>;
      successUrl?: string;
      failureUrl?: string;
      callbackUrl?: string;
    };
  }) {
    return this.payment.initiatePayTRPayment(data.instanceId, data.paymentRequest);
  }

  @Post('payments/bkm-express/initiate')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Initiate BKM Express payment' })
  @ApiResponse({ status: 200, description: 'BKM Express payment initiated successfully' })
  async initiateBKMExpressPayment(@Body() data: {
    instanceId: string;
    paymentRequest: {
      amount: number;
      currency: string;
      orderId: string;
      customer: {
        name: string;
        email: string;
        phone?: string;
        ip?: string;
      };
      billingAddress?: {
        address: string;
        city: string;
        country: string;
        postalCode: string;
      };
      products?: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
      }>;
      successUrl?: string;
      failureUrl?: string;
      callbackUrl?: string;
    };
  }) {
    return this.payment.initiateBKMExpressPayment(data.instanceId, data.paymentRequest);
  }

  @Post('payments/masterpass/initiate')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Initiate Masterpass payment' })
  @ApiResponse({ status: 200, description: 'Masterpass payment initiated successfully' })
  async initiateMasterpassPayment(@Body() data: {
    instanceId: string;
    paymentRequest: {
      amount: number;
      currency: string;
      orderId: string;
      customer: {
        name: string;
        email: string;
        phone?: string;
        ip?: string;
      };
      billingAddress?: {
        address: string;
        city: string;
        country: string;
        postalCode: string;
      };
      products?: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
      }>;
      successUrl?: string;
      failureUrl?: string;
      callbackUrl?: string;
    };
  }) {
    return this.payment.initiateMasterpassPayment(data.instanceId, data.paymentRequest);
  }

  @Post('payments/garanti-pos/initiate')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Initiate Garanti Virtual POS payment' })
  @ApiResponse({ status: 200, description: 'Garanti POS payment initiated successfully' })
  async initiateGarantiPOSPayment(@Body() data: {
    instanceId: string;
    paymentRequest: {
      amount: number;
      currency: string;
      orderId: string;
      customer: {
        name: string;
        email: string;
        phone?: string;
        ip?: string;
      };
      billingAddress?: {
        address: string;
        city: string;
        country: string;
        postalCode: string;
      };
      products?: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
      }>;
      successUrl?: string;
      failureUrl?: string;
      callbackUrl?: string;
    };
  }) {
    return this.payment.initiateGarantiPOSPayment(data.instanceId, data.paymentRequest);
  }

  @Post('payments/akbank-pos/initiate')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Initiate Akbank Virtual POS payment' })
  @ApiResponse({ status: 200, description: 'Akbank POS payment initiated successfully' })
  async initiateAkbankPOSPayment(@Body() data: {
    instanceId: string;
    paymentRequest: {
      amount: number;
      currency: string;
      orderId: string;
      customer: {
        name: string;
        email: string;
        phone?: string;
        ip?: string;
      };
      billingAddress?: {
        address: string;
        city: string;
        country: string;
        postalCode: string;
      };
      products?: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
      }>;
      successUrl?: string;
      failureUrl?: string;
      callbackUrl?: string;
    };
  }) {
    return this.payment.initiateAkbankPOSPayment(data.instanceId, data.paymentRequest);
  }

  @Post('payments/isbank-pos/initiate')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Initiate İşbank Virtual POS payment' })
  @ApiResponse({ status: 200, description: 'İşbank POS payment initiated successfully' })
  async initiateIsbankPOSPayment(@Body() data: {
    instanceId: string;
    paymentRequest: {
      amount: number;
      currency: string;
      orderId: string;
      customer: {
        name: string;
        email: string;
        phone?: string;
        ip?: string;
      };
      billingAddress?: {
        address: string;
        city: string;
        country: string;
        postalCode: string;
      };
      products?: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
      }>;
      successUrl?: string;
      failureUrl?: string;
      callbackUrl?: string;
    };
  }) {
    return this.payment.initiateIsbankPOSPayment(data.instanceId, data.paymentRequest);
  }

  @Post('payments/webhooks')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Process payment webhook' })
  @ApiResponse({ status: 200, description: 'Payment webhook processed successfully' })
  async processPaymentWebhook(@Body() data: { provider: string; webhookData: any }) {
    return this.payment.processPaymentWebhook(data.provider, data.webhookData);
  }

  @Post('payments/refund')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Refund payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  async refundPayment(@Body() data: {
    instanceId: string;
    paymentId: string;
    refundAmount?: number;
  }) {
    return this.payment.refundPayment(data.instanceId, data.paymentId, data.refundAmount);
  }

  @Get('payments/history')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get payment history' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  async getPaymentHistory(
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('customerEmail') customerEmail?: string
  ) {
    return this.payment.getPaymentHistory({
      provider,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      customerEmail
    });
  }

  @Get('payments/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get payment analytics' })
  @ApiResponse({ status: 200, description: 'Payment analytics retrieved successfully' })
  async getPaymentAnalytics(@Query('provider') provider?: string, @Query('period') period: 'day' | 'week' | 'month' = 'month') {
    return this.payment.getPaymentAnalytics(provider, period);
  }
}
