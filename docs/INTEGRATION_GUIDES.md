# AyazTrade Integration Guides

Comprehensive guides for integrating AyazTrade with third-party services including payment gateways, marketplaces, shipping providers, and more.

## Table of Contents

1. [Payment Gateway Integration](#payment-gateway-integration)
2. [Marketplace Integration](#marketplace-integration)
3. [Shipping Provider Integration](#shipping-provider-integration)
4. [ERP System Integration](#erp-system-integration)
5. [CRM Integration](#crm-integration)
6. [Accounting Software Integration](#accounting-software-integration)
7. [Webhook Configuration](#webhook-configuration)
8. [API Integration](#api-integration)

## Payment Gateway Integration

### Stripe Integration

#### Setup Instructions

1. **Create Stripe Account**
   ```bash
   # Go to https://stripe.com
   # Create account and get API keys
   ```

2. **Configure Environment Variables**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. **Install Dependencies**
   ```bash
   npm install stripe @nestjs/config
   ```

4. **Service Implementation**
   ```typescript
   // src/modules/payments/services/stripe.service.ts
   import { Injectable, Logger } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   import Stripe from 'stripe';

   @Injectable()
   export class StripeService {
     private stripe: Stripe;
     private readonly logger = new Logger(StripeService.name);

     constructor(private configService: ConfigService) {
       this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
         apiVersion: '2023-10-16',
       });
     }

     async createPaymentIntent(amount: number, currency: string, metadata: any) {
       try {
         const paymentIntent = await this.stripe.paymentIntents.create({
           amount: Math.round(amount * 100), // Convert to cents
           currency: currency.toLowerCase(),
           metadata,
           automatic_payment_methods: {
             enabled: true,
           },
         });

         this.logger.log(`Payment intent created: ${paymentIntent.id}`);
         return paymentIntent;
       } catch (error) {
         this.logger.error('Failed to create payment intent', error);
         throw error;
       }
     }

     async confirmPayment(paymentIntentId: string) {
       try {
         const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
         return paymentIntent;
       } catch (error) {
         this.logger.error('Failed to confirm payment', error);
         throw error;
       }
     }

     async refundPayment(paymentIntentId: string, amount?: number) {
       try {
         const refund = await this.stripe.refunds.create({
           payment_intent: paymentIntentId,
           amount: amount ? Math.round(amount * 100) : undefined,
         });

         this.logger.log(`Refund created: ${refund.id}`);
         return refund;
       } catch (error) {
         this.logger.error('Failed to process refund', error);
         throw error;
       }
     }

     async handleWebhook(signature: string, payload: string) {
       try {
         const event = this.stripe.webhooks.constructEvent(
           payload,
           signature,
           this.configService.get<string>('STRIPE_WEBHOOK_SECRET')
         );

         this.logger.log(`Webhook received: ${event.type}`);

         switch (event.type) {
           case 'payment_intent.succeeded':
             await this.handlePaymentSuccess(event.data.object);
             break;
           case 'payment_intent.payment_failed':
             await this.handlePaymentFailure(event.data.object);
             break;
           case 'charge.dispute.created':
             await this.handleDispute(event.data.object);
             break;
           default:
             this.logger.warn(`Unhandled event type: ${event.type}`);
         }

         return { received: true };
       } catch (error) {
         this.logger.error('Webhook signature verification failed', error);
         throw error;
       }
     }

     private async handlePaymentSuccess(paymentIntent: any) {
       // Update order status
       // Send confirmation email
       // Update analytics
     }

     private async handlePaymentFailure(paymentIntent: any) {
       // Update order status
       // Send failure notification
       // Log for review
     }

     private async handleDispute(charge: any) {
       // Handle dispute process
       // Notify admin
       // Update order status
     }
   }
   ```

5. **Controller Implementation**
   ```typescript
   // src/modules/payments/controllers/stripe.controller.ts
   import { Controller, Post, Body, Headers, Req } from '@nestjs/common';
   import { StripeService } from '../services/stripe.service';

   @Controller('payments/stripe')
   export class StripeController {
     constructor(private readonly stripeService: StripeService) {}

     @Post('create-payment-intent')
     async createPaymentIntent(@Body() body: {
       amount: number;
       currency: string;
       orderId: string;
     }) {
       const paymentIntent = await this.stripeService.createPaymentIntent(
         body.amount,
         body.currency,
         { orderId: body.orderId }
       );

       return {
         clientSecret: paymentIntent.client_secret,
         paymentIntentId: paymentIntent.id,
       };
     }

     @Post('webhook')
     async handleWebhook(
       @Headers('stripe-signature') signature: string,
       @Req() req: any
     ) {
       return this.stripeService.handleWebhook(signature, req.rawBody);
     }
   }
   ```

6. **Frontend Integration**
   ```typescript
   // Frontend payment integration
   import { loadStripe } from '@stripe/stripe-js';

   const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

   export const processStripePayment = async (amount: number, currency: string) => {
     const stripe = await stripePromise;

     const response = await fetch('/api/v1/payments/stripe/create-payment-intent', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ amount, currency, orderId: 'order_123' }),
     });

     const { clientSecret } = await response.json();

     const result = await stripe.confirmPayment({
       clientSecret,
       confirmParams: {
         return_url: `${window.location.origin}/checkout/success`,
       },
     });

     return result;
   };
   ```

#### Testing

```bash
# Run payment tests
npm run test:payments

# Test webhook locally
stripe listen --forward-to localhost:3000/api/v1/payments/stripe/webhook
```

### Iyzico Integration

#### Setup Instructions

1. **Create Iyzico Account**
   ```bash
   # Go to https://merchant.iyzico.com
   # Get API key and secret
   ```

2. **Configure Environment Variables**
   ```env
   IYZICO_API_KEY=your-api-key
   IYZICO_SECRET_KEY=your-secret-key
   IYZICO_BASE_URL=https://api.iyzico.com
   ```

3. **Service Implementation**
   ```typescript
   // src/modules/payments/services/iyzico.service.ts
   import { Injectable, Logger } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   import * as crypto from 'crypto';

   interface IyzicoPaymentRequest {
     price: string;
     paidPrice: string;
     currency: string;
     installment: string;
     paymentCard: {
       cardNumber: string;
       expireMonth: string;
       expireYear: string;
       cvc: string;
       cardHolderName: string;
     };
     buyer: {
       id: string;
       name: string;
       surname: string;
       email: string;
       identityNumber: string;
       city: string;
       country: string;
       registrationAddress: string;
       ip: string;
     };
   }

   @Injectable()
   export class IyzicoService {
     private readonly logger = new Logger(IyzicoService.name);

     constructor(private configService: ConfigService) {}

     async createPayment(request: IyzicoPaymentRequest) {
       const payload = {
         locale: 'tr',
         conversationId: `conv_${Date.now()}`,
         price: request.price,
         paidPrice: request.paidPrice,
         currency: request.currency,
         installment: request.installment,
         paymentCard: request.paymentCard,
         buyer: request.buyer,
         shippingAddress: request.buyer, // Same as buyer for simplicity
         billingAddress: request.buyer,
         basketItems: [{
           id: 'item_1',
           name: 'Product',
           category1: 'Electronics',
           price: request.price,
           itemType: 'PHYSICAL',
         }],
       };

       const signature = this.generateSignature(payload);

       try {
         const response = await fetch(`${this.configService.get<string>('IYZICO_BASE_URL')}/payment/iyzipos`, {
           method: 'POST',
           headers: {
             'Authorization': `IYZWS ${this.configService.get<string>('IYZICO_API_KEY')}:${signature}`,
             'Content-Type': 'application/json',
           },
           body: JSON.stringify(payload),
         });

         const result = await response.json();

         if (result.status === 'success') {
           this.logger.log(`Iyzico payment created: ${result.paymentId}`);
           return result;
         } else {
           throw new Error(result.errorMessage);
         }
       } catch (error) {
         this.logger.error('Iyzico payment failed', error);
         throw error;
       }
     }

     private generateSignature(payload: any): string {
       const data = JSON.stringify(payload);
       const secret = this.configService.get<string>('IYZICO_SECRET_KEY');
       const apiKey = this.configService.get<string>('IYZICO_API_KEY');

       return crypto
         .createHmac('sha256', secret)
         .update(`${apiKey}${data}`)
         .digest('base64');
     }
   }
   ```

## Marketplace Integration

### Trendyol Integration

#### Setup Instructions

1. **Get Trendyol API Credentials**
   ```bash
   # Contact Trendyol seller support
   # Get API key and secret
   ```

2. **Configure Environment Variables**
   ```env
   TRENDYOL_API_KEY=your-api-key
   TRENDYOL_API_SECRET=your-api-secret
   TRENDYOL_SELLER_ID=your-seller-id
   ```

3. **Service Implementation**
   ```typescript
   // src/modules/integrations/services/trendyol.service.ts
   import { Injectable, Logger } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   import * as crypto from 'crypto';

   interface TrendyolProduct {
     productCode: string;
     title: string;
     description: string;
     price: number;
     stock: number;
     images: string[];
     categoryId: number;
     brand: string;
   }

   @Injectable()
   export class TrendyolService {
     private readonly logger = new Logger(TrendyolService.name);
     private readonly baseUrl = 'https://api.trendyol.com';

     constructor(private configService: ConfigService) {}

     async syncProducts(products: TrendyolProduct[]) {
       const timestamp = Date.now().toString();
       const signature = this.generateSignature(timestamp);

       try {
         for (const product of products) {
           await this.createOrUpdateProduct(product, timestamp, signature);
         }

         this.logger.log(`Synced ${products.length} products to Trendyol`);
       } catch (error) {
         this.logger.error('Failed to sync products to Trendyol', error);
         throw error;
       }
     }

     async syncOrders() {
       const timestamp = Date.now().toString();
       const signature = this.generateSignature(timestamp);

       try {
         const response = await fetch(`${this.baseUrl}/integration/order`, {
           method: 'GET',
           headers: {
             'Authorization': `Bearer ${this.configService.get<string>('TRENDYOL_API_KEY')}`,
             'X-Timestamp': timestamp,
             'X-Signature': signature,
           },
         });

         const orders = await response.json();

         for (const order of orders) {
           await this.processOrder(order);
         }

         this.logger.log(`Processed ${orders.length} orders from Trendyol`);
       } catch (error) {
         this.logger.error('Failed to sync orders from Trendyol', error);
         throw error;
       }
     }

     async updateStock(productCode: string, stock: number) {
       const timestamp = Date.now().toString();
       const signature = this.generateSignature(timestamp);

       try {
         await fetch(`${this.baseUrl}/integration/product/stock`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${this.configService.get<string>('TRENDYOL_API_KEY')}`,
             'X-Timestamp': timestamp,
             'X-Signature': signature,
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             productCode,
             quantity: stock,
           }),
         });

         this.logger.log(`Updated stock for ${productCode}: ${stock}`);
       } catch (error) {
         this.logger.error('Failed to update stock on Trendyol', error);
         throw error;
       }
     }

     private generateSignature(timestamp: string): string {
       const secret = this.configService.get<string>('TRENDYOL_API_SECRET');
       return crypto
         .createHmac('sha256', secret)
         .update(timestamp)
         .digest('hex');
     }

     private async createOrUpdateProduct(product: TrendyolProduct, timestamp: string, signature: string) {
       const response = await fetch(`${this.baseUrl}/integration/product`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${this.configService.get<string>('TRENDYOL_API_KEY')}`,
           'X-Timestamp': timestamp,
           'X-Signature': signature,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(product),
       });

       return response.json();
     }

     private async processOrder(order: any) {
       // Create order in AyazTrade system
       // Update inventory
       // Send notifications
     }
   }
   ```

4. **Scheduler Setup**
   ```typescript
   // src/modules/integrations/schedulers/trendyol.scheduler.ts
   import { Injectable, Logger } from '@nestjs/common';
   import { Cron, CronExpression } from '@nestjs/schedule';
   import { TrendyolService } from '../services/trendyol.service';

   @Injectable()
   export class TrendyolScheduler {
     private readonly logger = new Logger(TrendyolScheduler.name);

     constructor(private readonly trendyolService: TrendyolService) {}

     // Sync products every 30 minutes
     @Cron(CronExpression.EVERY_30_MINUTES)
     async syncProducts() {
       this.logger.log('Starting Trendyol product sync...');

       try {
         // Get products from database
         const products = await this.getProductsForSync();
         await this.trendyolService.syncProducts(products);
       } catch (error) {
         this.logger.error('Trendyol product sync failed', error);
       }
     }

     // Sync orders every 5 minutes
     @Cron(CronExpression.EVERY_5_MINUTES)
     async syncOrders() {
       this.logger.log('Starting Trendyol order sync...');

       try {
         await this.trendyolService.syncOrders();
       } catch (error) {
         this.logger.error('Trendyol order sync failed', error);
       }
     }

     private async getProductsForSync() {
       // Get active products that should be synced
       return [];
     }
   }
   ```

### Hepsiburada Integration

#### Setup Instructions

1. **Get Hepsiburada API Credentials**
   ```bash
   # Contact Hepsiburada seller support
   # Get API credentials
   ```

2. **Configure Environment Variables**
   ```env
   HEPSIBURADA_API_KEY=your-api-key
   HEPSIBURADA_API_SECRET=your-api-secret
   HEPSIBURADA_MERCHANT_ID=your-merchant-id
   ```

3. **Service Implementation**
   ```typescript
   // src/modules/integrations/services/hepsiburada.service.ts
   import { Injectable, Logger } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';

   @Injectable()
   export class HepsiburadaService {
     private readonly logger = new Logger(HepsiburadaService.name);
     private readonly baseUrl = 'https://mpop.hepsiburada.com/api';

     constructor(private configService: ConfigService) {}

     async syncProducts(products: any[]) {
       try {
         for (const product of products) {
           await this.uploadProduct(product);
         }

         this.logger.log(`Synced ${products.length} products to Hepsiburada`);
       } catch (error) {
         this.logger.error('Failed to sync products to Hepsiburada', error);
         throw error;
       }
     }

     async syncOrders() {
       try {
         const orders = await this.getOrders();
         for (const order of orders) {
           await this.processOrder(order);
         }

         this.logger.log(`Processed ${orders.length} orders from Hepsiburada`);
       } catch (error) {
         this.logger.error('Failed to sync orders from Hepsiburada', error);
         throw error;
       }
     }

     private async uploadProduct(product: any) {
       const payload = {
         merchantId: this.configService.get<string>('HEPSIBURADA_MERCHANT_ID'),
         productCode: product.sku,
         title: product.name,
         description: product.description,
         price: product.price,
         stock: product.stock,
         images: product.images,
         categoryId: product.categoryId,
         brand: product.brand,
       };

       const response = await fetch(`${this.baseUrl}/product`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${this.configService.get<string>('HEPSIBURADA_API_KEY')}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(payload),
       });

       return response.json();
     }

     private async getOrders() {
       const response = await fetch(`${this.baseUrl}/orders`, {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${this.configService.get<string>('HEPSIBURADA_API_KEY')}`,
         },
       });

       return response.json();
     }

     private async processOrder(order: any) {
       // Process order in AyazTrade system
       // Update inventory
       // Send notifications
     }
   }
   ```

## Shipping Provider Integration

### Aras Kargo Integration

#### Setup Instructions

1. **Get Aras Kargo API Credentials**
   ```bash
   # Contact Aras Kargo business support
   # Get API credentials
   ```

2. **Configure Environment Variables**
   ```env
   ARAS_API_KEY=your-api-key
   ARAS_API_SECRET=your-api-secret
   ARAS_CUSTOMER_ID=your-customer-id
   ```

3. **Service Implementation**
   ```typescript
   // src/modules/shipping/services/aras.service.ts
   import { Injectable, Logger } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';

   interface ArasShipmentRequest {
     customerId: string;
     receiverName: string;
     receiverAddress: string;
     receiverCity: string;
     receiverDistrict: string;
     receiverPhone: string;
     receiverEmail?: string;
     weight: number;
     width: number;
     height: number;
     length: number;
     description: string;
     codAmount?: number;
   }

   @Injectable()
   export class ArasService {
     private readonly logger = new Logger(ArasService.name);
     private readonly baseUrl = 'https://api.aras.com.tr';

     constructor(private configService: ConfigService) {}

     async createShipment(shipmentData: ArasShipmentRequest) {
       const payload = {
         CustomerId: this.configService.get<string>('ARAS_CUSTOMER_ID'),
         ReceiverName: shipmentData.receiverName,
         ReceiverAddress: shipmentData.receiverAddress,
         ReceiverCity: shipmentData.receiverCity,
         ReceiverDistrict: shipmentData.receiverDistrict,
         ReceiverPhone: shipmentData.receiverPhone,
         ReceiverEmail: shipmentData.receiverEmail,
         Weight: shipmentData.weight,
         Width: shipmentData.width,
         Height: shipmentData.height,
         Length: shipmentData.length,
         Description: shipmentData.description,
         CodAmount: shipmentData.codAmount,
         ServiceType: 'Standard', // Standard, Express, etc.
       };

       try {
         const response = await fetch(`${this.baseUrl}/shipment`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${this.configService.get<string>('ARAS_API_KEY')}`,
             'Content-Type': 'application/json',
           },
           body: JSON.stringify(payload),
         });

         const result = await response.json();

         if (result.success) {
           this.logger.log(`Aras shipment created: ${result.trackingNumber}`);
           return {
             trackingNumber: result.trackingNumber,
             labelUrl: result.labelUrl,
             estimatedDelivery: result.estimatedDelivery,
           };
         } else {
           throw new Error(result.message);
         }
       } catch (error) {
         this.logger.error('Failed to create Aras shipment', error);
         throw error;
       }
     }

     async getTrackingInfo(trackingNumber: string) {
       try {
         const response = await fetch(`${this.baseUrl}/tracking/${trackingNumber}`, {
           method: 'GET',
           headers: {
             'Authorization': `Bearer ${this.configService.get<string>('ARAS_API_KEY')}`,
           },
         });

         const trackingData = await response.json();
         return this.formatTrackingInfo(trackingData);
       } catch (error) {
         this.logger.error('Failed to get tracking info from Aras', error);
         throw error;
       }
     }

     async calculateShippingRate(data: {
       fromCity: string;
       toCity: string;
       weight: number;
       serviceType: string;
     }) {
       try {
         const response = await fetch(`${this.baseUrl}/rate`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${this.configService.get<string>('ARAS_API_KEY')}`,
             'Content-Type': 'application/json',
           },
           body: JSON.stringify(data),
         });

         const rateData = await response.json();
         return {
           price: rateData.price,
           estimatedDays: rateData.estimatedDays,
           serviceType: data.serviceType,
         };
       } catch (error) {
         this.logger.error('Failed to calculate Aras shipping rate', error);
         throw error;
       }
     }

     private formatTrackingInfo(trackingData: any) {
       return {
         trackingNumber: trackingData.trackingNumber,
         status: trackingData.status,
         estimatedDelivery: trackingData.estimatedDelivery,
         history: trackingData.history.map((item: any) => ({
           status: item.status,
           location: item.location,
           timestamp: item.timestamp,
           description: item.description,
         })),
       };
     }
   }
   ```

4. **Controller Implementation**
   ```typescript
   // src/modules/shipping/controllers/aras.controller.ts
   import { Controller, Post, Get, Body, Param } from '@nestjs/common';
   import { ArasService } from '../services/aras.service';

   @Controller('shipping/aras')
   export class ArasController {
     constructor(private readonly arasService: ArasService) {}

     @Post('shipment')
     async createShipment(@Body() shipmentData: any) {
       return this.arasService.createShipment(shipmentData);
     }

     @Get('tracking/:trackingNumber')
     async getTrackingInfo(@Param('trackingNumber') trackingNumber: string) {
       return this.arasService.getTrackingInfo(trackingNumber);
     }

     @Post('rate')
     async calculateShippingRate(@Body() rateData: any) {
       return this.arasService.calculateShippingRate(rateData);
     }
   }
   ```

## Webhook Configuration

### Setting Up Webhooks

1. **Webhook Service**
   ```typescript
   // src/modules/webhooks/services/webhook.service.ts
   import { Injectable, Logger } from '@nestjs/common';
   import { EventBusService } from '../../../core/events/event-bus.service';

   @Injectable()
   export class WebhookService {
     private readonly logger = new Logger(WebhookService.name);

     constructor(private readonly eventBusService: EventBusService) {}

     async processWebhook(provider: string, event: string, payload: any) {
       try {
         this.logger.log(`Processing ${provider} webhook: ${event}`);

         switch (provider) {
           case 'stripe':
             await this.processStripeWebhook(event, payload);
             break;
           case 'trendyol':
             await this.processTrendyolWebhook(event, payload);
             break;
           case 'hepsiburada':
             await this.processHepsiburadaWebhook(event, payload);
             break;
           case 'aras':
             await this.processArasWebhook(event, payload);
             break;
           default:
             this.logger.warn(`Unknown webhook provider: ${provider}`);
         }

         // Log webhook processing
         await this.logWebhookEvent(provider, event, payload);
       } catch (error) {
         this.logger.error(`Failed to process webhook ${provider}:${event}`, error);
         throw error;
       }
     }

     private async processStripeWebhook(event: string, payload: any) {
       switch (event) {
         case 'payment_intent.succeeded':
           await this.eventBusService.publish('payment.completed', {
             orderId: payload.metadata.orderId,
             paymentId: payload.id,
             amount: payload.amount,
             currency: payload.currency,
           });
           break;
         case 'payment_intent.payment_failed':
           await this.eventBusService.publish('payment.failed', {
             orderId: payload.metadata.orderId,
             paymentId: payload.id,
             failureReason: payload.last_payment_error?.message,
           });
           break;
       }
     }

     private async processTrendyolWebhook(event: string, payload: any) {
       switch (event) {
         case 'order.created':
           await this.eventBusService.publish('marketplace.order.created', {
             marketplace: 'trendyol',
             orderId: payload.id,
             customerInfo: payload.customer,
             items: payload.items,
           });
           break;
         case 'product.stock.updated':
           await this.eventBusService.publish('marketplace.stock.updated', {
             marketplace: 'trendyol',
             productCode: payload.productCode,
             newStock: payload.stock,
           });
           break;
       }
     }

     private async logWebhookEvent(provider: string, event: string, payload: any) {
       // Log webhook event for audit purposes
       this.logger.log(`Webhook logged: ${provider}:${event}`);
     }
   }
   ```

2. **Webhook Controller**
   ```typescript
   // src/modules/webhooks/controllers/webhook.controller.ts
   import { Controller, Post, Body, Headers, Req } from '@nestjs/common';
   import { WebhookService } from '../services/webhook.service';

   @Controller('webhooks')
   export class WebhookController {
     constructor(private readonly webhookService: WebhookService) {}

     @Post(':provider')
     async handleWebhook(
       @Param('provider') provider: string,
       @Headers() headers: any,
       @Body() payload: any,
       @Req() req: any
     ) {
       // Verify webhook signature if required
       if (provider === 'stripe') {
         await this.verifyStripeSignature(headers['stripe-signature'], req.rawBody);
       }

       await this.webhookService.processWebhook(provider, headers['x-event-type'] || 'unknown', payload);

       return { received: true };
     }

     private async verifyStripeSignature(signature: string, payload: string) {
       // Verify Stripe webhook signature
       // Implementation depends on Stripe SDK
     }
   }
   ```

## Testing Integration

### Integration Test Setup

1. **Environment Configuration for Testing**
   ```env
   # Test environment variables
   NODE_ENV=test
   DATABASE_URL=postgresql://test:test@localhost:5432/ayaztrade_test
   REDIS_URL=redis://localhost:6379/1

   # Mock API credentials for testing
   STRIPE_SECRET_KEY=sk_test_mock
   IYZICO_API_KEY=test_key
   TRENDYOL_API_KEY=test_key
   ```

2. **Test Script**
   ```typescript
   // test/integration/payments.integration.spec.ts
   import { Test, TestingModule } from '@nestjs/testing';
   import * as request from 'supertest';
   import { AppModule } from '../../src/app.module';

   describe('Payment Integration', () => {
     let app: INestApplication;

     beforeAll(async () => {
       const moduleFixture: TestingModule = await Test.createTestingModule({
         imports: [AppModule],
       }).compile();

       app = moduleFixture.createNestApplication();
       await app.init();
     });

     afterAll(async () => {
       await app.close();
     });

     describe('Stripe Integration', () => {
       it('should create payment intent', async () => {
         const response = await request(app.getHttpServer())
           .post('/api/v1/payments/stripe/create-payment-intent')
           .send({
             amount: 199.99,
             currency: 'TRY',
             orderId: 'test-order-123',
           })
           .expect(201);

         expect(response.body.clientSecret).toBeDefined();
         expect(response.body.paymentIntentId).toBeDefined();
       });

       it('should handle payment webhook', async () => {
         const webhookPayload = {
           id: 'evt_test_webhook',
           object: 'event',
           type: 'payment_intent.succeeded',
           data: {
             object: {
               id: 'pi_test_123',
               metadata: { orderId: 'test-order-123' },
             },
           },
         };

         const response = await request(app.getHttpServer())
           .post('/api/v1/webhooks/stripe')
           .set('stripe-signature', 'test_signature')
           .send(webhookPayload)
           .expect(200);

         expect(response.body.received).toBe(true);
       });
     });
   });
   ```

## Troubleshooting Integration Issues

### Common Issues and Solutions

1. **Authentication Failures**
   ```bash
   # Check API credentials
   echo "Testing API connection..."
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.provider.com/test

   # Verify environment variables
   echo $STRIPE_SECRET_KEY
   echo $TRENDYOL_API_KEY
   ```

2. **Webhook Delivery Issues**
   ```bash
   # Check webhook endpoint accessibility
   curl -X POST https://your-domain.com/api/v1/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"test": "webhook"}'

   # Check webhook logs
   tail -f logs/webhook.log
   ```

3. **Rate Limiting Issues**
   ```bash
   # Check API rate limits
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-RateLimit-Limit: 100" \
     https://api.provider.com/endpoint

   # Implement exponential backoff
   npm install exponential-backoff
   ```

4. **Data Synchronization Issues**
   ```bash
   # Check sync logs
   tail -f logs/sync.log

   # Manual sync trigger
   curl -X POST https://your-domain.com/api/v1/integrations/trendyol/sync

   # Verify database state
   psql -d ayaztrade -c "SELECT * FROM products WHERE sku = 'TEST-SKU'"
   ```

### Monitoring Integration Health

1. **Health Check Endpoints**
   ```typescript
   // src/modules/integrations/controllers/health.controller.ts
   import { Controller, Get } from '@nestjs/common';
   import { StripeService } from '../services/stripe.service';
   import { TrendyolService } from '../services/trendyol.service';

   @Controller('integrations/health')
   export class IntegrationHealthController {
     constructor(
       private readonly stripeService: StripeService,
       private readonly trendyolService: TrendyolService,
     ) {}

     @Get('stripe')
     async checkStripeHealth() {
       try {
         // Test Stripe API connection
         await this.stripeService.testConnection();
         return { status: 'healthy', service: 'stripe' };
       } catch (error) {
         return { status: 'unhealthy', service: 'stripe', error: error.message };
       }
     }

     @Get('trendyol')
     async checkTrendyolHealth() {
       try {
         await this.trendyolService.testConnection();
         return { status: 'healthy', service: 'trendyol' };
       } catch (error) {
         return { status: 'unhealthy', service: 'trendyol', error: error.message };
       }
     }
   }
   ```

2. **Integration Metrics**
   ```typescript
   // Prometheus metrics for integrations
   const integrationRequests = new Counter({
     name: 'integration_requests_total',
     help: 'Total integration requests',
     labelNames: ['provider', 'endpoint', 'status'],
   });

   const integrationResponseTime = new Histogram({
     name: 'integration_response_time_seconds',
     help: 'Integration response time',
     labelNames: ['provider', 'endpoint'],
   });
   ```

## Best Practices

### Security Considerations

1. **API Key Management**
   ```env
   # Use environment variables only
   STRIPE_SECRET_KEY=sk_live_...
   # Never commit API keys to version control
   ```

2. **Webhook Security**
   ```typescript
   // Always verify webhook signatures
   const isValidSignature = verifySignature(payload, signature, secret);
   if (!isValidSignature) {
     throw new Error('Invalid webhook signature');
   }
   ```

3. **Rate Limiting**
   ```typescript
   // Implement rate limiting for integration endpoints
   @UseGuards(ThrottlerGuard)
   @Throttle(100, 60) // 100 requests per minute
   async syncProducts() {
     // Implementation
   }
   ```

### Performance Optimization

1. **Batch Processing**
   ```typescript
   // Process multiple items in batches
   async syncProducts(products: Product[]) {
     const batchSize = 10;
     for (let i = 0; i < products.length; i += batchSize) {
       const batch = products.slice(i, i + batchSize);
       await this.processBatch(batch);
       // Add delay between batches
       await this.delay(1000);
     }
   }
   ```

2. **Caching Integration Data**
   ```typescript
   // Cache frequently accessed data
   async getProductCategories() {
     const cacheKey = 'trendyol:categories';
     const cached = await this.cacheService.get(cacheKey);

     if (cached) {
       return cached;
     }

     const categories = await this.fetchCategories();
     await this.cacheService.set(cacheKey, categories, 3600); // 1 hour

     return categories;
   }
   ```

### Error Handling

1. **Retry Logic**
   ```typescript
   async retryOperation<T>(
     operation: () => Promise<T>,
     maxRetries: number = 3,
     delay: number = 1000
   ): Promise<T> {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await operation();
       } catch (error) {
         if (i === maxRetries - 1) {
           throw error;
         }
         await this.delay(delay * Math.pow(2, i)); // Exponential backoff
       }
     }
   }
   ```

2. **Error Logging**
   ```typescript
   async syncProducts() {
     try {
       await this.trendyolService.syncProducts(this.products);
       this.logger.log('Product sync completed successfully');
     } catch (error) {
       this.logger.error('Product sync failed', {
         error: error.message,
         stack: error.stack,
         productCount: this.products.length,
       });

       // Send alert to admin
       await this.alertService.sendAlert({
         type: 'integration_error',
         message: 'Trendyol product sync failed',
         details: error.message,
       });
     }
   }
   ```

## Support and Documentation

For additional integration support:

- **Documentation**: docs.ayaztrade.com/integrations
- **API Reference**: api.ayaztrade.com/docs
- **Community Forum**: community.ayaztrade.com
- **Support Email**: integrations@ayaztrade.com

---

**Last Updated**: October 26, 2025
**Version**: 1.0
