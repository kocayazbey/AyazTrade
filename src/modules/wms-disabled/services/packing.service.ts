import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../core/database/database.service';
import {
  pickingOrders,
  pickingItems,
  inventory,
  wmsProducts,
  locations,
  warehouses,
  stockMovements
} from '../../../database/schema/wms.schema';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';

export interface PackingSlip {
  id: string;
  packingNumber: string;
  pickingOrderId: string;
  orderNumber: string;
  warehouseId: string;
  status: 'generated' | 'packing' | 'packed' | 'verified' | 'cancelled';
  items: PackingItem[];
  barcode: string;
  qrCode: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
    weightUnit: string;
  };
  cartonInfo?: {
    cartonNumber: string;
    cartonType: string;
  };
  generatedAt: Date;
  packedAt?: Date;
  verifiedAt?: Date;
  packedBy?: string;
  verifiedBy?: string;
  metadata: Record<string, any>;
}

export interface PackingItem {
  id: string;
  pickingItemId: string;
  productId: string;
  sku: string;
  productName: string;
  requestedQuantity: number;
  packedQuantity: number;
  fromLocation: string;
  toLocation?: string;
  lotNumber?: string;
  serialNumbers: string[];
  barcode: string;
  status: 'pending' | 'packed' | 'shortage' | 'damage';
  notes?: string;
}

export interface BarcodeScanResult {
  success: boolean;
  type: 'product' | 'location' | 'picking_order' | 'packing_slip' | 'unknown';
  id?: string;
  data?: any;
  message: string;
}

@Injectable()
export class PackingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async createPackingSlip(pickingOrderId: string, tenantId: string, userId: string): Promise<PackingSlip> {
    // Get picking order details
    const pickingOrder = await this.getPickingOrderWithItems(pickingOrderId);
    if (!pickingOrder) {
      throw new NotFoundException('Picking order not found');
    }

    if (pickingOrder.status !== 'completed') {
      throw new BadRequestException('Picking order must be completed before packing');
    }

    // Generate packing slip number
    const packingNumber = await this.generatePackingNumber(tenantId);

    // Generate barcode and QR code
    const barcode = await this.generateBarcode(packingNumber);
    const qrCode = await this.generateQRCode(packingNumber);

    // Calculate dimensions and weight
    const dimensions = await this.calculatePackageDimensions(pickingOrder.items);

