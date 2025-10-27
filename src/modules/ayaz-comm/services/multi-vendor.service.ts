import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessType: 'individual' | 'company';
  taxNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    iban?: string;
    swift?: string;
  };
  commission: {
    rate: number;
    type: 'percentage' | 'fixed';
    minimum: number;
  };
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  rating: number;
  totalSales: number;
  totalCommission: number;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorProduct {
  id: string;
  vendorId: string;
  productId: string;
  sku: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive' | 'pending_approval';
  commission: number;
  qualityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorOrder {
  id: string;
  orderId: string;
  vendorId: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  commission: number;
  vendorAmount: number;
  shippingAddress: any;
  trackingNumber?: string;
  estimatedDelivery: Date;
  actualDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorCommission {
  id: string;
  vendorId: string;
  orderId: string;
  amount: number;
  rate: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentDate?: Date;
  createdAt: Date;
}

interface VendorReview {
  id: string;
  vendorId: string;
  customerId: string;
  orderId: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  createdAt: Date;
}

interface VendorAnalytics {
  vendorId: string;
  period: string;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  averageRating: number;
  totalReviews: number;
  topProducts: Array<{
    productId: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  performance: {
    onTimeDelivery: number;
    orderAccuracy: number;
    customerSatisfaction: number;
  };
}

@Injectable()
export class MultiVendorService {
  private readonly logger = new Logger(MultiVendorService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createVendor(vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'totalSales' | 'totalCommission'>): Promise<Vendor> {
    const vendorId = `vendor-${Date.now()}`;
    
    const newVendor: Vendor = {
      id: vendorId,
      ...vendor,
      rating: 0,
      totalSales: 0,
      totalCommission: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveVendor(newVendor);
    
    this.logger.log(`Created vendor: ${vendorId}`);
    return newVendor;
  }

  async getVendors(status?: string): Promise<Vendor[]> {
    const result = await this.db.execute(`
      SELECT * FROM vendors
      ${status ? 'WHERE status = $1' : ''}
      ORDER BY created_at DESC
    `, status ? [status] : []);
    
    return result.rows.map(row => ({
      ...row,
      address: JSON.parse(row.address || '{}'),
      bankDetails: JSON.parse(row.bank_details || '{}'),
      commission: JSON.parse(row.commission || '{}')
    }));
  }

  async getVendor(vendorId: string): Promise<Vendor> {
    const result = await this.db.execute(`
      SELECT * FROM vendors WHERE id = $1
    `, [vendorId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      address: JSON.parse(row.address || '{}'),
      bankDetails: JSON.parse(row.bank_details || '{}'),
      commission: JSON.parse(row.commission || '{}')
    };
  }

  async updateVendor(vendorId: string, updates: Partial<Vendor>): Promise<Vendor> {
    const existing = await this.getVendor(vendorId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveVendor(updated);
    
    this.logger.log(`Updated vendor: ${vendorId}`);
    return updated;
  }

  async approveVendor(vendorId: string): Promise<void> {
    await this.updateVendor(vendorId, { status: 'approved' });
    this.logger.log(`Approved vendor: ${vendorId}`);
  }

  async suspendVendor(vendorId: string, reason: string): Promise<void> {
    await this.updateVendor(vendorId, { status: 'suspended' });
    this.logger.log(`Suspended vendor: ${vendorId} - Reason: ${reason}`);
  }

  async addVendorProduct(vendorProduct: Omit<VendorProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<VendorProduct> {
    const productId = `vendor-product-${Date.now()}`;
    
    const newVendorProduct: VendorProduct = {
      id: productId,
      ...vendorProduct,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveVendorProduct(newVendorProduct);
    
    this.logger.log(`Added vendor product: ${productId}`);
    return newVendorProduct;
  }

  async getVendorProducts(vendorId?: string, status?: string): Promise<VendorProduct[]> {
    let query = 'SELECT * FROM vendor_products';
    const params = [];
    
    if (vendorId) {
      query += ' WHERE vendor_id = $1';
      params.push(vendorId);
    }
    
    if (status) {
      query += vendorId ? ' AND status = $2' : ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    return result.rows;
  }

  async updateVendorProduct(productId: string, updates: Partial<VendorProduct>): Promise<VendorProduct> {
    const existing = await this.getVendorProduct(productId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveVendorProduct(updated);
    
    this.logger.log(`Updated vendor product: ${productId}`);
    return updated;
  }

  async createVendorOrder(vendorOrder: Omit<VendorOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<VendorOrder> {
    const orderId = `vendor-order-${Date.now()}`;
    
    const newVendorOrder: VendorOrder = {
      id: orderId,
      ...vendorOrder,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveVendorOrder(newVendorOrder);
    
    this.logger.log(`Created vendor order: ${orderId}`);
    return newVendorOrder;
  }

  async getVendorOrders(vendorId?: string, status?: string): Promise<VendorOrder[]> {
    let query = 'SELECT * FROM vendor_orders';
    const params = [];
    
    if (vendorId) {
      query += ' WHERE vendor_id = $1';
      params.push(vendorId);
    }
    
    if (status) {
      query += vendorId ? ' AND status = $2' : ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      shippingAddress: JSON.parse(row.shipping_address || '{}')
    }));
  }

  async updateVendorOrderStatus(orderId: string, status: string, trackingNumber?: string): Promise<void> {
    const order = await this.getVendorOrder(orderId);
    
    order.status = status as any;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    
    if (status === 'delivered') {
      order.actualDelivery = new Date();
    }
    
    order.updatedAt = new Date();
    
    await this.saveVendorOrder(order);
    
    this.logger.log(`Updated vendor order status: ${orderId} to ${status}`);
  }

  async calculateCommission(vendorId: string, orderAmount: number): Promise<number> {
    const vendor = await this.getVendor(vendorId);
    const commission = vendor.commission;
    
    if (commission.type === 'percentage') {
      return Math.max(commission.minimum, orderAmount * (commission.rate / 100));
    } else {
      return Math.max(commission.minimum, commission.rate);
    }
  }

  async createVendorCommission(commission: Omit<VendorCommission, 'id' | 'createdAt'>): Promise<VendorCommission> {
    const commissionId = `commission-${Date.now()}`;
    
    const newCommission: VendorCommission = {
      id: commissionId,
      ...commission,
      createdAt: new Date()
    };

    await this.saveVendorCommission(newCommission);
    
    this.logger.log(`Created vendor commission: ${commissionId}`);
    return newCommission;
  }

  async getVendorCommissions(vendorId?: string, status?: string): Promise<VendorCommission[]> {
    let query = 'SELECT * FROM vendor_commissions';
    const params = [];
    
    if (vendorId) {
      query += ' WHERE vendor_id = $1';
      params.push(vendorId);
    }
    
    if (status) {
      query += vendorId ? ' AND status = $2' : ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    return result.rows;
  }

  async payVendorCommission(commissionId: string): Promise<void> {
    const commission = await this.getVendorCommission(commissionId);
    
    commission.status = 'paid';
    commission.paymentDate = new Date();
    
    await this.updateVendorCommission(commission);
    
    this.logger.log(`Paid vendor commission: ${commissionId}`);
  }

  async createVendorReview(review: Omit<VendorReview, 'id' | 'createdAt'>): Promise<VendorReview> {
    const reviewId = `review-${Date.now()}`;
    
    const newReview: VendorReview = {
      id: reviewId,
      ...review,
      createdAt: new Date()
    };

    await this.saveVendorReview(newReview);
    
    // Update vendor rating
    await this.updateVendorRating(review.vendorId);
    
    this.logger.log(`Created vendor review: ${reviewId}`);
    return newReview;
  }

  async getVendorReviews(vendorId: string): Promise<VendorReview[]> {
    const result = await this.db.execute(`
      SELECT * FROM vendor_reviews
      WHERE vendor_id = $1
      ORDER BY created_at DESC
    `, [vendorId]);
    
    return result.rows;
  }

  async getVendorAnalytics(vendorId: string, period: string = '30d'): Promise<VendorAnalytics> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(vo.id) as total_orders,
        SUM(vo.total_amount) as total_revenue,
        SUM(vo.commission) as total_commission,
        AVG(vr.rating) as avg_rating,
        COUNT(vr.id) as total_reviews
      FROM vendors v
      LEFT JOIN vendor_orders vo ON v.id = vo.vendor_id
      LEFT JOIN vendor_reviews vr ON v.id = vr.vendor_id
      WHERE v.id = $1
        AND vo.created_at >= NOW() - INTERVAL '${period}'
    `, [vendorId]);
    
    const stats = result.rows[0];
    
    // Get top products
    const topProductsResult = await this.db.execute(`
      SELECT 
        p.id as product_id,
        p.name,
        SUM(voi.quantity) as sales,
        SUM(voi.quantity * voi.price) as revenue
      FROM vendor_orders vo
      JOIN vendor_order_items voi ON vo.id = voi.vendor_order_id
      JOIN products p ON voi.product_id = p.id
      WHERE vo.vendor_id = $1
        AND vo.created_at >= NOW() - INTERVAL '${period}'
      GROUP BY p.id, p.name
      ORDER BY sales DESC
      LIMIT 5
    `, [vendorId]);
    
    const topProducts = topProductsResult.rows.map(row => ({
      productId: row.product_id,
      name: row.name,
      sales: parseInt(row.sales) || 0,
      revenue: parseFloat(row.revenue) || 0
    }));
    
    // Get performance metrics
    const performanceResult = await this.db.execute(`
      SELECT 
        AVG(CASE WHEN vo.actual_delivery <= vo.estimated_delivery THEN 1 ELSE 0 END) as on_time_delivery,
        AVG(CASE WHEN vo.status = 'delivered' THEN 1 ELSE 0 END) as order_accuracy,
        AVG(vr.rating) as customer_satisfaction
      FROM vendor_orders vo
      LEFT JOIN vendor_reviews vr ON vo.id = vr.order_id
      WHERE vo.vendor_id = $1
        AND vo.created_at >= NOW() - INTERVAL '${period}'
    `, [vendorId]);
    
    const performance = performanceResult.rows[0];
    
    return {
      vendorId,
      period,
      totalOrders: parseInt(stats.total_orders) || 0,
      totalRevenue: parseFloat(stats.total_revenue) || 0,
      totalCommission: parseFloat(stats.total_commission) || 0,
      averageRating: parseFloat(stats.avg_rating) || 0,
      totalReviews: parseInt(stats.total_reviews) || 0,
      topProducts,
      performance: {
        onTimeDelivery: parseFloat(performance.on_time_delivery) * 100 || 0,
        orderAccuracy: parseFloat(performance.order_accuracy) * 100 || 0,
        customerSatisfaction: parseFloat(performance.customer_satisfaction) || 0
      }
    };
  }

  async getMarketplaceAnalytics(): Promise<{
    totalVendors: number;
    activeVendors: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    averageCommission: number;
    topVendors: Array<{
      vendorId: string;
      name: string;
      sales: number;
      revenue: number;
    }>;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(DISTINCT v.id) as total_vendors,
        SUM(CASE WHEN v.status = 'approved' THEN 1 ELSE 0 END) as active_vendors,
        COUNT(DISTINCT vp.id) as total_products,
        COUNT(DISTINCT vo.id) as total_orders,
        SUM(vo.total_amount) as total_revenue,
        AVG(vo.commission) as avg_commission
      FROM vendors v
      LEFT JOIN vendor_products vp ON v.id = vp.vendor_id
      LEFT JOIN vendor_orders vo ON v.id = vo.vendor_id
    `);
    
    const stats = result.rows[0];
    
    // Get top vendors
    const topVendorsResult = await this.db.execute(`
      SELECT 
        v.id as vendor_id,
        v.name,
        COUNT(vo.id) as sales,
        SUM(vo.total_amount) as revenue
      FROM vendors v
      LEFT JOIN vendor_orders vo ON v.id = vo.vendor_id
      GROUP BY v.id, v.name
      ORDER BY revenue DESC
      LIMIT 10
    `);
    
    const topVendors = topVendorsResult.rows.map(row => ({
      vendorId: row.vendor_id,
      name: row.name,
      sales: parseInt(row.sales) || 0,
      revenue: parseFloat(row.revenue) || 0
    }));
    
    return {
      totalVendors: parseInt(stats.total_vendors) || 0,
      activeVendors: parseInt(stats.active_vendors) || 0,
      totalProducts: parseInt(stats.total_products) || 0,
      totalOrders: parseInt(stats.total_orders) || 0,
      totalRevenue: parseFloat(stats.total_revenue) || 0,
      averageCommission: parseFloat(stats.avg_commission) || 0,
      topVendors
    };
  }

  private async getVendorProduct(productId: string): Promise<VendorProduct> {
    const result = await this.db.execute(`
      SELECT * FROM vendor_products WHERE id = $1
    `, [productId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Vendor product not found: ${productId}`);
    }
    
    return result.rows[0];
  }

  private async saveVendor(vendor: Vendor): Promise<void> {
    await this.db.execute(`
      INSERT INTO vendors (id, name, email, phone, business_type, tax_number, address, bank_details, commission, status, rating, total_sales, total_commission, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        business_type = EXCLUDED.business_type,
        tax_number = EXCLUDED.tax_number,
        address = EXCLUDED.address,
        bank_details = EXCLUDED.bank_details,
        commission = EXCLUDED.commission,
        status = EXCLUDED.status,
        rating = EXCLUDED.rating,
        total_sales = EXCLUDED.total_sales,
        total_commission = EXCLUDED.total_commission,
        updated_at = EXCLUDED.updated_at
    `, [
      vendor.id,
      vendor.name,
      vendor.email,
      vendor.phone,
      vendor.businessType,
      vendor.taxNumber,
      JSON.stringify(vendor.address),
      JSON.stringify(vendor.bankDetails),
      JSON.stringify(vendor.commission),
      vendor.status,
      vendor.rating,
      vendor.totalSales,
      vendor.totalCommission,
      vendor.createdAt,
      vendor.updatedAt
    ]);
  }

  private async saveVendorProduct(product: VendorProduct): Promise<void> {
    await this.db.execute(`
      INSERT INTO vendor_products (id, vendor_id, product_id, sku, price, stock, status, commission, quality_score, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        vendor_id = EXCLUDED.vendor_id,
        product_id = EXCLUDED.product_id,
        sku = EXCLUDED.sku,
        price = EXCLUDED.price,
        stock = EXCLUDED.stock,
        status = EXCLUDED.status,
        commission = EXCLUDED.commission,
        quality_score = EXCLUDED.quality_score,
        updated_at = EXCLUDED.updated_at
    `, [
      product.id,
      product.vendorId,
      product.productId,
      product.sku,
      product.price,
      product.stock,
      product.status,
      product.commission,
      product.qualityScore,
      product.createdAt,
      product.updatedAt
    ]);
  }

  private async getVendorOrder(orderId: string): Promise<VendorOrder> {
    const result = await this.db.execute(`
      SELECT * FROM vendor_orders WHERE id = $1
    `, [orderId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Vendor order not found: ${orderId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      shippingAddress: JSON.parse(row.shipping_address || '{}')
    };
  }

  private async saveVendorOrder(order: VendorOrder): Promise<void> {
    await this.db.execute(`
      INSERT INTO vendor_orders (id, order_id, vendor_id, status, total_amount, commission, vendor_amount, shipping_address, tracking_number, estimated_delivery, actual_delivery, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        order_id = EXCLUDED.order_id,
        vendor_id = EXCLUDED.vendor_id,
        status = EXCLUDED.status,
        total_amount = EXCLUDED.total_amount,
        commission = EXCLUDED.commission,
        vendor_amount = EXCLUDED.vendor_amount,
        shipping_address = EXCLUDED.shipping_address,
        tracking_number = EXCLUDED.tracking_number,
        estimated_delivery = EXCLUDED.estimated_delivery,
        actual_delivery = EXCLUDED.actual_delivery,
        updated_at = EXCLUDED.updated_at
    `, [
      order.id,
      order.orderId,
      order.vendorId,
      order.status,
      order.totalAmount,
      order.commission,
      order.vendorAmount,
      JSON.stringify(order.shippingAddress),
      order.trackingNumber,
      order.estimatedDelivery,
      order.actualDelivery,
      order.createdAt,
      order.updatedAt
    ]);
  }

  private async getVendorCommission(commissionId: string): Promise<VendorCommission> {
    const result = await this.db.execute(`
      SELECT * FROM vendor_commissions WHERE id = $1
    `, [commissionId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Vendor commission not found: ${commissionId}`);
    }
    
    return result.rows[0];
  }

  private async saveVendorCommission(commission: VendorCommission): Promise<void> {
    await this.db.execute(`
      INSERT INTO vendor_commissions (id, vendor_id, order_id, amount, rate, status, payment_date, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      commission.id,
      commission.vendorId,
      commission.orderId,
      commission.amount,
      commission.rate,
      commission.status,
      commission.paymentDate,
      commission.createdAt
    ]);
  }

  private async updateVendorCommission(commission: VendorCommission): Promise<void> {
    await this.db.execute(`
      UPDATE vendor_commissions SET
        status = $2,
        payment_date = $3
      WHERE id = $1
    `, [
      commission.id,
      commission.status,
      commission.paymentDate
    ]);
  }

  private async saveVendorReview(review: VendorReview): Promise<void> {
    await this.db.execute(`
      INSERT INTO vendor_reviews (id, vendor_id, customer_id, order_id, rating, comment, is_verified, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      review.id,
      review.vendorId,
      review.customerId,
      review.orderId,
      review.rating,
      review.comment,
      review.isVerified,
      review.createdAt
    ]);
  }

  private async updateVendorRating(vendorId: string): Promise<void> {
    const result = await this.db.execute(`
      SELECT AVG(rating) as avg_rating
      FROM vendor_reviews
      WHERE vendor_id = $1
    `, [vendorId]);
    
    const avgRating = parseFloat(result.rows[0]?.avg_rating) || 0;
    
    await this.db.execute(`
      UPDATE vendors SET rating = $2 WHERE id = $1
    `, [vendorId, avgRating]);
  }
}
