import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '../../../core/database/database.service';
import { payments } from '../../../database/schema/payments.schema';
import { eq, and } from 'drizzle-orm';
import { StripeService } from './stripe.service';
import { IyzicoService } from './iyzico.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import * as crypto from 'crypto';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  IYZICO = 'iyzico',
  STRIPE = 'stripe',
  CASH_ON_DELIVERY = 'cash_on_delivery',
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly databaseService: DatabaseService,
    private readonly stripeService: StripeService,
    private readonly iyzicoService: IyzicoService,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<any> {
    try {
      const { orderId, amount, currency, method, customerInfo, idempotencyKey } = createPaymentDto;

      // Check idempotency key if provided
      if (idempotencyKey) {
        const existingPayment = await this.checkIdempotencyKey(idempotencyKey);
        if (existingPayment) {
          return existingPayment;
        }
      }

      // Validate amount
      if (amount <= 0) {
        throw new BadRequestException('Amount must be greater than zero');
      }

      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || this.generateIdempotencyKey(orderId, amount, method);

      // Set expiry for idempotency key (24 hours)
      const idempotencyExpiry = new Date();
      idempotencyExpiry.setHours(idempotencyExpiry.getHours() + 24);

      const payment = {
        id: `PAY${Date.now()}`,
        orderId,
        amount,
        currency: currency || 'TRY',
        method,
        status: PaymentStatus.PENDING,
        customerInfo,
        idempotencyKey: finalIdempotencyKey,
        idempotencyExpiry,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };

      // Process payment based on method
      let paymentResult;
      switch (method) {
        case PaymentMethod.STRIPE:
          paymentResult = await this.stripeService.createPaymentIntent(amount, currency);
          payment.metadata = { ...payment.metadata, stripeClientSecret: paymentResult.clientSecret };
          break;
        case PaymentMethod.IYZICO:
          paymentResult = await this.iyzicoService.createPayment({
            amount,
            currency,
            customerInfo,
            items: [],
          });
          payment.metadata = { ...payment.metadata, iyzicoToken: paymentResult.token };
          break;
        case PaymentMethod.CASH_ON_DELIVERY:
          payment.status = PaymentStatus.PENDING;
          break;
        default:
          throw new BadRequestException('Unsupported payment method');
      }

      payment.status = PaymentStatus.PROCESSING;

      // Save payment to database
      await this.savePaymentToDatabase(payment);

      await this.eventEmitter.emit('payment.created', payment);

      return payment;
    } catch (error) {
      await this.eventEmitter.emit('payment.failed', { orderId: createPaymentDto.orderId, error: error.message });
      throw error;
    }
  }

  async confirmPayment(paymentId: string, confirmationData?: any): Promise<any> {
    try {
      // Fetch payment from database
      const [payment] = await this.databaseService.drizzleClient
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Update payment status
      payment.status = PaymentStatus.COMPLETED;
      payment.completedAt = new Date();
      payment.updatedAt = new Date();

      await this.eventEmitter.emit('payment.completed', payment);

      return payment;
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment['failureReason'] = error.message;
      payment['updatedAt'] = new Date();

      await this.eventEmitter.emit('payment.failed', payment);
      throw error;
    }
  }

  async refundPayment(paymentId: string, refundDto: RefundPaymentDto): Promise<any> {
    // In real implementation, fetch from database
    const payment = { id: paymentId, amount: 100, status: PaymentStatus.COMPLETED, method: PaymentMethod.STRIPE };

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const refundAmount = refundDto.amount || payment.amount;

    if (refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    const refund = {
      id: `REF${Date.now()}`,
      paymentId,
      amount: refundAmount,
      reason: refundDto.reason,
      status: 'processing',
      createdAt: new Date(),
    };

    try {
      // Process refund with payment provider
      switch (payment.method) {
        case PaymentMethod.STRIPE:
          await this.stripeService.createRefund(paymentId, refundAmount);
          break;
        case PaymentMethod.IYZICO:
          await this.iyzicoService.refund(paymentId, refundAmount);
          break;
      }

      refund.status = 'completed';

      const newPaymentStatus =
        refundAmount === payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

      await this.eventEmitter.emit('payment.refunded', { payment, refund });

      return refund;
    } catch (error) {
      refund.status = 'failed';
      throw error;
    }
  }


  async getPaymentsByOrderId(orderId: string): Promise<any[]> {
    try {
      const paymentList = await this.databaseService.drizzleClient
        .select()
        .from(payments)
        .where(eq(payments.orderId, orderId))
        .orderBy(payments.createdAt);

      return paymentList;
    } catch (error) {
      this.logger.error('Error getting payments by order ID:', error);
      return [];
    }
  }

  async getPaymentById(paymentId: string): Promise<any> {
    try {
      const [payment] = await this.databaseService.drizzleClient
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      return payment;
    } catch (error) {
      this.logger.error('Error getting payment by ID:', error);
      throw error;
    }
  }

  async cancelPayment(paymentId: string): Promise<any> {
    try {
      const [payment] = await this.databaseService.drizzleClient
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException('Only pending payments can be cancelled');
      }

      // Update payment status
      await this.updatePaymentStatus(paymentId, PaymentStatus.CANCELLED);

      await this.eventEmitter.emit('payment.cancelled', { ...payment, status: PaymentStatus.CANCELLED });

      return { ...payment, status: PaymentStatus.CANCELLED, cancelledAt: new Date() };
    } catch (error) {
      this.logger.error('Error cancelling payment:', error);
      throw error;
    }
  }

  async getPaymentAnalytics(startDate: Date, endDate: Date): Promise<any> {
    return {
      totalTransactions: 0,
      totalAmount: 0,
      successRate: 0,
      averageTransactionValue: 0,
      byMethod: {},
      byStatus: {},
    };
  }

  async checkIdempotencyKey(idempotencyKey: string): Promise<any | null> {
    try {
      const [payment] = await this.databaseService.drizzleClient
        .select()
        .from(payments)
        .where(and(
          eq(payments.idempotencyKey, idempotencyKey),
          payments.idempotencyExpiry.gt(new Date())
        ))
        .limit(1);

      return payment || null;
    } catch (error) {
      this.logger.error('Error checking idempotency key:', error);
      return null;
    }
  }

  async savePaymentToDatabase(payment: any): Promise<void> {
    try {
      await this.databaseService.drizzleClient
        .insert(payments)
        .values({
          id: payment.id,
          orderId: payment.orderId,
          customerId: payment.customerId,
          amount: payment.amount.toString(),
          currency: payment.currency,
          method: payment.method,
          status: payment.status,
          provider: payment.provider,
          providerTransactionId: payment.providerTransactionId,
          providerResponse: payment.providerResponse,
          customerInfo: payment.customerInfo,
          metadata: payment.metadata,
          failureReason: payment.failureReason,
          idempotencyKey: payment.idempotencyKey,
          idempotencyExpiry: payment.idempotencyExpiry,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          completedAt: payment.completedAt,
          cancelledAt: payment.cancelledAt,
        });
    } catch (error) {
      this.logger.error('Error saving payment to database:', error);
      throw error;
    }
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus, providerResponse?: any): Promise<void> {
    try {
      await this.databaseService.drizzleClient
        .update(payments)
        .set({
          status,
          providerResponse,
          updatedAt: new Date(),
          ...(status === PaymentStatus.COMPLETED && { completedAt: new Date() }),
          ...(status === PaymentStatus.CANCELLED && { cancelledAt: new Date() }),
        })
        .where(eq(payments.id, paymentId));
    } catch (error) {
      this.logger.error('Error updating payment status:', error);
      throw error;
    }
  }

  private generateIdempotencyKey(orderId: string, amount: number, method: PaymentMethod): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `pay_${orderId}_${amount}_${method}_${timestamp}_${random}`;
  }

  private logger = console; // Simple logger for now
}
