import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PickingService } from './picking.service';
import { WmsService } from './wms.service';
import { DatabaseService } from '../../../core/database/database.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { CacheService } from '../../../core/cache/cache.service';

// Import schemas
import { orders, orderItems } from '../../../database/schema/orders.schema';

@Injectable()
export class WMSIntegrationService {
  constructor(
    private readonly pickingService: PickingService,
    private readonly databaseService: DatabaseService,
    private readonly loggerService: LoggerService,
    private readonly cacheService: CacheService,
  ) {}

  async handleInventoryReserved(data: { orderId: string; tenantId?: string }) {
    try {
      this.loggerService.log(`WMS: Processing inventory reservation for order ${data.orderId}`, 'WMSIntegrationService');

      // Get order details from database
      const order = await this.getOrderDetails(data.orderId);
      if (!order) {
        this.loggerService.error(`Order not found: ${data.orderId}`, 'WMSIntegrationService');
        return;
      }

      // Create picking order in WMS
      const pickingOrder = await this.createPickingOrderFromOrder(order);

      // Reserve inventory in WMS
      await this.reserveInventoryForOrder(order, pickingOrder.id);

      this.loggerService.log(`WMS: Inventory reserved successfully for order ${data.orderId}`, 'WMSIntegrationService');

      // Emit success event back to AyazCommerce
      this.eventEmitter.emit('wms.inventory.reserved', {
        orderId: data.orderId,
        pickingOrderId: pickingOrder.id,
        status: 'success'
      });

    } catch (error) {
      this.loggerService.error(`WMS: Error reserving inventory for order ${data.orderId}`, error, 'WMSIntegrationService');

      // Emit error event back to AyazCommerce
      this.eventEmitter.emit('wms.inventory.reservation.failed', {
        orderId: data.orderId,
        error: error.message,
        status: 'failed'
      });
    }
  }

  @OnEvent('order.fulfillment.started')
  async handleFulfillmentStarted(data: { orderId: string; tenantId?: string }) {
    try {
      this.loggerService.log(`WMS: Processing fulfillment for order ${data.orderId}`, 'WMSIntegrationService');

      // Get picking order from WMS
      const pickingOrder = await this.getPickingOrderByOrderId(data.orderId);
      if (!pickingOrder) {
        this.loggerService.error(`Picking order not found for order: ${data.orderId}`, 'WMSIntegrationService');
        return;
      }

      // Start picking process
      await this.pickingService.startPicking(pickingOrder.id, 'default', 'system');

      // Generate packing slip
      const packingSlip = await this.generatePackingSlip(pickingOrder.id);

      // Create shipment
      const shipment = await this.createShipment(pickingOrder.id, packingSlip);

      this.loggerService.log(`WMS: Fulfillment started successfully for order ${data.orderId}`, 'WMSIntegrationService');

      // Emit fulfillment progress
      this.eventEmitter.emit('wms.fulfillment.progress', {
        orderId: data.orderId,
        pickingOrderId: pickingOrder.id,
        shipmentId: shipment.id,
        status: 'picking_started',
        packingSlip
      });

    } catch (error) {
      this.loggerService.error(`WMS: Error starting fulfillment for order ${data.orderId}`, error, 'WMSIntegrationService');

      this.eventEmitter.emit('wms.fulfillment.failed', {
        orderId: data.orderId,
        error: error.message,
        status: 'failed'
      });
    }
  }

  @OnEvent('order.shipped')
  async handleOrderShipped(data: { orderId: string; trackingNumber: string; tenantId?: string }) {
    try {
      this.loggerService.log(`WMS: Processing shipment for order ${data.orderId}`, 'WMSIntegrationService');

      // Update shipment with tracking number
      const pickingOrder = await this.getPickingOrderByOrderId(data.orderId);
      if (pickingOrder) {
        await this.updateShipmentTracking(pickingOrder.id, data.trackingNumber);
      }

      this.loggerService.log(`WMS: Shipment updated for order ${data.orderId}`, 'WMSIntegrationService');

      this.eventEmitter.emit('wms.shipment.updated', {
        orderId: data.orderId,
        trackingNumber: data.trackingNumber,
        status: 'shipped'
      });

    } catch (error) {
      this.loggerService.error(`WMS: Error updating shipment for order ${data.orderId}`, error, 'WMSIntegrationService');
    }
  }

