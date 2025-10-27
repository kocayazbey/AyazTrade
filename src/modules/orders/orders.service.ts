import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, desc, gte, lte, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { orders, orderItems } from '../../database/schema/orders.schema';
import { customers } from '../../database/schema/customers.schema';
import { ShippingService } from './services/shipping.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly shippingService: ShippingService,
  ) {}

  async getOrders(query: any, userId: string, userRole: string) {
    try {
      const page = parseInt(query.page) || 1;
      const limit = Math.min(parseInt(query.limit) || 20, 100);
      const offset = (page - 1) * limit;
      
      const conditions = [];
      
      // Filter by user role
      if (userRole !== 'admin') {
        conditions.push(eq(orders.userId, userId));
    }

    // Apply filters
    if (query.status) {
        conditions.push(eq(orders.status, query.status as any));
    }

    if (query.paymentStatus) {
        conditions.push(eq(orders.paymentStatus, query.paymentStatus as any));
      }
      
      if (query.dateFrom) {
        conditions.push(gte(orders.orderDate, new Date(query.dateFrom)));
      }
      
      if (query.dateTo) {
        conditions.push(lte(orders.orderDate, new Date(query.dateTo)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await this.databaseService.drizzleClient
        .select({
          id: orders.id,
          userId: orders.userId,
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          subtotal: orders.subtotal,
          tax: orders.tax,
          shipping: orders.shipping,
          discount: orders.discount,
          totalAmount: orders.totalAmount,
          paymentMethod: orders.paymentMethod,
          paymentId: orders.paymentId,
          couponCode: orders.couponCode,
          couponDiscount: orders.couponDiscount,
          shippingAddress: orders.shippingAddress,
          billingAddress: orders.billingAddress,
          shippingMethod: orders.shippingMethod,
          trackingNumber: orders.trackingNumber,
          estimatedDelivery: orders.estimatedDelivery,
          notes: orders.notes,
          internalNotes: orders.internalNotes,
          orderDate: orders.orderDate,
          shippedAt: orders.shippedAt,
          deliveredAt: orders.deliveredAt,
          cancelledAt: orders.cancelledAt,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .where(whereClause)
        .orderBy(desc(orders.orderDate))
        .limit(limit)
        .offset(offset);

      // Get all order IDs
      const orderIds = results.map((o: any) => o.id);
      
      // Batch fetch order items
      const allOrderItems = orderIds.length > 0 ? await this.databaseService.drizzleClient
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          variantId: orderItems.variantId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          compareAtPrice: orderItems.compareAtPrice,
          productName: orderItems.productName,
          productSku: orderItems.productSku,
          productImage: orderItems.productImage,
          options: orderItems.options,
          attributes: orderItems.attributes,
          subtotal: orderItems.subtotal,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds)) : [];

      // Group items by orderId
      const itemsByOrderId = allOrderItems.reduce((acc: any, item: any) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      }, {});

      // Batch fetch customers
      const userIds = [...new Set(results.map((o: any) => o.userId))] as string[];
      const allCustomers = userIds.length > 0 ? await this.databaseService.drizzleClient
        .select({
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phone: customers.phone,
        })
        .from(customers)
        .where(inArray(customers.id, userIds)) : [];

      // Map customers by ID
      const customersById = allCustomers.reduce((acc: any, cust: any) => {
        acc[cust.id] = cust;
        return acc;
      }, {});

      // Combine results
      const ordersWithItems = results.map((order: any) => ({
        ...order,
        customer: customersById[order.userId] || null,
        items: itemsByOrderId[order.id] || [],
      }));

      const totalResults = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(whereClause);

    return {
        data: ordersWithItems,
        total: Number(totalResults[0].count),
      page,
        limit,
        totalPages: Math.ceil(Number(totalResults[0].count) / limit),
        hasNext: offset + limit < Number(totalResults[0].count),
      hasPrev: page > 1
    };
    } catch (error) {
      console.error('Error getting orders:', error);
      throw error;
    }
  }

  async getOrderStats(userId: string, userRole: string) {
    try {
      const conditions = [];
      
      if (userRole !== 'admin') {
        conditions.push(eq(orders.userId, userId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const stats = await this.databaseService.drizzleClient
        .select({
          totalOrders: sql<number>`count(*)`,
          totalRevenue: sql<number>`sum(${orders.totalAmount})`,
          pendingOrders: sql<number>`count(*) filter (where ${orders.status} = 'pending')`,
          processingOrders: sql<number>`count(*) filter (where ${orders.status} = 'processing')`,
          shippedOrders: sql<number>`count(*) filter (where ${orders.status} = 'shipped')`,
          deliveredOrders: sql<number>`count(*) filter (where ${orders.status} = 'delivered')`,
          cancelledOrders: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')`,
          averageOrderValue: sql<number>`avg(${orders.totalAmount})`,
        })
        .from(orders)
        .where(whereClause);

      const result = stats[0];
      return {
        totalOrders: Number(result?.totalOrders || 0),
        totalRevenue: Number(result?.totalRevenue || 0),
        pendingOrders: Number(result?.pendingOrders || 0),
        processingOrders: Number(result?.processingOrders || 0),
        shippedOrders: Number(result?.shippedOrders || 0),
        deliveredOrders: Number(result?.deliveredOrders || 0),
        cancelledOrders: Number(result?.cancelledOrders || 0),
        averageOrderValue: Number(result?.averageOrderValue || 0)
      };
    } catch (error) {
      console.error('Error getting order stats:', error);
      throw error;
    }
  }

  async getOrderById(orderId: string, userId: string, userRole: string) {
    try {
      const conditions = [eq(orders.id, orderId)];
      
      if (userRole !== 'admin') {
        conditions.push(eq(orders.userId, userId));
      }

      const order = await this.databaseService.drizzleClient
        .select()
        .from(orders)
        .where(and(...conditions))
        .limit(1);

      if (!order.length) {
        throw new NotFoundException('Order not found');
      }

      // Get order items
      const orderItemsData = await this.databaseService.drizzleClient
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      // Get customer info
      const customer = await this.databaseService.drizzleClient
        .select()
        .from(customers)
        .where(eq(customers.id, order[0].userId))
        .limit(1);

      return {
        ...order[0],
        customer: customer[0] || null,
        items: orderItemsData,
      };
    } catch (error) {
      console.error('Error getting order by ID:', error);
      throw error;
    }
  }

  async createOrder(data: any, userId: string) {
    try {
      return await this.databaseService.transaction(async (tx) => {
        const orderNumber = `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        
        const [order] = await tx
          .insert(orders)
          .values({
            userId,
            orderNumber,
            status: 'pending',
            paymentStatus: 'pending',
            subtotal: data.subtotal,
            tax: data.tax || 0,
            shipping: data.shipping || 0,
            discount: data.discount || 0,
            totalAmount: data.totalAmount,
            paymentMethod: data.paymentMethod,
            couponCode: data.couponCode,
            couponDiscount: data.couponDiscount || 0,
            shippingAddress: data.shippingAddress,
            billingAddress: data.billingAddress,
            shippingMethod: data.shippingMethod,
            notes: data.notes,
            orderDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Create order items
        if (data.items && data.items.length > 0) {
          await tx
            .insert(orderItems)
            .values(
              data.items.map((item: any) => ({
                orderId: order.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price,
                compareAtPrice: item.compareAtPrice,
                productName: item.productName,
                productSku: item.productSku,
                productImage: item.productImage,
                options: item.options || {},
                attributes: item.attributes || {},
                subtotal: item.subtotal,
                createdAt: new Date(),
                updatedAt: new Date(),
              }))
            );
        }

        return order;
      });
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrder(orderId: string, data: any) {
    try {
      const [updatedOrder] = await this.databaseService.drizzleClient
        .update(orders)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (!updatedOrder) {
        throw new NotFoundException('Order not found');
      }

      return updatedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (status === 'shipped') {
        updateData.shippedAt = new Date();
      } else if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      const [updatedOrder] = await this.databaseService.drizzleClient
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId))
        .returning();

      if (!updatedOrder) {
        throw new NotFoundException('Order not found');
      }

      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }


  async cancelOrder(orderId: string, userId: string, cancellationReason?: string) {
    try {
      return await this.databaseService.transaction(async (tx) => {
        // Get current order
        const [currentOrder] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

        if (!currentOrder) {
          throw new NotFoundException('Order not found');
        }

        // Check if user can cancel this order
        if (currentOrder.userId !== userId && !['admin', 'manager'].includes(userId)) {
          throw new Error('Unauthorized to cancel this order');
        }

        // Business rules for cancellation
        const canCancel = await this.canCancelOrder(currentOrder);
        if (!canCancel.allowed) {
          throw new Error(`Cannot cancel order: ${canCancel.reason}`);
        }

        // Update order status
        const [updatedOrder] = await tx
          .update(orders)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            internalNotes: `Cancelled by user ${userId}. Reason: ${cancellationReason || 'Not provided'}`,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId))
          .returning();

        // Restore inventory if order was paid
        if (currentOrder.paymentStatus === 'paid') {
          await this.restoreInventoryForCancelledOrder(tx, orderId);
        }

        // Cancel shipment if exists
        if (currentOrder.trackingNumber) {
          await this.cancelShipmentIfPossible(tx, currentOrder);
        }

        // Create cancellation record
        await tx
          .insert(orders)
          .values({
            id: `CANCEL-${Date.now()}`,
            userId: currentOrder.userId,
            orderNumber: `CANCEL-${currentOrder.orderNumber}`,
            status: 'cancelled',
            paymentStatus: 'cancelled',
            subtotal: 0,
            tax: 0,
            shipping: 0,
            discount: 0,
            totalAmount: currentOrder.totalAmount,
            paymentMethod: currentOrder.paymentMethod,
            internalNotes: `Order cancellation refund. Original order: ${currentOrder.orderNumber}`,
            orderDate: new Date(),
            cancelledAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        return {
          success: true,
          orderId,
          orderNumber: updatedOrder.orderNumber,
          cancelledAt: updatedOrder.cancelledAt,
          reason: cancellationReason,
        };
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  async processPartialRefund(orderId: string, refundData: any, userId: string) {
    try {
      return await this.databaseService.transaction(async (tx) => {
        // Get current order
        const [currentOrder] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

        if (!currentOrder) {
          throw new NotFoundException('Order not found');
        }

        // Check if user can process refund
        if (!['admin', 'manager', 'customer_service'].includes(userId)) {
          throw new Error('Unauthorized to process refunds');
        }

        // Validate refund amount
        if (refundData.amount <= 0 || refundData.amount > currentOrder.totalAmount) {
          throw new Error('Invalid refund amount');
        }

        // Check if partial refund is allowed
        if (currentOrder.paymentStatus !== 'paid') {
          throw new Error('Cannot process refund for unpaid order');
        }

        // Calculate new amounts
        const refundAmount = refundData.amount;
        const remainingAmount = currentOrder.totalAmount - refundAmount;
        const newPaymentStatus = remainingAmount <= 0 ? 'refunded' : 'partially_refunded';

        // Update order
        const [updatedOrder] = await tx
          .update(orders)
          .set({
            paymentStatus: newPaymentStatus,
            internalNotes: `${currentOrder.internalNotes}\nPartial refund: â‚º${refundAmount} on ${new Date().toISOString()}. Reason: ${refundData.reason}`,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId))
          .returning();

        // Create refund record
        const refundRecord = {
          id: `REFUND-${Date.now()}`,
          orderId,
          userId,
          amount: refundAmount,
          reason: refundData.reason,
          items: refundData.items || [], // Specific items being refunded
          status: 'processed',
          processedAt: new Date(),
          createdAt: new Date(),
        };

        return {
          success: true,
          refundId: refundRecord.id,
          orderId,
          orderNumber: updatedOrder.orderNumber,
          refundAmount,
          remainingAmount,
          newPaymentStatus,
          reason: refundData.reason,
        };
      });
    } catch (error) {
      console.error('Error processing partial refund:', error);
      throw error;
    }
  }

  // Helper methods for cancellation flow
  private async canCancelOrder(order: any): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();
    const orderDate = new Date(order.orderDate);
    const hoursSinceOrder = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);

    // Business rules for cancellation
    if (order.status === 'delivered') {
      return { allowed: false, reason: 'Cannot cancel delivered order' };
    }

    if (order.status === 'shipped' && hoursSinceOrder > 24) {
      return { allowed: false, reason: 'Cannot cancel order shipped more than 24 hours ago' };
    }

    if (order.paymentStatus === 'refunded') {
      return { allowed: false, reason: 'Cannot cancel already refunded order' };
    }

    // Check if within cancellation window (default 48 hours)
    if (hoursSinceOrder > 48) {
      return { allowed: false, reason: 'Order is outside cancellation window' };
    }

    return { allowed: true };
  }

  private async restoreInventoryForCancelledOrder(tx: any, orderId: string) {
    try {
      // Get order items
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      // Restore inventory for each item
      for (const item of items) {
        // This would integrate with inventory service
        // For now, just log the restoration
        console.log(`Restoring inventory for item: ${item.productSku}, quantity: ${item.quantity}`);
      }
    } catch (error) {
      console.error('Error restoring inventory for cancelled order:', error);
    }
  }

  private async cancelShipmentIfPossible(tx: any, order: any) {
    try {
      if (order.trackingNumber && order.shippingMethod) {
        // This would integrate with shipping service
        // For now, just update order status
        console.log(`Cancelling shipment: ${order.trackingNumber} for order: ${order.orderNumber}`);
      }
    } catch (error) {
      console.error('Error cancelling shipment:', error);
    }
  }

  async processPayment(orderId: string, paymentData: any, userId: string) {
    // TODO: Implement payment processing
    return { success: true, message: 'Payment processed', orderId };
  }

  async getOrderTracking(orderId: string, userId: string) {
    // TODO: Implement order tracking
    return { orderId, status: 'shipped', trackingNumber: null };
  }

  async requestRefund(orderId: string, refundData: any, userId: string) {
    // TODO: Implement refund request
    return { success: true, message: 'Refund requested', orderId };
  }
}
