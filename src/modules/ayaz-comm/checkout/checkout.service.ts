import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../core/database/database.service';
import { orders, orderItems } from '../../../database/schema/orders.schema';
import { carts, cartItems } from '../../../database/schema/carts.schema';
import { products } from '../../../database/schema/products.schema';
import { coupons } from '../../../database/schema/promotions.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { StripeService } from '../payments/stripe.service';
import { IyzicoService } from '../payments/iyzico.service';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stripeService: StripeService,
    private readonly iyzicoService: IyzicoService,
    private readonly emailService: EmailService,
  ) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    const { shippingAddress, paymentMethod, couponCode } = createOrderDto;

    // Get user's cart
    const cartRows = await this.databaseService.drizzleClient
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);
    const cart = cartRows[0];

    if (!cart) {
      throw new BadRequestException('Cart is empty');
    }

    const items = await this.databaseService.drizzleClient
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id));

    if (items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validate stock availability
    for (const item of items) {
      const productRows = await this.databaseService.drizzleClient
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);
      const product = productRows[0];
      if (!product || (product.trackInventory && product.stockQuantity < item.quantity)) {
        throw new BadRequestException('Insufficient stock for one or more items');
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const tax = subtotal * 0.18; // 18% KDV
    const shipping = subtotal > 500 ? 0 : 25; // Free shipping over 500 TL
    
    // Calculate discount from coupon
    let discount = 0;
    let couponDiscount = 0;
    if (couponCode) {
      const [coupon] = await this.databaseService.drizzleClient
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.code, couponCode),
            eq(coupons.isActive, 'true'),
            sql`${coupons.startDate} <= NOW()`,
            sql`${coupons.endDate} >= NOW()`
          )
        )
        .limit(1);

      if (coupon) {
        if (coupon.type === 'percentage') {
          couponDiscount = subtotal * (parseFloat(coupon.value.toString()) / 100);
          if (coupon.maximumDiscount) {
            couponDiscount = Math.min(couponDiscount, parseFloat(coupon.maximumDiscount.toString()));
          }
        } else if (coupon.type === 'fixed') {
          couponDiscount = parseFloat(coupon.value.toString());
        }
        discount = couponDiscount;
      }
    }
    
    const total = subtotal + tax + shipping - discount;

    // Create order
    const [savedOrder] = await this.databaseService.drizzleClient
      .insert(orders)
      .values({
        userId,
        orderNumber: this.generateOrderNumber(),
        status: 'pending',
        paymentStatus: 'pending',
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        shipping: shipping.toString(),
        discount: discount.toString(),
        totalAmount: total.toString(),
        shippingAddress,
        paymentMethod: paymentMethod as any,
        couponCode: couponCode || null,
        couponDiscount: couponDiscount.toString(),
      })
      .returning();

    // Create order items
    const orderItemsRows = items.map(item => ({
      orderId: savedOrder.id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      variantId: item.variantId,
      productName: '',
      productSku: '',
      productImage: null,
      options: {},
      attributes: {},
      subtotal: (parseFloat(item.price) * item.quantity).toString(),
    }));
    if (orderItemsRows.length > 0) {
      await this.databaseService.drizzleClient.insert(orderItems).values(orderItemsRows);
    }

    // Update product stock
    for (const item of items) {
      const productRows = await this.databaseService.drizzleClient
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);
      const product = productRows[0];
      if (product && product.trackInventory) {
        await this.databaseService.drizzleClient
          .update(products)
          .set({ stockQuantity: (product.stockQuantity || 0) - item.quantity })
          .where(eq(products.id, item.productId));
      }
    }

    // Clear cart
    await this.databaseService.drizzleClient
      .delete(cartItems)
      .where(eq(cartItems.cartId, cart.id));

    return savedOrder;
  }

  async processPayment(orderId: string, processPaymentDto: ProcessPaymentDto) {
    const { paymentMethod, paymentData } = processPaymentDto;

    const orderRows = await this.databaseService.drizzleClient
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    const order = orderRows[0];

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus !== 'pending') {
      throw new BadRequestException('Order payment has already been processed');
    }

    let paymentResult;

    try {
      switch (paymentMethod) {
        case 'stripe':
          paymentResult = await this.stripeService.processPayment({
            amount: order.totalAmount,
            currency: 'try',
            paymentMethodId: paymentData.paymentMethodId,
            customerId: paymentData.customerId,
          });
          break;

        case 'iyzico':
          paymentResult = await this.iyzicoService.processPayment({
            amount: order.totalAmount,
            currency: 'TRY',
            paymentCard: paymentData.paymentCard,
            buyer: paymentData.buyer,
          });
          break;

        case 'cash_on_delivery':
          paymentResult = { success: true, transactionId: null };
          break;

        default:
          throw new BadRequestException('Invalid payment method');
      }

      if (paymentResult.success) {
        // Update order status
        await this.databaseService.drizzleClient
          .update(orders)
          .set({
            paymentStatus: 'paid',
            status: 'confirmed',
            paymentReference: paymentResult.transactionId || null,
          })
          .where(eq(orders.id, orderId));

        // Send confirmation email
        await this.emailService.sendOrderConfirmation(order.userId, order.id);

        return {
          success: true,
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          transactionId: paymentResult.transactionId,
        };
      } else {
        // Payment failed
        await this.databaseService.drizzleClient
          .update(orders)
          .set({ paymentStatus: 'failed' })
          .where(eq(orders.id, orderId));

        return {
          success: false,
          error: paymentResult.error || 'Payment processing failed',
        };
      }
    } catch (error) {
      // Payment failed
      await this.databaseService.drizzleClient
        .update(orders)
        .set({ paymentStatus: 'failed' })
        .where(eq(orders.id, orderId));

      return {
        success: false,
        error: error.message || 'Payment processing failed',
      };
    }
  }

  async confirmOrder(orderId: string) {
    const orderRows = await this.databaseService.drizzleClient
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    const order = orderRows[0];

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'confirmed') {
      throw new BadRequestException('Order is not in confirmed status');
    }

    // Update order status to processing
    await this.databaseService.drizzleClient
      .update(orders)
      .set({ status: 'processing' })
      .where(eq(orders.id, orderId));

    return {
      success: true,
      orderId: order.id,
      status: order.status,
    };
  }

  async cancelOrder(orderId: string, reason?: string) {
    const orderRows = await this.databaseService.drizzleClient
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    const order = orderRows[0];

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('Order is already cancelled');
    }

    if (order.status === 'shipped' || order.status === 'delivered') {
      throw new BadRequestException('Cannot cancel order that has been shipped or delivered');
    }

    // Update order status
    await this.databaseService.drizzleClient
      .update(orders)
      .set({ status: 'cancelled', notes: reason || null })
      .where(eq(orders.id, orderId));

    // Restore product stock
    const orderItemsRows = await this.databaseService.drizzleClient
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    for (const item of orderItemsRows) {
      const productRows = await this.databaseService.drizzleClient
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);
      const product = productRows[0];
      if (product && product.trackInventory) {
        await this.databaseService.drizzleClient
          .update(products)
          .set({ stockQuantity: (product.stockQuantity || 0) + Number(item.quantity) })
          .where(eq(products.id, item.productId));
      }
    }

    // TODO: Process refund if payment was made
    if (order.paymentStatus === 'paid' && order.paymentTransactionId) {
      // Implement refund logic based on payment method
    }

    return {
      success: true,
      orderId: order.id,
      status: order.status,
    };
  }

  async getOrderStatus(orderId: string) {
    const orderRows = await this.databaseService.drizzleClient
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    const order = orderRows[0];

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items,
    };
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `AYZ${timestamp.slice(-6)}${random}`;
  }
}