  @OnEvent('order.cancelled')
  async handleOrderCancelled(data: { orderId: string; tenantId?: string }) {
    try {
      this.loggerService.log(`WMS: Processing cancellation for order ${data.orderId}`, 'WMSIntegrationService');

      // Cancel picking order and release reserved inventory
      const pickingOrder = await this.getPickingOrderByOrderId(data.orderId);
      if (pickingOrder) {
        await this.cancelPickingOrder(pickingOrder.id);
        await this.releaseReservedInventory(pickingOrder.id);
      }

      this.loggerService.log(`WMS: Order cancelled successfully for order ${data.orderId}`, 'WMSIntegrationService');

      this.eventEmitter.emit('wms.order.cancelled', {
        orderId: data.orderId,
        status: 'cancelled'
      });

    } catch (error) {
      this.loggerService.error(`WMS: Error cancelling order ${data.orderId}`, error, 'WMSIntegrationService');
    }
  }

  @OnEvent('inventory.increased')
  async handleInventoryIncreased(data: { productId: string; quantity: number; locationId?: string; tenantId?: string }) {
    try {
      this.loggerService.log(`WMS: Processing inventory increase for product ${data.productId}`, 'WMSIntegrationService');

      // Update WMS inventory
      await this.updateWMSInventory(data.productId, data.quantity, 'increase', data.locationId);

      this.loggerService.log(`WMS: Inventory updated successfully for product ${data.productId}`, 'WMSIntegrationService');

    } catch (error) {
      this.loggerService.error(`WMS: Error updating inventory for product ${data.productId}`, error, 'WMSIntegrationService');
    }
  }

  @OnEvent('inventory.decreased')
  async handleInventoryDecreased(data: { productId: string; quantity: number; locationId?: string; tenantId?: string }) {
    try {
      this.loggerService.log(`WMS: Processing inventory decrease for product ${data.productId}`, 'WMSIntegrationService');

      // Update WMS inventory
      await this.updateWMSInventory(data.productId, data.quantity, 'decrease', data.locationId);

      this.loggerService.log(`WMS: Inventory updated successfully for product ${data.productId}`, 'WMSIntegrationService');

    } catch (error) {
      this.loggerService.error(`WMS: Error updating inventory for product ${data.productId}`, error, 'WMSIntegrationService');
    }
  }

  @OnEvent('inventory.adjusted')
  async handleInventoryAdjusted(data: { productId: string; quantityChange: number; locationId?: string; reason: string; tenantId?: string }) {
    try {
      this.loggerService.log(`WMS: Processing inventory adjustment for product ${data.productId}`, 'WMSIntegrationService');

      // Update WMS inventory with adjustment
      await this.adjustWMSInventory(data.productId, data.quantityChange, data.reason, data.locationId);

      this.loggerService.log(`WMS: Inventory adjusted successfully for product ${data.productId}`, 'WMSIntegrationService');

    } catch (error) {
      this.loggerService.error(`WMS: Error adjusting inventory for product ${data.productId}`, error, 'WMSIntegrationService');
    }
  }

  // Helper methods
  private async getOrderDetails(orderId: string): Promise<any> {
    // Get order from orders table
    const order = await this.databaseService.drizzleClient
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) return null;

