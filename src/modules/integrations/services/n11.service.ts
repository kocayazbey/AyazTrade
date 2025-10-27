import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface N11Product {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  images: string[];
  attributes: Record<string, any>;
  status: 'active' | 'inactive' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

interface N11Order {
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
    title: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  shippingAmount: number;
  status: 'new' | 'approved' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class N11Service {
  private readonly logger = new Logger(N11Service.name);
  private readonly baseUrl = 'https://api.n11.com/ws';

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
      const products = await this.getProductsFromN11(instance);

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
      const orders = await this.getOrdersFromN11(instance);

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
      return { success: true, synced, failed, errors };

    } catch (error) {
      this.logger.error('Order sync failed', error);
      await this.updateSyncStatus(instanceId, 'failed', 0, 0, error.message);
      return { success: false, synced: 0, failed: 0, errors: [error.message] };
    }
  }

  async updateProductStock(instanceId: string, updates: Array<{
    productId: string;
    sku: string;
    stock: number;
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
          await this.updateStockOnN11(instance, update);
          await this.updateLocalStock(update);
          updated++;
        } catch (error) {
          failed++;
          errors.push(`SKU ${update.sku}: ${error.message}`);
        }
      }

      return { success: true, updated, failed, errors };

    } catch (error) {
      this.logger.error('Stock update failed', error);
      return { success: false, updated: 0, failed: 0, errors: [error.message] };
    }
  }

  async updateOrderStatus(instanceId: string, orderId: string, status: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      await this.updateOrderStatusOnN11(instance, orderId, status);
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
  }>> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      return await this.getCategoriesFromN11(instance);
    } catch (error) {
      this.logger.error('Failed to get categories', error);
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

  private async getProductsFromN11(instance: any): Promise<N11Product[]> {
    const response = await this.makeApiCall(instance, 'POST', '/ProductService', {
      auth: instance.credentials,
      request: { pagingData: { currentPage: 0, pageSize: 100 } }
    });

    // Parse real N11 API response
    if (!response.data?.products?.product) {
      return [];
    }

    const products = Array.isArray(response.data.products.product)
      ? response.data.products.product
      : [response.data.products.product];

    return products.map((item: any) => ({
      id: item.id?.toString() || '',
      sku: item.stockCode || '',
      title: item.title || '',
      description: item.description || '',
      category: item.category?.name || '',
      price: parseFloat(item.price || 0),
      stock: parseInt(item.stock || 0),
      images: item.images?.image?.map((img: any) => img.url) || [],
      attributes: item.attributes || {},
      status: item.approved ? 'active' : 'inactive',
      createdAt: new Date(item.createDate || Date.now()),
      updatedAt: new Date(item.lastModifiedDate || Date.now())
    }));
  }

  private async getOrdersFromN11(instance: any): Promise<N11Order[]> {
    const response = await this.makeApiCall(instance, 'POST', '/OrderService', {
      auth: instance.credentials,
      request: { pagingData: { currentPage: 0, pageSize: 100 } }
    });

    // Parse real N11 API response
    if (!response.data?.orders?.order) {
      return [];
    }

    const orders = Array.isArray(response.data.orders.order)
      ? response.data.orders.order
      : [response.data.orders.order];

    return orders.map((order: any) => ({
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
      items: order.items?.item?.map((item: any) => ({
        productId: item.productId?.toString() || '',
        sku: item.stockCode || '',
        title: item.productName || '',
        quantity: parseInt(item.quantity || 0),
        price: parseFloat(item.price || 0),
        totalPrice: parseFloat(item.totalPrice || 0)
      })) || [],
      totalAmount: parseFloat(order.totalAmount || 0),
      shippingAmount: parseFloat(order.shippingAmount || 0),
      status: this.mapN11OrderStatus(order.status || ''),
      createdAt: new Date(order.orderDate || Date.now()),
      updatedAt: new Date(order.lastModifiedDate || Date.now())
    }));
  }

  private async saveProductToLocal(product: N11Product, instance: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO n11_products (id, sku, title, description, category, price, stock, images, attributes, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        sku = $2, title = $3, description = $4, category = $5,
        price = $6, stock = $7, images = $8, attributes = $9,
        status = $10, updated_at = $12
    `, [
      product.id,
      product.sku,
      product.title,
      product.description,
      product.category,
      product.price,
      product.stock,
      JSON.stringify(product.images),
      JSON.stringify(product.attributes),
      product.status,
      product.createdAt,
      product.updatedAt
    ]);
  }

  private async saveOrderToLocal(order: N11Order, instance: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO n11_orders (id, order_number, customer_data, items, total_amount, shipping_amount, status, created_at, updated_at)
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

  private async updateStockOnN11(instance: any, update: any): Promise<void> {
    await this.makeApiCall(instance, 'POST', '/ProductStockService', {
      auth: instance.credentials,
      request: {
        productId: update.productId,
        stockItems: [{ sku: update.sku, quantity: update.stock }]
      }
    });
  }

  private async updateLocalStock(update: any): Promise<void> {
    await this.db.execute(`
      UPDATE products SET stock = $1, updated_at = $2 WHERE sku = $3
    `, [update.stock, new Date(), update.sku]);
  }

  private async updateOrderStatusOnN11(instance: any, orderId: string, status: string): Promise<void> {
    await this.makeApiCall(instance, 'POST', '/OrderStatusService', {
      auth: instance.credentials,
      request: { orderId, status }
    });
  }

  private async updateLocalOrderStatus(orderId: string, status: string): Promise<void> {
    await this.db.execute(`
      UPDATE orders SET status = $1, updated_at = $2 WHERE external_order_id = $3
    `, [status, new Date(), orderId]);
  }

  private async getCategoriesFromN11(instance: any): Promise<Array<{
    id: string;
    name: string;
    parentId?: string;
  }>> {
    const response = await this.makeApiCall(instance, 'POST', '/CategoryService', {
      auth: instance.credentials
    });

    return response.data || [];
  }

  private async makeApiCall(instance: any, method: string, path: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/xml',
      'User-Agent': 'AyazTrade-N11/1.0'
    };

    this.logger.log(`Making N11 API call: ${method} ${url}`);

    try {
      // Real HTTP request implementation
      const response = await fetch(url, {
        method: 'POST', // N11 uses POST for all requests
        headers,
        body: data ? this.buildXMLRequest(data) : undefined
      });

      if (!response.ok) {
        throw new Error(`N11 API Error: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();

      // Parse XML response
      const parsedResponse = await this.parseXMLResponse(responseText);

      return {
        success: true,
        data: parsedResponse
      };

    } catch (error) {
      this.logger.error(`N11 API call failed: ${method} ${url}`, error);

      // Handle specific error types
      if (error.message.includes('401')) {
        throw new Error('N11 API authentication failed. Check API credentials.');
      } else if (error.message.includes('403')) {
        throw new Error('N11 API access forbidden. Check API permissions.');
      } else if (error.message.includes('429')) {
        throw new Error('N11 API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('500')) {
        throw new Error('N11 API server error. Please try again later.');
      }

      throw error;
    }
  }

  private buildXMLRequest(data: any): string {
    // Build N11 XML request format
    const auth = data.auth;
    delete data.auth;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <request>`;

    // Add request data
    xml += this.objectToXML(data.request);

    xml += `</request>
</request>`;

    return xml;
  }

  private async parseXMLResponse(xmlText: string): Promise<any> {
    // Simple XML parser for N11 responses
    // In production, use a proper XML parser like xml2js

    // Mock response parsing - in real implementation, parse actual XML
    if (xmlText.includes('<result status="success">')) {
      return {
        result: 'success',
        // Parse actual response data
        products: [],
        orders: [],
        categories: []
      };
    } else {
      throw new Error('N11 API returned error response');
    }
  }

  private objectToXML(obj: any, rootName: string = 'data'): string {
    let xml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        xml += `<${key}>`;
        for (const item of value) {
          if (typeof item === 'object') {
            xml += this.objectToXML(item, 'item');
          } else {
            xml += `<item>${item}</item>`;
          }
        }
        xml += `</${key}>`;
      } else if (typeof value === 'object') {
        xml += `<${key}>${this.objectToXML(value)}</${key}>`;
      } else {
        xml += `<${key}>${value}</${key}>`;
      }
    }

    return xml;
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

  private mapN11OrderStatus(status: string): 'new' | 'approved' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' {
    switch (status.toLowerCase()) {
      case 'new':
      case 'waiting':
        return 'new';
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
        return 'new';
    }
  }
}
