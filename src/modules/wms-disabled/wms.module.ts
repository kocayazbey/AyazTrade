import { Module } from '@nestjs/common';
import { WMSController } from './wms.controller';
import { WmsService } from './wms.service';

// Core WMS Services
import { WarehouseService } from './services/warehouse.service';
import { ReceivingService } from './services/receiving.service';
import { PickingService } from './services/picking.service';
import { PutawayService } from './services/putaway.service';
import { ShippingService } from './services/shipping.service';
import { CycleCountingService } from './services/cycle-counting.service';
import { ReplenishmentService } from './services/replenishment.service';
import { WavePickingService } from './services/wave-picking.service';
import { InventoryQueryService } from './services/inventory-query.service';
import { SlottingService } from './services/slotting.service';
import { ProductionIntegrationService } from './services/production-integration.service';
import { QualityControlService } from './services/quality-control.service';
import { KittingService } from './services/kitting.service';
import { ReturnManagementService } from './services/return-management.service';

// Event Integration Services
import { WMSIntegrationService } from './services/wms-integration.service';

// Enhanced Services
import { PackingService } from './services/packing.service';
import { WMSAnalyticsService } from './services/wms-analytics.service';

import { DatabaseModule } from '../../core/database/database.module';
import { EventsModule } from '../../core/events/events.module';
import { CacheModule } from '../../core/cache/cache.module';
import { LoggerModule } from '../../core/logger/logger.module';

/**
 * WMS Module for AyazTrade
 * Production-ready Warehouse Management System
 * Adapted from AyazLogistics 3PL WMS for manufacturing/retail use
 * 
 * Features:
 * - Warehouse & Location Management
 * - Receiving (PO, Transfer, Production, Returns)
 * - Putaway with location optimization
 * - Picking (Wave, Batch, Zone, Discrete)
 * - Shipping & Tracking
 * - Cycle Counting (ABC, Random, Zone)
 * - Replenishment (Auto, Manual, Scheduled)
 * - Inventory Query & Search
 * - Slotting Optimization
 * - Production Integration (Work Orders, Handovers)
 * - Quality Control
 * - Kitting Operations
 * - Return Management
 */
@Module({
  imports: [DatabaseModule, EventsModule, CacheModule, LoggerModule],
  controllers: [WMSController],
  providers: [
    // Main WMS Service
    WmsService,
    // Core Services
    WarehouseService,
    ReceivingService,
    PickingService,
    PutawayService,
    ShippingService,
    CycleCountingService,
    ReplenishmentService,
    WavePickingService,
    InventoryQueryService,
    SlottingService,
    ProductionIntegrationService,
    QualityControlService,
    KittingService,
    ReturnManagementService,
    // Event Integration Service
    WMSIntegrationService,
    // Enhanced Services
    PackingService,
    WMSAnalyticsService,
  ],
  exports: [
    WmsService,
    WarehouseService,
    ReceivingService,
    PickingService,
    PutawayService,
    ShippingService,
    CycleCountingService,
    ReplenishmentService,
    InventoryQueryService,
    ProductionIntegrationService,
    QualityControlService,
    KittingService,
    ReturnManagementService,
    WMSIntegrationService,
    PackingService,
    WMSAnalyticsService,
  ],
})
export class WMSModule {}