    // Create packing slip
    const [packingSlip] = await this.databaseService.drizzleClient
      .insert(this.getPackingSlipsTable())
      .values({
        packingNumber,
        pickingOrderId,
        orderNumber: pickingOrder.orderNumber,
        warehouseId: pickingOrder.warehouseId,
        status: 'generated',
        barcode,
        qrCode,
        dimensions,
        metadata: {},
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create packing items
    for (const pickingItem of pickingOrder.items) {
      await this.createPackingItem({
        packingSlipId: packingSlip.id,
        pickingItemId: pickingItem.id,
        productId: pickingItem.productId,
        requestedQuantity: pickingItem.pickedQuantity,
        fromLocation: pickingItem.fromLocationId,
        lotNumber: pickingItem.lotNumber,
        serialNumbers: pickingItem.serialNumbers || [],
        barcode: await this.generateItemBarcode(pickingItem.id),
        tenantId,
        userId
      });
    }

    // Clear cache
    await this.cacheService.del(`packing_slips:${tenantId}:${pickingOrderId}`);

    this.loggerService.log(`Packing slip created: ${packingNumber} for order ${pickingOrder.orderNumber}`, 'PackingService');

    return await this.getPackingSlip(packingSlip.id);
  }

  async scanBarcode(barcode: string, tenantId: string): Promise<BarcodeScanResult> {
    try {
      // Try to find by packing slip barcode
      const packingSlip = await this.findByBarcode(barcode, 'packing_slip');
      if (packingSlip) {
        return {
          success: true,
          type: 'packing_slip',
          id: packingSlip.id,
          data: packingSlip,
          message: `Packing slip found: ${packingSlip.packingNumber}`
        };
      }

      // Try to find by picking order barcode
      const pickingOrder = await this.findByBarcode(barcode, 'picking_order');
      if (pickingOrder) {
        return {
          success: true,
          type: 'picking_order',
          id: pickingOrder.id,
          data: pickingOrder,
          message: `Picking order found: ${pickingOrder.pickingNumber}`
        };
      }

      // Try to find by product barcode
      const product = await this.findByBarcode(barcode, 'product');
      if (product) {
        return {
          success: true,
          type: 'product',
          id: product.id,
          data: product,
          message: `Product found: ${product.sku} - ${product.name}`
        };
      }

      // Try to find by location barcode
      const location = await this.findByBarcode(barcode, 'location');
      if (location) {
        return {
          success: true,
          type: 'location',
          id: location.id,
          data: location,
          message: `Location found: ${location.code}`
        };
      }

      return {
        success: false,
        type: 'unknown',
        message: 'Barcode not recognized'
      };

    } catch (error) {
      this.loggerService.error(`Error scanning barcode: ${barcode}`, error, 'PackingService');
      return {
        success: false,
        type: 'unknown',
        message: 'Error scanning barcode'
      };
    }
  }

  async packItem(packingSlipId: string, itemId: string, packedQuantity: number, userId: string): Promise<PackingItem> {
    // Get packing item
    const packingItems = await this.databaseService.drizzleClient
      .select()
      .from(this.getPackingItemsTable())
      .where(and(
        this.getPackingItemsTable().packingSlipId.eq(packingSlipId),
        this.getPackingItemsTable().id.eq(itemId)
      ))
      .limit(1);

    if (packingItems.length === 0) {
      throw new NotFoundException('Packing item not found');
    }

    const packingItem = packingItems[0];

    if (packedQuantity > packingItem.requestedQuantity) {
      throw new BadRequestException('Packed quantity cannot exceed requested quantity');
    }

    // Update packing item
    const [updatedItem] = await this.databaseService.drizzleClient
      .update(this.getPackingItemsTable())
      .set({
        packedQuantity,
        status: packedQuantity === packingItem.requestedQuantity ? 'packed' : 'pending',
        packedAt: new Date(),
        updatedAt: new Date()
      })
      .where(this.getPackingItemsTable().id.eq(itemId))
      .returning();

    // Check if all items are packed
    await this.checkPackingSlipCompletion(packingSlipId);

    this.loggerService.log(`Item packed: ${itemId} - Quantity: ${packedQuantity}`, 'PackingService');

    return updatedItem;
  }

  async verifyPackingSlip(packingSlipId: string, userId: string): Promise<PackingSlip> {
    // Get packing slip
    const packingSlip = await this.getPackingSlip(packingSlipId);
    if (!packingSlip) {
      throw new NotFoundException('Packing slip not found');
    }

    if (packingSlip.status !== 'packed') {
      throw new BadRequestException('Packing slip must be packed before verification');
    }

    // Verify all items are accounted for
    const incompleteItems = packingSlip.items.filter(item =>
      item.packedQuantity !== item.requestedQuantity
    );

    if (incompleteItems.length > 0) {
      throw new BadRequestException('All items must be packed before verification');
    }

    // Update packing slip status
    await this.databaseService.drizzleClient
      .update(this.getPackingSlipsTable())
      .set({
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: userId,
        updatedAt: new Date()
      })
      .where(this.getPackingSlipsTable().id.eq(packingSlipId));

    // Create stock movement for packed items
    for (const item of packingSlip.items) {
      if (item.packedQuantity > 0) {
        await this.createStockMovement({
          warehouseId: packingSlip.warehouseId,
          productId: item.productId,
          movementType: 'out',
          movementReason: 'packing',
          fromLocationId: item.fromLocation,
          toLocationId: packingSlip.cartonInfo?.cartonNumber || 'PACKING_AREA',
          quantity: item.packedQuantity,
          lotNumber: item.lotNumber,
          serialNumber: item.serialNumbers?.join(','),
          referenceType: 'packing_slip',
          referenceId: packingSlipId,
          performedBy: userId,
          notes: `Packed for order ${packingSlip.orderNumber}`
        }, packingSlip.tenantId || 'default');
      }
    }

    this.loggerService.log(`Packing slip verified: ${packingSlip.packingNumber}`, 'PackingService');

    return await this.getPackingSlip(packingSlipId);
  }

  async getPackingSlip(packingSlipId: string): Promise<PackingSlip> {
    const packingSlips = await this.databaseService.drizzleClient
      .select({
        packingSlip: this.getPackingSlipsTable(),
        items: this.getPackingItemsTable(),
        product: wmsProducts,
        fromLocation: locations,
        warehouse: warehouses
      })
      .from(this.getPackingSlipsTable())
      .leftJoin(this.getPackingItemsTable(), this.getPackingItemsTable().packingSlipId.eq(this.getPackingSlipsTable().id))
      .leftJoin(wmsProducts, wmsProducts.id.eq(this.getPackingItemsTable().productId))
      .leftJoin(locations, locations.id.eq(this.getPackingItemsTable().fromLocation))
      .leftJoin(warehouses, warehouses.id.eq(this.getPackingSlipsTable().warehouseId))
      .where(this.getPackingSlipsTable().id.eq(packingSlipId));

    if (packingSlips.length === 0) {
      return null;
    }

    // Group items by packing slip
    const packingSlipData = packingSlips[0];
    const items = packingSlips.map(ps => ({
      id: ps.items.id,
      pickingItemId: ps.items.pickingItemId,
      productId: ps.items.productId,
      sku: ps.product?.sku,
      productName: ps.product?.name,
      requestedQuantity: ps.items.requestedQuantity,
      packedQuantity: ps.items.packedQuantity,
      fromLocation: ps.fromLocation?.code,
      lotNumber: ps.items.lotNumber,
      serialNumbers: ps.items.serialNumbers || [],
      barcode: ps.items.barcode,
      status: ps.items.status,
      notes: ps.items.notes
    }));

    return {
      id: packingSlipData.packingSlip.id,
      packingNumber: packingSlipData.packingSlip.packingNumber,
      pickingOrderId: packingSlipData.packingSlip.pickingOrderId,
      orderNumber: packingSlipData.packingSlip.orderNumber,
      warehouseId: packingSlipData.packingSlip.warehouseId,
      status: packingSlipData.packingSlip.status,
      items,
      barcode: packingSlipData.packingSlip.barcode,
      qrCode: packingSlipData.packingSlip.qrCode,
      dimensions: packingSlipData.packingSlip.dimensions,
      cartonInfo: packingSlipData.packingSlip.cartonInfo,
      generatedAt: packingSlipData.packingSlip.createdAt,
      packedAt: packingSlipData.packingSlip.packedAt,
      verifiedAt: packingSlipData.packingSlip.verifiedAt,
      packedBy: packingSlipData.packingSlip.packedBy,
      verifiedBy: packingSlipData.packingSlip.verifiedBy,
      metadata: packingSlipData.packingSlip.metadata
    };
  }

  async getPackingSlips(filters: any, tenantId: string): Promise<{
    data: PackingSlip[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = parseInt(filters?.page) || 1;
    const limit = Math.min(parseInt(filters?.limit) || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = this.getPackingSlipsTable().tenantId.eq(tenantId);

    // Filter by status
    if (filters?.status) {
      whereClause = and(whereClause, this.getPackingSlipsTable().status.eq(filters.status));
    }

    // Filter by warehouse
    if (filters?.warehouseId) {
      whereClause = and(whereClause, this.getPackingSlipsTable().warehouseId.eq(filters.warehouseId));
    }

    // Filter by order number
    if (filters?.orderNumber) {
      whereClause = and(whereClause, this.getPackingSlipsTable().orderNumber.like(`%${filters.orderNumber}%`));
    }

    // Filter by date range
    if (filters?.startDate) {
      whereClause = and(whereClause, this.getPackingSlipsTable().createdAt.gte(new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      whereClause = and(whereClause, this.getPackingSlipsTable().createdAt.lte(new Date(filters.endDate)));
    }

    const [packingSlips, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select()
        .from(this.getPackingSlipsTable())
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(this.getPackingSlipsTable().createdAt)),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(this.getPackingSlipsTable())
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);
    const packingSlipDetails = await Promise.all(
      packingSlips.map(ps => this.getPackingSlip(ps.id))
    );

    return {
      data: packingSlipDetails.filter(Boolean),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getPackingStatistics(warehouseId: string, tenantId: string): Promise<any> {
    const cacheKey = `packing_stats:${tenantId}:${warehouseId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Get packing statistics
    const stats = await this.databaseService.drizzleClient
      .select({
        totalSlips: sql<number>`count(*)`,
        generatedSlips: sql<number>`count(*) FILTER (WHERE status = 'generated')`,
        packedSlips: sql<number>`count(*) FILTER (WHERE status = 'packed')`,
        verifiedSlips: sql<number>`count(*) FILTER (WHERE status = 'verified')`,
        avgPackingTime: sql<number>`AVG(EXTRACT(EPOCH FROM (packed_at - created_at))/3600) FILTER (WHERE packed_at IS NOT NULL)`,
        avgVerificationTime: sql<number>`AVG(EXTRACT(EPOCH FROM (verified_at - packed_at))/3600) FILTER (WHERE verified_at IS NOT NULL)`
      })
      .from(this.getPackingSlipsTable())
      .where(and(
        this.getPackingSlipsTable().warehouseId.eq(warehouseId),
        this.getPackingSlipsTable().tenantId.eq(tenantId)
      ));

    const result = {
      totalSlips: Number(stats[0].totalSlips) || 0,
      generatedSlips: Number(stats[0].generatedSlips) || 0,
      packedSlips: Number(stats[0].packedSlips) || 0,
      verifiedSlips: Number(stats[0].verifiedSlips) || 0,
      avgPackingTime: Number(stats[0].avgPackingTime) || 0,
      avgVerificationTime: Number(stats[0].avgVerificationTime) || 0,
      completionRate: (Number(stats[0].verifiedSlips) || 0) / (Number(stats[0].totalSlips) || 1) * 100
    };

    await this.cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
    return result;
  }

  // Private helper methods
  private async getPickingOrderWithItems(pickingOrderId: string): Promise<any> {
    const results = await this.databaseService.drizzleClient
      .select({
        pickingOrder,
        pickingItem: pickingItems,
        product: wmsProducts,
        fromLocation: locations
      })
      .from(pickingOrders)
      .leftJoin(pickingItems, pickingItems.pickingOrderId.eq(pickingOrders.id))
      .leftJoin(wmsProducts, wmsProducts.id.eq(pickingItems.productId))
      .leftJoin(locations, locations.id.eq(pickingItems.fromLocationId))
      .where(pickingOrders.id.eq(pickingOrderId));

    if (results.length === 0) return null;

    const order = results[0].pickingOrder;
    const items = results.map(result => ({
      id: result.pickingItem.id,
      productId: result.pickingItem.productId,
      pickedQuantity: result.pickingItem.pickedQuantity,
      fromLocationId: result.pickingItem.fromLocationId,
      lotNumber: result.pickingItem.lotNumber,
      serialNumbers: result.pickingItem.serialNumbers,
      sku: result.product?.sku,
      productName: result.product?.name,
      fromLocation: result.fromLocation?.code
    }));

    return {
      ...order,
      items
    };
  }

  private async generatePackingNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const count = await this.databaseService.drizzleClient
      .select({ count: sql<number>`count(*)` })
      .from(this.getPackingSlipsTable())
      .where(this.getPackingSlipsTable().packingNumber.like(`PACK-${year}${month}${day}-%`));

    const sequence = String(Number(count[0].count) + 1).padStart(3, '0');
    return `PACK-${year}${month}${day}-${sequence}`;
  }

  private async generateBarcode(text: string): Promise<string> {
    // Generate Code128 barcode for packing slip
    return `PS${Date.now()}${Math.random().toString(36).substr(2, 4)}`;
  }

  private async generateQRCode(text: string): Promise<string> {
    // Generate QR code data for packing slip
    return `QR${Date.now()}${Math.random().toString(36).substr(2, 4)}`;
  }

  private async generateItemBarcode(itemId: string): Promise<string> {
    return `ITEM${itemId}`;
  }

  private async calculatePackageDimensions(items: any[]): Promise<any> {
    // Calculate total dimensions and weight
    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    for (const item of items) {
      const product = await this.databaseService.drizzleClient
        .select()
        .from(wmsProducts)
        .where(wmsProducts.id.eq(item.productId))
        .limit(1);

      if (product.length > 0) {
        const prod = product[0];
        totalWeight += (prod.weight || 0) * item.pickedQuantity;
        maxLength = Math.max(maxLength, prod.length || 0);
        maxWidth = Math.max(maxWidth, prod.width || 0);
        totalHeight += (prod.height || 0) * item.pickedQuantity;
      }
    }

    return {
      length: maxLength,
      width: maxWidth,
      height: totalHeight,
      weight: totalWeight,
      weightUnit: 'kg'
    };
  }

  private async createPackingItem(data: any): Promise<void> {
    await this.databaseService.drizzleClient
      .insert(this.getPackingItemsTable())
      .values({
        packingSlipId: data.packingSlipId,
        pickingItemId: data.pickingItemId,
        productId: data.productId,
        requestedQuantity: data.requestedQuantity,
        packedQuantity: 0,
        fromLocation: data.fromLocation,
        lotNumber: data.lotNumber,
        serialNumbers: data.serialNumbers,
        barcode: data.barcode,
        status: 'pending',
        tenantId: data.tenantId,
        createdBy: data.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }

  private async checkPackingSlipCompletion(packingSlipId: string): Promise<void> {
    const items = await this.databaseService.drizzleClient
      .select()
      .from(this.getPackingItemsTable())
      .where(this.getPackingItemsTable().packingSlipId.eq(packingSlipId));

    const allPacked = items.every(item => item.packedQuantity === item.requestedQuantity);

    if (allPacked) {
      await this.databaseService.drizzleClient
        .update(this.getPackingSlipsTable())
        .set({
          status: 'packed',
          packedAt: new Date(),
          updatedAt: new Date()
        })
        .where(this.getPackingSlipsTable().id.eq(packingSlipId));
    }
  }

  private async findByBarcode(barcode: string, type: string): Promise<any> {
    switch (type) {
      case 'packing_slip':
        return await this.databaseService.drizzleClient
          .select()
          .from(this.getPackingSlipsTable())
          .where(this.getPackingSlipsTable().barcode.eq(barcode))
          .limit(1);

      case 'picking_order':
        return await this.databaseService.drizzleClient
          .select()
          .from(pickingOrders)
          .where(pickingOrders.barcode.eq(barcode))
          .limit(1);

      case 'product':
        return await this.databaseService.drizzleClient
          .select()
          .from(wmsProducts)
          .where(wmsProducts.barcode.eq(barcode))
          .limit(1);

      case 'location':
        return await this.databaseService.drizzleClient
          .select()
          .from(locations)
          .where(locations.barcode.eq(barcode))
          .limit(1);

      default:
        return null;
    }
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

  private getPackingSlipsTable() {
    // This would be imported from schema when available
    return sql`wms_packing_slips`;
  }

  private getPackingItemsTable() {
    // This would be imported from schema when available
    return sql`wms_packing_items`;
  }
}
