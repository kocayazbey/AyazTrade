import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface AmazonProduct {
  asin: string;
  sku: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  images: string[];
  price: number;
  stock: number;
  fbaStock?: number;
  fbmStock?: number;
  attributes: Record<string, any>;
  status: 'active' | 'inactive' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

interface AmazonOrder {
  amazonOrderId: string;
  merchantOrderId?: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address: {
      name: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      countryCode: string;
    };
  };
  items: Array<{
    orderItemId: string;
    asin: string;
    sku: string;
    title: string;
    quantity: number;
    price: number;
    totalPrice: number;
    fulfillmentChannel: 'AFN' | 'MFN';
  }>;
  totalAmount: number;
  shippingAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  fulfillmentChannel: 'AFN' | 'MFN';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AmazonTRService {
  private readonly logger = new Logger(AmazonTRService.name);
  private readonly baseUrl = 'https://sellingpartnerapi-na.amazon.com';

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async syncProducts(instanceId: string): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors?: string[];
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const products = await this.getProductsFromAmazon(instance);

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const product of products) {
        try {
          await this.saveProductToLocal(product, instance);
          synced++;
        } catch (error) {
          failed++;
          errors.push(`Product ${product.asin}: ${error.message}`);
        }
      }

      await this.updateSyncStatus(instanceId, 'completed', synced, failed);
      return { success: true, synced, failed, errors };

    } catch (error) {
      this.logger.error('Product sync failed', error);
      await this.updateSyncStatus(instanceId, 'failed', 0, 0, error.message);
      return { success: false, synced: 0, failed: 0, errors: [error.message] };
    }
  }

  async syncOrders(instanceId: string): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors?: string[];
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const orders = await this.getOrdersFromAmazon(instance);

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const order of orders) {
        try {
          await this.saveOrderToLocal(order, instance);
          synced++;
        } catch (error) {
          failed++;
          errors.push(`Order ${order.amazonOrderId}: ${error.message}`);
        }
      }

      await this.updateSyncStatus(instanceId, 'completed', synced, failed);
      return { success: true, synced, failed, errors };

    } catch (error) {
      this.logger.error('Order sync failed', error);
      await this.updateSyncStatus(instanceId, 'failed', 0, 0, error.message);
      return { success: false, synced: 0, failed: 0, errors: [error.message] };
    }
  }

  async updateInventory(instanceId: string, updates: Array<{
    asin: string;
    sku: string;
    stock: number;
    fulfillmentChannel: 'AFN' | 'MFN';
  }>): Promise<{
    success: boolean;
    updated: number;
    failed: number;
    errors?: string[];
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      let updated = 0;
      let failed = 0;
      const errors = [];

      for (const update of updates) {
        try {
          await this.updateInventoryOnAmazon(instance, update);
          await this.updateLocalInventory(update);
          updated++;
        } catch (error) {
          failed++;
          errors.push(`SKU ${update.sku}: ${error.message}`);
        }
      }

      return { success: true, updated, failed, errors };

    } catch (error) {
      this.logger.error('Inventory update failed', error);
      return { success: false, updated: 0, failed: 0, errors: [error.message] };
    }
  }

  async updateOrderStatus(instanceId: string, orderId: string, status: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      await this.updateOrderStatusOnAmazon(instance, orderId, status);
      await this.updateLocalOrderStatus(orderId, status);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update order status: ${orderId}`, error);
      return { success: false, error: error.message };
    }
  }

  async getFBAInventory(instanceId: string): Promise<Array<{
    asin: string;
    sku: string;
    fbaStock: number;
    reservedStock: number;
    availableStock: number;
  }>> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      return await this.getFBAInventoryFromAmazon(instance);
    } catch (error) {
      this.logger.error('Failed to get FBA inventory', error);
      return [];
    }
  }

  async createFBAShipment(instanceId: string, shipmentData: any): Promise<{
    success: boolean;
    shipmentId?: string;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      return await this.createFBAShipmentOnAmazon(instance, shipmentData);
    } catch (error) {
      this.logger.error('Failed to create FBA shipment', error);
      return { success: false, error: error.message };
    }
  }

  async getSellerCentralReports(instanceId: string, reportType: string): Promise<any> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      return await this.getReportFromAmazon(instance, reportType);
    } catch (error) {
      this.logger.error('Failed to get seller central report', error);
      return null;
    }
  }

  private async getIntegrationInstance(instanceId: string): Promise<any> {
    const result = await this.db.execute(
      'SELECT * FROM integration_instances WHERE id = $1',
      [instanceId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Integration instance not found: ${instanceId}`);
    }

    return {
      ...result.rows[0],
      config: JSON.parse(result.rows[0].config || '{}'),
      credentials: JSON.parse(result.rows[0].credentials || '{}')
    };
  }

  private async getProductsFromAmazon(instance: any): Promise<AmazonProduct[]> {
    const response = await this.makeApiCall(
      instance,
      'GET',
      '/listings/2021-08-01/items',
      { marketplaceIds: [instance.config.marketplaceId] }
    );

    return response.data?.items || [];
  }

  private async getOrdersFromAmazon(instance: any): Promise<AmazonOrder[]> {
    const response = await this.makeApiCall(
      instance,
      'GET',
      '/orders/v0/orders',
      {
        MarketplaceIds: [instance.config.marketplaceId],
        CreatedAfter: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    );

    return response.data?.Orders || [];
  }

  private async saveProductToLocal(product: AmazonProduct, instance: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO amazon_products (asin, sku, title, description, brand, category, images, price, stock, fba_stock, fbm_stock, attributes, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (asin) DO UPDATE SET
        sku = $2, title = $3, description = $4, brand = $5, category = $6,
        images = $7, price = $8, stock = $9, fba_stock = $10, fbm_stock = $11,
        attributes = $12, status = $13, updated_at = $15
    `, [
      product.asin,
      product.sku,
      product.title,
      product.description,
      product.brand,
      product.category,
      JSON.stringify(product.images),
      product.price,
      product.stock,
      product.fbaStock,
      product.fbmStock,
      JSON.stringify(product.attributes),
      product.status,
      product.createdAt,
      product.updatedAt
    ]);
  }

  private async saveOrderToLocal(order: AmazonOrder, instance: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO amazon_orders (amazon_order_id, merchant_order_id, order_number, customer_data, items, total_amount, shipping_amount, status, fulfillment_channel, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (amazon_order_id) DO UPDATE SET
        merchant_order_id = $2, order_number = $3, customer_data = $4, items = $5,
        total_amount = $6, shipping_amount = $7, status = $8, fulfillment_channel = $9, updated_at = $11
    `, [
      order.amazonOrderId,
      order.merchantOrderId,
      order.orderNumber,
      JSON.stringify(order.customer),
      JSON.stringify(order.items),
      order.totalAmount,
      order.shippingAmount,
      order.status,
      order.fulfillmentChannel,
      order.createdAt,
      order.updatedAt
    ]);
  }

  private async updateInventoryOnAmazon(instance: any, update: any): Promise<void> {
    await this.makeApiCall(
      instance,
      'PUT',
      `/listings/2021-08-01/items/${instance.config.sellerId}/inventory`,
      {
        marketplaceIds: [instance.config.marketplaceId],
        inventory: [{
          asin: update.asin,
          sku: update.sku,
          quantity: update.stock,
          fulfillmentChannelCode: update.fulfillmentChannel
        }]
      }
    );
  }

  private async updateLocalInventory(update: any): Promise<void> {
    await this.db.execute(`
      UPDATE products SET stock = $1, updated_at = $2 WHERE sku = $3
    `, [update.stock, new Date(), update.sku]);
  }

  private async updateOrderStatusOnAmazon(instance: any, orderId: string, status: string): Promise<void> {
    await this.makeApiCall(
      instance,
      'POST',
      `/orders/v0/orders/${orderId}/orderItems/acknowledgment`,
      {
        marketplaceId: instance.config.marketplaceId,
        acknowledged: true
      }
    );
  }

  private async updateLocalOrderStatus(orderId: string, status: string): Promise<void> {
    await this.db.execute(`
      UPDATE orders SET status = $1, updated_at = $2 WHERE external_order_id = $3
    `, [status, new Date(), orderId]);
  }

  private async getFBAInventoryFromAmazon(instance: any): Promise<Array<{
    asin: string;
    sku: string;
    fbaStock: number;
    reservedStock: number;
    availableStock: number;
  }>> {
    const response = await this.makeApiCall(
      instance,
      'GET',
      '/fba/inventory/v1/summaries',
      { marketplaceIds: [instance.config.marketplaceId] }
    );

    return response.data?.summaries || [];
  }

  private async createFBAShipmentOnAmazon(instance: any, shipmentData: any): Promise<{
    success: boolean;
    shipmentId?: string;
    error?: string;
  }> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/fba/inbound/v0/shipments',
      shipmentData
    );

    return {
      success: true,
      shipmentId: response.data?.shipmentId
    };
  }

  private async getReportFromAmazon(instance: any, reportType: string): Promise<any> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/reports/2021-06-30/reports',
      {
        marketplaceIds: [instance.config.marketplaceId],
        reportType: reportType
      }
    );

    return response.data;
  }

  private async makeApiCall(instance: any, method: string, path: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${instance.credentials.accessToken}`,
      'Content-Type': 'application/json',
      'X-Amz-User-Agent': 'AyazTrade-Amazon/1.0'
    };

    this.logger.log(`Making Amazon API call: ${method} ${url}`);

    // Mock API response
    return {
      success: true,
      data: {
        items: [],
        Orders: []
      }
    };
  }

  private async updateSyncStatus(instanceId: string, status: string, synced: number, failed: number, error?: string): Promise<void> {
    await this.db.execute(`
      UPDATE integration_instances SET
        last_sync = $2,
        updated_at = $3,
        sync_stats = $4
      WHERE id = $1
    `, [
      instanceId,
      new Date(),
      new Date(),
      JSON.stringify({ status, synced, failed, error, timestamp: new Date() })
    ]);
  }
}
