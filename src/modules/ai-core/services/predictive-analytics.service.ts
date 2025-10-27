import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface CustomerLTV {
  customerId: string;
  ltv: number;
  confidence: number;
  segments: string[];
  predictedRevenue: number;
  churnProbability: number;
  nextPurchaseDate?: Date;
  calculatedAt: Date;
}

interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: Record<string, any>;
  customerCount: number;
  averageLTV: number;
  characteristics: string[];
  createdAt: Date;
}

interface PriceOptimization {
  productId: string;
  currentPrice: number;
  optimalPrice: number;
  elasticity: number;
  demandForecast: number;
  revenueImpact: number;
  confidence: number;
  calculatedAt: Date;
}

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async calculateCustomerLTV(customerId: string): Promise<CustomerLTV> {
    this.logger.log(`Calculating LTV for customer: ${customerId}`);
    
    const customer = await this.getCustomer(customerId);
    const orders = await this.getCustomerOrders(customerId);
    const segments = await this.getCustomerSegments(customerId);
    
    const ltv = this.calculateLTV(orders);
    const churnProbability = this.calculateChurnProbability(customer, orders);
    const predictedRevenue = this.predictFutureRevenue(orders, segments);
    const nextPurchaseDate = this.predictNextPurchase(orders);
    
    const ltvData: CustomerLTV = {
      customerId,
      ltv,
      confidence: this.calculateConfidence(orders),
      segments,
      predictedRevenue,
      churnProbability,
      nextPurchaseDate,
      calculatedAt: new Date()
    };
    
    await this.saveCustomerLTV(ltvData);
    
    this.logger.log(`LTV calculated for customer ${customerId}: ${ltv}`);
    return ltvData;
  }

  async createCustomerSegment(segment: Omit<CustomerSegment, 'id' | 'createdAt'>): Promise<CustomerSegment> {
    const segmentId = `segment-${Date.now()}`;
    
    const newSegment: CustomerSegment = {
      id: segmentId,
      ...segment,
      createdAt: new Date()
    };

    await this.saveCustomerSegment(newSegment);
    
    this.logger.log(`Created customer segment: ${segmentId}`);
    return newSegment;
  }

  async getCustomerSegments(): Promise<CustomerSegment[]> {
    const result = await this.db.execute(`
      SELECT * FROM customer_segments
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      criteria: JSON.parse(row.criteria || '{}'),
      characteristics: JSON.parse(row.characteristics || '[]')
    }));
  }

  async segmentCustomers(): Promise<void> {
    this.logger.log('Starting customer segmentation process');
    
    const customers = await this.getAllCustomers();
    const segments = await this.getCustomerSegments();
    
    for (const customer of customers) {
      const customerSegments = [];
      
      for (const segment of segments) {
        if (this.matchesSegmentCriteria(customer, segment.criteria)) {
          customerSegments.push(segment.id);
        }
      }
      
      await this.updateCustomerSegments(customer.id, customerSegments);
    }
    
    this.logger.log(`Customer segmentation completed for ${customers.length} customers`);
  }

  async optimizeProductPrice(productId: string): Promise<PriceOptimization> {
    this.logger.log(`Optimizing price for product: ${productId}`);
    
    const product = await this.getProduct(productId);
    const salesHistory = await this.getProductSalesHistory(productId);
    const competitorPrices = await this.getCompetitorPrices(productId);
    
    const elasticity = this.calculatePriceElasticity(salesHistory);
    const optimalPrice = this.calculateOptimalPrice(product, salesHistory, competitorPrices);
    const demandForecast = await this.forecastDemand(productId, optimalPrice);
    const revenueImpact = this.calculateRevenueImpact(product.price, optimalPrice, demandForecast);
    
    const optimization: PriceOptimization = {
      productId,
      currentPrice: product.price,
      optimalPrice,
      elasticity,
      demandForecast,
      revenueImpact,
      confidence: this.calculatePriceConfidence(salesHistory),
      calculatedAt: new Date()
    };
    
    await this.savePriceOptimization(optimization);
    
    this.logger.log(`Price optimization completed for product ${productId}: ${optimalPrice}`);
    return optimization;
  }

  async getPredictiveAnalytics(period: string = '30d'): Promise<{
    totalCustomers: number;
    averageLTV: number;
    topSegments: Array<{
      segment: string;
      count: number;
      averageLTV: number;
    }>;
    priceOptimizations: number;
    revenueImpact: number;
    churnRate: number;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(DISTINCT customer_id) as total_customers,
        AVG(ltv) as average_ltv,
        AVG(churn_probability) as churn_rate
      FROM customer_ltv
      WHERE calculated_at >= NOW() - INTERVAL '${period}'
    `);
    
    const stats = result.rows[0];
    
    const segmentsResult = await this.db.execute(`
      SELECT 
        s.name as segment,
        COUNT(cs.customer_id) as count,
        AVG(cl.ltv) as average_ltv
      FROM customer_segments s
      LEFT JOIN customer_segment_assignments cs ON s.id = cs.segment_id
      LEFT JOIN customer_ltv cl ON cs.customer_id = cl.customer_id
      WHERE cl.calculated_at >= NOW() - INTERVAL '${period}'
      GROUP BY s.id, s.name
      ORDER BY count DESC
      LIMIT 5
    `);
    
    const topSegments = segmentsResult.rows.map(row => ({
      segment: row.segment,
      count: parseInt(row.count) || 0,
      averageLTV: parseFloat(row.average_ltv) || 0
    }));
    
    const optimizationsResult = await this.db.execute(`
      SELECT 
        COUNT(*) as optimization_count,
        SUM(revenue_impact) as total_revenue_impact
      FROM price_optimizations
      WHERE calculated_at >= NOW() - INTERVAL '${period}'
    `);
    
    const optimizations = optimizationsResult.rows[0];
    
    return {
      totalCustomers: parseInt(stats.total_customers) || 0,
      averageLTV: parseFloat(stats.average_ltv) || 0,
      topSegments,
      priceOptimizations: parseInt(optimizations.optimization_count) || 0,
      revenueImpact: parseFloat(optimizations.total_revenue_impact) || 0,
      churnRate: parseFloat(stats.churn_rate) || 0
    };
  }

  private calculateLTV(orders: any[]): number {
    if (orders.length === 0) return 0;
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const averageOrderValue = totalRevenue / orders.length;
    const purchaseFrequency = orders.length / 12; // Monthly frequency
    const customerLifespan = 24; // 24 months average
    
    return averageOrderValue * purchaseFrequency * customerLifespan;
  }

  private calculateChurnProbability(customer: any, orders: any[]): number {
    const daysSinceLastOrder = this.getDaysSinceLastOrder(orders);
    const orderFrequency = this.calculateOrderFrequency(orders);
    const totalOrders = orders.length;
    
    let churnProbability = 0;
    
    if (daysSinceLastOrder > 90) churnProbability += 0.4;
    else if (daysSinceLastOrder > 60) churnProbability += 0.2;
    
    if (orderFrequency < 0.5) churnProbability += 0.3;
    else if (orderFrequency < 1) churnProbability += 0.1;
    
    if (totalOrders < 3) churnProbability += 0.2;
    
    return Math.min(churnProbability, 1);
  }

  private predictFutureRevenue(orders: any[], segments: string[]): number {
    const recentOrders = orders.slice(-6); // Last 6 orders
    const averageOrderValue = recentOrders.reduce((sum, order) => sum + order.total_amount, 0) / recentOrders.length;
    const orderFrequency = this.calculateOrderFrequency(orders);
    
    const segmentMultiplier = this.getSegmentMultiplier(segments);
    const predictedOrders = orderFrequency * 12 * segmentMultiplier;
    
    return averageOrderValue * predictedOrders;
  }

  private predictNextPurchase(orders: any[]): Date | undefined {
    if (orders.length < 2) return undefined;
    
    const recentOrders = orders.slice(-3);
    const intervals = [];
    
    for (let i = 1; i < recentOrders.length; i++) {
      const interval = new Date(recentOrders[i].created_at).getTime() - new Date(recentOrders[i-1].created_at).getTime();
      intervals.push(interval);
    }
    
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const lastOrderDate = new Date(orders[orders.length - 1].created_at);
    
    return new Date(lastOrderDate.getTime() + averageInterval);
  }

  private calculatePriceElasticity(salesHistory: any[]): number {
    if (salesHistory.length < 2) return -1.5; // Default elasticity
    
    const priceChanges = [];
    const quantityChanges = [];
    
    for (let i = 1; i < salesHistory.length; i++) {
      const priceChange = (salesHistory[i].price - salesHistory[i-1].price) / salesHistory[i-1].price;
      const quantityChange = (salesHistory[i].quantity - salesHistory[i-1].quantity) / salesHistory[i-1].quantity;
      
      if (priceChange !== 0) {
        priceChanges.push(priceChange);
        quantityChanges.push(quantityChange);
      }
    }
    
    if (priceChanges.length === 0) return -1.5;
    
    const elasticity = quantityChanges.reduce((sum, q) => sum + q, 0) / priceChanges.reduce((sum, p) => sum + p, 0);
    return Math.max(elasticity, -3); // Cap at -3
  }

  private calculateOptimalPrice(product: any, salesHistory: any[], competitorPrices: any[]): number {
    const currentPrice = product.price;
    const elasticity = this.calculatePriceElasticity(salesHistory);
    const cost = product.cost || currentPrice * 0.6; // Assume 40% margin
    
    const competitorAverage = competitorPrices.length > 0 
      ? competitorPrices.reduce((sum, p) => sum + p.price, 0) / competitorPrices.length 
      : currentPrice;
    
    const optimalPrice = cost / (1 + 1/elasticity);
    const marketAdjustedPrice = (optimalPrice + competitorAverage) / 2;
    
    return Math.max(marketAdjustedPrice, cost * 1.1); // Minimum 10% margin
  }

  private async forecastDemand(productId: string, price: number): Promise<number> {
    const salesHistory = await this.getProductSalesHistory(productId);
    const averageQuantity = salesHistory.reduce((sum, sale) => sum + sale.quantity, 0) / salesHistory.length;
    const elasticity = this.calculatePriceElasticity(salesHistory);

    const priceChange = (price - salesHistory[salesHistory.length - 1]?.price) / salesHistory[salesHistory.length - 1]?.price;
    const demandChange = elasticity * priceChange;

    return averageQuantity * (1 + demandChange);
  }

  private calculateRevenueImpact(currentPrice: number, optimalPrice: number, demandForecast: number): number {
    const currentRevenue = currentPrice * demandForecast;
    const optimalRevenue = optimalPrice * demandForecast;
    
    return optimalRevenue - currentRevenue;
  }

  private calculateConfidence(orders: any[]): number {
    if (orders.length < 3) return 0.5;
    if (orders.length < 10) return 0.7;
    return 0.9;
  }

  private calculatePriceConfidence(salesHistory: any[]): number {
    if (salesHistory.length < 5) return 0.6;
    if (salesHistory.length < 20) return 0.8;
    return 0.95;
  }

  private getDaysSinceLastOrder(orders: any[]): number {
    if (orders.length === 0) return 999;
    
    const lastOrderDate = new Date(orders[orders.length - 1].created_at);
    const now = new Date();
    
    return Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateOrderFrequency(orders: any[]): number {
    if (orders.length < 2) return 0;
    
    const firstOrderDate = new Date(orders[0].created_at);
    const lastOrderDate = new Date(orders[orders.length - 1].created_at);
    const daysDiff = (lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return orders.length / (daysDiff / 30); // Orders per month
  }

  private getSegmentMultiplier(segments: string[]): number {
    const multipliers = {
      'vip': 1.5,
      'high_value': 1.3,
      'regular': 1.0,
      'new': 0.8,
      'at_risk': 0.5
    };
    
    if (segments.length === 0) return 1.0;
    
    const segmentMultiplier = segments.reduce((max, segment) => {
      const multiplier = multipliers[segment] || 1.0;
      return Math.max(max, multiplier);
    }, 1.0);
    
    return segmentMultiplier;
  }

  private matchesSegmentCriteria(customer: any, criteria: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(criteria)) {
      if (customer[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private async getCustomer(customerId: string): Promise<any> {
    const result = await this.db.execute(`
      SELECT * FROM customers WHERE id = $1
    `, [customerId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Customer not found: ${customerId}`);
    }
    
    return result.rows[0];
  }

  private async getCustomerOrders(customerId: string): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at ASC
    `, [customerId]);
    
    return result.rows;
  }


  private async getAllCustomers(): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT * FROM customers
    `);
    
    return result.rows;
  }

  private async getProduct(productId: string): Promise<any> {
    const result = await this.db.execute(`
      SELECT * FROM products WHERE id = $1
    `, [productId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    return result.rows[0];
  }

  private async getProductSalesHistory(productId: string): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT oi.price, oi.quantity, o.created_at
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = $1
      ORDER BY o.created_at ASC
    `, [productId]);
    
    return result.rows;
  }

  private async getCompetitorPrices(productId: string): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT * FROM competitor_prices WHERE product_id = $1
    `, [productId]);
    
    return result.rows;
  }

  private async updateCustomerSegments(customerId: string, segments: string[]): Promise<void> {
    await this.db.execute(`
      DELETE FROM customer_segment_assignments WHERE customer_id = $1
    `, [customerId]);
    
    for (const segmentId of segments) {
      await this.db.execute(`
        INSERT INTO customer_segment_assignments (customer_id, segment_id)
        VALUES ($1, $2)
      `, [customerId, segmentId]);
    }
  }

  private async saveCustomerLTV(ltv: CustomerLTV): Promise<void> {
    await this.db.execute(`
      INSERT INTO customer_ltv (customer_id, ltv, confidence, segments, predicted_revenue, churn_probability, next_purchase_date, calculated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (customer_id) DO UPDATE SET
        ltv = EXCLUDED.ltv,
        confidence = EXCLUDED.confidence,
        segments = EXCLUDED.segments,
        predicted_revenue = EXCLUDED.predicted_revenue,
        churn_probability = EXCLUDED.churn_probability,
        next_purchase_date = EXCLUDED.next_purchase_date,
        calculated_at = EXCLUDED.calculated_at
    `, [
      ltv.customerId,
      ltv.ltv,
      ltv.confidence,
      JSON.stringify(ltv.segments),
      ltv.predictedRevenue,
      ltv.churnProbability,
      ltv.nextPurchaseDate,
      ltv.calculatedAt
    ]);
  }

  private async saveCustomerSegment(segment: CustomerSegment): Promise<void> {
    await this.db.execute(`
      INSERT INTO customer_segments (id, name, description, criteria, customer_count, average_ltv, characteristics, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      segment.id,
      segment.name,
      segment.description,
      JSON.stringify(segment.criteria),
      segment.customerCount,
      segment.averageLTV,
      JSON.stringify(segment.characteristics),
      segment.createdAt
    ]);
  }

  private async savePriceOptimization(optimization: PriceOptimization): Promise<void> {
    await this.db.execute(`
      INSERT INTO price_optimizations (product_id, current_price, optimal_price, elasticity, demand_forecast, revenue_impact, confidence, calculated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      optimization.productId,
      optimization.currentPrice,
      optimization.optimalPrice,
      optimization.elasticity,
      optimization.demandForecast,
      optimization.revenueImpact,
      optimization.confidence,
      optimization.calculatedAt
    ]);
  }
}