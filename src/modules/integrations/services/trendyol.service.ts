import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface TrendyolProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  brand: string;
  category: string;
  description: string;
  images: string[];
  price: number;
  stock: number;
  attributes: Record<string, any>;
  status: 'active' | 'inactive' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

interface TrendyolOrder {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: {
      fullName: string;
      address: string;
      city: string;
      district: string;
      postalCode: string;
    };
  };
  items: Array<{
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  shippingAmount: number;
  status: 'created' | 'approved' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

interface TrendyolInventoryUpdate {
  productId: string;
  sku: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
}

@Injectable()
export class TrendyolService {
  private readonly logger = new Logger(TrendyolService.name);
  private readonly baseUrl = 'https://api.trendyol.com/sapigw';

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
      const products = await this.getProductsFromTrendyol(instance);

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const product of products) {
        try {
          await this.saveProductToLocal(product, instance);
          synced++;
        } catch (error) {
          failed++;
          errors.push(`Product ${product.id}: ${error.message}`);
        }
      }

      await this.updateSyncStatus(instanceId, 'completed', synced, failed);

      this.logger.log(`Product sync completed: ${synced} synced, ${failed} failed`);
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
      const orders = await this.getOrdersFromTrendyol(instance);

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const order of orders) {
        try {
          await this.saveOrderToLocal(order, instance);
          synced++;
        } catch (error) {
          failed++;
          errors.push(`Order ${order.id}: ${error.message}`);
        }
      }

      await this.updateSyncStatus(instanceId, 'completed', synced, failed);

      this.logger.log(`Order sync completed: ${synced} synced, ${failed} failed`);
      return { success: true, synced, failed, errors };

    } catch (error) {
      this.logger.error('Order sync failed', error);
      await this.updateSyncStatus(instanceId, 'failed', 0, 0, error.message);
      return { success: false, synced: 0, failed: 0, errors: [error.message] };
    }
  }

  async updateInventory(instanceId: string, updates: TrendyolInventoryUpdate[]): Promise<{
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
          await this.updateInventoryOnTrendyol(instance, update);
          await this.updateLocalInventory(update);
          updated++;
        } catch (error) {
          failed++;
          errors.push(`SKU ${update.sku}: ${error.message}`);
        }
      }

      this.logger.log(`Inventory update completed: ${updated} updated, ${failed} failed`);
      return { success: true, updated, failed, errors };

    } catch (error) {
      this.logger.error('Inventory update failed', error);
      return { success: false, updated: 0, failed: 0, errors: [error.message] };
    }
  }

  async getProductById(instanceId: string, productId: string): Promise<TrendyolProduct> {
    const instance = await this.getIntegrationInstance(instanceId);
    return this.getProductFromTrendyol(instance, productId);
  }

  async updateOrderStatus(instanceId: string, orderId: string, status: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      await this.updateOrderStatusOnTrendyol(instance, orderId, status);
      await this.updateLocalOrderStatus(orderId, status);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update order status: ${orderId}`, error);
      return { success: false, error: error.message };
    }
  }

  async getShippingRates(instanceId: string, orderData: any): Promise<{
    success: boolean;
    rates?: Array<{
      service: string;
      cost: number;
      estimatedDays: number;
    }>;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const rates = await this.getShippingRatesFromTrendyol(instance, orderData);

      return { success: true, rates };
    } catch (error) {
      this.logger.error('Failed to get shipping rates', error);
      return { success: false, error: error.message };
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

  private async getProductsFromTrendyol(instance: any): Promise<TrendyolProduct[]> {
    const response = await this.makeApiCall(instance, 'GET', '/suppliers/{supplierId}/products');

    // Parse real Trendyol API response
    if (!response.data?.content) {
      return [];
    }

    return response.data.content.map((item: any) => ({
      id: item.id?.toString() || '',
      name: item.productName || '',
      sku: item.stockCode || '',
      barcode: item.barcode || '',
      brand: item.brand?.name || '',
      category: item.category?.name || '',
      description: item.description || '',
      images: item.images?.map((img: any) => img.url) || [],
      price: parseFloat(item.salePrice || 0),
      stock: parseInt(item.quantity || 0),
      attributes: item.attributes || {},
      status: item.approved ? 'active' : 'inactive',
      createdAt: new Date(item.createDate || Date.now()),
      updatedAt: new Date(item.lastModifiedDate || Date.now())
    }));
  }

  private async getOrdersFromTrendyol(instance: any): Promise<TrendyolOrder[]> {
    const response = await this.makeApiCall(instance, 'GET', '/suppliers/{supplierId}/orders');

    // Parse real Trendyol API response
    if (!response.data?.content) {
      return [];
    }

    return response.data.content.map((order: any) => ({
      id: order.id?.toString() || '',
      orderNumber: order.orderNumber || '',
      customer: {
        name: order.customerFirstName && order.customerLastName
          ? `${order.customerFirstName} ${order.customerLastName}`
          : 'Unknown Customer',
        email: order.customerEmail || '',
        phone: order.customerMobilePhone || '',
        address: {
          fullName: order.cargoCompanyName || '',
          address: order.cargoAddress || '',
          city: order.cargoCity || '',
          district: order.cargoDistrict || '',
          postalCode: order.cargoPostcode || ''
        }
      },
      items: order.lines?.map((item: any) => ({
        productId: item.productId?.toString() || '',
        sku: item.stockCode || '',
        name: item.productName || '',
        quantity: parseInt(item.quantity || 0),
        price: parseFloat(item.price || 0),
        totalPrice: parseFloat(item.totalPrice || 0)
      })) || [],
      totalAmount: parseFloat(order.totalPrice || 0),
      shippingAmount: parseFloat(order.cargoCompanyPrice || 0),
      status: this.mapTrendyolOrderStatus(order.status || ''),
      createdAt: new Date(order.orderDate || Date.now()),
      updatedAt: new Date(order.lastModifiedDate || Date.now())
    }));
  }

  private async saveProductToLocal(product: TrendyolProduct, instance: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO trendyol_products (id, name, sku, barcode, brand, category, description, images, price, stock, attributes, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        name = $2, sku = $3, barcode = $4, brand = $5, category = $6,
        description = $7, images = $8, price = $9, stock = $10,
        attributes = $11, status = $12, updated_at = $14
    `, [
      product.id,
      product.name,
      product.sku,
      product.barcode,
      product.brand,
      product.category,
      product.description,
      JSON.stringify(product.images),
      product.price,
      product.stock,
      JSON.stringify(product.attributes),
      product.status,
      product.createdAt,
      product.updatedAt
    ]);
  }

  private async saveOrderToLocal(order: TrendyolOrder, instance: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO trendyol_orders (id, order_number, customer_data, items, total_amount, shipping_amount, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        order_number = $2, customer_data = $3, items = $4,
        total_amount = $5, shipping_amount = $6, status = $7, updated_at = $9
    `, [
      order.id,
      order.orderNumber,
      JSON.stringify(order.customer),
      JSON.stringify(order.items),
      order.totalAmount,
      order.shippingAmount,
      order.status,
      order.createdAt,
      order.updatedAt
    ]);
  }

  private async updateInventoryOnTrendyol(instance: any, update: TrendyolInventoryUpdate): Promise<void> {
    await this.makeApiCall(
      instance,
      'PUT',
      `/suppliers/{supplierId}/products/${update.productId}/stock`,
      { stock: update.stock }
    );
  }

  private async updateLocalInventory(update: TrendyolInventoryUpdate): Promise<void> {
    await this.db.execute(`
      UPDATE products SET stock = $1, updated_at = $2 WHERE sku = $3
    `, [update.availableStock, new Date(), update.sku]);
  }

  private async getProductFromTrendyol(instance: any, productId: string): Promise<TrendyolProduct> {
    const response = await this.makeApiCall(
      instance,
      'GET',
      `/suppliers/{supplierId}/products/${productId}`
    );

    return response.data;
  }

  private async updateOrderStatusOnTrendyol(instance: any, orderId: string, status: string): Promise<void> {
    await this.makeApiCall(
      instance,
      'PUT',
      `/suppliers/{supplierId}/orders/${orderId}/status`,
      { status }
    );
  }

  private async updateLocalOrderStatus(orderId: string, status: string): Promise<void> {
    await this.db.execute(`
      UPDATE orders SET status = $1, updated_at = $2 WHERE external_order_id = $3
    `, [status, new Date(), orderId]);
  }

  private async getShippingRatesFromTrendyol(instance: any, orderData: any): Promise<Array<{
    service: string;
    cost: number;
    estimatedDays: number;
  }>> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/suppliers/{supplierId}/shipping-rates',
      orderData
    );

    return response.data;
  }

  private async makeApiCall(instance: any, method: string, path: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${path.replace('{supplierId}', instance.config.supplierId)}`;

    // Generate authentication token (Trendyol uses API Key + Secret)
    const authString = Buffer.from(`${instance.credentials.apiKey}:${instance.credentials.apiSecret}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AyazTrade-Trendyol/1.0',
      'X-Requested-With': 'XMLHttpRequest'
    };

    this.logger.log(`Making Trendyol API call: ${method} ${url}`);

    try {
      // Real HTTP request implementation (using fetch for Node.js)
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        throw new Error(`Trendyol API Error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();

      // Handle Trendyol-specific response structure
      if (responseData.success === false) {
        throw new Error(`Trendyol API Error: ${responseData.message || 'Unknown error'}`);
      }

      return {
        success: true,
        data: responseData,
        statusCode: response.status
      };

    } catch (error) {
      this.logger.error(`Trendyol API call failed: ${method} ${url}`, error);

      // Handle specific error types
      if (error.message.includes('401')) {
        throw new Error('Trendyol API authentication failed. Check API credentials.');
      } else if (error.message.includes('403')) {
        throw new Error('Trendyol API access forbidden. Check API permissions.');
      } else if (error.message.includes('429')) {
        throw new Error('Trendyol API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('500')) {
        throw new Error('Trendyol API server error. Please try again later.');
      }

      throw error;
    }
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

  private mapTrendyolOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'Created': 'pending',
      'Picking': 'processing',
      'Invoiced': 'processing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'UnDelivered': 'failed',
      'Returned': 'returned'
    };
    return statusMap[status] || 'pending';
  }
}