    // Get order items
    const orderItemList = await this.databaseService.drizzleClient
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    return {
      ...order[0],
      items: orderItemList
    };
  }

  private async createPickingOrderFromOrder(order: any): Promise<any> {
    // Find main warehouse (default warehouse for now)
    const warehouses = await this.databaseService.drizzleClient
      .select()
      .from(warehouses)
      .where(eq(warehouses.status, 'active'))
      .limit(1);

    if (warehouses.length === 0) {
      throw new Error('No active warehouse found');
    }

    const warehouse = warehouses[0];

    // Create picking order in WMS
    const pickingData = {
      warehouseId: warehouse.id,
      orderNumber: order.orderNumber || order.id,
      priority: order.priority || 'medium',
      status: 'pending',
      items: order.items.map((item: any) => ({
        productId: item.productId,
        requestedQuantity: item.quantity,
        sku: item.sku
      }))
    };

    return await this.pickingService.createPickingOrder(pickingData, 'default', 'system');
  }

  private async reserveInventoryForOrder(order: any): Promise<void> {
    // Reserve inventory for each order item
    for (const item of order.items) {
      await this.wmsService.updateInventory(
        item.productId,
        order.warehouseId || 'default-warehouse',
        item.locationId || 'default-location',
        {
          quantityChange: -item.quantity,
          reason: 'order_reservation',
          notes: `Reserved for order ${order.id}`
        },
        'system',
        order.tenantId || 'default'
      );
    }
  }

  private async getPickingOrderByOrderId(orderId: string): Promise<any> {
    // This would need a proper relationship between orders and picking orders
    // For now, we'll use a simple lookup
    const pickingOrderList = await this.databaseService.drizzleClient
      .select()
      .from(pickingOrders)
      .where(eq(pickingOrders.orderNumber, orderId))
      .limit(1);

    return pickingOrderList.length > 0 ? pickingOrderList[0] : null;
  }

  private async cancelPickingOrder(pickingOrderId: string): Promise<void> {
    // Cancel picking order and update status
    await this.databaseService.drizzleClient
      .update(pickingOrders)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(pickingOrders.id, pickingOrderId));
  }

  private async releaseReservedInventory(pickingOrderId: string): Promise<void> {
    // Get picking items and release reserved inventory
    const pickingItemList = await this.databaseService.drizzleClient
      .select()
      .from(pickingItems)
      .where(eq(pickingItems.pickingOrderId, pickingOrderId));

    for (const item of pickingItemList) {
      await this.wmsService.updateInventory(
        item.productId,
        item.warehouseId,
        item.locationId,
        {
          quantityChange: item.quantity,
          reason: 'order_cancellation',
          notes: `Released from cancelled order`
        },
        'system',
        'default'
      );
    }
  }

  private async updateWMSInventory(productId: string, quantity: number, operation: 'increase' | 'decrease'): Promise<void> {
    // Find inventory record
    const inventoryRecords = await this.databaseService.drizzleClient
      .select()
      .from(this.databaseService.inventory)
      .where(eq(this.databaseService.inventory.productId, productId))
      .limit(1);

    if (inventoryRecords.length > 0) {
      const record = inventoryRecords[0];
      const quantityChange = operation === 'increase' ? quantity : -quantity;

      await this.wmsService.updateInventory(
        productId,
        record.warehouseId,
        record.locationId,
        {
          quantityChange,
          reason: `inventory_${operation}`,
          notes: `${operation} from external system`
        },
        'system',
        'default'
      );
    }
  }

  private async adjustWMSInventory(productId: string, quantityChange: number, reason: string): Promise<void> {
    // Find inventory record
    const inventoryRecords = await this.databaseService.drizzleClient
      .select()
      .from(this.databaseService.inventory)
      .where(eq(this.databaseService.inventory.productId, productId))
      .limit(1);

    if (inventoryRecords.length > 0) {
      const record = inventoryRecords[0];

      await this.wmsService.updateInventory(
        productId,
        record.warehouseId,
        record.locationId,
        {
          quantityChange,
          reason,
          notes: `Adjustment from external system`
        },
        'system',
        'default'
      );
    }
  }

  private async generatePackingSlip(pickingOrderId: string): Promise<any> {
    // Generate packing slip for picking order
    return {
      pickingOrderId,
      generatedAt: new Date(),
      packingNumber: `PACK-${Date.now()}`,
      status: 'generated'
    };
  }

  private async createShipment(pickingOrderId: string, packingSlip: any): Promise<any> {
    // Create shipment record
    return {
      pickingOrderId,
      packingSlipId: packingSlip.packingNumber,
      shipmentNumber: `SHIP-${Date.now()}`,
      status: 'created',
      createdAt: new Date()
    };
  }

  private async updateShipmentTracking(pickingOrderId: string, trackingNumber: string): Promise<void> {
    // Update shipment with tracking number
    await this.databaseService.drizzleClient
      .update(shipments)
      .set({
        trackingNumber,
        status: 'shipped',
        shippedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(shipments.pickingOrderId, pickingOrderId));
  }

  private async startPicking(): Promise<void> {
    // Update picking order status to started
    await this.databaseService.drizzleClient
      .update(pickingOrders)
      .set({
        status: 'picking',
        startedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(pickingOrders.id, pickingOrderId));
  }
}
