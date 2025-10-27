import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { Tenant } from '../../core/shared/decorators/tenant.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { ComprehensiveGet, ComprehensivePost } from '../../core/decorators/comprehensive.decorator';
import { WmsService } from './wms.service';
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
import { PackingService } from './services/packing.service';
import { WMSAnalyticsService } from './services/wms-analytics.service';

@ApiTags('WMS - Warehouse Management')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller({ path: 'wms', version: '1' })
export class WMSController {
  constructor(
    private readonly wmsService: WmsService,
    private readonly warehouseService: WarehouseService,
    private readonly receivingService: ReceivingService,
    private readonly pickingService: PickingService,
    private readonly putawayService: PutawayService,
    private readonly shippingService: ShippingService,
    private readonly cycleCountingService: CycleCountingService,
    private readonly replenishmentService: ReplenishmentService,
    private readonly wavePickingService: WavePickingService,
    private readonly inventoryQueryService: InventoryQueryService,
    private readonly slottingService: SlottingService,
    private readonly productionService: ProductionIntegrationService,
    private readonly qualityControlService: QualityControlService,
    private readonly kittingService: KittingService,
    private readonly returnService: ReturnManagementService,
    private readonly packingService: PackingService,
    private readonly analyticsService: WMSAnalyticsService,
  ) {}

  // ============================================
  // WAREHOUSE & LOCATION ENDPOINTS
  // ============================================

  @Get('warehouses')
  @ComprehensiveGet({
    auditAction: 'read',
    auditResource: 'warehouses',
    auditLevel: 'medium',
    cacheTtl: 300,
    cacheTags: ['warehouses', 'inventory'],
    summary: 'Get all warehouses',
    description: 'Retrieve all warehouses with comprehensive caching and audit logging',
    tags: ['warehouses', 'inventory', 'wms']
  })
  async getWarehouses() {
    return this.warehouseService.getWarehouses();
  }

  @Post('warehouses')
  @ComprehensivePost({
    auditAction: 'create',
    auditResource: 'warehouse',
    auditLevel: 'high',
    securityLevel: 'high',
    cacheTtl: 0, // No cache for create operations
    rateLimitMax: 10, // Lower rate limit for create operations
    summary: 'Create warehouse',
    description: 'Create a new warehouse with comprehensive security and audit logging',
    tags: ['warehouses', 'inventory', 'wms', 'admin']
  })
  async createWarehouse(@Body() data: any) {
    return this.warehouseService.createWarehouse(data);
  }

  @Get('warehouses/:id')
  @ComprehensiveGet({
    auditAction: 'read',
    auditResource: 'warehouse',
    auditLevel: 'medium',
    cacheTtl: 600,
    cacheTags: ['warehouses', 'inventory'],
    summary: 'Get warehouse by ID',
    description: 'Retrieve a specific warehouse by ID with comprehensive caching',
    tags: ['warehouses', 'inventory', 'wms']
  })
  async getWarehouseById(@Param('id') warehouseId: string) {
    return this.warehouseService.getWarehouseById(warehouseId);
  }

  @Get('warehouses/:id/locations')
  @ApiOperation({ summary: 'Get warehouse locations' })
  async getLocations(@Param('id') warehouseId: string, @Query() filters: any) {
    return this.warehouseService.getLocations(warehouseId, filters);
  }

