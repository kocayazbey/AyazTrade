import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { configValidationSchema } from './config/config.schema';
import { AuthController } from './auth.controller';

// Core Modules
import { DatabaseModule } from './core/database/database.module';
import { EventsModule } from './core/events/events.module';
import { CacheModule } from './core/cache/cache.module';
import { LoggerModule } from './core/logger/logger.module';
import { AuthModule } from './core/auth/auth.module';
import { HealthModule } from './core/health/health.module';
import { VerificationModule } from './core/verification/verification.module';
import { SecurityModule } from './core/security/security.module';
import { RequestLoggerMiddleware } from './core/logger/request-logger.middleware';
import { RequestIdMiddleware } from './core/middleware/request-id.middleware';
import { CorrelationIdMiddleware } from './core/telemetry/correlation-id.middleware';

// Business Modules
import { AyazCommModule } from './modules/ayaz-comm/ayaz-comm.module';
import { CRMModule } from './modules/crm/crm.module';
import { ERPModule } from './modules/erp/erp.module';
// import { WMSModule } from './modules/wms/wms.module'; // Temporarily disabled due to compilation errors
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AIModule } from './modules/ai-core/ai.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CartModule } from './modules/cart/cart.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { WebhookModule } from './modules/webhooks/webhook.module';
import { ExportModule } from './modules/export/export.module';
import { ImportModule } from './modules/import/import.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { SustainabilityModule } from './modules/sustainability/sustainability.module';
import { AdminModule } from './modules/admin/admin.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: false,
      cache: true,
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    // Core Modules
    DatabaseModule,
    EventsModule,
    CacheModule,
    LoggerModule,
    AuthModule,
    HealthModule,
    VerificationModule,
    SecurityModule,
          // Business Modules (temporarily disabled for compilation)
          // AyazCommModule,
          // CRMModule,
          // ERPModule,
          // WMSModule, // Temporarily disabled due to compilation errors
          // AnalyticsModule,
          // AIModule,
          // ProductsModule,
          // OrdersModule,
          // CustomersModule,
          // CartModule,
          // MarketplaceModule,
          // InventoryModule,
          // WebhookModule,
          // ExportModule,
          // ImportModule,
          // IntegrationsModule,
          // SustainabilityModule,
          // AdminModule,
          // SuppliersModule,
  ],
  controllers: [AuthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, CorrelationIdMiddleware, RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
