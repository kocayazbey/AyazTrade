import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, gte, lte, asc, desc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../core/database/database.service';
import { inventory, stockMovements, wmsProducts } from '../../../database/schema/wms.schema';
import { batchLots } from '../../../database/schema/shared/erp-inventory.schema';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';

export interface LotInfo {
  id: string;
  lotNumber: string;
  batchNumber?: string;
  productId: string;
  warehouseId: string;
  locationId?: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  manufactureDate?: Date;
  expiryDate?: Date;
  receivedDate: Date;
  status: 'available' | 'reserved' | 'expired' | 'quarantine' | 'consumed';
  rotationRule: 'FIFO' | 'FEFO' | 'LIFO';
  metadata?: Record<string, any>;
}

export interface FIFOAllocationResult {
  lotId: string;
  lotNumber: string;
  quantity: number;
  expiryDate?: Date;
  manufactureDate?: Date;
  locationCode?: string;
}

@Injectable()
export class LotFIFOManagementService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Get available lots for a product using FIFO/LIFO/FEFO strategy
   */
  async getAvailableLots = async (
    productId: string,
    warehouseId: string,
    strategy: 'FIFO' | 'FEFO' | 'LIFO' = 'FIFO',
    tenantId: string,
  ): Promise<LotInfo[]> => {
    const cacheKey = `lots:${productId}:${warehouseId}:${strategy}:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Get product rotation rule
    const product = await this.databaseService.drizzleClient
      .select()
      .from(wmsProducts)
      .where(eq(wmsProducts.id, productId))
      .limit(1);

    if (!product.length) {
      throw new NotFoundException('Product not found');
    }

    const rotationRule = this.determineRotationRule(product[0], strategy);

    // Get inventory with lot information
    const lots = await this.databaseService.drizzleClient
      .select({
        id: inventory.id,
        lotNumber: inventory.lotNumber,
        productId: inventory.productId,
        warehouseId: inventory.warehouseId,
        locationId: inventory.locationId,
        quantityOnHand: inventory.quantityOnHand,
        quantityAvailable: inventory.quantityAvailable,
        quantityReserved: inventory.quantityReserved,
        manufactureDate: inventory.manufactureDate,
        expiryDate: inventory.expiryDate,
        receivedDate: inventory.receivedDate,
        status: inventory.status,
      })
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, productId),
          eq(inventory.warehouseId, warehouseId),
          eq(inventory.status, 'available'),
          sql`${inventory.quantityAvailable} > 0`,
        ),
      );

    // Sort based on rotation rule
    const sortedLots = this.sortLotsByStrategy(lots, rotationRule);

    const result = sortedLots.map((lot) => ({
      id: lot.id,
      lotNumber: lot.lotNumber || 'DEFAULT',
      productId: lot.productId,
      warehouseId: lot.warehouseId,
      locationId: lot.locationId,
      quantity: Number(lot.quantityOnHand || 0),
      availableQuantity: Number(lot.quantityAvailable || 0),
      reservedQuantity: Number(lot.quantityReserved || 0),
      manufactureDate: lot.manufactureDate,
      expiryDate: lot.expiryDate,
      receivedDate: lot.receivedDate || new Date(),
      status: lot.status as any,
      rotationRule,
      metadata: {},
    }));

    await this.cacheService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  };

  /**
   * Allocate inventory using FIFO/FEFO/LIFO strategy
   */
  async allocateInventoryByFIFO = async (
    productId: string,
    warehouseId: string,
    requestedQuantity: number,
    strategy: 'FIFO' | 'FEFO' | 'LIFO' = 'FIFO',
    tenantId: string,
    userId: string,
  ): Promise<FIFOAllocationResult[]> => {
    const availableLots = await this.getAvailableLots(productId, warehouseId, strategy, tenantId);

    if (availableLots.length === 0) {
      throw new NotFoundException('No available lots found for this product');
    }

    let remainingQuantity = requestedQuantity;
    const allocations: FIFOAllocationResult[] = [];

    for (const lot of availableLots) {
      if (remainingQuantity <= 0) break;

      const allocateQuantity = Math.min(remainingQuantity, lot.availableQuantity);

      if (allocateQuantity > 0) {
        // Reserve inventory
        await this.reserveLotQuantity(lot.id, allocateQuantity, tenantId, userId);

        allocations.push({
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          quantity: allocateQuantity,
          expiryDate: lot.expiryDate,
          manufactureDate: lot.manufactureDate,
          locationCode: lot.locationId,
        });

        remainingQuantity -= allocateQuantity;
      }
    }

    if (remainingQuantity > 0) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${requestedQuantity - remainingQuantity}, Requested: ${requestedQuantity}`,
      );
    }

    // Clear cache
    await this.cacheService.del(`lots:${productId}:${warehouseId}:${strategy}:${tenantId}`);

    this.loggerService.log(
      `Allocated ${requestedQuantity} units using ${strategy} strategy for product ${productId}`,
      'LotFIFOManagementService',
    );

    return allocations;
  };

  /**
   * Reserve lot quantity
   */
  private async reserveLotQuantity = async (
    lotId: string,
    quantity: number,
    tenantId: string,
    userId: string,
  ): Promise<void> => {
    const lot = await this.databaseService.drizzleClient
      .select()
      .from(inventory)
      .where(eq(inventory.id, lotId))
      .limit(1);

    if (!lot.length) {
      throw new NotFoundException('Lot not found');
    }

    const currentLot = lot[0];
    const newReserved = (currentLot.quantityReserved || 0) + quantity;
    const newAvailable = (currentLot.quantityAvailable || 0) - quantity;

    if (newAvailable < 0) {
      throw new BadRequestException('Insufficient available quantity');
    }

    await this.databaseService.drizzleClient
      .update(inventory)
      .set({
        quantityReserved: newReserved,
        quantityAvailable: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, lotId));

    // Record movement
    await this.databaseService.drizzleClient.insert(stockMovements).values({
      movementNumber: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      warehouseId: currentLot.warehouseId,
      productId: currentLot.productId,
      movementType: 'reservation',
      movementReason: 'picking_allocation',
      fromLocationId: currentLot.locationId,
      quantity,
      lotNumber: currentLot.lotNumber,
      referenceType: 'allocation',
      performedBy: userId,
      movementDate: new Date(),
    });
  };

  /**
   * Release reserved lot quantity
   */
  async releaseLotQuantity = async (
    lotId: string,
    quantity: number,
    tenantId: string,
    userId: string,
  ): Promise<void> => {
    const lot = await this.databaseService.drizzleClient
      .select()
      .from(inventory)
      .where(eq(inventory.id, lotId))
      .limit(1);

    if (!lot.length) {
      throw new NotFoundException('Lot not found');
    }

    const currentLot = lot[0];
    const newReserved = Math.max(0, (currentLot.quantityReserved || 0) - quantity);
    const newAvailable = (currentLot.quantityAvailable || 0) + quantity;

    await this.databaseService.drizzleClient
      .update(inventory)
      .set({
        quantityReserved: newReserved,
        quantityAvailable: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, lotId));

    this.loggerService.log(`Released ${quantity} units from lot ${lotId}`, 'LotFIFOManagementService');
  };

  /**
   * Check for expired lots
   */
  async checkExpiredLots = async (warehouseId: string, tenantId: string): Promise<LotInfo[]> => {
    const expiredLots = await this.databaseService.drizzleClient
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.warehouseId, warehouseId),
          eq(inventory.status, 'available'),
          sql`${inventory.expiryDate} IS NOT NULL`,
          sql`${inventory.expiryDate} < NOW()`,
          sql`${inventory.quantityOnHand} > 0`,
        ),
      );

    const expired: LotInfo[] = [];

    for (const lot of expiredLots) {
      // Update status to expired
      await this.databaseService.drizzleClient
        .update(inventory)
        .set({
          status: 'expired',
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, lot.id));

      expired.push({
        id: lot.id,
        lotNumber: lot.lotNumber || 'DEFAULT',
        productId: lot.productId,
        warehouseId: lot.warehouseId,
        locationId: lot.locationId,
        quantity: Number(lot.quantityOnHand || 0),
        availableQuantity: Number(lot.quantityAvailable || 0),
        reservedQuantity: Number(lot.quantityReserved || 0),
        manufactureDate: lot.manufactureDate,
        expiryDate: lot.expiryDate,
        receivedDate: lot.receivedDate || new Date(),
        status: 'expired',
        rotationRule: 'FEFO',
        metadata: {},
      });
    }

    this.loggerService.log(`Found ${expired.length} expired lots in warehouse ${warehouseId}`, 'LotFIFOManagementService');

    return expired;
  };

  /**
   * Get lot details by lot number
   */
  async getLotByLotNumber = async (
    lotNumber: string,
    warehouseId: string,
    tenantId: string,
  ): Promise<LotInfo | null> => {
    const lot = await this.databaseService.drizzleClient
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.lotNumber, lotNumber),
          eq(inventory.warehouseId, warehouseId),
        ),
      )
      .limit(1);

    if (!lot.length) return null;

    const l = lot[0];
    return {
      id: l.id,
      lotNumber: l.lotNumber || 'DEFAULT',
      productId: l.productId,
      warehouseId: l.warehouseId,
      locationId: l.locationId,
      quantity: Number(l.quantityOnHand || 0),
      availableQuantity: Number(l.quantityAvailable || 0),
      reservedQuantity: Number(l.quantityReserved || 0),
      manufactureDate: l.manufactureDate,
      expiryDate: l.expiryDate,
      receivedDate: l.receivedDate || new Date(),
      status: l.status as any,
      rotationRule: 'FIFO',
      metadata: {},
    };
  };

  /**
   * Sort lots based on rotation strategy
   */
  private sortLotsByStrategy = (lots: any[], strategy: 'FIFO' | 'FEFO' | 'LIFO'): any[] => {
    const sorted = [...lots];

    switch (strategy) {
      case 'FIFO':
        // First In First Out - oldest received date first
        return sorted.sort((a, b) => {
          const dateA = a.receivedDate ? new Date(a.receivedDate).getTime() : 0;
          const dateB = b.receivedDate ? new Date(b.receivedDate).getTime() : 0;
          return dateA - dateB;
        });

      case 'FEFO':
        // First Expiry First Out - earliest expiry date first
        return sorted.sort((a, b) => {
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        });

      case 'LIFO':
        // Last In First Out - newest received date first
        return sorted.sort((a, b) => {
          const dateA = a.receivedDate ? new Date(a.receivedDate).getTime() : 0;
          const dateB = b.receivedDate ? new Date(b.receivedDate).getTime() : 0;
          return dateB - dateA;
        });

      default:
        return sorted;
    }
  };

  /**
   * Determine rotation rule for product
   */
  private determineRotationRule = (product: any, defaultStrategy: 'FIFO' | ' a' | 'LIFO'): 'FIFO' | 'FEFO' | 'LIFO' => {
    // Check if product has expiry date (FEFO for perishables)
    if (product.isPerishable || product.hasExpiryDate) {
      return 'FEFO';
    }

    // LIFO for fashion/electronics (newest first)
    if (product.category === 'electronics' || product.category === 'fashion') {
      return 'LIFO';
    }

    // Default to FIFO
    return defaultStrategy || 'FIFO';
  };
}