  @Post('warehouses/:id/locations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create location' })
  async createLocation(@Param('id') warehouseId: string, @Body() data: any) {
    return this.warehouseService.createLocation(warehouseId, data);
  }

  @Get('warehouses/:id/statistics')
  @ApiOperation({ summary: 'Get warehouse statistics' })
  async getWarehouseStats(@Param('id') warehouseId: string) {
    return this.warehouseService.getWarehouseStatistics(warehouseId);
  }

  // ============================================
  // RECEIVING ENDPOINTS
  // ============================================

  @Get('receiving')
  @ApiOperation({ summary: 'Get receiving orders' })
  async getReceivingOrders(@Query() query: any, @Tenant() tenantId: string) {
    const warehouseId = query.warehouseId;
    if (!warehouseId) {
      throw new BadRequestException('warehouseId is required');
    }
    return this.receivingService.getReceivingOrders(warehouseId, {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    }, tenantId);
  }

  @Post('receiving')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create receiving order' })
  async createReceivingOrder(@Body() data: any, @Tenant() tenantId: string, @CurrentUser() user: any) {
    return this.receivingService.createReceivingOrder(data, tenantId, user?.id);
  }

  @Post('receiving/:id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start receiving process' })
  async startReceiving(@Param('id') receivingOrderId: string, @CurrentUser() user: any) {
    return this.receivingService.startReceiving(receivingOrderId, user?.id);
  }


  @Post('receiving/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete receiving' })
  async completeReceiving(@Param('id') receivingOrderId: string, @CurrentUser() user: any) {
    return this.receivingService.completePutaway(receivingOrderId, user?.id);
  }

  @Get('receiving/statistics')
  @ApiOperation({ summary: 'Get receiving statistics' })
  async getReceivingStats(@Query('warehouseId') warehouseId: string, @Tenant() tenantId: string) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.receivingService.getReceivingStatistics(warehouseId, tenantId);
  }

  // ============================================
  // PICKING ENDPOINTS
  // ============================================

  @Get('picking')
  @ApiOperation({ summary: 'Get picking orders' })
  async getPickingOrders(@Query('warehouseId') warehouseId: string, @Query() filters: any) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.pickingService.getPickingOrders(warehouseId, filters);
  }

  @Post('picking')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create picking order' })
  async createPickingOrder(@Body() data: any, @Tenant() tenantId: string, @CurrentUser() user: any) {
    return this.pickingService.createPickingOrder(data, tenantId, user?.id);
  }

  @Post('picking/:id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start picking' })
  async startPicking(@Param('id') pickingOrderId: string, @Tenant() tenantId: string, @CurrentUser() user: any) {
    return this.pickingService.startPicking(pickingOrderId, tenantId, user?.id);
  }

  @Post('picking/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete picking' })
  async completePicking(@Param('id') pickingOrderId: string, @Tenant() tenantId: string, @CurrentUser() user: any) {
    return this.pickingService.completePicking(pickingOrderId, tenantId, user?.id);
  }

  @Get('picking/statistics')
  @ApiOperation({ summary: 'Get picking statistics' })
  async getPickingStats(@Query('warehouseId') warehouseId: string, @Tenant() tenantId: string) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.pickingService.getPickingStatistics(warehouseId, tenantId);
  }

  // ============================================
  // PUTAWAY ENDPOINTS
  // ============================================

  @Get('putaway/pending')
  @ApiOperation({ summary: 'Get pending putaway tasks' })
  async getPendingPutaway(@Query('warehouseId') warehouseId: string) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.putawayService.getPendingTasks(warehouseId);
  }

  @Post('putaway')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create putaway task' })
  async createPutawayTask(@Body() data: any) {
    return this.putawayService.createPutawayTask(data);
  }


  // ============================================
  // SHIPPING ENDPOINTS
  // ============================================

  @Get('shipments')
  @ApiOperation({ summary: 'Get shipments' })
  async getShipments(@Query('warehouseId') warehouseId: string, @Query() filters: any) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.shippingService.getShipments(warehouseId, filters);
  }

  @Post('shipments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create shipment' })
  async createShipment(@Body() data: any) {
    return this.shippingService.createShipment(data);
  }

  @Post('shipments/:id/pack')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pack shipment' })
  async packShipment(@Param('id') shipmentId: string) {
    return this.shippingService.packShipment(shipmentId);
  }

  @Post('shipments/:id/ship')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ship order' })
  async shipOrder(@Param('id') shipmentId: string, @Body() body: any) {
    return this.shippingService.shipOrder(shipmentId, body.trackingNumber);
  }

  // ============================================
  // INVENTORY MANAGEMENT ENDPOINTS
  // ============================================

  @Get('inventory')
  @Roles('admin', 'manager', 'warehouse_manager', 'warehouse_worker')
  @ApiOperation({ summary: 'Get inventory with advanced filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String, description: 'Warehouse filter' })
  @ApiQuery({ name: 'productId', required: false, type: String, description: 'Product filter' })
  @ApiQuery({ name: 'locationId', required: false, type: String, description: 'Location filter' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Inventory status filter' })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean, description: 'Show only low stock items' })
  @ApiQuery({ name: 'outOfStock', required: false, type: Boolean, description: 'Show only out of stock items' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by SKU or product name' })
  @ApiResponse({ status: 200, description: 'Inventory retrieved successfully' })
  async getInventory(
    @Query() filters: any,
    @Tenant() tenantId: string
  ) {
    return this.wmsService.getInventory(filters, tenantId);
  }

  @Get('inventory/overview')
  @Roles('admin', 'manager', 'warehouse_manager')
  @ApiOperation({ summary: 'Get warehouse inventory overview' })
  @ApiResponse({ status: 200, description: 'Inventory overview retrieved successfully' })
  async getWarehouseOverview(@Tenant() tenantId: string) {
    return this.wmsService.getWarehouseOverview(tenantId);
  }

  @Get('inventory/product/:productId')
  @Roles('admin', 'manager', 'warehouse_manager', 'warehouse_worker')
  @ApiOperation({ summary: 'Get inventory summary by product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product inventory retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product inventory not found' })
  async getInventoryByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Tenant() tenantId: string
  ) {
    return this.wmsService.getInventoryByProduct(productId, tenantId);
  }

  @Post('inventory/adjust')
  @Roles('admin', 'manager', 'warehouse_manager')
  @ApiOperation({ summary: 'Adjust inventory quantity' })
  @ApiResponse({ status: 200, description: 'Inventory adjusted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - insufficient inventory or invalid data' })
  async adjustInventory(
    @Body() adjustmentData: {
      productId: string;
      warehouseId: string;
      locationId: string;
      quantityChange: number;
      reason: string;
      lotNumber?: string;
      serialNumber?: string;
      notes?: string;
    },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.wmsService.updateInventory(
      adjustmentData.productId,
      adjustmentData.warehouseId,
      adjustmentData.locationId,
      adjustmentData,
      userId,
      tenantId
    );
  }

  @Post('inventory/transfer')
  @Roles('admin', 'manager', 'warehouse_manager')
  @ApiOperation({ summary: 'Transfer inventory between locations' })
  @ApiResponse({ status: 200, description: 'Inventory transferred successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - insufficient inventory' })
  async transferInventory(
    @Body() transferData: {
      productId: string;
      fromWarehouseId: string;
      toWarehouseId: string;
      fromLocationId: string;
      toLocationId: string;
      quantity: number;
      lotNumber?: string;
      serialNumber?: string;
      reason: string;
      notes?: string;
    },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.wmsService.transferInventory(transferData, userId, tenantId);
  }

  @Get('inventory/movements')
  @Roles('admin', 'manager', 'warehouse_manager')
  @ApiOperation({ summary: 'Get stock movements' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String, description: 'Warehouse filter' })
  @ApiQuery({ name: 'productId', required: false, type: String, description: 'Product filter' })
  @ApiQuery({ name: 'movementType', required: false, type: String, description: 'Movement type filter' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'Stock movements retrieved successfully' })
  async getStockMovements(
    @Query() filters: any,
    @Tenant() tenantId: string
  ) {
    return this.wmsService.getStockMovements(filters, tenantId);
  }

  @Get('inventory/low-stock')
  @Roles('admin', 'manager', 'warehouse_manager')
  @ApiOperation({ summary: 'Get low stock items' })
  @ApiQuery({ name: 'threshold', required: false, type: Number, description: 'Low stock threshold (0-1)' })
  @ApiResponse({ status: 200, description: 'Low stock items retrieved successfully' })
  async getLowStockItems(
    @Query('threshold') threshold: number,
    @Tenant() tenantId: string
  ) {
    return this.wmsService.getLowStockItems(tenantId, threshold || 0.2);
  }

  @Get('inventory/value')
  @Roles('admin', 'manager', 'warehouse_manager')
  @ApiOperation({ summary: 'Get inventory value analysis' })
  @ApiResponse({ status: 200, description: 'Inventory value analysis retrieved successfully' })
  async getInventoryValue(@Tenant() tenantId: string) {
    return this.wmsService.getInventoryValue(tenantId);
  }

  // ============================================
  // INVENTORY QUERY ENDPOINTS (Legacy)
  // ============================================

  @Get('inventory/search')
  @Roles('admin', 'manager', 'warehouse_manager', 'warehouse_worker')
  @ApiOperation({ summary: 'Search inventory (legacy)' })
  async searchInventory(@Query('q') searchTerm: string, @Query('warehouseId') warehouseId?: string) {
    if (!searchTerm) throw new BadRequestException('Search term is required');
    return this.inventoryQueryService.searchInventory(searchTerm, warehouseId);
  }

  @Get('inventory/location/:locationId')
  @Roles('admin', 'manager', 'warehouse_manager', 'warehouse_worker')
  @ApiOperation({ summary: 'Get inventory by location (legacy)' })
  async getInventoryByLocation(@Param('locationId', ParseUUIDPipe) locationId: string) {
    return this.inventoryQueryService.getInventoryByLocation(locationId);
  }

  @Get('inventory/abc-analysis')
  @Roles('admin', 'manager', 'warehouse_manager')
  @ApiOperation({ summary: 'Get ABC analysis (legacy)' })
  async getABCAnalysis(@Query('warehouseId') warehouseId: string) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.inventoryQueryService.getInventoryABCAnalysis(warehouseId);
  }

  @Get('inventory/expiring')
  @Roles('admin', 'manager', 'warehouse_manager')
  @ApiOperation({ summary: 'Get expiring inventory (legacy)' })
  async getExpiringInventory(
    @Query('warehouseId') warehouseId: string,
    @Query('daysAhead') daysAhead?: number
  ) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.inventoryQueryService.getExpiringInventory(warehouseId, daysAhead || 30);
  }

  // ============================================
  // CYCLE COUNTING ENDPOINTS
  // ============================================

  @Post('cycle-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create cycle count' })
  async createCycleCount(@Body() data: any) {
    const { warehouseId, strategy = 'ABC', count = 10 } = data;
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.cycleCountingService.generateCycleCountTasks(warehouseId, strategy, count);
  }

  @Post('cycle-count/:id/record')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record count result' })
  async recordCount(@Param('id') countItemId: string, @Body() body: any) {
    return this.cycleCountingService.recordCount(countItemId, body.countedQuantity, body.countedBy);
  }

  @Post('cycle-count/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete cycle count' })
  async completeCycleCount(@Param('id') cycleCountId: string) {
    return this.cycleCountingService.completeCycleCount(cycleCountId);
  }

  // ============================================
  // WAVE PICKING ENDPOINTS
  // ============================================

  @Post('wave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create picking wave' })
  async createWave(@Body() data: any) {
    const { warehouseId, orderIds, config } = data;
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    if (!orderIds || !Array.isArray(orderIds)) {
      throw new BadRequestException('orderIds array is required');
    }
    
    return this.wavePickingService.createWave(warehouseId, orderIds, config);
  }

  @Post('wave/:waveId/release')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Release wave for picking' })
  async releaseWave(
    @Param('waveId') waveId: string,
    @Query('warehouseId') warehouseId: string
  ) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.wavePickingService.releaseWave(waveId, warehouseId);
  }

  @Post('wave/:waveId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete wave' })
  async completeWave(@Param('waveId') waveId: string) {
    return this.wavePickingService.completeWave(waveId);
  }

  // ============================================
  // REPLENISHMENT ENDPOINTS
  // ============================================

  @Get('replenishment/analyze')
  @ApiOperation({ summary: 'Analyze replenishment needs' })
  async analyzeReplenishment(@Query('warehouseId') warehouseId: string) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.replenishmentService.analyzeReplenishmentNeeds(warehouseId);
  }

  @Post('replenishment/wave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create replenishment wave' })
  async createReplenishmentWave(
    @Query('warehouseId') warehouseId: string,
    @Query('maxTasks') maxTasks?: number
  ) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.replenishmentService.createReplenishmentWave(warehouseId, maxTasks);
  }

  @Post('replenishment/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete replenishment task' })
  async completeReplenishment(@Param('id') taskId: string, @Body() body: any) {
    return this.replenishmentService.completeReplenishment(taskId, body.transferredQuantity);
  }

  // ============================================
  // SLOTTING ENDPOINTS
  // ============================================

  @Get('slotting/analysis')
  @ApiOperation({ summary: 'Analyze slotting optimization' })
  async analyzeSlotting(@Query('warehouseId') warehouseId: string) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.slottingService.analyzeSlottingOptimization(warehouseId);
  }

  @Post('slotting/execute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute slotting change' })
  async executeSlotting(@Body() data: any) {
    return this.slottingService.executeSlottingChange(data);
  }

  // ============================================
  // QUALITY & ASN ENDPOINTS
  // ============================================


  @Post('asn/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate Advance Shipping Notice' })
  async generateASN(@Body() data: any) {
    return this.receivingService.generateASN(data);
  }

  // ============================================
  // PRODUCTION INTEGRATION ENDPOINTS
  // ============================================

  @Get('production/work-orders')
  @ApiOperation({ summary: 'Get work orders' })
  async getWorkOrders(@Query('status') status?: string) {
    return this.productionService.getWorkOrders({ status });
  }

  @Post('production/work-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create work order' })
  async createWorkOrder(@Body() data: any) {
    return this.productionService.createWorkOrder(data);
  }

  @Post('production/handover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create production handover' })
  async createProductionHandover(@Body() data: any) {
    return this.productionService.createProductionHandover(data);
  }

  @Post('production/handover/:id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve production handover' })
  async approveHandover(@Param('id') handoverId: string, @Body() body: any) {
    return this.productionService.approveHandover(handoverId, body.receivingLocation, body.approvedBy);
  }

  @Get('production/handovers/pending')
  @ApiOperation({ summary: 'Get pending handovers' })
  async getPendingHandovers() {
    return this.productionService.getPendingHandovers();
  }

  // ============================================
  // KITTING ENDPOINTS
  // ============================================

  @Get('kitting')
  @ApiOperation({ summary: 'Get kitting orders' })
  async getKittingOrders(@Query('warehouseId') warehouseId: string, @Query('status') status?: string) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.kittingService.getKittingOrders(warehouseId, status);
  }

  @Post('kitting')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create kitting order' })
  async createKittingOrder(@Body() data: any) {
    return this.kittingService.createKittingOrder(data);
  }

  @Post('kitting/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete kitting' })
  async completeKitting(@Param('id') kittingOrderId: string) {
    return this.kittingService.completeKitting(kittingOrderId);
  }

  // ============================================
  // RETURN MANAGEMENT ENDPOINTS
  // ============================================

  @Get('returns')
  @ApiOperation({ summary: 'Get return orders' })
  async getReturnOrders(@Query('warehouseId') warehouseId: string, @Query('status') status?: string) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.returnService.getReturnOrders(warehouseId, status);
  }

  @Post('returns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create return order' })
  async createReturnOrder(@Body() data: any) {
    return this.returnService.createReturnOrder(data);
  }

  @Post('returns/:id/inspect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect return' })
  async inspectReturn(@Param('id') returnOrderId: string, @Body() data: any) {
    return this.returnService.inspectReturn(returnOrderId, data);
  }

  // ============================================
  // QUALITY CONTROL ENDPOINTS
  // ============================================

  @Get('quality/checks')
  @ApiOperation({ summary: 'Get quality checks' })
  async getQualityChecks(@Query('warehouseId') warehouseId: string, @Query() filters: any) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.qualityControlService.getQualityChecks(warehouseId, filters);
  }

  @Post('quality/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perform quality check (enhanced)' })
  async performDetailedQualityCheck(@Body() data: any) {
    return this.qualityControlService.performQualityCheck(data);
  }

  @Get('quality/statistics')
  @ApiOperation({ summary: 'Get quality statistics' })
  async getQualityStats(@Query('warehouseId') warehouseId: string) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.qualityControlService.getQualityStatistics(warehouseId);
  }

  // ============================================
  // PACKING & PACKING SLIPS ENDPOINTS
  // ============================================

  @Post('picking/:pickingOrderId/packing-slip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create packing slip for picking order' })
  @ApiParam({ name: 'pickingOrderId', description: 'Picking order ID' })
  async createPackingSlip(
    @Param('pickingOrderId') pickingOrderId: string,
    @Tenant() tenantId: string,
    @CurrentUser() user: any
  ) {
    return this.packingService.createPackingSlip(pickingOrderId, tenantId, user.id);
  }

  @Get('packing-slips')
  @ApiOperation({ summary: 'Get packing slips' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'orderNumber', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPackingSlips(@Query('warehouseId') warehouseId: string, @Query() filters: any, @Tenant() tenantId: string) {
    if (!warehouseId) throw new BadRequestException('warehouseId is required');
    return this.packingService.getPackingSlips(filters, tenantId);
  }

  @Get('packing-slips/:id')
  @ApiOperation({ summary: 'Get packing slip details' })
  @ApiParam({ name: 'id', description: 'Packing slip ID' })
  async getPackingSlip(@Param('id') packingSlipId: string) {
    return this.packingService.getPackingSlip(packingSlipId);
  }

  @Post('packing-slips/:packingSlipId/items/:itemId/pack')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pack item in packing slip' })
  @ApiParam({ name: 'packingSlipId', description: 'Packing slip ID' })
  @ApiParam({ name: 'itemId', description: 'Packing item ID' })
  async packItem(
    @Param('packingSlipId') packingSlipId: string,
    @Param('itemId') itemId: string,
    @Body() data: { packedQuantity: number },
    @CurrentUser() user: any
  ) {
    return this.packingService.packItem(packingSlipId, itemId, data.packedQuantity, user.id);
  }

  @Post('packing-slips/:id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify packing slip' })
  @ApiParam({ name: 'id', description: 'Packing slip ID' })
  async verifyPackingSlip(@Param('id') packingSlipId: string, @CurrentUser() user: any) {
    return this.packingService.verifyPackingSlip(packingSlipId, user.id);
  }

  @Post('barcode/scan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Scan barcode for WMS operations' })
  async scanBarcode(@Body() data: { barcode: string }, @Tenant() tenantId: string) {
    return this.packingService.scanBarcode(data.barcode, tenantId);
  }

  @Get('packing/statistics')
  @ApiOperation({ summary: 'Get packing statistics' })
  @ApiQuery({ name: 'warehouseId', required: true })
  async getPackingStatistics(@Query('warehouseId') warehouseId: string, @Tenant() tenantId: string) {
    return this.packingService.getPackingStatistics(warehouseId, tenantId);
  }

  // ============================================
  // ENHANCED RECEIVING ENDPOINTS
  // ============================================

  @Post('receiving/:receivingOrderId/items/:productId/receive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Receive item in receiving order' })
  @ApiParam({ name: 'receivingOrderId', description: 'Receiving order ID' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  async receiveItem(
    @Param('receivingOrderId') receivingOrderId: string,
    @Param('productId') productId: string,
    @Body() data: any,
    @CurrentUser() user: any
  ) {
    return this.receivingService.receiveItem({ ...data, receivingOrderId, productId }, user.id);
  }


  @Get('receiving/:receivingOrderId/items/:productId/optimal-locations')
  @ApiOperation({ summary: 'Get optimal location suggestions for putaway' })
  @ApiParam({ name: 'receivingOrderId', description: 'Receiving order ID' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  async suggestOptimalLocations(
    @Param('receivingOrderId') receivingOrderId: string,
    @Param('productId') productId: string
  ) {
    return this.receivingService.suggestOptimalLocations(receivingOrderId, productId);
  }

  @Post('receiving/:id/assign-putaway')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign optimal putaway locations' })
  @ApiParam({ name: 'id', description: 'Receiving order ID' })
  async assignOptimalPutaway(@Param('id') receivingOrderId: string, @CurrentUser() user: any) {
    return this.receivingService.assignOptimalPutaway(receivingOrderId, user.id);
  }


  @Get('receiving/statistics')
  @ApiOperation({ summary: 'Get receiving statistics (enhanced)' })
  @ApiQuery({ name: 'warehouseId', required: true })
  async getReceivingStatistics(@Query('warehouseId') warehouseId: string, @Tenant() tenantId: string) {
    return this.receivingService.getReceivingStatistics(warehouseId, tenantId);
  }

  // ============================================
  // WMS ANALYTICS ENDPOINTS
  // ============================================

  @Get('analytics/inventory-turnover')
  @ApiOperation({ summary: 'Get inventory turnover metrics' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'days', required: false })
  async getInventoryTurnover(@Query('warehouseId') warehouseId: string, @Query('days') days: number, @Tenant() tenantId: string) {
    return this.analyticsService.getInventoryTurnoverMetrics(warehouseId, tenantId, days || 365);
  }

  @Get('analytics/accuracy')
  @ApiOperation({ summary: 'Get accuracy metrics' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'days', required: false })
  async getAccuracyMetrics(@Query('warehouseId') warehouseId: string, @Query('days') days: number, @Tenant() tenantId: string) {
    return this.analyticsService.getAccuracyMetrics(warehouseId, tenantId, days || 30);
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'days', required: false })
  async getPerformanceMetrics(@Query('warehouseId') warehouseId: string, @Query('days') days: number, @Tenant() tenantId: string) {
    return this.analyticsService.getPerformanceMetrics(warehouseId, tenantId, days || 30);
  }

  @Get('analytics/kpis')
  @ApiOperation({ summary: 'Get operational KPIs' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'days', required: false })
  async getOperationalKPIs(@Query('warehouseId') warehouseId: string, @Query('days') days: number, @Tenant() tenantId: string) {
    return this.analyticsService.getOperationalKPIs(warehouseId, tenantId, days || 30);
  }

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Get comprehensive dashboard metrics' })
  @ApiQuery({ name: 'warehouseId', required: false })
  async getDashboardMetrics(@Query('warehouseId') warehouseId: string, @Tenant() tenantId: string) {
    return this.analyticsService.getDashboardMetrics(warehouseId, tenantId);
  }
}

