import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { sql, eq, and, or, gte, lte, desc, asc } from 'drizzle-orm';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  fulfillmentStatus: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
  tags: string[];
  trackingNumber?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  metadata: Record<string, any>;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  weight?: number;
  dimensions?: any;
  attributes: Record<string, string>;
  fulfillmentStatus: 'unfulfilled' | 'fulfilled' | 'partially_fulfilled' | 'cancelled';
  fulfillmentLocation?: string;
  notes?: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export interface OrderFulfillmentRequest {
  orderId: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
    locationId: string;
    notes?: string;
  }>;
  trackingNumber?: string;
  shippingMethod: string;
  notes?: string;
}

export interface OrderUpdateRequest {
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  priority?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface OrderSearchFilters {
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  customerId?: string;
  dateRange?: { start: Date; end: Date };
  totalRange?: { min: number; max: number };
  search?: string;
  tags?: string[];
  priority?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class FrontendOrdersManagementService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getOrders(filters: OrderSearchFilters, tenantId: string): Promise<{
    data: Order[];
    total: number;
    page: number;
    totalPages: number;
    summary: {
      totalOrders: number;
      totalRevenue: number;
      pendingOrders: number;
      processingOrders: number;
      shippedOrders: number;
      deliveredOrders: number;
      cancelledOrders: number;
    };
  }> {
    const cacheKey = `frontend_orders:${tenantId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = this.getOrdersTable().tenantId.eq(tenantId);

    // Apply filters
    if (filters.status) {
      whereClause = and(whereClause, this.getOrdersTable().status.eq(filters.status));
    }

    if (filters.paymentStatus) {
      whereClause = and(whereClause, this.getOrdersTable().paymentStatus.eq(filters.paymentStatus));
    }

    if (filters.fulfillmentStatus) {
      whereClause = and(whereClause, this.getOrdersTable().fulfillmentStatus.eq(filters.fulfillmentStatus));
    }

    if (filters.customerId) {
      whereClause = and(whereClause, this.getOrdersTable().customerId.eq(filters.customerId));
    }

    if (filters.dateRange) {
      whereClause = and(
        whereClause,
        this.getOrdersTable().createdAt.gte(filters.dateRange.start),
        this.getOrdersTable().createdAt.lte(filters.dateRange.end)
      );
    }

    if (filters.totalRange) {
      whereClause = and(
        whereClause,
        this.getOrdersTable().total.gte(filters.totalRange.min),
        this.getOrdersTable().total.lte(filters.totalRange.max)
      );
    }

    if (filters.search) {
      whereClause = and(whereClause,
        or(
          this.getOrdersTable().orderNumber.like(`%${filters.search}%`),
          this.getOrdersTable().customerName.like(`%${filters.search}%`),
          this.getOrdersTable().customerEmail.like(`%${filters.search}%`)
        )
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClause = and(whereClause,
        this.getOrdersTable().tags.overlapsWith(filters.tags)
      );
    }

    if (filters.priority) {
      whereClause = and(whereClause, this.getOrdersTable().priority.eq(filters.priority));
    }

    // Sorting
    let orderByClause = desc(this.getOrdersTable().createdAt);
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'createdAt':
          orderByClause = filters.sortOrder === 'asc' ? asc(this.getOrdersTable().createdAt) : desc(this.getOrdersTable().createdAt);
          break;
        case 'total':
          orderByClause = filters.sortOrder === 'asc' ? asc(this.getOrdersTable().total) : desc(this.getOrdersTable().total);
          break;
        case 'status':
          orderByClause = filters.sortOrder === 'asc' ? asc(this.getOrdersTable().status) : desc(this.getOrdersTable().status);
          break;
        case 'customerName':
          orderByClause = filters.sortOrder === 'asc' ? asc(this.getOrdersTable().customerName) : desc(this.getOrdersTable().customerName);
          break;
      }
    }

    const [orders, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select()
        .from(this.getOrdersTable())
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(orderByClause),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(this.getOrdersTable())
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);

    // Get full order details
    const fullOrders = await Promise.all(
      orders.map(order => this.getOrder(order.id))
    );

    // Calculate summary
    const summary = await this.calculateOrderSummary(tenantId, filters);

    const result = {
      data: fullOrders.filter(Boolean),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary
    };

    await this.cacheService.set(cacheKey, result, 300); // Cache for 5 minutes
    return result;
  }

  async getOrder(orderId: string): Promise<Order> {
    const cacheKey = `frontend_order:${orderId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const results = await this.databaseService.drizzleClient
      .select({
        order: this.getOrdersTable(),
        item: this.getOrderItemsTable(),
        product: this.getProductsTable()
      })
      .from(this.getOrdersTable())
      .leftJoin(this.getOrderItemsTable(), this.getOrderItemsTable().orderId.eq(this.getOrdersTable().id))
      .leftJoin(this.getProductsTable(), this.getProductsTable().id.eq(this.getOrderItemsTable().productId))
      .where(this.getOrdersTable().id.eq(orderId));

    if (results.length === 0) return null;

    const orderData = results[0];
    const order: Order = {
      id: orderData.order.id,
      orderNumber: orderData.order.orderNumber,
      customerId: orderData.order.customerId,
      customerName: orderData.order.customerName,
      customerEmail: orderData.order.customerEmail,
      status: orderData.order.status,
      paymentStatus: orderData.order.paymentStatus,
      fulfillmentStatus: orderData.order.fulfillmentStatus,
      priority: orderData.order.priority,
      items: results.filter(r => r.item).map(r => ({
        id: r.item.id,
        orderId: r.item.orderId,
        productId: r.item.productId,
        productName: r.product?.name || '',
        sku: r.product?.sku || '',
        variantId: r.item.variantId,
        variantName: r.item.variantName,
        quantity: r.item.quantity,
        price: r.item.price,
        discount: r.item.discount,
        total: r.item.total,
        weight: r.item.weight,
        dimensions: r.item.dimensions,
        attributes: r.item.attributes || {},
        fulfillmentStatus: r.item.fulfillmentStatus,
        fulfillmentLocation: r.item.fulfillmentLocation,
        notes: r.item.notes
      })),
      subtotal: orderData.order.subtotal,
      tax: orderData.order.tax,
      shipping: orderData.order.shipping,
      discount: orderData.order.discount,
      total: orderData.order.total,
      currency: orderData.order.currency,
      shippingAddress: orderData.order.shippingAddress,
      billingAddress: orderData.order.billingAddress,
      paymentMethod: orderData.order.paymentMethod,
      paymentReference: orderData.order.paymentReference,
      notes: orderData.order.notes,
      tags: orderData.order.tags || [],
      trackingNumber: orderData.order.trackingNumber,
      shippedAt: orderData.order.shippedAt,
      deliveredAt: orderData.order.deliveredAt,
      metadata: orderData.order.metadata || {},
      tenantId: orderData.order.tenantId,
      createdBy: orderData.order.createdBy,
      updatedBy: orderData.order.updatedBy,
      createdAt: orderData.order.createdAt,
      updatedAt: orderData.order.updatedAt
    };

    await this.cacheService.set(cacheKey, order, 600); // Cache for 10 minutes
    return order;
  }

  async updateOrder(orderId: string, updateData: OrderUpdateRequest, tenantId: string, userId: string): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate status transitions
    if (updateData.status && !this.isValidStatusTransition(order.status, updateData.status)) {
      throw new BadRequestException(`Invalid status transition from ${order.status} to ${updateData.status}`);
    }

    const [updatedOrder] = await this.databaseService.drizzleClient
      .update(this.getOrdersTable())
      .set({
        ...updateData,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(and(
        this.getOrdersTable().id.eq(orderId),
        this.getOrdersTable().tenantId.eq(tenantId)
      ))
      .returning();

    // Update order items if provided
    if (updateData.items) {
      for (const itemUpdate of updateData.items) {
        await this.updateOrderItem(itemUpdate.id, itemUpdate, userId);
      }
    }

    // Emit order update event
    this.eventEmitter.emit('order.updated', {
      orderId,
      changes: updateData,
      updatedBy: userId
    });

    // Clear cache
    await this.cacheService.del(`frontend_order:${orderId}`);
    await this.cacheService.del(`frontend_orders:${tenantId}`);

    this.loggerService.log(`Order updated: ${orderId} - ${JSON.stringify(updateData)}`, 'FrontendOrdersManagementService');
    return await this.getOrder(orderId);
  }

  async processFulfillment(fulfillmentData: OrderFulfillmentRequest, tenantId: string, userId: string): Promise<Order> {
    const order = await this.getOrder(fulfillmentData.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.fulfillmentStatus === 'fulfilled') {
      throw new BadRequestException('Order is already fulfilled');
    }

    try {
      // Validate fulfillment request
      await this.validateFulfillmentRequest(fulfillmentData, order);

      // Create fulfillment records in WMS
      const pickingOrder = await this.createWMSPickingOrder(fulfillmentData, order);

      // Update order fulfillment status
      await this.databaseService.drizzleClient
        .update(this.getOrdersTable())
        .set({
          fulfillmentStatus: 'partially_fulfilled',
          updatedBy: userId,
          updatedAt: new Date()
        })
        .where(this.getOrdersTable().id.eq(fulfillmentData.orderId));

      // Update order items fulfillment status
      for (const item of fulfillmentData.items) {
        await this.databaseService.drizzleClient
          .update(this.getOrderItemsTable())
          .set({
            fulfillmentStatus: 'fulfilled',
            fulfillmentLocation: item.locationId,
            notes: item.notes
          })
          .where(this.getOrderItemsTable().id.eq(item.orderItemId));
      }

      // Emit fulfillment event
      this.eventEmitter.emit('order.fulfillment.created', {
        orderId: fulfillmentData.orderId,
        pickingOrderId: pickingOrder.id,
        items: fulfillmentData.items,
        createdBy: userId
      });

      // Clear cache
      await this.cacheService.del(`frontend_order:${fulfillmentData.orderId}`);

      this.loggerService.log(`Order fulfillment processed: ${fulfillmentData.orderId} -> ${pickingOrder.pickingNumber}`, 'FrontendOrdersManagementService');
      return await this.getOrder(fulfillmentData.orderId);

    } catch (error) {
      this.loggerService.error(`Error processing fulfillment: ${fulfillmentData.orderId}`, error, 'FrontendOrdersManagementService');
      throw error;
    }
  }

  async cancelOrder(orderId: string, reason: string, tenantId: string, userId: string): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (['cancelled', 'delivered', 'refunded'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled in current status');
    }

    // Cancel picking order in WMS if exists
    const pickingOrder = await this.getPickingOrderByOrderId(orderId);
    if (pickingOrder) {
      await this.cancelWMSPickingOrder(pickingOrder.id);
    }

    // Update order status
    await this.databaseService.drizzleClient
      .update(this.getOrdersTable())
      .set({
        status: 'cancelled',
        fulfillmentStatus: 'cancelled',
        notes: reason,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(this.getOrdersTable().id.eq(orderId));

    // Update order items
    await this.databaseService.drizzleClient
      .update(this.getOrderItemsTable())
      .set({
        fulfillmentStatus: 'cancelled'
      })
      .where(this.getOrderItemsTable().orderId.eq(orderId));

    // Process refund if paid
    if (order.paymentStatus === 'paid') {
      await this.processRefund(orderId, reason);
    }

    // Emit cancellation event
    this.eventEmitter.emit('order.cancelled', {
      orderId,
      reason,
      cancelledBy: userId
    });

    // Clear cache
    await this.cacheService.del(`frontend_order:${orderId}`);

    this.loggerService.log(`Order cancelled: ${orderId} - ${reason}`, 'FrontendOrdersManagementService');
    return await this.getOrder(orderId);
  }

  async updateOrderStatus(orderId: string, status: string, tenantId: string, userId: string): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!this.isValidStatusTransition(order.status, status)) {
      throw new BadRequestException(`Invalid status transition from ${order.status} to ${status}`);
    }

    let updateData: any = { status, updatedBy: userId, updatedAt: new Date() };

    // Handle special status transitions
    switch (status) {
      case 'shipped':
        if (!order.trackingNumber) {
          updateData.trackingNumber = `TRK-${Date.now()}`;
        }
        updateData.shippedAt = new Date();
        break;

      case 'delivered':
        updateData.deliveredAt = new Date();
        break;
    }

    const [updatedOrder] = await this.databaseService.drizzleClient
      .update(this.getOrdersTable())
      .set(updateData)
      .where(this.getOrdersTable().id.eq(orderId))
      .returning();

    // Emit status change event
    this.eventEmitter.emit('order.status.changed', {
      orderId,
      oldStatus: order.status,
      newStatus: status,
      changedBy: userId
    });

    // Clear cache
    await this.cacheService.del(`frontend_order:${orderId}`);

    this.loggerService.log(`Order status updated: ${orderId} - ${order.status} -> ${status}`, 'FrontendOrdersManagementService');
    return await this.getOrder(orderId);
  }

  async getOrderAnalytics(tenantId: string, days: number = 30): Promise<any> {
    const cacheKey = `frontend_order_analytics:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Order performance metrics
    const metrics = await this.databaseService.drizzleClient
      .select({
        totalOrders: sql<number>`count(*)`,
        totalRevenue: sql<number>`SUM(total)`,
        avgOrderValue: sql<number>`AVG(total)`,
        pendingOrders: sql<number>`count(*) FILTER (WHERE status = 'pending')`,
        processingOrders: sql<number>`count(*) FILTER (WHERE status = 'processing')`,
        shippedOrders: sql<number>`count(*) FILTER (WHERE status = 'shipped')`,
        deliveredOrders: sql<number>`count(*) FILTER (WHERE status = 'delivered')`,
        cancelledOrders: sql<number>`count(*) FILTER (WHERE status = 'cancelled')`,
        avgProcessingTime: sql<number>`AVG(EXTRACT(EPOCH FROM (shipped_at - created_at))/3600) FILTER (WHERE shipped_at IS NOT NULL)`,
        onTimeDelivery: sql<number>`count(*) FILTER (WHERE delivered_at IS NOT NULL AND delivered_at <= created_at + INTERVAL '7 days')::float / count(*) * 100`
      })
      .from(this.getOrdersTable())
      .where(and(
        this.getOrdersTable().tenantId.eq(tenantId),
        this.getOrdersTable().createdAt.gte(startDate)
      ));

    // Status distribution
    const statusDistribution = await this.databaseService.drizzleClient
      .select({
        status: this.getOrdersTable().status,
        count: sql<number>`count(*)`,
        totalValue: sql<number>`SUM(total)`
      })
      .from(this.getOrdersTable())
      .where(and(
        this.getOrdersTable().tenantId.eq(tenantId),
        this.getOrdersTable().createdAt.gte(startDate)
      ))
      .groupBy(this.getOrdersTable().status);

    // Top customers
    const topCustomers = await this.databaseService.drizzleClient
      .select({
        customerId: this.getOrdersTable().customerId,
        customerName: this.getOrdersTable().customerName,
        orderCount: sql<number>`count(*)`,
        totalValue: sql<number>`SUM(total)`
      })
      .from(this.getOrdersTable())
      .where(and(
        this.getOrdersTable().tenantId.eq(tenantId),
        this.getOrdersTable().createdAt.gte(startDate)
      ))
      .groupBy(this.getOrdersTable().customerId, this.getOrdersTable().customerName)
      .orderBy(sql`SUM(total) DESC`)
      .limit(10);

    const result = {
      totalOrders: Number(metrics[0].totalOrders) || 0,
      totalRevenue: Number(metrics[0].totalRevenue) || 0,
      avgOrderValue: Number(metrics[0].avgOrderValue) || 0,
      statusBreakdown: {
        pending: Number(metrics[0].pendingOrders) || 0,
        processing: Number(metrics[0].processingOrders) || 0,
        shipped: Number(metrics[0].shippedOrders) || 0,
        delivered: Number(metrics[0].deliveredOrders) || 0,
        cancelled: Number(metrics[0].cancelledOrders) || 0
      },
      performance: {
        avgProcessingTime: Number(metrics[0].avgProcessingTime) || 0,
        onTimeDeliveryRate: Number(metrics[0].onTimeDelivery) || 0,
        fulfillmentRate: 0 // Would calculate from fulfillment data
      },
      statusDistribution,
      topCustomers,
      recentActivity: [], // Would fetch recent order activities
      trends: {} // Would calculate trends over time
    };

    await this.cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
    return result;
  }

  // Private helper methods
  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'cancelled'],
      'delivered': ['refunded'],
      'cancelled': ['confirmed'], // Allow reactivation
      'refunded': []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private async calculateOrderSummary(tenantId: string, filters: OrderSearchFilters): Promise<any> {
    let whereClause = this.getOrdersTable().tenantId.eq(tenantId);

    // Apply same filters as main query
    if (filters.status) {
      whereClause = and(whereClause, this.getOrdersTable().status.eq(filters.status));
    }

    if (filters.dateRange) {
      whereClause = and(
        whereClause,
        this.getOrdersTable().createdAt.gte(filters.dateRange.start),
        this.getOrdersTable().createdAt.lte(filters.dateRange.end)
      );
    }

    const summary = await this.databaseService.drizzleClient
      .select({
        totalOrders: sql<number>`count(*)`,
        totalRevenue: sql<number>`SUM(total)`,
        pendingOrders: sql<number>`count(*) FILTER (WHERE status = 'pending')`,
        processingOrders: sql<number>`count(*) FILTER (WHERE status = 'processing')`,
        shippedOrders: sql<number>`count(*) FILTER (WHERE status = 'shipped')`,
        deliveredOrders: sql<number>`count(*) FILTER (WHERE status = 'delivered')`,
        cancelledOrders: sql<number>`count(*) FILTER (WHERE status = 'cancelled')`
      })
      .from(this.getOrdersTable())
      .where(whereClause);

    return {
      totalOrders: Number(summary[0].totalOrders) || 0,
      totalRevenue: Number(summary[0].totalRevenue) || 0,
      pendingOrders: Number(summary[0].pendingOrders) || 0,
      processingOrders: Number(summary[0].processingOrders) || 0,
      shippedOrders: Number(summary[0].shippedOrders) || 0,
      deliveredOrders: Number(summary[0].deliveredOrders) || 0,
      cancelledOrders: Number(summary[0].cancelledOrders) || 0
    };
  }

  private async validateFulfillmentRequest(fulfillmentData: OrderFulfillmentRequest, order: Order): Promise<void> {
    // Validate that all items exist in order
    for (const item of fulfillmentData.items) {
      const orderItem = order.items.find(oi => oi.id === item.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(`Order item ${item.orderItemId} not found in order`);
      }

      if (item.quantity > orderItem.quantity) {
        throw new BadRequestException(`Fulfillment quantity (${item.quantity}) exceeds order quantity (${orderItem.quantity})`);
      }
    }
  }

  private async createWMSPickingOrder(fulfillmentData: OrderFulfillmentRequest, order: Order): Promise<any> {
    // This would integrate with WMS picking service
    // For now, return mock data
    return {
      id: `picking-${fulfillmentData.orderId}`,
      pickingNumber: `PICK-${Date.now()}`,
      orderId: fulfillmentData.orderId,
      status: 'pending',
      items: fulfillmentData.items.map(item => ({
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        locationId: item.locationId
      }))
    };
  }

  private async getPickingOrderByOrderId(orderId: string): Promise<any> {
    // This would query WMS picking orders
    // For now, return mock data
    return {
      id: `picking-${orderId}`,
      pickingNumber: `PICK-${Date.now()}`,
      status: 'completed'
    };
  }

  private async cancelWMSPickingOrder(pickingOrderId: string): Promise<void> {
    // This would cancel WMS picking order
    this.loggerService.log(`WMS picking order cancelled: ${pickingOrderId}`, 'FrontendOrdersManagementService');
  }

  private async processRefund(orderId: string, reason: string): Promise<void> {
    // This would integrate with payment service
    this.loggerService.log(`Refund processed: ${orderId} - ${reason}`, 'FrontendOrdersManagementService');
  }

  private async updateOrderItem(itemId: string, updateData: any, userId: string): Promise<void> {
    await this.databaseService.drizzleClient
      .update(this.getOrderItemsTable())
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(this.getOrderItemsTable().id.eq(itemId));
  }

  private getOrdersTable() {
    return sql`orders`;
  }

  private getOrderItemsTable() {
    return sql`order_items`;
  }

  private getProductsTable() {
    return sql`products`;
  }
}
