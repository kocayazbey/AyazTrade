import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../core/database/database.service';
import {
  receivingOrders,
  receivingItems,
  inventory,
  wmsProducts,
  locations,
  warehouses,
  stockMovements
} from '../../../database/schema/wms.schema';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';

export interface ReceivingOrder {
  id: string;
  receivingNumber: string;
  warehouseId: string;
  receivingType: 'purchase_order' | 'transfer' | 'production' | 'return';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  supplier?: string;
  carrier?: string;
  trackingNumber?: string;
  expectedDate: Date;
  actualDate?: Date;
  items: ReceivingItem[];
  totalExpectedQuantity: number;
  totalReceivedQuantity: number;
  totalValue: number;
  qualityStatus: 'pending' | 'passed' | 'failed' | 'partial';
  putawayStatus: 'pending' | 'in_progress' | 'completed';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceivingItem {
  id: string;
  receivingOrderId: string;
  productId: string;
  sku: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  lotNumber?: string;
  serialNumbers: string[];
  expiryDate?: Date;
  unitCost: number;
  totalCost: number;
  fromLocation?: string;
  toLocation?: string;
  optimalLocation?: string;
  status: 'pending' | 'received' | 'quality_checked' | 'putaway_assigned' | 'putaway_completed';
  qualityStatus: 'pending' | 'passed' | 'failed' | 'conditional';
  notes?: string;
  damageReason?: string;
}

export interface OptimalLocationSuggestion {
  locationId: string;
  locationCode: string;
  zone: string;
  score: number;
  reason: string;
  distance: number;
  utilizationRate: number;
  rotationRule: 'FIFO' | 'FEFO' | 'LIFO';
}

@Injectable()
export class ReceivingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async createReceivingOrder(createData: {
    warehouseId: string;
    receivingType: string;
    supplier?: string;
    carrier?: string;
    trackingNumber?: string;
    expectedDate: Date;
    priority?: string;
    items: Array<{
      productId: string;
      expectedQuantity: number;
      unitCost: number;
      lotNumber?: string;
      expiryDate?: Date;
    }>;
    metadata?: Record<string, any>;
  }, tenantId: string, userId: string): Promise<ReceivingOrder> {

    // Generate receiving number
    const receivingNumber = await this.generateReceivingNumber(tenantId);

    // Calculate total expected quantity and value
    const totalExpectedQuantity = createData.items.reduce((sum, item) => sum + item.expectedQuantity, 0);
    const totalValue = createData.items.reduce((sum, item) => sum + (item.expectedQuantity * item.unitCost), 0);

    // Create receiving order
    const [receivingOrder] = await this.databaseService.drizzleClient
      .insert(this.getReceivingOrdersTable())
      .values({
        receivingNumber,
        warehouseId: createData.warehouseId,
        receivingType: createData.receivingType,
        status: 'pending',
        priority: createData.priority || 'normal',
        supplier: createData.supplier,
        carrier: createData.carrier,
        trackingNumber: createData.trackingNumber,
        expectedDate: createData.expectedDate,
        totalExpectedQuantity,
        totalReceivedQuantity: 0,
        totalValue,
        qualityStatus: 'pending',
        putawayStatus: 'pending',
        metadata: createData.metadata || {},
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create receiving items
    for (const item of createData.items) {
      const product = await this.getProductDetails(item.productId);
      await this.createReceivingItem({
        receivingOrderId: receivingOrder.id,
        productId: item.productId,
        expectedQuantity: item.expectedQuantity,
        unitCost: item.unitCost,
        lotNumber: item.lotNumber,
        expiryDate: item.expiryDate,
        tenantId,
        userId
      }, product);
    }

    // Clear cache
    await this.cacheService.del(`receiving_orders:${tenantId}:${createData.warehouseId}`);

    this.loggerService.log(`Receiving order created: ${receivingNumber}`, 'ReceivingService');
    return await this.getReceivingOrder(receivingOrder.id);
  }

  async startReceiving(receivingOrderId: string): Promise<ReceivingOrder> {
    const receivingOrder = await this.getReceivingOrder(receivingOrderId);
    if (!receivingOrder) {
      throw new NotFoundException('Receiving order not found');
    }

    if (receivingOrder.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be started');
    }

    // Update status to in progress
    await this.databaseService.drizzleClient
      .update(this.getReceivingOrdersTable())
      .set({
        status: 'in_progress',
        actualDate: new Date(),
        updatedAt: new Date()
      })
      .where(this.getReceivingOrdersTable().id, receivingOrderId));

    // Generate ASN if needed
    if (receivingOrder.receivingType === 'purchase_order') {
      await this.generateASN(receivingOrderId);
    }

    this.loggerService.log(`Receiving started: ${receivingOrder.receivingNumber}`, 'ReceivingService');
    return await this.getReceivingOrder(receivingOrderId);
  }

  async receiveItem(data: {
    receivingOrderId: string;
    productId: string;
    receivedQuantity: number;
    lotNumber?: string;
    serialNumbers?: string[];
    expiryDate?: Date;
    notes?: string;
    damageReason?: string;
  }, userId: string): Promise<ReceivingItem> {

    const receivingOrder = await this.getReceivingOrder(data.receivingOrderId);
    if (!receivingOrder) {
      throw new NotFoundException('Receiving order not found');
    }

    if (receivingOrder.status !== 'in_progress') {
      throw new BadRequestException('Receiving order must be in progress');
    }

    // Get receiving item
    const receivingItem = await this.getReceivingItem(data.receivingOrderId, data.productId);
    if (!receivingItem) {
      throw new NotFoundException('Receiving item not found');
    }

    if (data.receivedQuantity > receivingItem.expectedQuantity - receivingItem.receivedQuantity) {
      throw new BadRequestException('Received quantity cannot exceed expected remaining quantity');
    }

    // Update received quantity
    const newReceivedQuantity = receivingItem.receivedQuantity + data.receivedQuantity;
    const isComplete = newReceivedQuantity >= receivingItem.expectedQuantity;

    await this.databaseService.drizzleClient
      .update(this.getReceivingItemsTable())
      .set({
        receivedQuantity: newReceivedQuantity,
        status: isComplete ? 'received' : 'pending',
        lotNumber: data.lotNumber || receivingItem.lotNumber,
        serialNumbers: data.serialNumbers || receivingItem.serialNumbers,
        expiryDate: data.expiryDate || receivingItem.expiryDate,
        notes: data.notes,
        damageReason: data.damageReason,
        receivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(this.getReceivingItemsTable().id, receivingItem.id));

    // Update receiving order totals
    await this.updateReceivingOrderTotals(data.receivingOrderId);

    // Create stock movement
    await this.createStockMovement({
      warehouseId: receivingOrder.warehouseId,
      productId: data.productId,
      movementType: 'in',
      movementReason: 'receiving',
      toLocationId: 'RECEIVING_DOCK',
      quantity: data.receivedQuantity,
      lotNumber: data.lotNumber,
      serialNumber: data.serialNumbers?.join(','),
      referenceType: 'receiving_order',
      referenceId: data.receivingOrderId,
      performedBy: userId,
      notes: data.notes
    }, 'default');

    this.loggerService.log(`Item received: ${data.productId} - Quantity: ${data.receivedQuantity}`, 'ReceivingService');
    return await this.getReceivingItem(data.receivingOrderId, data.productId);
  }

  async performQualityCheck(data: {
    receivingOrderId: string;
    productId: string;
    sampleSize: number;
    passedQuantity: number;
    failedQuantity: number;
    qualityNotes?: string;
    inspectorId: string;
  }, userId: string): Promise<ReceivingItem> {

    const receivingItem = await this.getReceivingItem(data.receivingOrderId, data.productId);
    if (!receivingItem) {
      throw new NotFoundException('Receiving item not found');
    }

    // Calculate quality status
    const totalChecked = data.passedQuantity + data.failedQuantity;
    const passRate = totalChecked > 0 ? (data.passedQuantity / totalChecked) * 100 : 0;

    let qualityStatus: 'passed' | 'failed' | 'conditional';
    if (passRate >= 95) {
      qualityStatus = 'passed';
    } else if (passRate >= 80) {
      qualityStatus = 'conditional';
    } else {
      qualityStatus = 'failed';
    }

    // Update receiving item
    const acceptedQuantity = Math.floor((data.passedQuantity / totalChecked) * receivingItem.receivedQuantity);
    const rejectedQuantity = receivingItem.receivedQuantity - acceptedQuantity;

    await this.databaseService.drizzleClient
      .update(this.getReceivingItemsTable())
      .set({
        acceptedQuantity,
        rejectedQuantity,
        qualityStatus,
        status: 'quality_checked',
        updatedAt: new Date()
      })
      .where(this.getReceivingItemsTable().id, receivingItem.id));

    // Create quality check record
    await this.createQualityCheck({
      receivingOrderId: data.receivingOrderId,
      receivingItemId: receivingItem.id,
      productId: data.productId,
      sampleSize: data.sampleSize,
      passedQuantity: data.passedQuantity,
      failedQuantity: data.failedQuantity,
      passRate,
      qualityStatus,
      qualityNotes: data.qualityNotes,
      inspectorId: data.inspectorId,
      performedBy: userId,
      tenantId: 'default'
    });

    // Update receiving order quality status
    await this.updateReceivingOrderQualityStatus(data.receivingOrderId);

    this.loggerService.log(`Quality check completed: ${data.productId} - Pass Rate: ${passRate}%`, 'ReceivingService');
    return await this.getReceivingItem(data.receivingOrderId, data.productId);
  }

  async suggestOptimalLocations(receivingOrderId: string, productId: string): Promise<OptimalLocationSuggestion[]> {
    const receivingItem = await this.getReceivingItem(receivingOrderId, productId);
    if (!receivingItem) {
      throw new NotFoundException('Receiving item not found');
    }

    const product = await this.getProductDetails(productId);
    const warehouseId = await this.getReceivingOrderWarehouse(receivingOrderId);

    // Get available locations in warehouse
    const availableLocations = await this.databaseService.drizzleClient
      .select()
      .from(locations)
      .where(and(
        locations.warehouseId, warehouseId),
        locations.isOccupied, false),
        locations.isLocked, false)
      ))
      .orderBy(locations.zone, locations.aisle, locations.rack);

    // Calculate scores for each location
    const suggestions: OptimalLocationSuggestion[] = [];

    for (const location of availableLocations) {
      const score = await this.calculateLocationScore(location, product, receivingItem);
      const distance = await this.calculateDistanceFromReceiving(location);

      suggestions.push({
        locationId: location.id,
        locationCode: location.code,
        zone: location.zone || '',
        score,
        reason: await this.getLocationScoreReason(location, product),
        distance,
        utilizationRate: await this.getLocationUtilizationRate(location.id),
        rotationRule: this.getOptimalRotationRule(product)
      });
    }

    // Sort by score (highest first) and distance
    return suggestions
      .sort((a, b) => {
        if (Math.abs(a.score - b.score) < 0.1) {
          return a.distance - b.distance; // Closer is better when scores are similar
        }
        return b.score - a.score; // Higher score is better
      })
      .slice(0, 5); // Top 5 suggestions
  }

  async assignOptimalPutaway(receivingOrderId: string, userId: string): Promise<ReceivingOrder> {
    const receivingOrder = await this.getReceivingOrder(receivingOrderId);
    if (!receivingOrder) {
      throw new NotFoundException('Receiving order not found');
    }

    // For each quality-passed item, assign optimal location
    for (const item of receivingOrder.items) {
      if (item.qualityStatus === 'passed' && item.acceptedQuantity > 0) {
        const suggestions = await this.suggestOptimalLocations(receivingOrderId, item.productId);

        if (suggestions.length > 0) {
          const bestLocation = suggestions[0];

          // Update item with optimal location
          await this.databaseService.drizzleClient
            .update(this.getReceivingItemsTable())
            .set({
              optimalLocation: bestLocation.locationId,
              status: 'putaway_assigned',
              updatedAt: new Date()
            })
            .where(this.getReceivingItemsTable().id, item.id));

          // Create putaway task
          await this.createPutawayTask({
            receivingOrderId,
            receivingItemId: item.id,
            productId: item.productId,
            quantity: item.acceptedQuantity,
            fromLocation: 'RECEIVING_DOCK',
            toLocation: bestLocation.locationId,
            priority: receivingOrder.priority,
            suggestedBy: 'system',
            assignedTo: userId,
            tenantId: receivingOrder.tenantId || 'default'
          });
        }
      }
    }

    // Update receiving order putaway status
    await this.databaseService.drizzleClient
      .update(this.getReceivingOrdersTable())
      .set({
        putawayStatus: 'in_progress',
        updatedAt: new Date()
      })
      .where(this.getReceivingOrdersTable().id, receivingOrderId));

    this.loggerService.log(`Optimal putaway assigned: ${receivingOrder.receivingNumber}`, 'ReceivingService');
    return await this.getReceivingOrder(receivingOrderId);
  }

  async completePutaway(receivingOrderId: string, userId: string): Promise<ReceivingOrder> {
    const receivingOrder = await this.getReceivingOrder(receivingOrderId);
    if (!receivingOrder) {
      throw new NotFoundException('Receiving order not found');
    }

    // Update all items to putaway completed
    await this.databaseService.drizzleClient
      .update(this.getReceivingItemsTable())
      .set({
        status: 'putaway_completed',
        updatedAt: new Date()
      })
      .where(this.getReceivingItemsTable().receivingOrderId, receivingOrderId));

    // Update receiving order
    await this.databaseService.drizzleClient
      .update(this.getReceivingOrdersTable())
      .set({
        status: 'completed',
        putawayStatus: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(this.getReceivingOrdersTable().id, receivingOrderId));

    // Move inventory to final locations
    await this.moveInventoryToFinalLocations(receivingOrderId, userId);

    // Clear cache
    await this.cacheService.del(`receiving_orders:${receivingOrder.tenantId}:${receivingOrder.warehouseId}`);

    this.loggerService.log(`Putaway completed: ${receivingOrder.receivingNumber}`, 'ReceivingService');
    return await this.getReceivingOrder(receivingOrderId);
  }

  async getReceivingOrders(warehouseId: string, filters: any, tenantId: string): Promise<{
    data: ReceivingOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = parseInt(filters?.page) || 1;
    const limit = Math.min(parseInt(filters?.limit) || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = and(
      this.getReceivingOrdersTable().warehouseId, warehouseId),
      this.getReceivingOrdersTable().tenantId, tenantId)
    );

    // Filter by status
    if (filters?.status) {
      whereClause = and(whereClause, this.getReceivingOrdersTable().status, filters.status));
    }

    // Filter by receiving type
    if (filters?.receivingType) {
      whereClause = and(whereClause, this.getReceivingOrdersTable().receivingType, filters.receivingType));
    }

    // Filter by date range
    if (filters?.startDate) {
      whereClause = and(whereClause, this.getReceivingOrdersTable().expectedDate.gte(new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      whereClause = and(whereClause, this.getReceivingOrdersTable().expectedDate.lte(new Date(filters.endDate)));
    }

    const [orders, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select()
        .from(this.getReceivingOrdersTable())
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(this.getReceivingOrdersTable().createdAt)),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(this.getReceivingOrdersTable())
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);
    const receivingOrders = await Promise.all(
      orders.map((order: any) => this.getReceivingOrder(order.id))
    );

    return {
      data: receivingOrders.filter(Boolean),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getReceivingStatistics(warehouseId: string, tenantId: string): Promise<any> {
    const cacheKey = `receiving_stats:${tenantId}:${warehouseId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Get comprehensive receiving statistics
    const stats = await this.databaseService.drizzleClient
      .select({
        totalOrders: sql<number>`count(*)`,
        completedOrders: sql<number>`count(*) FILTER (WHERE status = 'completed')`,
        inProgressOrders: sql<number>`count(*) FILTER (WHERE status = 'in_progress')`,
        pendingOrders: sql<number>`count(*) FILTER (WHERE status = 'pending')`,
        avgProcessingTime: sql<number>`AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FILTER (WHERE completed_at IS NOT NULL)`,
        totalReceivedQuantity: sql<number>`SUM(total_received_quantity)`,
        totalExpectedQuantity: sql<number>`SUM(total_expected_quantity)`,
        accuracyRate: sql<number>`AVG(CASE WHEN total_received_quantity = total_expected_quantity THEN 100 ELSE (total_received_quantity::float / total_expected_quantity::float) * 100 END)`,
        qualityPassRate: sql<number>`AVG(CASE WHEN quality_status = 'passed' THEN 100 WHEN quality_status = 'conditional' THEN 75 ELSE 0 END)`
      })
      .from(this.getReceivingOrdersTable())
      .where(and(
        this.getReceivingOrdersTable().warehouseId, warehouseId),
        this.getReceivingOrdersTable().tenantId, tenantId)
      ));

    const result = {
      totalOrders: Number(stats[0].totalOrders) || 0,
      completedOrders: Number(stats[0].completedOrders) || 0,
      inProgressOrders: Number(stats[0].inProgressOrders) || 0,
      pendingOrders: Number(stats[0].pendingOrders) || 0,
      avgProcessingTime: Number(stats[0].avgProcessingTime) || 0,
      totalReceivedQuantity: Number(stats[0].totalReceivedQuantity) || 0,
      totalExpectedQuantity: Number(stats[0].totalExpectedQuantity) || 0,
      accuracyRate: Number(stats[0].accuracyRate) || 0,
      qualityPassRate: Number(stats[0].qualityPassRate) || 0,
      onTimeDeliveryRate: 0, // Would calculate based on expected vs actual dates
      putawayCompletionRate: 0 // Would calculate based on putaway status
    };

    await this.cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
    return result;
  }

  // Private helper methods
  private async getReceivingOrder(receivingOrderId: string): Promise<ReceivingOrder> {
    const results = await this.databaseService.drizzleClient
      .select({
        receivingOrder: this.getReceivingOrdersTable(),
        receivingItem: this.getReceivingItemsTable(),
        product: wmsProducts,
        toLocation: locations,
        warehouse: warehouses
      })
      .from(this.getReceivingOrdersTable())
      .leftJoin(this.getReceivingItemsTable(), this.getReceivingItemsTable().receivingOrderId, this.getReceivingOrdersTable().id))
      .leftJoin(wmsProducts, wmsProducts.id, this.getReceivingItemsTable().productId))
      .leftJoin(locations, locations.id, this.getReceivingItemsTable().toLocation))
      .leftJoin(warehouses, warehouses.id, this.getReceivingOrdersTable().warehouseId))
      .where(this.getReceivingOrdersTable().id, receivingOrderId));

    if (results.length === 0) return null;

    // Group items by receiving order
    const orderData = results[0];
    const items = results.map(result => ({
      id: result.receivingItem.id,
      productId: result.receivingItem.productId,
      sku: result.product?.sku,
      productName: result.product?.name,
      expectedQuantity: result.receivingItem.expectedQuantity,
      receivedQuantity: result.receivingItem.receivedQuantity,
      acceptedQuantity: result.receivingItem.acceptedQuantity,
      rejectedQuantity: result.receivingItem.rejectedQuantity,
      lotNumber: result.receivingItem.lotNumber,
      serialNumbers: result.receivingItem.serialNumbers || [],
      expiryDate: result.receivingItem.expiryDate,
      unitCost: result.receivingItem.unitCost,
      totalCost: result.receivingItem.totalCost,
      toLocation: result.toLocation?.code,
      optimalLocation: result.receivingItem.optimalLocation,
      status: result.receivingItem.status,
      qualityStatus: result.receivingItem.qualityStatus,
      notes: result.receivingItem.notes,
      damageReason: result.receivingItem.damageReason
    }));

    return {
      id: orderData.receivingOrder.id,
      receivingNumber: orderData.receivingOrder.receivingNumber,
      warehouseId: orderData.receivingOrder.warehouseId,
      receivingType: orderData.receivingOrder.receivingType,
      status: orderData.receivingOrder.status,
      priority: orderData.receivingOrder.priority,
      supplier: orderData.receivingOrder.supplier,
      carrier: orderData.receivingOrder.carrier,
      trackingNumber: orderData.receivingOrder.trackingNumber,
      expectedDate: orderData.receivingOrder.expectedDate,
      actualDate: orderData.receivingOrder.actualDate,
      items,
      totalExpectedQuantity: orderData.receivingOrder.totalExpectedQuantity,
      totalReceivedQuantity: orderData.receivingOrder.totalReceivedQuantity,
      totalValue: orderData.receivingOrder.totalValue,
      qualityStatus: orderData.receivingOrder.qualityStatus,
      putawayStatus: orderData.receivingOrder.putawayStatus,
      metadata: orderData.receivingOrder.metadata,
      createdAt: orderData.receivingOrder.createdAt,
      updatedAt: orderData.receivingOrder.updatedAt
    };
  }

  private async getReceivingItem(receivingOrderId: string, productId: string): Promise<ReceivingItem> {
    const results = await this.databaseService.drizzleClient
      .select({
        receivingItem: this.getReceivingItemsTable(),
        product: wmsProducts,
        toLocation: locations
      })
      .from(this.getReceivingItemsTable())
      .leftJoin(wmsProducts, wmsProducts.id, this.getReceivingItemsTable().productId))
      .leftJoin(locations, locations.id, this.getReceivingItemsTable().toLocation))
      .where(and(
        this.getReceivingItemsTable().receivingOrderId, receivingOrderId),
        this.getReceivingItemsTable().productId, productId)
      ))
      .limit(1);

    if (results.length === 0) return null;

    const result = results[0];
    return {
      id: result.receivingItem.id,
      receivingOrderId: result.receivingItem.receivingOrderId,
      productId: result.receivingItem.productId,
      sku: result.product?.sku,
      productName: result.product?.name,
      expectedQuantity: result.receivingItem.expectedQuantity,
      receivedQuantity: result.receivingItem.receivedQuantity,
      acceptedQuantity: result.receivingItem.acceptedQuantity,
      rejectedQuantity: result.receivingItem.rejectedQuantity,
      lotNumber: result.receivingItem.lotNumber,
      serialNumbers: result.receivingItem.serialNumbers || [],
      expiryDate: result.receivingItem.expiryDate,
      unitCost: result.receivingItem.unitCost,
      totalCost: result.receivingItem.totalCost,
      fromLocation: result.receivingItem.fromLocation,
      toLocation: result.toLocation?.code,
      optimalLocation: result.receivingItem.optimalLocation,
      status: result.receivingItem.status,
      qualityStatus: result.receivingItem.qualityStatus,
      notes: result.receivingItem.notes,
      damageReason: result.receivingItem.damageReason
    };
  }

  private async generateReceivingNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const count = await this.databaseService.drizzleClient
      .select({ count: sql<number>`count(*)` })
      .from(this.getReceivingOrdersTable())
      .where(this.getReceivingOrdersTable().receivingNumber.like(`RO-${year}${month}${day}-%`));

    const sequence = String(Number(count[0].count) + 1).padStart(3, '0');
    return `RO-${year}${month}${day}-${sequence}`;
  }

  private async getProductDetails(productId: string): Promise<any> {
    return await this.databaseService.drizzleClient
      .select()
      .from(wmsProducts)
      .where(wmsProducts.id, productId))
      .limit(1);
  }

  private async createReceivingItem(data: any): Promise<void> {
    await this.databaseService.drizzleClient
      .insert(this.getReceivingItemsTable())
      .values({
        receivingOrderId: data.receivingOrderId,
        productId: data.productId,
        expectedQuantity: data.expectedQuantity,
        receivedQuantity: 0,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        unitCost: data.unitCost,
        totalCost: data.expectedQuantity * data.unitCost,
        lotNumber: data.lotNumber,
        expiryDate: data.expiryDate,
        status: 'pending',
        qualityStatus: 'pending',
        tenantId: data.tenantId,
        createdBy: data.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }

  private async updateReceivingOrderTotals(receivingOrderId: string): Promise<void> {
    const items = await this.databaseService.drizzleClient
      .select({
        expectedQuantity: this.getReceivingItemsTable().expectedQuantity,
        receivedQuantity: this.getReceivingItemsTable().receivedQuantity,
        acceptedQuantity: this.getReceivingItemsTable().acceptedQuantity,
        unitCost: this.getReceivingItemsTable().unitCost
      })
      .from(this.getReceivingItemsTable())
      .where(this.getReceivingItemsTable().receivingOrderId, receivingOrderId));

    const totalReceivedQuantity = items.reduce((sum: number, item: any) => sum + item.receivedQuantity, 0);
    const totalValue = items.reduce((sum: number, item: any) => sum + (item.acceptedQuantity * item.unitCost), 0);

    await this.databaseService.drizzleClient
      .update(this.getReceivingOrdersTable())
      .set({
        totalReceivedQuantity,
        totalValue,
        updatedAt: new Date()
      })
      .where(this.getReceivingOrdersTable().id, receivingOrderId));
  }

  private async createStockMovement(movementData: any, tenantId: string): Promise<void> {
    const movementNumber = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    await this.databaseService.drizzleClient
      .insert(stockMovements)
      .values({
        movementNumber,
        ...movementData,
        movementDate: new Date(),
        tenantId
      });
  }

  private async calculateLocationScore(location: any, product: any, receivingItem: any): Promise<number> {
    let score = 50; // Base score

    // Zone preference based on product type
    if (product.storageTemp === 'frozen' && location.zone === 'frozen') score += 30;
    else if (product.storageTemp === 'refrigerated' && location.zone === 'refrigerated') score += 25;
    else if (product.storageTemp === 'ambient' && location.zone === 'ambient') score += 20;

    // ABC classification preference
    const abcClass = await this.getProductABCClass(product.id);
    if (abcClass === 'A' && location.zone === 'picking') score += 20;
    else if (abcClass === 'B' && location.zone === 'storage') score += 15;
    else if (abcClass === 'C' && location.zone === 'bulk') score += 10;

    // Expiry-based rotation
    if (product.isPerishable && location.zone === 'picking') score += 15;

    // Utilization optimization
    const utilizationRate = await this.getLocationUtilizationRate(location.id);
    if (utilizationRate < 70) score += 10; // Prefer under-utilized locations

    return Math.min(score, 100); // Cap at 100
  }

  private async calculateDistanceFromReceiving(location: any): Promise<number> {
    // Simplified distance calculation based on zone
    const zoneDistances = {
      'receiving': 0,
      'picking': 10,
      'storage': 20,
      'bulk': 30,
      'shipping': 15
    };

    return zoneDistances[location.zone] || 25;
  }

  private async getLocationScoreReason(location: any, product: any): Promise<string> {
    const reasons = [];

    if (product.storageTemp && location.zone?.includes(product.storageTemp)) {
      reasons.push(`Optimal temperature zone for ${product.storageTemp} storage`);
    }

    const utilizationRate = await this.getLocationUtilizationRate(location.id);
    if (utilizationRate < 70) {
      reasons.push(`Under-utilized location (${utilizationRate}% capacity)`);
    }

    if (product.isPerishable && location.zone === 'picking') {
      reasons.push('FEFO rotation for perishable item');
    }

    return reasons.join(', ') || 'Standard location assignment';
  }

  private async getLocationUtilizationRate(locationId: string): Promise<number> {
    // Get inventory in location
    const inventoryInLocation = await this.databaseService.drizzleClient
      .select({ totalQuantity: sql<number>`SUM(quantity_on_hand)` })
      .from(inventory)
      .where(inventory.locationId, locationId));

    const currentQuantity = Number(inventoryInLocation[0].totalQuantity) || 0;

    // Get location capacity
    const locationDetails = await this.databaseService.drizzleClient
      .select()
      .from(locations)
      .where(locations.id, locationId))
      .limit(1);

    if (locationDetails.length === 0) return 0;

    const capacity = Number(locationDetails[0].capacity) || 1;
    return (currentQuantity / capacity) * 100;
  }

  private getOptimalRotationRule(product: any): 'FIFO' | 'FEFO' | 'LIFO' {
    if (product.isPerishable) return 'FEFO';
    if (product.category === 'electronics' || product.category === 'fashion') return 'LIFO';
    return 'FIFO';
  }

  private async getProductABCClass(productId: string): Promise<string> {
    // Simplified ABC classification based on value
    // In real implementation, this would be calculated based on usage frequency and value
    return 'B'; // Default to B class
  }

  private async updateReceivingOrderQualityStatus(receivingOrderId: string): Promise<void> {
    const items = await this.databaseService.drizzleClient
      .select({ qualityStatus: this.getReceivingItemsTable().qualityStatus })
      .from(this.getReceivingItemsTable())
      .where(this.getReceivingItemsTable().receivingOrderId, receivingOrderId));

    const passedItems = items.filter(item => item.qualityStatus === 'passed').length;
    const totalItems = items.length;

    let qualityStatus: 'passed' | 'failed' | 'partial';
    if (passedItems === totalItems) {
      qualityStatus = 'passed';
    } else if (passedItems === 0) {
      qualityStatus = 'failed';
    } else {
      qualityStatus = 'partial';
    }

    await this.databaseService.drizzleClient
      .update(this.getReceivingOrdersTable())
      .set({
        qualityStatus,
        updatedAt: new Date()
      })
      .where(this.getReceivingOrdersTable().id, receivingOrderId));
  }

  async generateASN(data: any): Promise<string> {
    const receivingOrderId = data.receivingOrderId;
    const asnNumber = `ASN-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // In real implementation, this would create an ASN record
    this.loggerService.log(`ASN generated: ${asnNumber} for receiving order ${receivingOrderId}`, 'ReceivingService');

    return asnNumber;
  }

  private async createQualityCheck(data: any): Promise<void> {
    await this.databaseService.drizzleClient
      .insert(qualityChecks)
      .values({
        ...data,
        checkDate: new Date(),
        checkType: 'receiving'
      });
  }

  private async createPutawayTask(data: any): Promise<void> {
    // In real implementation, this would create a putaway task record
    this.loggerService.log(`Putaway task created: ${data.productId} -> ${data.toLocation}`, 'ReceivingService');
  }

  private async getReceivingOrderWarehouse(receivingOrderId: string): Promise<string> {
    const result = await this.databaseService.drizzleClient
      .select()
      .from(this.getReceivingOrdersTable())
      .where(this.getReceivingOrdersTable().id, receivingOrderId))
      .limit(1);

    return result[0]?.warehouseId;
  }

  private async moveInventoryToFinalLocations(receivingOrderId: string, userId: string): Promise<void> {
    const receivingOrder = await this.getReceivingOrder(receivingOrderId);

    for (const item of receivingOrder.items) {
      if (item.acceptedQuantity > 0 && item.optimalLocation) {
        // Update inventory to final location
        await this.databaseService.drizzleClient
          .update(inventory)
          .set({
            locationId: item.optimalLocation,
            quantityOnHand: item.acceptedQuantity,
            quantityAvailable: item.acceptedQuantity,
            updatedAt: new Date()
          })
          .where(and(
            inventory.productId, item.productId),
            inventory.warehouseId, receivingOrder.warehouseId)
          ));

        // Create stock movement
        await this.createStockMovement({
          warehouseId: receivingOrder.warehouseId,
          productId: item.productId,
          movementType: 'transfer',
          movementReason: 'putaway',
          fromLocationId: 'RECEIVING_DOCK',
          toLocationId: item.optimalLocation,
          quantity: item.acceptedQuantity,
          lotNumber: item.lotNumber,
          referenceType: 'receiving_order',
          referenceId: receivingOrderId,
          performedBy: userId,
          notes: `Putaway completed for ${item.sku}`
        }, 'default');
      }
    }
  }

  private getReceivingOrdersTable() {
    return sql`wms_receiving_orders`;
  }

  private getReceivingItemsTable() {
    return sql`wms_receiving_items`;
  }
}