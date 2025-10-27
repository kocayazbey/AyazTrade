import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueService } from '@/core/queue/queue.service';
import { PickingService } from '../../../modules/wms/services/picking.service';
import { PackingService } from '../../../modules/wms/services/packing.service';
import { DatabaseService } from '../../../core/database/database.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { orders, orderItems } from '../../../database/schema/orders.schema';

@Injectable()
export class OrderProcessingService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly queueService: QueueService,
    private readonly pickingService: PickingService,
    private readonly packingService: PackingService,
    private readonly databaseService: DatabaseService,
    private readonly loggerService: LoggerService,
  ) {}

  async processNewOrder(orderId: string): Promise<void> {
    // Add to processing queue
    await this.queueService.addJob('order-processing', JSON.stringify({
      orderId,
      step: 'validate',
    }), { delay: 0 });

    // Emit event
    this.eventEmitter.emit('order.processing.started', { orderId });
  }

  async validateOrder(orderId: string): Promise<boolean> {
    // Validate order data
    // Check stock availability
    // Validate payment method
    // Validate shipping address
    
    return true;
  }

  async processPayment(orderId: string): Promise<boolean> {
    // Process payment through payment gateway
    // Handle payment callbacks
    
    this.eventEmitter.emit('order.payment.processing', { orderId });
    
    return true;
  }

  async reserveInventory(orderId: string): Promise<void> {
    // Reserve stock for order items
    this.eventEmitter.emit('order.inventory.reserved', { orderId });
  }

  async fulfillOrder(orderId: string, tenantId: string = 'default'): Promise<void> {
    try {
      this.loggerService.log(`Starting order fulfillment: ${orderId}`, 'OrderProcessingService');

      // Get order details from database
      const order = await this.getOrderDetails(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Check if order can be fulfilled (inventory availability)
      await this.validateInventoryForFulfillment(order);

      // Create picking order in WMS
      const pickingOrder = await this.createWMSPickingOrder(order, tenantId);

      // Generate packing slip
      const packingSlip = await this.packingService.createPackingSlip(pickingOrder.id, tenantId, 'system');

      // Add to fulfillment queue
      await this.queueService.addJob('order-fulfillment', JSON.stringify({
        orderId,
        pickingOrderId: pickingOrder.id,
        packingSlipId: packingSlip.id
      }), { delay: 0 });

      this.loggerService.log(`Order fulfillment initiated: ${orderId} -> ${pickingOrder.pickingNumber}`, 'OrderProcessingService');

      // Emit fulfillment event to WMS
      this.eventEmitter.emit('order.fulfillment.started', { orderId, tenantId });

    } catch (error) {
      this.loggerService.error(`Error in order fulfillment: ${orderId}`, error, 'OrderProcessingService');
      this.eventEmitter.emit('order.fulfillment.failed', { orderId, error: error.message });
    }
  }

  async shipOrder(orderId: string, trackingNumber: string, tenantId: string = 'default'): Promise<void> {
    try {
      this.loggerService.log(`Processing shipment: ${orderId} with tracking ${trackingNumber}`, 'OrderProcessingService');

      // Get order details
      const order = await this.getOrderDetails(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Get picking order from WMS
      const pickingOrder = await this.getPickingOrderByOrderNumber(orderId);
      if (pickingOrder) {
        // Verify packing slip in WMS
        const packingSlip = await this.packingService.getPackingSlip(pickingOrder.packingSlipId);
        if (packingSlip && packingSlip.status !== 'verified') {
          await this.packingService.verifyPackingSlip(packingSlip.id, 'system');
        }

        // Update shipment with tracking number
        await this.updateShipmentTracking(pickingOrder.id, trackingNumber);
      }

      // Update order status
      await this.updateOrderStatus(orderId, 'shipped');

      // Send shipping notification
      await this.sendShippingNotification(orderId);

      this.loggerService.log(`Order shipped: ${orderId} with tracking ${trackingNumber}`, 'OrderProcessingService');

      this.eventEmitter.emit('order.shipped', { orderId, trackingNumber, tenantId });

    } catch (error) {
      this.loggerService.error(`Error shipping order: ${orderId}`, error, 'OrderProcessingService');
      this.eventEmitter.emit('order.shipping.failed', { orderId, error: error.message });
    }
  }

  async completeOrder(orderId: string): Promise<void> {
    // Mark order as delivered
    // Update inventory
    // Request review
    
    this.eventEmitter.emit('order.completed', { orderId });
  }

  async handleFailedPayment(orderId: string, reason: string): Promise<void> {
    // Release reserved inventory
    // Update order status
    // Notify customer
    
    this.eventEmitter.emit('order.payment.failed', { orderId, reason });
  }

  async handleCancellation(orderId: string, tenantId: string = 'default'): Promise<void> {
    try {
      this.loggerService.log(`Processing order cancellation: ${orderId}`, 'OrderProcessingService');

      // Get order details
      const order = await this.getOrderDetails(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Cancel picking order in WMS
      const pickingOrder = await this.getPickingOrderByOrderNumber(orderId);
      if (pickingOrder) {
        await this.cancelWMSPickingOrder(pickingOrder.id);
      }

      // Update order status
      await this.updateOrderStatus(orderId, 'cancelled');

      // Process refund if paid
      if (order.paymentStatus === 'paid') {
        await this.processRefund(orderId);
      }

      // Send cancellation notification
      await this.sendCancellationNotification(orderId);

      this.loggerService.log(`Order cancelled: ${orderId}`, 'OrderProcessingService');

      this.eventEmitter.emit('order.cancelled', { orderId, tenantId });

    } catch (error) {
      this.loggerService.error(`Error cancelling order: ${orderId}`, error, 'OrderProcessingService');
      this.eventEmitter.emit('order.cancellation.failed', { orderId, error: error.message });
    }
  }

  async sendOrderConfirmation(orderId: string): Promise<void> {
    await this.queueService.addJob('send-email', JSON.stringify({
      template: 'order-confirmation',
      orderId,
    }), { delay: 0 });
  }

  async sendShippingNotification(orderId: string): Promise<void> {
    await this.queueService.addJob('send-email', JSON.stringify({
      template: 'order-shipped',
      orderId,
    }), { delay: 0 });
  }

  async sendDeliveryConfirmation(orderId: string): Promise<void> {
    await this.queueService.addJob('send-email', JSON.stringify({
      template: 'order-delivered',
      orderId,
    }), { delay: 0 });
  }

  // Private helper methods for WMS integration
  private async getOrderDetails(orderId: string): Promise<any> {
    try {
      // Get order from database
      const order = await this.databaseService.drizzleClient
        .select()
        .from(orders)
        .where(orders.id.eq(orderId))
        .limit(1);

      if (order.length === 0) return null;

      // Get order items
      const orderItemList = await this.databaseService.drizzleClient
        .select()
        .from(orderItems)
        .where(orderItems.orderId.eq(orderId));

      return {
        ...order[0],
        items: orderItemList
      };
    } catch (error) {
      this.loggerService.error(`Error getting order details: ${orderId}`, error, 'OrderProcessingService');
      return null;
    }
  }

  private async validateInventoryForFulfillment(order: any): Promise<void> {
    // Check inventory availability for each order item
    for (const item of order.items) {
      // This would check WMS inventory availability
      // For now, assume inventory is available
      this.loggerService.log(`Validating inventory for item: ${item.productId} - Quantity: ${item.quantity}`, 'OrderProcessingService');
    }
  }

  private async createWMSPickingOrder(order: any, tenantId: string): Promise<any> {
    try {
      // Find default warehouse (simplified - would come from order or configuration)
      const warehouseId = await this.getDefaultWarehouseId();

      // Create picking order in WMS
      const pickingData = {
        warehouseId,
        orderNumber: order.orderNumber || order.id,
        pickingStrategy: 'wave', // Could be configurable
        pickingType: 'sales',
        priority: order.priority || 'normal',
        items: order.items.map((item: any) => ({
          productId: item.productId,
          requestedQuantity: item.quantity,
          sku: item.sku
        })),
        metadata: {
          orderId: order.id,
          customerId: order.userId,
          shippingAddress: order.shippingAddress
        }
      };

      const pickingOrder = await this.pickingService.createPickingOrder(pickingData, tenantId, 'system');

      // Update order with picking order reference (if needed)
      await this.updateOrderWithPickingReference(order.id, pickingOrder.id);

      this.loggerService.log(`WMS picking order created: ${pickingOrder.pickingNumber} for order ${order.id}`, 'OrderProcessingService');

      return pickingOrder;
    } catch (error) {
      this.loggerService.error(`Error creating WMS picking order for ${order.id}`, error, 'OrderProcessingService');
      throw error;
    }
  }

  private async getPickingOrderByOrderNumber(orderId: string): Promise<any> {
    // This would query WMS picking orders by order number
    // For now, return mock data structure
    try {
      // In real implementation, this would query the WMS picking orders table
      // const pickingOrders = await this.databaseService.drizzleClient
      //   .select()
      //   .from(pickingOrders)
      //   .where(pickingOrders.orderNumber.eq(orderId))
      //   .limit(1);

      // For now, return a mock structure
      return {
        id: `picking-${orderId}`,
        pickingNumber: `PICK-${Date.now()}`,
        orderNumber: orderId,
        status: 'completed',
        packingSlipId: `pack-${orderId}`
      };
    } catch (error) {
      this.loggerService.error(`Error getting picking order for ${orderId}`, error, 'OrderProcessingService');
      return null;
    }
  }

  private async cancelWMSPickingOrder(pickingOrderId: string): Promise<void> {
    try {
      // Cancel picking order in WMS
      // This would update the picking order status to cancelled
      this.loggerService.log(`WMS picking order cancelled: ${pickingOrderId}`, 'OrderProcessingService');

      // In real implementation:
      // await this.databaseService.drizzleClient
      //   .update(pickingOrders)
      //   .set({ status: 'cancelled', updatedAt: new Date() })
      //   .where(pickingOrders.id.eq(pickingOrderId));
    } catch (error) {
      this.loggerService.error(`Error cancelling picking order: ${pickingOrderId}`, error, 'OrderProcessingService');
    }
  }

  private async updateShipmentTracking(pickingOrderId: string, trackingNumber: string): Promise<void> {
    try {
      // Update shipment with tracking number in WMS
      this.loggerService.log(`WMS shipment tracking updated: ${pickingOrderId} - ${trackingNumber}`, 'OrderProcessingService');

      // In real implementation:
      // await this.databaseService.drizzleClient
      //   .update(shipments)
      //   .set({
      //     trackingNumber,
      //     status: 'shipped',
      //     shippedAt: new Date()
      //   })
      //   .where(shipments.pickingOrderId.eq(pickingOrderId));
    } catch (error) {
      this.loggerService.error(`Error updating shipment tracking: ${pickingOrderId}`, error, 'OrderProcessingService');
    }
  }

  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      await this.databaseService.drizzleClient
        .update(orders)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(orders.id.eq(orderId));

      this.loggerService.log(`Order status updated: ${orderId} -> ${status}`, 'OrderProcessingService');
    } catch (error) {
      this.loggerService.error(`Error updating order status: ${orderId}`, error, 'OrderProcessingService');
    }
  }

  private async updateOrderWithPickingReference(orderId: string, pickingOrderId: string): Promise<void> {
    try {
      // Update order with WMS picking order reference
      await this.databaseService.drizzleClient
        .update(orders)
        .set({
          metadata: sql`jsonb_set(COALESCE(metadata, '{}'), '{wms_picking_order_id}', ${pickingOrderId})`,
          updatedAt: new Date()
        })
        .where(orders.id.eq(orderId));
    } catch (error) {
      this.loggerService.error(`Error updating order with picking reference: ${orderId}`, error, 'OrderProcessingService');
    }
  }

  private async getDefaultWarehouseId(): Promise<string> {
    try {
      // Get default warehouse (simplified - would come from configuration)
      // In real implementation, this could be based on shipping address, inventory availability, etc.

      // For now, return a default warehouse ID
      return 'default-warehouse-id';
    } catch (error) {
      this.loggerService.error('Error getting default warehouse', error, 'OrderProcessingService');
      throw error;
    }
  }

  private async processRefund(orderId: string): Promise<void> {
    try {
      // Process refund through payment gateway
      this.loggerService.log(`Processing refund for order: ${orderId}`, 'OrderProcessingService');

      // In real implementation, this would integrate with payment service
      // await this.paymentService.processRefund(orderId);
    } catch (error) {
      this.loggerService.error(`Error processing refund: ${orderId}`, error, 'OrderProcessingService');
    }
  }

  private async sendCancellationNotification(orderId: string): Promise<void> {
    try {
      await this.queueService.addJob('send-email', JSON.stringify({
        template: 'order-cancelled',
        orderId,
      }), { delay: 0 });

      this.loggerService.log(`Cancellation notification queued: ${orderId}`, 'OrderProcessingService');
    } catch (error) {
      this.loggerService.error(`Error sending cancellation notification: ${orderId}`, error, 'OrderProcessingService');
    }
  }
}

