import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../core/database/database.service';
import {
  pickingOrders,
  pickingItems,
  inventory,
  wmsProducts,
  locations,
  warehouses
} from '../../../database/schema/wms.schema';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';

export interface CreatePickingOrderDto {
  warehouseId: string;
  orderNumber?: string;
  pickingStrategy?: string;
  pickingType?: string;
  priority?: string;
  assignedTo?: string;
  items: Array<{
    productId: string;
    requestedQuantity: number;
    fromLocationId?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface UpdatePickingOrderDto {
  status?: string;
  assignedTo?: string;
  priority?: string;
  pickingStrategy?: string;
  metadata?: Record<string, any>;
}

export interface PickingOrder {
  id: string;
  pickingNumber: string;
  warehouseId: string;
  orderNumber?: string;
  pickingStrategy: string;
  pickingType: string;
  priority: string;
  status: string;
  assignedTo?: string;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PickingItem {
  id: string;
  pickingOrderId: string;
  productId: string;
  fromLocationId?: string;
  requestedQuantity: number;
  pickedQuantity: number;
  status: string;
  lotNumber?: string;
  serialNumbers?: string[];
  pickedAt?: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class PickingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async createPickingOrder(createDto: CreatePickingOrderDto, tenantId: string, userId: string): Promise<PickingOrder> {
    // Generate unique picking number
    const pickingNumber = await this.generatePickingNumber(tenantId);

    // Validate items and check inventory availability
    for (const item of createDto.items) {
      await this.validateInventoryAvailability(item, createDto.warehouseId);
    }

    const [pickingOrder] = await this.databaseService.drizzleClient
      .insert(pickingOrders)
      .values({
        pickingNumber,
        warehouseId: createDto.warehouseId,
        orderNumber: createDto.orderNumber,
        pickingStrategy: createDto.pickingStrategy || 'discrete',
        pickingType: createDto.pickingType || 'sales',
        priority: createDto.priority || 'normal',
        status: 'pending',
        assignedTo: createDto.assignedTo,
        metadata: createDto.metadata || {},
        tenantId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    // Create picking items
    for (const item of createDto.items) {
      await this.createPickingItem(pickingOrder.id, item, tenantId, userId);
    }

    // Clear cache
    await this.cacheService.del(`picking_orders:${tenantId}:${createDto.warehouseId}`);

    this.loggerService.log(`Picking order created: ${pickingOrder.id} (${pickingNumber})`, 'PickingService');
    return pickingOrder;
  }

  async findAll(warehouseId: string, filters: any, tenantId: string): Promise<{
    data: PickingOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = parseInt(filters?.page) || 1;
    const limit = Math.min(parseInt(filters?.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(pickingOrders.warehouseId, warehouseId)];

    // Filter by status
    if (filters?.status) {
      conditions.push(eq(pickingOrders.status, filters.status));
    }

    // Filter by priority
    if (filters?.priority) {
      conditions.push(eq(pickingOrders.priority, filters.priority));
    }

    // Filter by assigned user
    if (filters?.assignedTo) {
      conditions.push(eq(pickingOrders.assignedTo, filters.assignedTo));
    }

    // Filter by date range
    if (filters?.startDate) {
      conditions.push(gte(pickingOrders.createdAt, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(pickingOrders.createdAt, new Date(filters.endDate)));
    }

    // Filter by picking strategy
    if (filters?.pickingStrategy) {
      conditions.push(eq(pickingOrders.pickingStrategy, filters.pickingStrategy));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select()
        .from(pickingOrders)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(pickingOrders.createdAt)),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(pickingOrders)
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);

    return {
      data: results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrev: page > 1,
    };
  }

  async findOne(id: string, tenantId: string): Promise<PickingOrder | null> {
    const results = await this.databaseService.drizzleClient
      .select()
      .from(pickingOrders)
      .where(and(eq(pickingOrders.id, id), eq(pickingOrders.tenantId, tenantId)))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  async update(id: string, updateDto: UpdatePickingOrderDto, tenantId: string, userId: string): Promise<PickingOrder | null> {
    const existingOrder = await this.findOne(id, tenantId);
    if (!existingOrder) {
      throw new NotFoundException('Picking order not found');
    }

    const [updatedOrder] = await this.databaseService.drizzleClient
      .update(pickingOrders)
      .set({
        ...updateDto,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(pickingOrders.id, id), eq(pickingOrders.tenantId, tenantId)))
      .returning();

    // Clear cache
    await this.cacheService.del(`picking_orders:${tenantId}:${existingOrder.warehouseId}`);

    this.loggerService.log(`Picking order updated: ${id}`, 'PickingService');
    return updatedOrder;
  }

  async startPicking(id: string, tenantId: string, userId: string): Promise<PickingOrder | null> {
    return this.update(id, {
      status: 'in_progress',
      startedAt: new Date(),
      assignedTo: userId,
    }, tenantId, userId);
  }

  async completePicking(id: string, tenantId: string, userId: string): Promise<PickingOrder | null> {
    // Check if all items are picked
    const pickingItems = await this.getPickingItems(id, tenantId);

    const incompleteItems = pickingItems.filter(item =>
      item.status !== 'completed' && item.requestedQuantity > item.pickedQuantity
    );

    if (incompleteItems.length > 0) {
      throw new BadRequestException('All items must be picked before completing the order');
    }

    return this.update(id, {
      status: 'completed',
      completedAt: new Date(),
    }, tenantId, userId);
  }

  async getPickingItems(pickingOrderId: string, tenantId: string): Promise<PickingItem[]> {
    const results = await this.databaseService.drizzleClient
      .select({
        ...pickingItems,
        product: wmsProducts,
        fromLocation: locations,
      })
      .from(pickingItems)
      .leftJoin(wmsProducts, eq(pickingItems.productId, wmsProducts.id))
      .leftJoin(locations, eq(pickingItems.fromLocationId, locations.id))
      .where(eq(pickingItems.pickingOrderId, pickingOrderId))
      .orderBy(asc(pickingItems.id));

    return results.map(r => ({
      ...r.picking_items,
      product: r.product,
      fromLocation: r.from_location,
    }));
  }

  async pickItem(pickingItemId: string, quantity: number, tenantId: string, userId: string): Promise<PickingItem> {
    // Get picking item
    const pickingItem = await this.databaseService.drizzleClient
      .select()
      .from(pickingItems)
      .where(eq(pickingItems.id, pickingItemId))
      .limit(1);

    if (pickingItem.length === 0) {
      throw new NotFoundException('Picking item not found');
    }

    const item = pickingItem[0];
    const newPickedQuantity = item.pickedQuantity + quantity;

    if (newPickedQuantity > item.requestedQuantity) {
      throw new BadRequestException('Cannot pick more than requested quantity');
    }

    // Update picking item
    const [updatedItem] = await this.databaseService.drizzleClient
      .update(pickingItems)
      .set({
        pickedQuantity: newPickedQuantity,
        status: newPickedQuantity >= item.requestedQuantity ? 'completed' : 'in_progress',
        pickedAt: newPickedQuantity > 0 ? new Date() : item.pickedAt,
        metadata: {
          ...item.metadata,
          lastPickedBy: userId,
          lastPickedAt: new Date(),
        }
      })
      .where(eq(pickingItems.id, pickingItemId))
      .returning();

    // Update inventory
    if (item.fromLocationId) {
      await this.updateInventoryAfterPick(item.productId, item.fromLocationId, quantity);
    }

    // Clear cache
    await this.cacheService.del(`picking_items:${pickingItemId}`);

    this.loggerService.log(`Item picked: ${pickingItemId} - Quantity: ${quantity}`, 'PickingService');
    return updatedItem;
  }

  async getPickingStatistics(warehouseId: string, tenantId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    inProgressOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averagePickingTime: number;
    totalItems: number;
    pickedItems: number;
    pickingEfficiency: number;
    ordersByPriority: Record<string, number>;
    ordersByStrategy: Record<string, number>;
  }> {
    const cacheKey = `picking_stats:${tenantId}:${warehouseId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const allOrders = await this.databaseService.drizzleClient
      .select()
      .from(pickingOrders)
      .where(eq(pickingOrders.warehouseId, warehouseId));

    const allItems = await this.databaseService.drizzleClient
      .select()
      .from(pickingItems)
      .where(sql`${pickingItems.pickingOrderId} IN (SELECT id FROM ${pickingOrders} WHERE ${eq(pickingOrders.warehouseId, warehouseId)})`);

    // Calculate statistics
    const stats = {
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter(o => o.status === 'pending').length,
      inProgressOrders: allOrders.filter(o => o.status === 'in_progress').length,
      completedOrders: allOrders.filter(o => o.status === 'completed').length,
      cancelledOrders: allOrders.filter(o => o.status === 'cancelled').length,
      averagePickingTime: 0, // Would need to calculate from completed orders
      totalItems: allItems.length,
      pickedItems: allItems.filter(i => i.status === 'completed').length,
      pickingEfficiency: allItems.length > 0 ? (allItems.filter(i => i.status === 'completed').length / allItems.length) * 100 : 0,
      ordersByPriority: {} as Record<string, number>,
      ordersByStrategy: {} as Record<string, number>,
    };

    // Count by priority and strategy
    allOrders.forEach(order => {
      stats.ordersByPriority[order.priority] = (stats.ordersByPriority[order.priority] || 0) + 1;
      stats.ordersByStrategy[order.pickingStrategy] = (stats.ordersByStrategy[order.pickingStrategy] || 0) + 1;
    });

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, stats, 300);
    return stats;
  }

  async getOptimizedPickingPath(pickingOrderId: string, tenantId: string): Promise<{
    orderId: string;
    optimizedPath: Array<{
      itemId: string;
      productId: string;
      locationId: string;
      locationCode: string;
      quantity: number;
      sequence: number;
    }>;
    estimatedTime: number;
    totalDistance: number;
  }> {
    const pickingItems = await this.getPickingItems(pickingOrderId, tenantId);

    // Simple optimization - sort by location proximity (in real implementation, use proper pathfinding)
    const optimizedPath = pickingItems
      .filter(item => item.fromLocationId)
      .sort((a, b) => {
        // Sort by location code for simplicity
        const aCode = a.fromLocation?.code || '';
        const bCode = b.fromLocation?.code || '';
        return aCode.localeCompare(bCode);
      })
      .map((item, index) => ({
        itemId: item.id,
        productId: item.productId,
        locationId: item.fromLocationId!,
        locationCode: item.fromLocation?.code || '',
        quantity: item.requestedQuantity,
        sequence: index + 1,
      }));

    return {
      orderId: pickingOrderId,
      optimizedPath,
      estimatedTime: optimizedPath.length * 2, // 2 minutes per item estimate
      totalDistance: optimizedPath.length * 10, // 10 units per item estimate
    };
  }

  async generateWavePicking(warehouseId: string, orderIds: string[], tenantId: string, userId: string): Promise<{
    waveId: string;
    waveNumber: string;
    totalOrders: number;
    totalItems: number;
    estimatedPickingTime: number;
    orders: PickingOrder[];
  }> {
    const waveNumber = `WAVE-${Date.now()}`;

    // Create wave picking order
    const [waveOrder] = await this.databaseService.drizzleClient
      .insert(pickingOrders)
      .values({
        pickingNumber: waveNumber,
        warehouseId,
        pickingStrategy: 'wave',
        pickingType: 'sales',
        priority: 'normal',
        status: 'pending',
        metadata: {
          waveOrders: orderIds,
          waveType: 'sales_wave',
        },
        tenantId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    // Get all order items and create picking items for wave
    const allOrderItems: any[] = [];
    for (const orderId of orderIds) {
      // This would integrate with orders module to get order items
      // For now, create mock items
      allOrderItems.push({
        productId: `prod_${orderId}`,
        requestedQuantity: Math.floor(Math.random() * 10) + 1,
        orderId,
      });
    }

    // Create picking items for wave
    for (const item of allOrderItems) {
      await this.createPickingItem(waveOrder.id, {
        productId: item.productId,
        requestedQuantity: item.requestedQuantity,
      }, tenantId, userId);
    }

    this.loggerService.log(`Wave picking created: ${waveOrder.id} (${waveNumber})`, 'PickingService');

    return {
      waveId: waveOrder.id,
      waveNumber,
      totalOrders: orderIds.length,
      totalItems: allOrderItems.length,
      estimatedPickingTime: allOrderItems.length * 3, // 3 minutes per item
      orders: [waveOrder],
    };
  }

  async getPickingQueue(warehouseId: string, tenantId: string): Promise<{
    urgentOrders: PickingOrder[];
    highPriorityOrders: PickingOrder[];
    normalOrders: PickingOrder[];
    totalInQueue: number;
  }> {
    const conditions = [
      eq(pickingOrders.warehouseId, warehouseId),
      sql`${pickingOrders.status} IN ('pending', 'in_progress')`
    ];

    const whereClause = and(...conditions);

    const orders = await this.databaseService.drizzleClient
      .select()
      .from(pickingOrders)
      .where(whereClause)
      .orderBy(
        desc(pickingOrders.priority),
        asc(pickingOrders.createdAt)
      );

    return {
      urgentOrders: orders.filter(o => o.priority === 'urgent'),
      highPriorityOrders: orders.filter(o => o.priority === 'high'),
      normalOrders: orders.filter((o: any) => o.priority === 'normal'),
      totalInQueue: orders.length,
    };
  }

  async assignPickingOrder(pickingOrderId: string, userId: string, tenantId: string): Promise<PickingOrder | null> {
    return this.update(pickingOrderId, {
      assignedTo: userId,
      status: 'in_progress',
      startedAt: new Date(),
    }, tenantId, userId);
  }

  private async generatePickingNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();

    // Get the latest picking number for this tenant and year
    const latestOrder = await this.databaseService.drizzleClient
      .select()
      .from(pickingOrders)
      .where(like(pickingOrders.pickingNumber, `PICK-${currentYear}-%`))
      .orderBy(desc(pickingOrders.createdAt))
      .limit(1);

    let nextNumber = 1;
    if (latestOrder.length > 0) {
      const match = latestOrder[0].pickingNumber.match(/PICK-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `PICK-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
  }

  private async validateInventoryAvailability(item: any, warehouseId: string): Promise<void> {
    const inventoryItem = await this.databaseService.drizzleClient
      .select()
      .from(inventory)
      .where(and(
        eq(inventory.productId, item.productId),
        eq(inventory.warehouseId, warehouseId)
      ))
      .limit(1);

    if (inventoryItem.length === 0) {
      throw new BadRequestException(`No inventory found for product ${item.productId} in warehouse ${warehouseId}`);
    }

    if (inventoryItem[0].quantityAvailable < item.requestedQuantity) {
      throw new BadRequestException(`Insufficient inventory for product ${item.productId}. Available: ${inventoryItem[0].quantityAvailable}, Requested: ${item.requestedQuantity}`);
    }
  }

  private async createPickingItem(pickingOrderId: string, item: any): Promise<void> {
    // Find optimal location for picking
    const optimalLocation = await this.findOptimalPickingLocation(item.productId, item.requestedQuantity);

    await this.databaseService.drizzleClient
      .insert(pickingItems)
      .values({
        pickingOrderId,
        productId: item.productId,
        fromLocationId: optimalLocation?.id,
        requestedQuantity: item.requestedQuantity,
        pickedQuantity: 0,
        status: 'pending',
        metadata: {
          optimalLocationSuggested: optimalLocation?.code,
        },
      });
  }

  private async findOptimalPickingLocation(productId: string, quantity: number): Promise<any> {
    // Find locations with sufficient inventory, ordered by proximity to picking areas
    const locationTable = locations; // Reference to avoid hoisting issues
    const locations = await this.databaseService.drizzleClient
      .select({
        ...locationTable,
        inventoryQuantity: inventory.quantityAvailable,
      })
      .from(locationTable)
      .leftJoin(inventory, and(
        eq(inventory.locationId, locationTable.id),
        eq(inventory.productId, productId),
        gte(inventory.quantityAvailable, quantity)
      ))
      .where(and(
        sql`${locationTable.zone} IN ('picking', 'storage')`,
        sql`${inventory.quantityAvailable} >= ${quantity}`
      ))
      .orderBy(asc(locationTable.zone), asc(locationTable.code))
      .limit(1);

    return locations.length > 0 ? locations[0] : null;
  }

  private async updateInventoryAfterPick(productId: string, locationId: string, quantity: number): Promise<void> {
    // Update inventory after picking
    const currentInventory = await this.databaseService.drizzleClient
      .select()
      .from(inventory)
      .where(and(
        eq(inventory.productId, productId),
        eq(inventory.locationId, locationId)
      ))
      .limit(1);

    if (currentInventory.length > 0) {
      const inventoryItem = currentInventory[0];
      const newAvailable = Math.max(0, inventoryItem.quantityAvailable - quantity);

      await this.databaseService.drizzleClient
        .update(inventory)
        .set({
          quantityAvailable: newAvailable,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inventoryItem.id));
    }
  }

  async getPickingOrders(warehouseId: string, filters: any): Promise<{
    data: PickingOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = parseInt(filters?.page) || 1;
    const limit = parseInt(filters?.limit) || 20;
    const offset = (page - 1) * limit;

    try {
      // TODO: Implement actual database query
      const result = await this.databaseService.drizzleClient
        .select()
        .from(pickingOrders)
        .where(eq(pickingOrders.warehouseId, warehouseId))
        .limit(limit)
        .offset(offset);

      return {
        data: result,
        total: result.length,
        page,
        totalPages: Math.ceil(result.length / limit)
      };
    } catch (error) {
      this.loggerService.error('Error getting picking orders', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}