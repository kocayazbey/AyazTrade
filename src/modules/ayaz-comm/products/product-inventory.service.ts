import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, sql, lte } from 'drizzle-orm';
import { DatabaseService } from '../../../core/database/database.service';
import { products, productVariants } from '../../../database/schema/products.schema';
import { inventoryMovements } from '../../../database/schema/inventory-movements.schema';

export interface StockMovement {
  productId: string;
  variantId?: string;
  quantity: number;
  type: 'in' | 'out' | 'adjustment';
  reason: string;
  reference?: string;
  userId?: string;
  createdAt: Date;
}

@Injectable()
export class ProductInventoryService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly databaseService: DatabaseService,
  ) {}

  async increaseStock(
    productId: string,
    quantity: number,
    reason: string,
    variantId?: string,
  ): Promise<void> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const movement: StockMovement = {
      productId,
      variantId,
      quantity,
      type: 'in',
      reason,
      createdAt: new Date(),
    };

    // Record movement
    await this.recordStockMovement(movement);

    // Update stock
    await this.updateStock(productId, quantity, variantId);

    // Emit event
    this.eventEmitter.emit('inventory.increased', {
      productId,
      variantId,
      quantity,
    });
  }

  async decreaseStock(
    productId: string,
    quantity: number,
    reason: string,
    variantId?: string,
  ): Promise<void> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    // Check if stock is available
    const available = await this.checkAvailability(productId, quantity, variantId);
    if (!available) {
      throw new BadRequestException('Insufficient stock');
    }

    const movement: StockMovement = {
      productId,
      variantId,
      quantity: -quantity,
      type: 'out',
      reason,
      createdAt: new Date(),
    };

    // Record movement
    await this.recordStockMovement(movement);

    // Update stock
    await this.updateStock(productId, -quantity, variantId);

    // Emit event
    this.eventEmitter.emit('inventory.decreased', {
      productId,
      variantId,
      quantity,
    });

    // Check for low stock
    await this.checkLowStock(productId, variantId);
  }

  async adjustStock(
    productId: string,
    newQuantity: number,
    reason: string,
    variantId?: string,
  ): Promise<void> {
    const currentStock = await this.getCurrentStock(productId, variantId);
    const difference = newQuantity - currentStock;

    const movement: StockMovement = {
      productId,
      variantId,
      quantity: difference,
      type: 'adjustment',
      reason,
      createdAt: new Date(),
    };

    // Record movement
    await this.recordStockMovement(movement);

    // Set new stock level
    await this.setStock(productId, newQuantity, variantId);

    // Emit event
    this.eventEmitter.emit('inventory.adjusted', {
      productId,
      variantId,
      oldQuantity: currentStock,
      newQuantity,
    });
  }

  async checkAvailability(
    productId: string,
    quantity: number,
    variantId?: string,
  ): Promise<boolean> {
    const currentStock = await this.getCurrentStock(productId, variantId);
    return currentStock >= quantity;
  }

  async reserveStock(
    productId: string,
    quantity: number,
    orderId: string,
    variantId?: string,
  ): Promise<void> {
    const available = await this.checkAvailability(productId, quantity, variantId);
    
    if (!available) {
      throw new BadRequestException('Insufficient stock for reservation');
    }

    // Create reservation record
    await this.createReservation({
      productId,
      variantId,
      quantity,
      orderId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      createdAt: new Date(),
    });

    this.eventEmitter.emit('inventory.reserved', {
      productId,
      variantId,
      quantity,
      orderId,
    });
  }

  async releaseReservation(orderId: string): Promise<void> {
    // Remove reservation
    await this.removeReservation(orderId);

    this.eventEmitter.emit('inventory.reservation.released', { orderId });
  }

  async confirmReservation(orderId: string): Promise<void> {
    const reservation = await this.getReservation(orderId);
    
    if (!reservation) {
      throw new BadRequestException('Reservation not found');
    }

    // Decrease actual stock
    await this.decreaseStock(
      reservation.productId,
      reservation.quantity,
      `Order confirmed: ${orderId}`,
      reservation.variantId,
    );

    // Remove reservation
    await this.removeReservation(orderId);
  }

  async getStockMovements(
    productId: string,
    variantId?: string,
  ): Promise<StockMovement[]> {
    const conditions = [eq(inventoryMovements.productId, productId)];
    
    if (variantId) {
      // If variant movements are tracked separately, add variant condition
      // For now, using productId only
    }

    const movements = await this.databaseService.drizzleClient
      .select()
      .from(inventoryMovements)
      .where(and(...conditions))
      .orderBy(sql`${inventoryMovements.createdAt} DESC`)
      .limit(100);

    return movements.map(m => ({
      productId: m.productId,
      quantity: Number(m.quantity),
      type: m.type as 'in' | 'out' | 'adjustment',
      reason: m.reason || '',
      reference: m.reference || undefined,
      createdAt: m.createdAt,
    }));
  }

  async getLowStockProducts(threshold?: number): Promise<any[]> {
    const stockThreshold = threshold || 10;
    
    const lowStockProducts = await this.databaseService.drizzleClient
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        stockQuantity: products.stockQuantity,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(products)
      .where(
        and(
          eq(products.trackInventory, true),
          sql`${products.stockQuantity} <= ${stockThreshold}`,
          sql`${products.stockQuantity} > 0`
        )
      );

    return lowStockProducts;
  }

  async getOutOfStockProducts(): Promise<any[]> {
    const outOfStockProducts = await this.databaseService.drizzleClient
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        stockQuantity: products.stockQuantity,
      })
      .from(products)
      .where(
        and(
          eq(products.trackInventory, true),
          sql`${products.stockQuantity} <= 0`
        )
      );

    return outOfStockProducts;
  }

  private async getCurrentStock(
    productId: string,
    variantId?: string,
  ): Promise<number> {
    if (variantId) {
      const [variant] = await this.databaseService.drizzleClient
        .select({ stockQuantity: productVariants.stockQuantity })
        .from(productVariants)
        .where(eq(productVariants.id, variantId))
        .limit(1);
      
      return variant?.stockQuantity || 0;
    }

    const [product] = await this.databaseService.drizzleClient
      .select({ stockQuantity: products.stockQuantity })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    return product?.stockQuantity || 0;
  }

  private async updateStock(
    productId: string,
    change: number,
    variantId?: string,
  ): Promise<void> {
    if (variantId) {
      const currentStock = await this.getCurrentStock(productId, variantId);
      await this.databaseService.drizzleClient
        .update(productVariants)
        .set({ stockQuantity: currentStock + change })
        .where(eq(productVariants.id, variantId));
      return;
    }

    const currentStock = await this.getCurrentStock(productId);
    await this.databaseService.drizzleClient
      .update(products)
      .set({ stockQuantity: currentStock + change })
      .where(eq(products.id, productId));
  }

  private async setStock(
    productId: string,
    quantity: number,
    variantId?: string,
  ): Promise<void> {
    if (variantId) {
      await this.databaseService.drizzleClient
        .update(productVariants)
        .set({ stockQuantity: quantity })
        .where(eq(productVariants.id, variantId));
      return;
    }

    await this.databaseService.drizzleClient
      .update(products)
      .set({ stockQuantity: quantity })
      .where(eq(products.id, productId));
  }

  private async recordStockMovement(movement: StockMovement): Promise<void> {
    await this.databaseService.drizzleClient
      .insert(inventoryMovements)
      .values({
        productId: movement.productId,
        type: movement.type,
        quantity: movement.quantity.toString(),
        reason: movement.reason,
        reference: movement.reference,
        tenantId: 'default', // TODO: Get from context
        createdBy: movement.userId || 'system',
      });
  }

  private async checkLowStock(
    productId: string,
    variantId?: string,
  ): Promise<void> {
    const stock = await this.getCurrentStock(productId, variantId);
    const threshold = 10; // Get from product settings

    if (stock <= threshold) {
      this.eventEmitter.emit('inventory.low_stock', {
        productId,
        variantId,
        currentStock: stock,
        threshold,
      });
    }
  }

  private async createReservation(reservation: any): Promise<void> {
    // Reservation is tracked via products.stockQuantity - reservedQuantity
    // In a full implementation, you'd have a separate reservations table
    // For now, we'll track via orderId in movements
    await this.recordStockMovement({
      productId: reservation.productId,
      variantId: reservation.variantId,
      quantity: reservation.quantity,
      type: 'out',
      reason: `Reservation for order: ${reservation.orderId}`,
      reference: reservation.orderId,
      userId: reservation.userId,
      createdAt: reservation.createdAt,
    });
  }

  private async getReservation(orderId: string): Promise<any> {
    // Check if there's a movement record for this order
    const [movement] = await this.databaseService.drizzleClient
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.reference, orderId),
          eq(inventoryMovements.type, 'out')
        )
      )
      .limit(1);

    if (!movement) {
      return null;
    }

    return {
      productId: movement.productId,
      quantity: Number(movement.quantity),
      orderId: movement.reference,
      createdAt: movement.createdAt,
    };
  }

  private async removeReservation(orderId: string): Promise<void> {
    // In a full implementation, you'd update a reservations table
    // For now, reservations are tracked via movements which shouldn't be deleted
    // This method is called when reservation is confirmed or released
    // The actual stock decrease happens in confirmReservation
  }
}

