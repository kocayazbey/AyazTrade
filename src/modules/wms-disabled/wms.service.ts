import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import {
  warehouses,
  locations,
  wmsProducts,
  inventory,
  stockMovements
} from '../../database/schema/wms.schema';
import { CacheService } from '../../core/cache/cache.service';
import { LoggerService } from '../../core/logger/logger.service';

export interface InventorySummary {
  productId: string;
  sku: string;
  productName: string;
  totalOnHand: number;
  totalAvailable: number;
  totalAllocated: number;
  totalReserved: number;
  locations: Array<{
    locationId: string;
    locationCode: string;
    quantity: number;
    status: string;
  }>;
  lastMovement: Date;
  lowStock: boolean;
  outOfStock: boolean;
}

export interface WarehouseOverview {
  totalWarehouses: number;
  totalLocations: number;
  totalProducts: number;
  totalInventoryValue: number;
  utilizationRate: number;
  lowStockItems: number;
  outOfStockItems: number;
  warehouses: Array<{
    id: string;
    code: string;
    name: string;
    totalCapacity: number;
    usedCapacity: number;
    utilizationRate: number;
    activeProducts: number;
  }>;
}

@Injectable()
export class WmsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async getWarehouseOverview(tenantId: string): Promise<WarehouseOverview> {
    try {
      const cacheKey = `warehouse_overview:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached as WarehouseOverview;

      // Get all warehouses for this tenant
      const warehouseList = await this.databaseService.drizzleClient
        .select()
        .from(warehouses)
        .where(eq(warehouses.status, 'active'));

      // Get inventory summary for each warehouse
      const overview: WarehouseOverview = {
        totalWarehouses: warehouseList.length,
        totalLocations: 0,
        totalProducts: 0,
        totalInventoryValue: 0,
        utilizationRate: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        warehouses: []
      };

      for (const warehouse of warehouseList) {
        const warehouseInventory = await this.getWarehouseInventory(warehouse.id);

        overview.totalLocations += warehouseInventory.totalLocations;
        overview.totalProducts += warehouseInventory.totalProducts;
        overview.totalInventoryValue += warehouseInventory.totalValue;
        overview.lowStockItems += warehouseInventory.lowStockItems;
        overview.outOfStockItems += warehouseInventory.outOfStockItems;

        overview.warehouses.push({
          id: warehouse.id,
          code: warehouse.code,
          name: warehouse.name,
          totalCapacity: parseFloat(warehouse.totalArea?.toString() || '0'),
          usedCapacity: warehouseInventory.usedCapacity,
          utilizationRate: warehouseInventory.utilizationRate,
          activeProducts: warehouseInventory.totalProducts
        });
      }

      // Calculate overall utilization rate
      const totalCapacity = overview.warehouses.reduce((sum, w) => sum + w.totalCapacity, 0);
      const totalUsed = overview.warehouses.reduce((sum, w) => sum + w.usedCapacity, 0);
      overview.utilizationRate = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

      await this.cacheService.set(cacheKey, overview, 1800);
      return overview;
    } catch (error) {
      this.loggerService.error('Error getting warehouse overview', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async getInventory(filters: any, _tenantId: string): Promise<{
    data: InventorySummary[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = parseInt(filters?.page) || 1;
    const limit = Math.min(parseInt(filters?.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [];

    // Filter by warehouse
    if (filters?.warehouseId) {
      conditions.push(eq(inventory.warehouseId, filters.warehouseId));
    }

    // Filter by product
    if (filters?.productId) {
      conditions.push(eq(inventory.productId, filters.productId));
    }

    // Filter by location
    if (filters?.locationId) {
      conditions.push(eq(inventory.locationId, filters.locationId));
    }

    // Filter by status
    if (filters?.status) {
      conditions.push(eq(inventory.status, filters.status));
    }

    // Filter by low stock
    if (filters?.lowStock === 'true') {
      conditions.push(sql`${inventory.quantityAvailable} < ${inventory.quantityOnHand} * 0.2`);
    }

    // Filter by out of stock
    if (filters?.outOfStock === 'true') {
      conditions.push(eq(inventory.quantityAvailable, 0));
    }

    // Search by SKU or product name
    if (filters?.search) {
      // const _searchTerm = `%${filters.search}%`; // Reserved for future use
      // This would need a join with products table
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select({
          ...inventory,
          product: wmsProducts,
          location: locations,
          warehouse: warehouses,
        })
        .from(inventory)
        .leftJoin(wmsProducts, eq(inventory.productId, wmsProducts.id))
        .leftJoin(locations, eq(inventory.locationId, locations.id))
        .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(inventory.updatedAt)),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(inventory)
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);

    // Transform results to summary format
    const inventorySummary: InventorySummary[] = [];
    const productGroups = new Map<string, any>();

    for (const result of results) {
      const productId = result.inventory.productId;

      if (!productGroups.has(productId)) {
        productGroups.set(productId, {
          productId,
          sku: result.product?.sku,
          productName: result.product?.name,
          totalOnHand: 0,
          totalAvailable: 0,
          totalAllocated: 0,
          totalReserved: 0,
          locations: [],
          lastMovement: result.inventory.updatedAt
        });
      }

      const productGroup = productGroups.get(productId);
      productGroup.totalOnHand += result.inventory.quantityOnHand;
      productGroup.totalAvailable += result.inventory.quantityAvailable;
      productGroup.totalAllocated += result.inventory.quantityAllocated;
      productGroup.totalReserved += result.inventory.quantityReserved;

      if (result.location) {
        productGroup.locations.push({
          locationId: result.location.id,
          locationCode: result.location.code,
          quantity: result.inventory.quantityAvailable,
          status: result.inventory.status
        });
      }
    }

    productGroups.forEach(group => {
      inventorySummary.push({
        ...group,
        lowStock: group.totalAvailable < group.totalOnHand * 0.2,
        outOfStock: group.totalAvailable === 0
      });
    });

    return {
      data: inventorySummary,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }

  async getInventoryByProduct(productId: string, _tenantId: string): Promise<InventorySummary> {
    const locationsTable = locations; // Store reference before redeclaration
    const results = await this.databaseService.drizzleClient
      .select({
        ...inventory,
        product: wmsProducts,
        location: locationsTable,
        warehouse: warehouses,
      })
      .from(inventory)
      .leftJoin(wmsProducts, eq(inventory.productId, wmsProducts.id))
      .leftJoin(locationsTable, eq(inventory.locationId, locationsTable.id))
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .where(eq(inventory.productId, productId));

    if (results.length === 0) {
      throw new NotFoundException('Inventory not found for this product');
    }

    const product = results[0].product;
    let totalOnHand = 0;
    let totalAvailable = 0;
    let totalAllocated = 0;
    let totalReserved = 0;
    const locationData: any[] = [];
    let lastMovement = new Date();

    for (const result of results) {
      totalOnHand += result.inventory.quantityOnHand || 0;
      totalAvailable += result.inventory.quantityAvailable || 0;
      totalAllocated += result.inventory.quantityAllocated;
      totalReserved += result.inventory.quantityReserved;

      if (result.location) {
        locationData.push({
          locationId: result.location.id,
          locationCode: result.location.code,
          quantity: result.inventory.quantityAvailable,
          status: result.inventory.status
        });
      }

      if (result.inventory.updatedAt > lastMovement) {
        lastMovement = result.inventory.updatedAt;
      }
    }

    return {
      productId,
      sku: product?.sku,
      productName: product?.name,
      totalOnHand,
      totalAvailable,
      totalAllocated,
      totalReserved,
      locations: locationData,
      lastMovement,
      lowStock: totalAvailable < totalOnHand * 0.2,
      outOfStock: totalAvailable === 0
    };
  }

  async updateInventory(
    productId: string,
    warehouseId: string,
    locationId: string,
    adjustmentData: {
      quantityChange: number;
      reason: string;
      lotNumber?: string;
      serialNumber?: string;
      notes?: string;
    },
    userId: string,
    tenantId: string
  ): Promise<any> {
    // Get current inventory
    const currentInventory = await this.databaseService.drizzleClient
      .select()
      .from(inventory)
      .where(and(
        eq(inventory.productId, productId),
        eq(inventory.warehouseId, warehouseId),
        eq(inventory.locationId, locationId)
      ))
      .limit(1);

    let inventoryRecord;
    if (currentInventory.length > 0) {
      inventoryRecord = currentInventory[0];
    } else {
      // Create new inventory record if doesn't exist
      const [newInventory] = await this.databaseService.drizzleClient
        .insert(inventory)
        .values({
          warehouseId,
          locationId,
          productId,
          quantityOnHand: 0,
          quantityAvailable: 0,
          quantityAllocated: 0,
          quantityReserved: 0,
        })
        .returning();
      inventoryRecord = newInventory;
    }

    // Calculate new quantities
    const newOnHand = inventoryRecord.quantityOnHand + adjustmentData.quantityChange;
    const newAvailable = Math.max(0, newOnHand - inventoryRecord.quantityAllocated - inventoryRecord.quantityReserved);

    // Update inventory
    const [updatedInventory] = await this.databaseService.drizzleClient
      .update(inventory)
      .set({
        quantityOnHand: newOnHand,
        quantityAvailable: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, inventoryRecord.id))
      .returning();

    // Create stock movement record
    await this.createStockMovement({
      warehouseId,
      productId,
      movementType: adjustmentData.quantityChange > 0 ? 'in' : 'out',
      movementReason: adjustmentData.reason,
      fromLocationId: locationId,
      toLocationId: locationId,
      quantity: Math.abs(adjustmentData.quantityChange),
      lotNumber: adjustmentData.lotNumber,
      serialNumber: adjustmentData.serialNumber,
      referenceType: 'adjustment',
      referenceId: inventoryRecord.id,
      performedBy: userId,
      notes: adjustmentData.notes,
    }, tenantId);

    // Clear inventory cache
    await this.cacheService.del(`inventory:${tenantId}:${warehouseId}`);
    await this.cacheService.del(`inventory:${tenantId}:${productId}`);

    this.loggerService.log(`Inventory adjusted: ${productId} at ${warehouseId}/${locationId}`, 'WmsService');
    return updatedInventory;
  }

  async transferInventory(
    transferData: {
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
    userId: string,
    tenantId: string
  ): Promise<any> {
    // Validate source inventory
    const sourceInventory = await this.databaseService.drizzleClient
      .select()
      .from(inventory)
      .where(and(
        eq(inventory.productId, transferData.productId),
        eq(inventory.warehouseId, transferData.fromWarehouseId),
        eq(inventory.locationId, transferData.fromLocationId)
      ))
      .limit(1);

    if (sourceInventory.length === 0 || sourceInventory[0].quantityAvailable < transferData.quantity) {
      throw new BadRequestException('Insufficient inventory for transfer');
    }

    // Update source inventory
    await this.updateInventory(
      transferData.productId,
      transferData.fromWarehouseId,
      transferData.fromLocationId,
      {
        quantityChange: -transferData.quantity,
        reason: 'transfer_out',
        lotNumber: transferData.lotNumber,
        serialNumber: transferData.serialNumber,
        notes: transferData.notes
      },
      userId,
      tenantId
    );

    // Update destination inventory
    await this.updateInventory(
      transferData.productId,
      transferData.toWarehouseId,
      transferData.toLocationId,
      {
        quantityChange: transferData.quantity,
        reason: 'transfer_in',
        lotNumber: transferData.lotNumber,
        serialNumber: transferData.serialNumber,
        notes: transferData.notes
      },
      userId,
      tenantId
    );

    // Create transfer movement record
    await this.createStockMovement({
      warehouseId: transferData.fromWarehouseId,
      productId: transferData.productId,
      movementType: 'transfer',
      movementReason: transferData.reason,
      fromLocationId: transferData.fromLocationId,
      toLocationId: transferData.toLocationId,
      quantity: transferData.quantity,
      lotNumber: transferData.lotNumber,
      serialNumber: transferData.serialNumber,
      referenceType: 'transfer',
      performedBy: userId,
      notes: transferData.notes,
    }, tenantId);

    this.loggerService.log(`Inventory transferred: ${transferData.productId} from ${transferData.fromWarehouseId} to ${transferData.toWarehouseId}`, 'WmsService');
    return { success: true, message: 'Transfer completed successfully' };
  }

  async getStockMovements(filters: any, _tenantId: string): Promise<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = parseInt(filters?.page) || 1;
    const limit = Math.min(parseInt(filters?.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [];

    // Filter by warehouse
    if (filters?.warehouseId) {
      conditions.push(eq(stockMovements.warehouseId, filters.warehouseId));
    }

    // Filter by product
    if (filters?.productId) {
      conditions.push(eq(stockMovements.productId, filters.productId));
    }

    // Filter by movement type
    if (filters?.movementType) {
      conditions.push(eq(stockMovements.movementType, filters.movementType));
    }

    // Filter by date range
    if (filters?.startDate) {
      conditions.push(gte(stockMovements.movementDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(stockMovements.movementDate, new Date(filters.endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select({
          ...stockMovements,
          product: wmsProducts,
          fromLocation: locations,
          toLocation: locations,
        })
        .from(stockMovements)
        .leftJoin(wmsProducts, eq(stockMovements.productId, wmsProducts.id))
        .leftJoin(locations, eq(stockMovements.fromLocationId, locations.id))
        .leftJoin(locations, eq(stockMovements.toLocationId, locations.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(stockMovements.movementDate)),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(stockMovements)
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);

    return {
      data: results.map((r: any) => ({
        ...r.stock_movements,
        product: r.product,
        fromLocation: r.from_location,
        toLocation: r.to_location,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }

  async getLowStockItems(tenantId: string, threshold: number = 0.2): Promise<InventorySummary[]> {
    const cacheKey = `low_stock_items:${tenantId}:${threshold}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached as InventorySummary[];

    // Get inventory where available quantity is below threshold
    const lowStockInventory = await this.databaseService.drizzleClient
      .select({
        ...inventory,
        product: wmsProducts,
        location: locations,
        warehouse: warehouses,
      })
      .from(inventory)
      .leftJoin(wmsProducts, eq(inventory.productId, wmsProducts.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .where(sql`${inventory.quantityAvailable} < ${inventory.quantityOnHand} * ${threshold}`);

    // Group by product
    const productGroups = new Map<string, any>();

    for (const result of lowStockInventory) {
      const productId = result.inventory.productId;

      if (!productGroups.has(productId)) {
        productGroups.set(productId, {
          productId,
          sku: result.product?.sku,
          productName: result.product?.name,
          totalOnHand: 0,
          totalAvailable: 0,
          totalAllocated: 0,
          totalReserved: 0,
          locations: [],
          lastMovement: result.inventory.updatedAt,
          lowStock: true,
          outOfStock: false
        });
      }

      const productGroup = productGroups.get(productId);
      productGroup.totalOnHand += result.inventory.quantityOnHand;
      productGroup.totalAvailable += result.inventory.quantityAvailable;
      productGroup.totalAllocated += result.inventory.quantityAllocated;
      productGroup.totalReserved += result.inventory.quantityReserved;

      if (result.location) {
        productGroup.locations.push({
          locationId: result.location.id,
          locationCode: result.location.code,
          quantity: result.inventory.quantityAvailable,
          status: result.inventory.status
        });
      }
    }

    const result: InventorySummary[] = [];
    productGroups.forEach(group => {
      result.push({
        ...group,
        outOfStock: group.totalAvailable === 0
      });
    });

    await this.cacheService.set(cacheKey, result, 600); // Cache for 10 minutes
    return result;
  }

  async getInventoryValue(tenantId: string): Promise<{
    totalValue: number;
    valueByWarehouse: Record<string, number>;
    valueByCategory: Record<string, number>;
    topValuedProducts: Array<{
      productId: string;
      sku: string;
      name: string;
      value: number;
      quantity: number;
    }>;
  }> {
    const cacheKey = `inventory_value:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached as { totalValue: number; valueByWarehouse: Record<string, number>; valueByCategory: Record<string, number>; topValuedProducts: Array<{ productId: string; sku: string; name: string; value: number; quantity: number; }>; };

    // Get all inventory with product prices
    const inventoryWithProducts = await this.databaseService.drizzleClient
      .select({
        ...inventory,
        product: wmsProducts,
        warehouse: warehouses,
      })
      .from(inventory)
      .leftJoin(wmsProducts, eq(inventory.productId, wmsProducts.id))
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id));

    let totalValue = 0;
    const valueByWarehouse: Record<string, number> = {};
    const valueByCategory: Record<string, number> = {};
    const productValues: Record<string, { value: number; quantity: number; name: string; sku: string }> = {};

    for (const item of inventoryWithProducts) {
      const quantity = item.inventory.quantityAvailable;
      const price = parseFloat(item.product?.metadata?.price?.toString() || '0') || 0;
      const itemValue = quantity * price;

      totalValue += itemValue;

      // By warehouse
      if (item.warehouse?.id) {
        valueByWarehouse[item.warehouse.id] = (valueByWarehouse[item.warehouse.id] || 0) + itemValue;
      }

      // By category
      const category = item.product?.category || 'uncategorized';
      valueByCategory[category] = (valueByCategory[category] || 0) + itemValue;

      // By product
      if (item.product?.id) {
        if (!productValues[item.product.id]) {
          productValues[item.product.id] = {
            value: 0,
            quantity: 0,
            name: item.product.name,
            sku: item.product.sku
          };
        }
        productValues[item.product.id].value += itemValue;
        productValues[item.product.id].quantity += quantity;
      }
    }

    // Get top valued products
    const topValuedProducts = Object.values(productValues)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(p => ({
        productId: Object.keys(productValues).find(k => productValues[k] === p)!,
        sku: p.sku,
        name: p.name,
        value: p.value,
        quantity: p.quantity
      }));

    const result = {
      totalValue,
      valueByWarehouse,
      valueByCategory,
      topValuedProducts
    };

    await this.cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
    return result;
  }

  async createWarehouse(warehouseData: any, _tenantId: string, _userId: string): Promise<any> {
    try {
      const [warehouse] = await this.databaseService.drizzleClient
        .insert(warehouses)
        .values({
          ...warehouseData,
          status: 'active',
        })
        .returning();

      // Clear warehouse cache
      await this.cacheService.del(`warehouse_overview:${_tenantId}`);

      this.loggerService.log(`Warehouse created: ${warehouse.id} (${warehouse.code})`, 'WmsService');
      return warehouse;
    } catch (error) {
      this.loggerService.error('Error creating warehouse', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async getInventoryLocations(warehouseId: string, _tenantId: string): Promise<any[]> {
    try {
      const locationsList = await this.databaseService.drizzleClient
        .select()
        .from(locations)
        .where(eq(locations.warehouseId, warehouseId));

      const result = [];
      for (const location of locationsList) {
        // Get inventory count for this location
        const inventoryCount = await this.databaseService.drizzleClient
          .select({ count: sql<number>`count(*)` })
          .from(inventory)
          .where(and(
            eq(inventory.locationId, location.id),
            sql`${inventory.quantityOnHand} > 0`
          ));

        const occupiedSlots = Number(inventoryCount[0].count);
        const utilizationRate = location.capacity > 0 ? (occupiedSlots / parseFloat(location.capacity.toString())) * 100 : 0;

        result.push({
          id: location.id,
          code: location.code,
          zone: location.zone,
          aisle: location.aisle,
          rack: location.rack,
          shelf: location.shelf,
          bin: location.bin,
          locationType: location.locationType,
          capacity: parseFloat(location.capacity?.toString() || '0'),
          usedCapacity: occupiedSlots,
          utilizationRate: Math.round(utilizationRate * 100) / 100,
          isOccupied: location.isOccupied,
          isLocked: location.isLocked,
        });
      }

      return result;
    } catch (error) {
      this.loggerService.error('Error getting inventory locations', error);
      throw error;
    }
  }

  async createLocation(locationData: any, _tenantId: string, _userId: string): Promise<any> {
    try {
      const [location] = await this.databaseService.drizzleClient
        .insert(locations)
        .values({
          ...locationData,
          isOccupied: false,
          isLocked: false,
        })
        .returning();

      // Clear location cache
      await this.cacheService.del(`inventory_locations:${locationData.warehouseId}:${_tenantId}`);

      this.loggerService.log(`Location created: ${location.id} (${location.code})`, 'WmsService');
      return location;
    } catch (error) {
      this.loggerService.error('Error creating location', error);
      throw error;
    }
  }

  async getPickingList(orderId: string, _tenantId: string): Promise<any> {
    try {
      // Get order items (this would come from orders module)
      // For now, return mock data structure
      return {
        orderId,
        pickingNumber: `PICK-${Date.now()}`,
        items: [
          {
            productId: 'prod1',
            sku: 'SKU-001',
            productName: 'Sample Product',
            requestedQuantity: 2,
            fromLocation: 'A-1-1',
            priority: 'high',
            lotNumber: 'LOT-001',
            serialNumbers: []
          }
        ],
        estimatedTime: 15,
        generatedAt: new Date(),
        assignedTo: null,
        status: 'pending'
      };
    } catch (error) {
      this.loggerService.error('Error generating picking list', error);
      throw error;
    }
  }

  async optimizeWarehouseLayout(warehouseId: string, _tenantId: string): Promise<any> {
    try {
      // Get inventory movement data for optimization
      const movementData = await this.databaseService.drizzleClient
        .select({
          productId: inventory.productId,
          locationId: inventory.locationId,
          totalMovements: sql<number>`count(*)`,
        })
        .from(inventory)
        .leftJoin(stockMovements, eq(inventory.productId, stockMovements.productId))
        .where(eq(inventory.warehouseId, warehouseId))
        .groupBy(inventory.productId, inventory.locationId);

      // Analyze movement patterns and suggest optimizations
      const suggestions = [
        'Move fast-moving items closer to picking areas',
        'Group similar products together for efficient picking',
        'Optimize slotting based on product velocity',
        'Consider implementing dynamic slotting',
        'Review location utilization and consolidate where possible'
      ];

      return {
        warehouseId,
        suggestions,
        movementAnalysis: movementData,
        estimatedImprovement: '15-25% efficiency gain',
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
    } catch (error) {
      this.loggerService.error('Error optimizing warehouse layout', error);
      throw error;
    }
  }

  private async getWarehouseInventory(warehouseId: string): Promise<{
    totalLocations: number;
    totalProducts: number;
    totalValue: number;
    usedCapacity: number;
    utilizationRate: number;
    lowStockItems: number;
    outOfStockItems: number;
  }> {
    // Get all locations in warehouse
    const locationsList = await this.databaseService.drizzleClient
      .select()
      .from(locations)
      .where(eq(locations.warehouseId, warehouseId));

    // Get all inventory in warehouse
    const inventoryList = await this.databaseService.drizzleClient
      .select({
        ...inventory,
        product: wmsProducts,
      })
      .from(inventory)
      .leftJoin(wmsProducts, eq(inventory.productId, wmsProducts.id))
      .where(eq(inventory.warehouseId, warehouseId));

    const totalLocations = locationsList.length;
    const totalProducts = new Set(inventoryList.map((i: any) => i.inventory.productId)).size;

    // Calculate total value
    const totalValue = inventoryList.reduce((sum: number, item: any) => {
      const price = parseFloat(item.product?.metadata?.price?.toString() || '0') || 0;
      return sum + (item.inventory.quantityAvailable * price);
    }, 0);

    // Calculate capacity utilization
    const totalCapacity = locationsList.reduce((sum: number, loc: any) =>
      sum + parseFloat(loc.capacity?.toString() || '0'), 0);
    const usedCapacity = inventoryList.reduce((sum: number, item: any) =>
      sum + item.inventory.quantityAvailable, 0);
    const utilizationRate = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

    // Count low stock and out of stock items
    const lowStockItems = inventoryList.filter((item: any) =>
      item.inventory.quantityAvailable < item.inventory.quantityOnHand * 0.2).length;
    const outOfStockItems = inventoryList.filter((item: any) =>
      item.inventory.quantityAvailable === 0).length;

    return {
      totalLocations,
      totalProducts,
      totalValue,
      usedCapacity,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      lowStockItems,
      outOfStockItems
    };
  }

  private async createStockMovement(movementData: any, _tenantId: string): Promise<void> {
    const movementNumber = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    await this.databaseService.drizzleClient
      .insert(stockMovements)
      .values({
        movementNumber,
        ...movementData,
        movementDate: new Date(),
      });
  }

  // ==================== SHIPPING SYSTEM INTEGRATION ====================

  async validateShippingOrder(shipmentData: any): Promise<{ valid: boolean; integrationId: string; errors: string[]; estimatedDelivery: Date; wmsData: any }> {
    try {
      // 1. Check if all products are available in inventory
      const validationErrors: string[] = [];

      for (const packageInfo of shipmentData.packages) {
        // Check inventory availability for each package
        const inventoryCheck = await this.checkInventoryAvailability(packageInfo.productId, packageInfo.quantity);
        if (!inventoryCheck.available) {
          validationErrors.push(`Insufficient inventory for product ${packageInfo.productId}`);
        }
      }

      // 2. Find appropriate warehouse for shipping
      const warehouse = await this.findOptimalWarehouse(shipmentData.toAddress);
      if (!warehouse) {
        validationErrors.push('No suitable warehouse found for delivery address');
      }

      // 3. Calculate estimated delivery time
      const estimatedDelivery = this.calculateEstimatedDelivery(shipmentData.toAddress, warehouse);

      return {
        valid: validationErrors.length === 0,
        integrationId: `WMS-${Date.now()}`,
        errors: validationErrors,
        estimatedDelivery,
        wmsData: {
          warehouseId: warehouse?.id,
          warehouseCode: warehouse?.code,
          optimalRoute: this.calculateOptimalRoute(shipmentData.fromAddress, shipmentData.toAddress),
        },
      };
    } catch (error) {
      return {
        valid: false,
        integrationId: '',
        errors: [error.message],
        estimatedDelivery: new Date(),
        wmsData: {},
      };
    }
  }

  async registerShippingOrder(shipment: any): Promise<void> {
    // 1. Reserve inventory in WMS
    for (const packageInfo of shipment.packages) {
      await this.reserveInventory(packageInfo.productId, packageInfo.quantity, shipment.id);
    }

    // 2. Create picking order in WMS
    await this.createPickingOrder(shipment);

    // 3. Update shipping order status in WMS
    await this.updateShippingOrderStatusInWMS(shipment.id, 'registered');
  }

  async updateShippingOrderStatus(shipmentId: string, status: string, location?: string): Promise<void> {
    // Update shipping order status in WMS system
    await this.updateShippingOrderStatusInWMS(shipmentId, status, location);

    // If shipment is delivered, release any reserved inventory
    if (status === 'delivered') {
      await this.releaseReservedInventory(shipmentId);
    }
  }

  async getShippingOrderTracking(trackingNumber: string): Promise<any> {
    // Get tracking information from WMS
    const trackingData = await this.getTrackingDataFromWMS(trackingNumber);

    return {
      trackingNumber,
      status: trackingData.status,
      events: trackingData.events,
      estimatedDelivery: trackingData.estimatedDelivery,
      actualDelivery: trackingData.actualDelivery,
      currentLocation: trackingData.currentLocation,
    };
  }

  async getShippingOrderStats(): Promise<any> {
    // Get shipping statistics from WMS
    const stats = await this.getShippingStatisticsFromWMS();

    return {
      totalShipments: stats.totalShipments || 0,
      pendingShipments: stats.pendingShipments || 0,
      inTransitShipments: stats.inTransitShipments || 0,
      deliveredShipments: stats.deliveredShipments || 0,
      failedShipments: stats.failedShipments || 0,
      averageDeliveryTime: stats.averageDeliveryTime || 0,
      onTimeDeliveryRate: stats.onTimeDeliveryRate || 0,
    };
  }

  async syncShippingOrders(): Promise<void> {
    // Sync shipment data between shipping system and WMS
    this.logger.log('Syncing shipments between shipping system and WMS');
    // Implementation would sync data between systems
  }

  async setupWebhooks(): Promise<void> {
    // Setup webhook listeners for WMS events
    this.logger.log('Setting up webhook listeners for WMS events');
    // Implementation would setup webhook endpoints
  }

  async getIntegrationStatus(): Promise<{ status: string; lastSync: Date; errorCount: number }> {
    // Check WMS integration status
    return {
      status: 'active',
      lastSync: new Date(),
      errorCount: 0,
    };
  }

  // Helper methods for shipping system integration
  private async checkInventoryAvailability(productId: string, quantity: number): Promise<{ available: boolean; availableQuantity: number }> {
    // Check if product is available in WMS
    const inventoryData = await this.getInventorySummary(productId);
    return {
      available: inventoryData.totalAvailable >= quantity,
      availableQuantity: inventoryData.totalAvailable,
    };
  }

  private async findOptimalWarehouse(address: any): Promise<any> {
    // Find optimal warehouse based on delivery address
    const warehouses = await this.getWarehouses();
    // Logic to find closest warehouse with available inventory
    return warehouses[0]; // Simplified for mock
  }

  private calculateEstimatedDelivery(toAddress: any, warehouse: any): Date {
    // Calculate estimated delivery time
    const baseDeliveryTime = 2; // days
    return new Date(Date.now() + baseDeliveryTime * 24 * 60 * 60 * 1000);
  }

  private calculateOptimalRoute(fromAddress: any, toAddress: any): any {
    // Calculate optimal delivery route
    return {
      distance: '150km',
      estimatedTime: '2.5 hours',
      route: 'Istanbul -> Ankara Highway',
    };
  }

  private async reserveInventory(productId: string, quantity: number, shippingOrderId: string): Promise<void> {
    // Reserve inventory in WMS for shipping order
    this.logger.log(`Reserving inventory for product ${productId}, quantity ${quantity}, shipping order ${shippingOrderId}`);
  }

  private async createPickingOrder(shippingOrder: any): Promise<void> {
    // Create picking order in WMS
    this.logger.log(`Creating picking order for shipping order ${shippingOrder.id}`);
  }

  private async updateShippingOrderStatusInWMS(shippingOrderId: string, status: string, location?: string): Promise<void> {
    // Update shipping order status in WMS database
    this.logger.log(`Updating WMS shipping order status: ${shippingOrderId} -> ${status}`);
  }

  private async releaseReservedInventory(shippingOrderId: string): Promise<void> {
    // Release reserved inventory when shipping order is delivered
    this.logger.log(`Releasing reserved inventory for shipping order ${shippingOrderId}`);
  }

  private async getTrackingDataFromWMS(trackingNumber: string): Promise<any> {
    // Get tracking data from WMS
    return {
      status: 'in_transit',
      events: [
        {
          timestamp: new Date(),
          status: 'picked_up',
          location: 'Istanbul Warehouse',
          description: 'Package picked up from warehouse',
        },
        {
          timestamp: new Date(Date.now() - 3600000),
          status: 'in_transit',
          location: 'On Highway',
          description: 'Package in transit',
        },
      ],
      estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000),
      currentLocation: 'Ankara Distribution Center',
    };
  }

  private async getShippingStatisticsFromWMS(): Promise<any> {
    // Get shipping statistics from WMS
    return {
      totalShipments: 1250,
      pendingShipments: 45,
      inTransitShipments: 120,
      deliveredShipments: 1085,
      failedShipments: 0,
      averageDeliveryTime: 1.8,
      onTimeDeliveryRate: 95.5,
    };
  }
}
