import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database/database.module';
import { IntegrationsEnhancedController } from './integrations-enhanced.controller';
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

@Module({
  imports: [DatabaseModule],
  controllers: [IntegrationsEnhancedController],
  providers: [
    ApiMarketplaceService,
    ExternalSystemsService,
    DataSyncService,
    TrendyolService,
    HepsiburadaService,
    N11Service,
    AmazonTRService,
    SahibindenService,
    ShippingService,
    ERPIntegrationService,
    SMSGatewayService,
    EmailService,
    WhatsAppService,
    PaymentService,
    WebSocketNotificationsService,
    WebSocketLiveChatService,
    WebSocketInventoryService,
    AnalyticsRealtimeService,
    AnalyticsCustomReportsService,
    AnalyticsBIService,
    TenantManagementService,
    DatabaseSeedService,
    DatabaseOptimizationService,
  ],
  exports: [
    ApiMarketplaceService,
    ExternalSystemsService,
    DataSyncService,
    TrendyolService,
    HepsiburadaService,
    N11Service,
    AmazonTRService,
    SahibindenService,
    ShippingService,
    ERPIntegrationService,
    SMSGatewayService,
    EmailService,
    WhatsAppService,
    PaymentService,
    WebSocketNotificationsService,
    WebSocketLiveChatService,
    WebSocketInventoryService,
    AnalyticsRealtimeService,
    AnalyticsCustomReportsService,
    AnalyticsBIService,
    TenantManagementService,
    DatabaseSeedService,
    DatabaseOptimizationService,
  ],
})
export class IntegrationsModule {}
