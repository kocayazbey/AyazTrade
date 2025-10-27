import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  price: number;
  currency: string;
  billingCycle: number; // days
  features: string[];
  limits: {
    products?: number;
    storage?: number;
    users?: number;
    apiCalls?: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerSubscription {
  id: string;
  customerId: string;
  planId: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired' | 'trial';
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
  trialEndDate?: Date;
  autoRenew: boolean;
  paymentMethod: string;
  billingAddress: any;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionBilling {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  billingDate: Date;
  dueDate: Date;
  paidDate?: Date;
  paymentMethod: string;
  transactionId?: string;
  failureReason?: string;
  createdAt: Date;
}

interface SubscriptionUsage {
  id: string;
  subscriptionId: string;
  feature: string;
  usage: number;
  limit: number;
  period: string;
  recordedAt: Date;
}

interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  trialSubscriptions: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  churnRate: number;
  customerLifetimeValue: number;
  planDistribution: Record<string, number>;
  revenueByPlan: Record<string, number>;
}

@Injectable()
export class SubscriptionCommerceService {
  private readonly logger = new Logger(SubscriptionCommerceService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createSubscriptionPlan(plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    const planId = `plan-${Date.now()}`;
    
    const newPlan: SubscriptionPlan = {
      id: planId,
      ...plan,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveSubscriptionPlan(newPlan);
    
    this.logger.log(`Created subscription plan: ${planId}`);
    return newPlan;
  }

  async getSubscriptionPlans(isActive?: boolean): Promise<SubscriptionPlan[]> {
    const result = await this.db.execute(`
      SELECT * FROM subscription_plans
      ${isActive !== undefined ? 'WHERE is_active = $1' : ''}
      ORDER BY created_at DESC
    `, isActive !== undefined ? [isActive] : []);
    
    return result.rows.map(row => ({
      ...row,
      features: JSON.parse(row.features || '[]'),
      limits: JSON.parse(row.limits || '{}')
    }));
  }

  async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan> {
    const result = await this.db.execute(`
      SELECT * FROM subscription_plans WHERE id = $1
    `, [planId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Subscription plan not found: ${planId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      features: JSON.parse(row.features || '[]'),
      limits: JSON.parse(row.limits || '{}')
    };
  }

  async updateSubscriptionPlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const existing = await this.getSubscriptionPlan(planId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveSubscriptionPlan(updated);
    
    this.logger.log(`Updated subscription plan: ${planId}`);
    return updated;
  }

  async createCustomerSubscription(subscription: Omit<CustomerSubscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomerSubscription> {
    const subscriptionId = `sub-${Date.now()}`;
    
    const newSubscription: CustomerSubscription = {
      id: subscriptionId,
      ...subscription,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveCustomerSubscription(newSubscription);
    
    // Create first billing record
    await this.createBillingRecord(newSubscription);
    
    this.logger.log(`Created customer subscription: ${subscriptionId}`);
    return newSubscription;
  }

  async getCustomerSubscriptions(customerId?: string, status?: string): Promise<CustomerSubscription[]> {
    let query = 'SELECT * FROM customer_subscriptions';
    const params = [];
    
    if (customerId) {
      query += ' WHERE customer_id = $1';
      params.push(customerId);
    }
    
    if (status) {
      query += customerId ? ' AND status = $2' : ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      billingAddress: JSON.parse(row.billing_address || '{}'),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async getCustomerSubscription(subscriptionId: string): Promise<CustomerSubscription> {
    const result = await this.db.execute(`
      SELECT * FROM customer_subscriptions WHERE id = $1
    `, [subscriptionId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Customer subscription not found: ${subscriptionId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      billingAddress: JSON.parse(row.billing_address || '{}'),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  async updateSubscriptionStatus(subscriptionId: string, status: string): Promise<void> {
    const subscription = await this.getCustomerSubscription(subscriptionId);
    
    subscription.status = status as any;
    subscription.updatedAt = new Date();
    
    await this.saveCustomerSubscription(subscription);
    
    this.logger.log(`Updated subscription status: ${subscriptionId} to ${status}`);
  }

  async pauseSubscription(subscriptionId: string, reason?: string): Promise<void> {
    await this.updateSubscriptionStatus(subscriptionId, 'paused');
    this.logger.log(`Paused subscription: ${subscriptionId} - Reason: ${reason || 'No reason provided'}`);
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    await this.updateSubscriptionStatus(subscriptionId, 'active');
    this.logger.log(`Resumed subscription: ${subscriptionId}`);
  }

  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    await this.updateSubscriptionStatus(subscriptionId, 'cancelled');
    this.logger.log(`Cancelled subscription: ${subscriptionId} - Reason: ${reason || 'No reason provided'}`);
  }

  async processBilling(): Promise<void> {
    const dueSubscriptions = await this.getDueSubscriptions();
    
    for (const subscription of dueSubscriptions) {
      try {
        await this.processSubscriptionBilling(subscription);
      } catch (error) {
        this.logger.error(`Failed to process billing for subscription ${subscription.id}:`, error);
      }
    }
  }

  async processSubscriptionBilling(subscription: CustomerSubscription): Promise<void> {
    const plan = await this.getSubscriptionPlan(subscription.planId);
    
    // Create billing record
    const billing: SubscriptionBilling = {
      id: `billing-${Date.now()}`,
      subscriptionId: subscription.id,
      amount: plan.price,
      currency: plan.currency,
      status: 'pending',
      billingDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      paymentMethod: subscription.paymentMethod,
      createdAt: new Date()
    };
    
    await this.saveSubscriptionBilling(billing);
    
    // Process payment
    const paymentResult = await this.processPayment(billing);
    
    if (paymentResult.success) {
      billing.status = 'paid';
      billing.paidDate = new Date();
      billing.transactionId = paymentResult.transactionId;
      
      // Update subscription
      subscription.nextBillingDate = new Date(Date.now() + plan.billingCycle * 24 * 60 * 60 * 1000);
      subscription.updatedAt = new Date();
      
      await this.saveCustomerSubscription(subscription);
      await this.saveSubscriptionBilling(billing);
      
      this.logger.log(`Successfully processed billing for subscription: ${subscription.id}`);
    } else {
      billing.status = 'failed';
      billing.failureReason = paymentResult.error;
      
      await this.saveSubscriptionBilling(billing);
      
      this.logger.error(`Failed to process payment for subscription ${subscription.id}: ${paymentResult.error}`);
    }
  }

  async recordUsage(subscriptionId: string, feature: string, usage: number): Promise<void> {
    const subscription = await this.getCustomerSubscription(subscriptionId);
    const plan = await this.getSubscriptionPlan(subscription.planId);
    
    const limit = plan.limits[feature as keyof typeof plan.limits] || Infinity;
    
    const usageRecord: SubscriptionUsage = {
      id: `usage-${Date.now()}`,
      subscriptionId,
      feature,
      usage,
      limit,
      period: new Date().toISOString().slice(0, 7), // YYYY-MM
      recordedAt: new Date()
    };
    
    await this.saveSubscriptionUsage(usageRecord);
    
    // Check if usage exceeds limit
    if (usage > limit) {
      await this.handleUsageLimitExceeded(subscription, feature, usage, limit);
    }
  }

  async getSubscriptionUsage(subscriptionId: string, feature?: string): Promise<SubscriptionUsage[]> {
    let query = 'SELECT * FROM subscription_usage WHERE subscription_id = $1';
    const params = [subscriptionId];
    
    if (feature) {
      query += ' AND feature = $2';
      params.push(feature);
    }
    
    query += ' ORDER BY recorded_at DESC';
    
    const result = await this.db.execute(query, params);
    return result.rows;
  }

  async getSubscriptionAnalytics(period: string = '30d'): Promise<SubscriptionAnalytics> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_subscriptions,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
        SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END) as trial_subscriptions,
        SUM(CASE WHEN status = 'active' THEN sp.price ELSE 0 END) as mrr,
        AVG(CASE WHEN status = 'active' THEN sp.price ELSE 0 END) as arpu
      FROM customer_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.id
      WHERE cs.created_at >= NOW() - INTERVAL '${period}'
    `);
    
    const stats = result.rows[0];
    
    // Get churn rate
    const churnResult = await this.db.execute(`
      SELECT 
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as churned,
        COUNT(*) as total
      FROM customer_subscriptions
      WHERE created_at >= NOW() - INTERVAL '${period}'
    `);
    
    const churnRate = churnResult.rows[0]?.total > 0 
      ? (churnResult.rows[0].churned / churnResult.rows[0].total) * 100 
      : 0;
    
    // Get plan distribution
    const planResult = await this.db.execute(`
      SELECT 
        sp.name as plan_name,
        COUNT(cs.id) as subscription_count,
        SUM(sp.price) as revenue
      FROM customer_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.id
      WHERE cs.status = 'active'
        AND cs.created_at >= NOW() - INTERVAL '${period}'
      GROUP BY sp.id, sp.name
    `);
    
    const planDistribution: Record<string, number> = {};
    const revenueByPlan: Record<string, number> = {};
    
    planResult.rows.forEach(row => {
      planDistribution[row.plan_name] = parseInt(row.subscription_count);
      revenueByPlan[row.plan_name] = parseFloat(row.revenue);
    });
    
    return {
      totalSubscriptions: parseInt(stats.total_subscriptions) || 0,
      activeSubscriptions: parseInt(stats.active_subscriptions) || 0,
      cancelledSubscriptions: parseInt(stats.cancelled_subscriptions) || 0,
      trialSubscriptions: parseInt(stats.trial_subscriptions) || 0,
      monthlyRecurringRevenue: parseFloat(stats.mrr) || 0,
      averageRevenuePerUser: parseFloat(stats.arpu) || 0,
      churnRate,
      customerLifetimeValue: 0, // Mock CLV calculation
      planDistribution,
      revenueByPlan
    };
  }

  private async getDueSubscriptions(): Promise<CustomerSubscription[]> {
    const result = await this.db.execute(`
      SELECT * FROM customer_subscriptions
      WHERE status = 'active'
        AND next_billing_date <= NOW()
        AND auto_renew = true
    `);
    
    return result.rows.map(row => ({
      ...row,
      billingAddress: JSON.parse(row.billing_address || '{}'),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  private async createBillingRecord(subscription: CustomerSubscription): Promise<void> {
    const plan = await this.getSubscriptionPlan(subscription.planId);
    
    const billing: SubscriptionBilling = {
      id: `billing-${Date.now()}`,
      subscriptionId: subscription.id,
      amount: plan.price,
      currency: plan.currency,
      status: 'pending',
      billingDate: new Date(),
      dueDate: subscription.nextBillingDate,
      paymentMethod: subscription.paymentMethod,
      createdAt: new Date()
    };
    
    await this.saveSubscriptionBilling(billing);
  }

  private async processPayment(billing: SubscriptionBilling): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    // Mock payment processing - in real implementation, this would integrate with payment gateways
    this.logger.log(`Processing payment for billing: ${billing.id}`);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock success/failure
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      return {
        success: true,
        transactionId: `txn-${Date.now()}`
      };
    } else {
      return {
        success: false,
        error: 'Payment failed - insufficient funds'
      };
    }
  }

  private async handleUsageLimitExceeded(subscription: CustomerSubscription, feature: string, usage: number, limit: number): Promise<void> {
    this.logger.warn(`Usage limit exceeded for subscription ${subscription.id}: ${feature} (${usage}/${limit})`);
    
    // Send notification to customer
    // In real implementation, this would send email/SMS notification
    
    // Optionally upgrade subscription or apply overage charges
  }

  private async saveSubscriptionPlan(plan: SubscriptionPlan): Promise<void> {
    await this.db.execute(`
      INSERT INTO subscription_plans (id, name, description, type, price, currency, billing_cycle, features, limits, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        billing_cycle = EXCLUDED.billing_cycle,
        features = EXCLUDED.features,
        limits = EXCLUDED.limits,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at
    `, [
      plan.id,
      plan.name,
      plan.description,
      plan.type,
      plan.price,
      plan.currency,
      plan.billingCycle,
      JSON.stringify(plan.features),
      JSON.stringify(plan.limits),
      plan.isActive,
      plan.createdAt,
      plan.updatedAt
    ]);
  }

  private async saveCustomerSubscription(subscription: CustomerSubscription): Promise<void> {
    await this.db.execute(`
      INSERT INTO customer_subscriptions (id, customer_id, plan_id, status, start_date, end_date, next_billing_date, trial_end_date, auto_renew, payment_method, billing_address, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        next_billing_date = EXCLUDED.next_billing_date,
        trial_end_date = EXCLUDED.trial_end_date,
        auto_renew = EXCLUDED.auto_renew,
        payment_method = EXCLUDED.payment_method,
        billing_address = EXCLUDED.billing_address,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    `, [
      subscription.id,
      subscription.customerId,
      subscription.planId,
      subscription.status,
      subscription.startDate,
      subscription.endDate,
      subscription.nextBillingDate,
      subscription.trialEndDate,
      subscription.autoRenew,
      subscription.paymentMethod,
      JSON.stringify(subscription.billingAddress),
      JSON.stringify(subscription.metadata),
      subscription.createdAt,
      subscription.updatedAt
    ]);
  }

  private async saveSubscriptionBilling(billing: SubscriptionBilling): Promise<void> {
    await this.db.execute(`
      INSERT INTO subscription_billing (id, subscription_id, amount, currency, status, billing_date, due_date, paid_date, payment_method, transaction_id, failure_reason, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      billing.id,
      billing.subscriptionId,
      billing.amount,
      billing.currency,
      billing.status,
      billing.billingDate,
      billing.dueDate,
      billing.paidDate,
      billing.paymentMethod,
      billing.transactionId,
      billing.failureReason,
      billing.createdAt
    ]);
  }

  private async saveSubscriptionUsage(usage: SubscriptionUsage): Promise<void> {
    await this.db.execute(`
      INSERT INTO subscription_usage (id, subscription_id, feature, usage, "limit", period, recorded_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      usage.id,
      usage.subscriptionId,
      usage.feature,
      usage.usage,
      usage.limit,
      usage.period,
      usage.recordedAt
    ]);
  }
}
