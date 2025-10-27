import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: any) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: metadata || {},
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      throw new BadRequestException(`Stripe payment intent creation failed: ${error.message}`);
    }
  }

  async processPayment(paymentData: {
    amount: number;
    currency: string;
    paymentMethodId: string;
    customerId?: string;
  }) {
    try {
      const { amount, currency, paymentMethodId, customerId } = paymentData;

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        customer: customerId,
        confirmation_method: 'manual',
        confirm: true,
        return_url: process.env.STRIPE_RETURN_URL || 'https://ayaztrade.com/checkout/success',
      });

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          transactionId: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert back from cents
          currency: paymentIntent.currency,
        };
      } else {
        return {
          success: false,
          error: `Payment failed with status: ${paymentIntent.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createCustomer(customerData: {
    email: string;
    name?: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  }) {
    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address,
      });

      return {
        customerId: customer.id,
        email: customer.email,
      };
    } catch (error) {
      throw new BadRequestException(`Stripe customer creation failed: ${error.message}`);
    }
  }

  async createSetupIntent(customerId: string) {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });

      return {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      throw new BadRequestException(`Stripe setup intent creation failed: ${error.message}`);
    }
  }

  async getPaymentMethods(customerId: string) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        },
      }));
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve payment methods: ${error.message}`);
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number, reason?: string) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
        reason: reason as any,
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100, // Convert back from cents
        status: refund.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert back from cents
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  async createWebhookEndpoint(url: string, events: string[]) {
    try {
      const webhookEndpoint = await this.stripe.webhookEndpoints.create({
        url,
        enabled_events: events as any,
      });

      return {
        id: webhookEndpoint.id,
        url: webhookEndpoint.url,
        enabledEvents: webhookEndpoint.enabled_events,
        secret: webhookEndpoint.secret,
      };
    } catch (error) {
      throw new BadRequestException(`Webhook endpoint creation failed: ${error.message}`);
    }
  }

  async verifyWebhookSignature(payload: string, signature: string, secret: string) {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      return event;
    } catch (error) {
      throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
    }
  }

  async createRefund(paymentIntentId: string, amount?: number, reason?: string) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as any,
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}