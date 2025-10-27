import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface HepsiburadaProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  images: string[];
  price: number;
  stock: number;
  attributes: Record<string, any>;
  status: 'active' | 'inactive' | 'deleted';
  variants?: Array<{
    variantId: string;
    variantName: string;
    price: number;
    stock: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface HepsiburadaOrder {
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
    variantId?: string;
  }>;
  totalAmount: number;
  shippingAmount: number;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

interface HepsiburadaPriceUpdate {
  productId: string;
  sku: string;
  price: number;
  discountPrice?: number;
  discountRate?: number;
}

@Injectable()
export class HepsiburadaService {
  private readonly logger = new Logger(HepsiburadaService.name);
  private readonly baseUrl = 'https://api.hepsiburada.com';

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
      const products = await this.getProductsFromHepsiburada(instance);

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
      const orders = await this.getOrdersFromHepsiburada(instance);

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

  async updatePrices(instanceId: string, updates: HepsiburadaPriceUpdate[]): Promise<{
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
          await this.updatePriceOnHepsiburada(instance, update);
          await this.updateLocalPrice(update);
          updated++;
        } catch (error) {
          failed++;
          errors.push(`SKU ${update.sku}: ${error.message}`);
        }
      }

      this.logger.log(`Price update completed: ${updated} updated, ${failed} failed`);
      return { success: true, updated, failed, errors };

    } catch (error) {
      this.logger.error('Price update failed', error);
      return { success: false, updated: 0, failed: 0, errors: [error.message] };
    }
  }

  async updateInventory(instanceId: string, updates: Array<{
    productId: string;
    sku: string;
    stock: number;
    reservedStock?: number;
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
          await this.updateInventoryOnHepsiburada(instance, update);
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

  async getProductById(instanceId: string, productId: string): Promise<HepsiburadaProduct> {
    const instance = await this.getIntegrationInstance(instanceId);
    return this.getProductFromHepsiburada(instance, productId);
  }

  async updateOrderStatus(instanceId: string, orderId: string, status: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      await this.updateOrderStatusOnHepsiburada(instance, orderId, status);
      await this.updateLocalOrderStatus(orderId, status);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update order status: ${orderId}`, error);
      return { success: false, error: error.message };
    }
  }

  async getCategories(instanceId: string): Promise<Array<{
    id: string;
    name: string;
    parentId?: string;
    level: number;
  }>> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      return await this.getCategoriesFromHepsiburada(instance);
    } catch (error) {
      this.logger.error('Failed to get categories', error);
      return [];
    }
  }

  async getBrands(instanceId: string): Promise<Array<{
    id: string;
    name: string;
    status: string;
  }>> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      return await this.getBrandsFromHepsiburada(instance);
    } catch (error) {
      this.logger.error('Failed to get brands', error);
      return [];
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

  private async getProductsFromHepsiburada(instance: any): Promise<HepsiburadaProduct[]> {
    const response = await this.makeApiCall(instance, 'GET', '/listings/v1/');

    // Parse real Hepsiburada API response
    if (!response.data?.items) {
      return [];
    }

    return response.data.items.map((item: any) => ({
      id: item.id?.toString() || '',
      sku: item.sku || '',
      name: item.title || '',
      description: item.description || '',
      brand: item.brand?.name || '',
      category: item.category?.name || '',
      images: item.images?.map((img: any) => img.url) || [],
      price: parseFloat(item.price || 0),
      stock: parseInt(item.stock || 0),
      attributes: item.attributes || {},
      status: item.status === 'Active' ? 'active' : 'inactive',
      variants: item.variants?.map((variant: any) => ({
        variantId: variant.id?.toString() || '',
        variantName: variant.name || '',
        price: parseFloat(variant.price || 0),
        stock: parseInt(variant.stock || 0)
      })) || [],
      createdAt: new Date(item.createdDate || Date.now()),
      updatedAt: new Date(item.lastModifiedDate || Date.now())
    }));
  }

  private async getOrdersFromHepsiburada(instance: any): Promise<HepsiburadaOrder[]> {
    const response = await this.makeApiCall(instance, 'GET', '/orders/v1/');

    // Parse real Hepsiburada API response
    if (!response.data?.items) {
      return [];
    }

    return response.data.items.map((order: any) => ({
      id: order.id?.toString() || '',
      orderNumber: order.orderNumber || '',
      customer: {
        name: order.customerName || 'Unknown Customer',
        email: order.customerEmail || '',
        phone: order.customerPhone || '',
        address: {
          fullName: order.shippingAddress?.fullName || '',
          address: order.shippingAddress?.address || '',
          city: order.shippingAddress?.city || '',
          district: order.shippingAddress?.district || '',
          postalCode: order.shippingAddress?.postalCode || ''
        }
      },
      items: order.items?.map((item: any) => ({
        productId: item.productId?.toString() || '',
        sku: item.sku || '',
        name: item.productName || '',
        quantity: parseInt(item.quantity || 0),
        price: parseFloat(item.price || 0),
        totalPrice: parseFloat(item.totalPrice || 0),
        variantId: item.variantId?.toString()
      })) || [],
      totalAmount: parseFloat(order.totalAmount || 0),
      shippingAmount: parseFloat(order.shippingAmount || 0),
      status: this.mapHepsiburadaOrderStatus(order.status || ''),
      createdAt: new Date(order.createdDate || Date.now()),
      updatedAt: new Date(order.lastModifiedDate || Date.now())
    }));
  }

  private async saveProductToLocal(product: HepsiburadaProduct, instance: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO hepsiburada_products (id, sku, name, description, brand, category, images, price, stock, attributes, status, variants, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        sku = $2, name = $3, description = $4, brand = $5, category = $6,
        images = $7, price = $8, stock = $9, attributes = $10,
        status = $11, variants = $12, updated_at = $14
    `, [
      product.id,
      product.sku,
      product.name,
      product.description,
      product.brand,
      product.category,
      JSON.stringify(product.images),
      product.price,
      product.stock,
      JSON.stringify(product.attributes),
      product.status,
      JSON.stringify(product.variants || []),
      product.createdAt,
      product.updatedAt
    ]);
  }

  private async saveOrderToLocal(order: HepsiburadaOrder, instance: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO hepsiburada_orders (id, order_number, customer_data, items, total_amount, shipping_amount, status, created_at, updated_at)
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

  private async updatePriceOnHepsiburada(instance: any, update: HepsiburadaPriceUpdate): Promise<void> {
    await this.makeApiCall(
      instance,
      'PUT',
      `/listings/${update.productId}/price`,
      {
        price: update.price,
        discountPrice: update.discountPrice,
        discountRate: update.discountRate
      }
    );
  }

  private async updateInventoryOnHepsiburada(instance: any, update: any): Promise<void> {
    await this.makeApiCall(
      instance,
      'PUT',
      `/listings/${update.productId}/inventory`,
      {
        stock: update.stock,
        reservedStock: update.reservedStock
      }
    );
  }

  private async updateLocalPrice(update: HepsiburadaPriceUpdate): Promise<void> {
    await this.db.execute(`
      UPDATE products SET price = $1, updated_at = $2 WHERE sku = $3
    `, [update.price, new Date(), update.sku]);
  }

  private async updateLocalInventory(update: any): Promise<void> {
    await this.db.execute(`
      UPDATE products SET stock = $1, updated_at = $2 WHERE sku = $3
    `, [update.stock, new Date(), update.sku]);
  }

  private async getProductFromHepsiburada(instance: any, productId: string): Promise<HepsiburadaProduct> {
    const response = await this.makeApiCall(
      instance,
      'GET',
      `/listings/${productId}`
    );

    return response.data;
  }

  private async updateOrderStatusOnHepsiburada(instance: any, orderId: string, status: string): Promise<void> {
    await this.makeApiCall(
      instance,
      'PUT',
      `/orders/${orderId}/status`,
      { status }
    );
  }

  private async updateLocalOrderStatus(orderId: string, status: string): Promise<void> {
    await this.db.execute(`
      UPDATE orders SET status = $1, updated_at = $2 WHERE external_order_id = $3
    `, [status, new Date(), orderId]);
  }

  private async getCategoriesFromHepsiburada(instance: any): Promise<Array<{
    id: string;
    name: string;
    parentId?: string;
    level: number;
  }>> {
    const response = await this.makeApiCall(instance, 'GET', '/categories');

    return response.data || [];
  }

  private async getBrandsFromHepsiburada(instance: any): Promise<Array<{
    id: string;
    name: string;
    status: string;
  }>> {
    const response = await this.makeApiCall(instance, 'GET', '/brands');

    return response.data || [];
  }

  private async makeApiCall(instance: any, method: string, path: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${instance.credentials.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AyazTrade-Hepsiburada/1.0',
      'Accept': 'application/json'
    };

    this.logger.log(`Making Hepsiburada API call: ${method} ${url}`);

    try {
      // Real HTTP request implementation
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Hepsiburada API Error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const responseData = await response.json();

      return {
        success: true,
        data: responseData,
        statusCode: response.status
      };

    } catch (error) {
      this.logger.error(`Hepsiburada API call failed: ${method} ${url}`, error);

      // Handle specific error types
      if (error.message.includes('401')) {
        throw new Error('Hepsiburada API authentication failed. Check access token.');
      } else if (error.message.includes('403')) {
        throw new Error('Hepsiburada API access forbidden. Check API permissions.');
      } else if (error.message.includes('429')) {
        throw new Error('Hepsiburada API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('500')) {
        throw new Error('Hepsiburada API server error. Please try again later.');
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

  private mapHepsiburadaOrderStatus(status: string): 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' {
    switch (status.toLowerCase()) {
      case 'created':
      case 'waiting':
        return 'pending';
      case 'approved':
      case 'confirmed':
        return 'approved';
      case 'shipped':
      case 'sent':
        return 'shipped';
      case 'delivered':
      case 'completed':
        return 'delivered';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      case 'refunded':
      case 'returned':
        return 'refunded';
      default:
        return 'pending';
    }
  }
}
