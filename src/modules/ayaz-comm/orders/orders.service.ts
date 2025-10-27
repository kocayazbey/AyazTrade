import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { orders, orderItems, orderStatusHistory } from '../../../database/schema/orders.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly emailService: EmailService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { userId, items, totalAmount, shippingAddress, paymentMethod, couponCode } = createOrderDto;

    // Create order
    const [savedOrder] = await this.db
      .insert(orders)
      .values({
        userId,
        orderNumber: this.generateOrderNumber(),
        status: 'pending',
        paymentStatus: 'pending',
        totalAmount: totalAmount.toString(),
        subtotal: totalAmount.toString(),
        shippingAddress,
        paymentMethod,
        couponCode,
      })
      .returning();

    // Create order items
    const orderItemsData = items.map(item => ({
      orderId: savedOrder.id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price.toString(),
      variantId: item.variantId,
      productName: item.productName || 'Unknown Product',
      productSku: item.productSku || 'N/A',
      subtotal: (item.price * item.quantity).toString(),
    }));

    await this.db.insert(orderItems).values(orderItemsData);

    // Send order confirmation email
    await this.emailService.sendOrderConfirmation(userId, savedOrder.id);

    return savedOrder;
  }

  async findAll(filters?: {
    status?: string;
    paymentStatus?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    let whereConditions = [];

    if (filters?.status) {
      whereConditions.push(eq(orders.status, filters.status as any));
    }

    if (filters?.paymentStatus) {
      whereConditions.push(eq(orders.paymentStatus, filters.paymentStatus as any));
    }

    if (filters?.userId) {
      whereConditions.push(eq(orders.userId, filters.userId));
    }

    if (filters?.startDate) {
      whereConditions.push(sql`${orders.orderDate} >= ${filters.startDate}`);
    }

    if (filters?.endDate) {
      whereConditions.push(sql`${orders.orderDate} <= ${filters.endDate}`);
    }

    const result = await this.db
      .select()
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(orders.orderDate))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return result;
  }

  async findOne(id: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get order items
    const items = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    return { ...order, items };
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update order
    Object.assign(order, updateOrderDto);
    const updatedOrder = await this.orderRepository.save(order);

    // Send status update email if status changed
    if (updateOrderDto.status && updateOrderDto.status !== order.status) {
      await this.emailService.sendOrderStatusUpdate(order.userId, order.id, updateOrderDto.status);
    }

    return updatedOrder;
  }

  async updateStatus(id: string, status: string, trackingNumber?: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid order status');
    }

    order.status = status;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    const updatedOrder = await this.orderRepository.save(order);

    // Send status update email
    await this.emailService.sendOrderStatusUpdate(order.userId, order.id, status);

    return updatedOrder;
  }

  async cancel(id: string, reason?: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('Order is already cancelled');
    }

    if (order.status === 'shipped' || order.status === 'delivered') {
      throw new BadRequestException('Cannot cancel order that has been shipped or delivered');
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;
    const updatedOrder = await this.orderRepository.save(order);

    // Send cancellation email
    await this.emailService.sendOrderCancellation(order.userId, order.id, reason);

    return updatedOrder;
  }

  async getOrderHistory(userId: string, limit = 20, offset = 0) {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getOrderStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }) {
    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    if (filters?.startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters?.status) {
      queryBuilder.andWhere('order.status = :status', { status: filters.status });
    }

    const [
      totalOrders,
      totalRevenue,
      averageOrderValue,
      statusBreakdown,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .select('SUM(order.totalAmount)', 'total')
        .getRawOne()
        .then(result => parseFloat(result.total) || 0),
      queryBuilder
        .select('AVG(order.totalAmount)', 'average')
        .getRawOne()
        .then(result => parseFloat(result.average) || 0),
      queryBuilder
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('order.status')
        .getRawMany(),
    ]);

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  async remove(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only allow deletion of cancelled orders
    if (order.status !== 'cancelled') {
      throw new BadRequestException('Only cancelled orders can be deleted');
    }

    await this.orderRepository.remove(order);
    return { message: 'Order deleted successfully' };
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `AYZ${timestamp.slice(-6)}${random}`;
  }
}