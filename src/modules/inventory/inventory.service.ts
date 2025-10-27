import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { inventory } from '../../database/schema/wms/inventory.schema';
import { products } from '../../database/schema/products.schema';
import { warehouses } from '../../database/schema/warehouses.schema';
import { inventoryMovements } from '../../database/schema/inventory-movements.schema';
import { CacheService } from '../../core/cache/cache.service';
import { LoggerService } from '../../core/logger/logger.service';
import { WebSocketGateway } from '../../core/websocket/websocket.gateway';

@Injectable()
export class InventoryService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
    private readonly websocketGateway: WebSocketGateway,
  ) {}

  async getInventory(filters: any, tenantId: string) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = Math.min(parseInt(filters.limit) || 20, 100);
      const offset = (page - 1) * limit;
      
      const conditions = [eq(inventory.tenantId, tenantId as any)];
      
      if (filters.sku) {
        conditions.push(eq(inventory.sku, filters.sku));
      }
      
      if (filters.warehouseId) {
        conditions.push(eq(inventory.warehouseId, filters.warehouseId));
      }
      
      if (filters.lowStock === 'true') {
        conditions.push(sql`cast(${inventory.quantity} as numeric) <= 10`);
      }

      const whereClause = and(...conditions);

      const results = await this.databaseService.drizzleClient
        .select({
          id: inventory.id,
          sku: inventory.sku,
          warehouseId: inventory.warehouseId,
          quantity: inventory.quantity,
          reservedQuantity: inventory.reservedQuantity,
          availableQuantity: inventory.availableQuantity,
          unitCost: inventory.unitCost,
          lastUpdated: inventory.updatedAt,
        })
        .from(inventory)
        .where(whereClause)
        .orderBy(desc(inventory.updatedAt))
        .limit(limit)
        .offset(offset);

      const totalResults = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(inventory)
        .where(whereClause);

      return {
        data: results,
        total: Number(totalResults[0].count),
        page,
        limit,
        totalPages: Math.ceil(Number(totalResults[0].count) / limit)
      };
    } catch (error) {
      this.loggerService.error('Error getting inventory', error);
      throw error;
    }
  }

  async getInventoryBySKU(sku: string, tenantId: string) {
    try {
      const cacheKey = `inventory:${sku}:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached as string);

      const result = await this.databaseService.drizzleClient
        .select({
          sku: inventory.sku,
          totalStock: sql<number>`sum(cast(${inventory.quantity} as numeric))`,
          totalReserved: sql<number>`sum(cast(${inventory.reservedQuantity} as numeric))`,
          totalAvailable: sql<number>`sum(cast(${inventory.availableQuantity} as numeric))`,
          warehouses: sql<any>`json_agg(
            json_build_object(
              'id', ${inventory.warehouseId},
              'stock', cast(${inventory.quantity} as numeric),
              'reserved', cast(${inventory.reservedQuantity} as numeric),
              'available', cast(${inventory.availableQuantity} as numeric)
            )
          )`
        })
        .from(inventory)
        .where(and(
          eq(inventory.sku, sku),
          eq(inventory.tenantId, tenantId as any)
        ))
        .groupBy(inventory.sku);

      if (!result.length) {
        throw new NotFoundException('Inventory item not found');
      }

      const inventoryData = {
        ...result[0],
        totalStock: Number(result[0].totalStock || 0),
        totalReserved: Number(result[0].totalReserved || 0),
        totalAvailable: Number(result[0].totalAvailable || 0),
      };

      await this.cacheService.set(cacheKey, JSON.stringify(inventoryData), 300);
      return inventoryData;
    } catch (error) {
      this.loggerService.error('Error getting inventory by SKU', error);
      throw error;
    }
  }

  async adjustInventory(data: any, tenantId: string, userId: string) {
    try {
      const { sku, warehouseId, quantity, reason, notes } = data;

      // Get current inventory
      const currentInventory = await this.databaseService.drizzleClient
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.sku, sku),
          eq(inventory.warehouseId, warehouseId),
          eq(inventory.tenantId, tenantId as any)
        ))
        .limit(1);

      if (!currentInventory.length) {
        throw new NotFoundException('Inventory item not found');
      }

      const current = currentInventory[0];
      const currentQty = parseFloat(current.quantity || '0');
      const newQuantity = currentQty + quantity;

      if (newQuantity < 0) {
        throw new BadRequestException('Insufficient stock for adjustment');
      }

      // Update inventory
      const [updatedInventory] = await this.databaseService.drizzleClient
        .update(inventory)
        .set({
          quantity: newQuantity.toString(),
          availableQuantity: (newQuantity - parseFloat(current.reservedQuantity || '0')).toString(),
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, current.id))
        .returning();

      // Create inventory movement record
      await this.databaseService.drizzleClient
        .insert(inventoryMovements)
        .values({
          tenantId: tenantId as any,
          sku,
          warehouseId,
          movementType: quantity > 0 ? 'adjustment_in' : 'adjustment_out',
        quantity: Math.abs(quantity),
          reason,
          notes,
        createdBy: userId,
        createdAt: new Date(),
      });

      // Clear cache and publish real-time update
      await this.clearInventoryCache(sku, tenantId);

      // Publish real-time inventory change notification
      await this.publishInventoryChange({
        type: 'inventory_adjusted',
        tenantId,
        sku,
        warehouseId,
        oldQuantity: currentQty,
        newQuantity,
        adjustment: quantity,
        reason,
        userId,
        timestamp: new Date()
      });

      this.loggerService.log(`Inventory adjusted: ${sku} by ${quantity}`, 'InventoryService');
      return {
        success: true,
        sku,
        newQuantity,
        adjustment: quantity
      };
    } catch (error) {
      this.loggerService.error('Error adjusting inventory', error);
      throw error;
    }
  }

  async transferStock(data: any, tenantId: string, userId: string) {
    try {
      const { sku, fromWarehouseId, toWarehouseId, quantity, reason } = data;

      if (fromWarehouseId === toWarehouseId) {
        throw new BadRequestException('Source and destination warehouses cannot be the same');
      }

      // Check source inventory
      const sourceInventory = await this.databaseService.drizzleClient
        .select()
        .from(inventory)
      .where(and(
          eq(inventory.sku, sku),
          eq(inventory.warehouseId, fromWarehouseId),
          eq(inventory.tenantId, tenantId as any)
        ))
        .limit(1);

      if (!sourceInventory.length) {
        throw new NotFoundException('Source inventory item not found');
      }

      const sourceQty = parseFloat(sourceInventory[0].quantity || '0');
      if (sourceQty < quantity) {
        throw new BadRequestException('Insufficient stock for transfer');
      }

      // Get or create destination inventory
      let destInventory = await this.databaseService.drizzleClient
        .select()
        .from(inventory)
      .where(and(
          eq(inventory.sku, sku),
          eq(inventory.warehouseId, toWarehouseId),
          eq(inventory.tenantId, tenantId as any)
        ))
        .limit(1);

      // Start transaction
      await this.databaseService.drizzleClient.transaction(async (tx) => {
        // Update source inventory
        const newSourceQty = sourceQty - quantity;
        const sourceReserved = parseFloat(sourceInventory[0].reservedQuantity || '0');
        await tx
          .update(inventory)
          .set({
            quantity: newSourceQty.toString(),
            availableQuantity: (newSourceQty - sourceReserved).toString(),
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, sourceInventory[0].id));

        // Update or create destination inventory
        if (destInventory.length) {
          const destQty = parseFloat(destInventory[0].quantity || '0');
          const destReserved = parseFloat(destInventory[0].reservedQuantity || '0');
          await tx
            .update(inventory)
            .set({
              quantity: (destQty + quantity).toString(),
              availableQuantity: (destQty + quantity - destReserved).toString(),
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, destInventory[0].id));
        } else {
          // Create new inventory record for destination
          await tx
            .insert(inventory)
            .values({
              tenantId: tenantId as any,
              productId: sourceInventory[0].productId,
              sku,
              warehouseId: toWarehouseId,
              quantity: quantity.toString(),
              reservedQuantity: '0',
              availableQuantity: quantity.toString(),
              unitCost: sourceInventory[0].unitCost,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
        }

        // Create movement records
        await tx
          .insert(inventoryMovements)
          .values([
            {
              tenantId: tenantId as any,
              sku,
              warehouseId: fromWarehouseId,
              movementType: 'transfer_out',
              quantity,
              reason,
              createdBy: userId,
              createdAt: new Date(),
            },
            {
              tenantId: tenantId as any,
              sku,
              warehouseId: toWarehouseId,
              movementType: 'transfer_in',
              quantity,
              reason,
              createdBy: userId,
              createdAt: new Date(),
            }
          ]);
      });

      // Clear caches and publish real-time update
      await this.clearInventoryCache(sku, tenantId);

      // Publish real-time inventory change notification
      await this.publishInventoryChange({
        type: 'stock_transfer',
        tenantId,
        sku,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        reason,
        userId,
        timestamp: new Date()
      });

      this.loggerService.log(`Stock transferred: ${sku} from ${fromWarehouseId} to ${toWarehouseId}`, 'InventoryService');
      return {
        success: true,
        transferId: `TRF-${Date.now()}`,
        sku,
        quantity,
        fromWarehouseId,
        toWarehouseId
      };
    } catch (error) {
      this.loggerService.error('Error transferring stock', error);
      throw error;
    }
  }

  async getLowStockAlerts(tenantId: string) {
    try {
      const cacheKey = `low_stock_alerts:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached as string);

      const alerts = await this.databaseService.drizzleClient
        .select({
          sku: inventory.sku,
          warehouseId: inventory.warehouseId,
          currentStock: sql<number>`cast(${inventory.quantity} as numeric)`,
          available: sql<number>`cast(${inventory.availableQuantity} as numeric)`,
        })
        .from(inventory)
        .where(and(
          eq(inventory.tenantId, tenantId as any),
          sql`cast(${inventory.quantity} as numeric) <= 10`
        ))
        .orderBy(inventory.quantity);

      // Publish low stock alerts for real-time notifications
      for (const alert of alerts) {
        await this.publishInventoryChange({
          type: 'low_stock_alert',
          tenantId,
          sku: alert.sku,
          warehouseId: alert.warehouseId,
          currentStock: alert.currentStock,
          available: alert.available,
          timestamp: new Date()
        });
      }

      await this.cacheService.set(cacheKey, JSON.stringify(alerts), 300);
      return alerts;
    } catch (error) {
      this.loggerService.error('Error getting low stock alerts', error);
      throw error;
    }
  }

  async getInventoryStats(tenantId: string) {
    try {
      const cacheKey = `inventory_stats:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached as string);

      const stats = await this.databaseService.drizzleClient
        .select({
          totalItems: sql<number>`count(distinct ${inventory.sku})`,
          totalStock: sql<number>`sum(cast(${inventory.quantity} as numeric))`,
          totalValue: sql<number>`sum(cast(${inventory.quantity} as numeric) * cast(${inventory.unitCost} as numeric))`,
          lowStockItems: sql<number>`count(*) filter (where cast(${inventory.quantity} as numeric) <= 10)`,
          outOfStockItems: sql<number>`count(*) filter (where cast(${inventory.quantity} as numeric) = 0)`,
        })
        .from(inventory)
        .where(eq(inventory.tenantId, tenantId as any));

      const result = {
        totalItems: Number(stats[0]?.totalItems || 0),
        totalStock: Number(stats[0]?.totalStock || 0),
        totalValue: Number(stats[0]?.totalValue || 0),
        lowStockItems: Number(stats[0]?.lowStockItems || 0),
        outOfStockItems: Number(stats[0]?.outOfStockItems || 0),
      };

      await this.cacheService.set(cacheKey, JSON.stringify(result), 1800);
      return result;
    } catch (error) {
      this.loggerService.error('Error getting inventory stats', error);
      throw error;
    }
  }

  async bulkUpdateInventory(updates: any[], tenantId: string, userId: string) {
    try {
      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const result = await this.adjustInventory(update, tenantId, userId);
          results.push(result);
        } catch (error) {
          errors.push({
            sku: update.sku,
            warehouseId: update.warehouseId,
            error: error.message
          });
        }
      }

      // Clear all related caches
      await this.clearInventoryCache('*', tenantId);

      // Publish bulk update notification
      await this.publishInventoryChange({
        type: 'bulk_inventory_update',
        tenantId,
        updateCount: results.length,
        errorCount: errors.length,
        userId,
        timestamp: new Date()
      });

      this.loggerService.log(`Bulk inventory update completed: ${results.length} successful, ${errors.length} errors`, 'InventoryService');

      return {
        success: true,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      this.loggerService.error('Error in bulk inventory update', error);
      throw error;
    }
  }

  async bulkTransferStock(transfers: any[], tenantId: string, userId: string) {
    try {
      const results = [];
      const errors = [];

      for (const transfer of transfers) {
        try {
          const result = await this.transferStock(transfer, tenantId, userId);
          results.push(result);
        } catch (error) {
          errors.push({
            sku: transfer.sku,
            fromWarehouseId: transfer.fromWarehouseId,
            toWarehouseId: transfer.toWarehouseId,
            error: error.message
          });
        }
      }

      // Clear all related caches
      await this.clearInventoryCache('*', tenantId);

      // Publish bulk transfer notification
      await this.publishInventoryChange({
        type: 'bulk_stock_transfer',
        tenantId,
        transferCount: results.length,
        errorCount: errors.length,
        userId,
        timestamp: new Date()
      });

      this.loggerService.log(`Bulk stock transfer completed: ${results.length} successful, ${errors.length} errors`, 'InventoryService');

      return {
        success: true,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      this.loggerService.error('Error in bulk stock transfer', error);
      throw error;
    }
  }

  async subscribeToInventoryChanges(tenantId: string, callback: (data: any) => void) {
    const channel = `inventory_changes:${tenantId}`;
    await this.cacheService.subscribe(channel, callback);
    this.loggerService.log(`Subscribed to inventory changes for tenant: ${tenantId}`, 'InventoryService');
  }

  async unsubscribeFromInventoryChanges(tenantId: string) {
    const channel = `inventory_changes:${tenantId}`;
    await this.cacheService.unsubscribe(channel);
    this.loggerService.log(`Unsubscribed from inventory changes for tenant: ${tenantId}`, 'InventoryService');
  }

  // Helper methods
  private async clearInventoryCache(sku: string, tenantId: string) {
    if (sku === '*') {
      // Clear all inventory caches for tenant
      await this.cacheService.delPattern(`inventory:*:${tenantId}`);
      await this.cacheService.delPattern(`inventory_stats:${tenantId}`);
      await this.cacheService.delPattern(`low_stock_alerts:${tenantId}`);
    } else {
      // Clear specific inventory cache
      await this.cacheService.del(`inventory:${sku}:${tenantId}`);
      await this.cacheService.del(`inventory_stats:${tenantId}`);
      await this.cacheService.del(`low_stock_alerts:${tenantId}`);
    }
  }

  private async publishInventoryChange(data: any) {
    const channel = `inventory_changes:${data.tenantId}`;
    await this.cacheService.publish(channel, data);

    // Also add to Redis stream for persistent real-time sync
    await this.cacheService.addToStream('inventory_stream', data);

    // Send WebSocket notifications
    this.sendWebSocketNotifications(data);
  }

  private sendWebSocketNotifications(data: any) {
    const { type, tenantId, sku } = data;

    switch (type) {
      case 'inventory_adjusted':
        this.websocketGateway.broadcastInventoryChange(tenantId, data);
        if (sku) {
          this.websocketGateway.broadcastInventoryChangeToSku(tenantId, sku, data);
        }
        break;

      case 'stock_transfer':
        this.websocketGateway.broadcastInventoryChange(tenantId, data);
        if (sku) {
          this.websocketGateway.broadcastInventoryChangeToSku(tenantId, sku, data);
        }
        break;

      case 'bulk_inventory_update':
        this.websocketGateway.broadcastInventoryChange(tenantId, data);
        break;

      case 'bulk_stock_transfer':
        this.websocketGateway.broadcastInventoryChange(tenantId, data);
        break;

      case 'low_stock_alert':
        this.websocketGateway.broadcastLowStockAlert(tenantId, data);
        break;
    }
  }
}