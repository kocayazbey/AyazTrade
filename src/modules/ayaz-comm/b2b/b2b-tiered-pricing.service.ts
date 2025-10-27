import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, gte, lte } from 'drizzle-orm';

export interface CustomerTier {
  id: string;
  name: string;
  description: string;
  minOrderValue: number;
  minOrderQuantity: number;
  discountPercentage: number;
  priority: number; // Higher priority tiers override lower ones
  isActive: boolean;
  benefits: string[];
  requirements: Record<string, any>;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VolumeDiscount {
  id: string;
  name: string;
  description: string;
  productId?: string; // If null, applies to all products
  categoryId?: string; // If null, applies to all categories
  minQuantity: number;
  maxQuantity?: number; // If null, no upper limit
  discountPercentage: number;
  discountType: 'percentage' | 'fixed';
  discountAmount?: number;
  tierId?: string; // Link to customer tier
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  customerId?: string; // If null, applies to all customers in tier
  customerGroupId?: string;
  tierId: string;
  productId?: string;
  categoryId?: string;
  minQuantity: number;
  discountPercentage: number;
  discountType: 'percentage' | 'fixed';
  discountAmount?: number;
  priority: number;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalculatedPrice {
  basePrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    discountAmount: number;
    discountPercentage: number;
    reason: string;
  }>;
  tierInfo?: {
    tierId: string;
    tierName: string;
    tierDiscount: number;
  };
}

@Injectable()
export class B2BTieredPricingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async createCustomerTier(tierData: {
    name: string;
    description: string;
    minOrderValue: number;
    minOrderQuantity: number;
    discountPercentage: number;
    priority: number;
    benefits: string[];
    requirements: Record<string, any>;
  }, tenantId: string, userId: string): Promise<CustomerTier> {

    const tierId = `tier-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const [tier] = await this.databaseService.drizzleClient
      .insert(this.getCustomerTiersTable())
      .values({
        id: tierId,
        ...tierData,
        isActive: true,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Clear pricing cache
    await this.cacheService.del(`b2b_pricing_tiers:${tenantId}`);
    await this.cacheService.del(`b2b_pricing_rules:${tenantId}`);

    this.loggerService.log(`Customer tier created: ${tier.name}`, 'B2BTieredPricingService');
    return tier;
  }

  async createVolumeDiscount(discountData: {
    name: string;
    description: string;
    productId?: string;
    categoryId?: string;
    minQuantity: number;
    maxQuantity?: number;
    discountPercentage: number;
    discountType: 'percentage' | 'fixed';
    discountAmount?: number;
    tierId?: string;
    startDate?: Date;
    endDate?: Date;
  }, tenantId: string, userId: string): Promise<VolumeDiscount> {

    const discountId = `vd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const [discount] = await this.databaseService.drizzleClient
      .insert(this.getVolumeDiscountsTable())
      .values({
        id: discountId,
        ...discountData,
        isActive: true,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Clear pricing cache
    await this.cacheService.del(`b2b_volume_discounts:${tenantId}`);
    await this.cacheService.del(`b2b_pricing_rules:${tenantId}`);

    this.loggerService.log(`Volume discount created: ${discount.name}`, 'B2BTieredPricingService');
    return discount;
  }

  async createPricingRule(ruleData: {
    name: string;
    description: string;
    customerId?: string;
    customerGroupId?: string;
    tierId: string;
    productId?: string;
    categoryId?: string;
    minQuantity: number;
    discountPercentage: number;
    discountType: 'percentage' | 'fixed';
    discountAmount?: number;
    priority: number;
    startDate?: Date;
    endDate?: Date;
  }, tenantId: string, userId: string): Promise<PricingRule> {

    const ruleId = `pr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const [rule] = await this.databaseService.drizzleClient
      .insert(this.getPricingRulesTable())
      .values({
        id: ruleId,
        ...ruleData,
        isActive: true,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Clear pricing cache
    await this.cacheService.del(`b2b_pricing_rules:${tenantId}`);
    await this.cacheService.del(`product_pricing:${tenantId}:${ruleData.productId || 'all'}`);

    this.loggerService.log(`Pricing rule created: ${rule.name}`, 'B2BTieredPricingService');
    return rule;
  }

  async calculatePrice(
    productId: string,
    quantity: number,
    customerId: string,
    tenantId: string
  ): Promise<CalculatedPrice> {
    const cacheKey = `calculated_price:${tenantId}:${productId}:${quantity}:${customerId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Get base product price
    const product = await this.getProductPrice(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const basePrice = product.price * quantity;

    // Get customer tier
    const customerTier = await this.getCustomerTier(customerId, tenantId);

    // Get applicable pricing rules
    const applicableRules = await this.getApplicablePricingRules(
      productId,
      quantity,
      customerId,
      customerTier?.id,
      tenantId
    );

    // Get applicable volume discounts
    const applicableDiscounts = await this.getApplicableVolumeDiscounts(
      productId,
      product.categoryId,
      quantity,
      customerTier?.id,
      tenantId
    );

    // Calculate discounts
    let finalPrice = basePrice;
    let totalDiscountAmount = 0;
    let totalDiscountPercentage = 0;
    const appliedRules: any[] = [];

    // Apply customer tier discount first
    if (customerTier) {
      const tierDiscount = (basePrice * customerTier.discountPercentage) / 100;
      finalPrice -= tierDiscount;
      totalDiscountAmount += tierDiscount;
      totalDiscountPercentage += customerTier.discountPercentage;

      appliedRules.push({
        ruleId: customerTier.id,
        ruleName: customerTier.name,
        discountAmount: tierDiscount,
        discountPercentage: customerTier.discountPercentage,
        reason: 'Customer tier discount'
      });
    }

    // Apply volume discounts (sorted by discount amount, highest first)
    for (const discount of applicableDiscounts.sort((a, b) => b.discountPercentage - a.discountPercentage)) {
      if (discount.discountType === 'percentage') {
        const discountAmount = (basePrice * discount.discountPercentage) / 100;
        finalPrice -= discountAmount;
        totalDiscountAmount += discountAmount;
        totalDiscountPercentage += discount.discountPercentage;

        appliedRules.push({
          ruleId: discount.id,
          ruleName: discount.name,
          discountAmount,
          discountPercentage: discount.discountPercentage,
          reason: `Volume discount (${discount.minQuantity}+ items)`
        });
      } else {
        const discountAmount = discount.discountAmount || 0;
        finalPrice -= discountAmount;
        totalDiscountAmount += discountAmount;

        appliedRules.push({
          ruleId: discount.id,
          ruleName: discount.name,
          discountAmount,
          discountPercentage: 0,
          reason: `Fixed discount (${discount.minQuantity}+ items)`
        });
      }
    }

    // Apply pricing rules (sorted by priority, highest first)
    for (const rule of applicableRules.sort((a, b) => b.priority - a.priority)) {
      if (rule.discountType === 'percentage') {
        const discountAmount = (basePrice * rule.discountPercentage) / 100;
        finalPrice -= discountAmount;
        totalDiscountAmount += discountAmount;
        totalDiscountPercentage += rule.discountPercentage;

        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          discountAmount,
          discountPercentage: rule.discountPercentage,
          reason: `Pricing rule (${rule.minQuantity}+ items)`
        });
      } else {
        const discountAmount = rule.discountAmount || 0;
        finalPrice -= discountAmount;
        totalDiscountAmount += discountAmount;

        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          discountAmount,
          discountPercentage: 0,
          reason: `Fixed pricing rule (${rule.minQuantity}+ items)`
        });
      }
    }

    const result: CalculatedPrice = {
      basePrice,
      finalPrice: Math.max(finalPrice, 0), // Ensure price doesn't go negative
      discountAmount: totalDiscountAmount,
      discountPercentage: basePrice > 0 ? (totalDiscountAmount / basePrice) * 100 : 0,
      appliedRules,
      tierInfo: customerTier ? {
        tierId: customerTier.id,
        tierName: customerTier.name,
        tierDiscount: customerTier.discountPercentage
      } : undefined
    };

    // Cache for 15 minutes
    await this.cacheService.set(cacheKey, result, 900);
    return result;
  }

  async assignCustomerTier(customerId: string, tierId: string, tenantId: string, userId: string): Promise<void> {
    try {
      // Update customer with tier assignment
      await this.databaseService.drizzleClient
        .update(this.getCustomersTable())
        .set({
          tierId,
          updatedAt: new Date()
        })
        .where(and(
          this.getCustomersTable().id.eq(customerId),
          this.getCustomersTable().tenantId.eq(tenantId)
        ));

      // Clear customer pricing cache
      await this.cacheService.del(`customer_tier:${tenantId}:${customerId}`);
      await this.cacheService.del(`b2b_pricing_rules:${tenantId}`);

      this.loggerService.log(`Customer ${customerId} assigned to tier ${tierId}`, 'B2BTieredPricingService');
    } catch (error) {
      this.loggerService.error(`Error assigning customer tier: ${customerId} -> ${tierId}`, error, 'B2BTieredPricingService');
      throw error;
    }
  }

  async getCustomerTiers(tenantId: string): Promise<CustomerTier[]> {
    const cacheKey = `b2b_pricing_tiers:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const tiers = await this.databaseService.drizzleClient
      .select()
      .from(this.getCustomerTiersTable())
      .where(and(
        this.getCustomerTiersTable().tenantId.eq(tenantId),
        this.getCustomerTiersTable().isActive.eq(true)
      ))
      .orderBy(this.getCustomerTiersTable().priority);

    await this.cacheService.set(cacheKey, tiers, 1800); // Cache for 30 minutes
    return tiers;
  }

  async getVolumeDiscounts(tenantId: string): Promise<VolumeDiscount[]> {
    const cacheKey = `b2b_volume_discounts:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const discounts = await this.databaseService.drizzleClient
      .select()
      .from(this.getVolumeDiscountsTable())
      .where(and(
        this.getVolumeDiscountsTable().tenantId.eq(tenantId),
        this.getVolumeDiscountsTable().isActive.eq(true)
      ))
      .orderBy(this.getVolumeDiscountsTable().minQuantity);

    await this.cacheService.set(cacheKey, discounts, 1800);
    return discounts;
  }

  async getPricingRules(tenantId: string): Promise<PricingRule[]> {
    const cacheKey = `b2b_pricing_rules:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const rules = await this.databaseService.drizzleClient
      .select()
      .from(this.getPricingRulesTable())
      .where(and(
        this.getPricingRulesTable().tenantId.eq(tenantId),
        this.getPricingRulesTable().isActive.eq(true)
      ))
      .orderBy(this.getPricingRulesTable().priority);

    await this.cacheService.set(cacheKey, rules, 1800);
    return rules;
  }

  async getPricingAnalytics(tenantId: string, days: number = 30): Promise<any> {
    const cacheKey = `b2b_pricing_analytics:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Calculate tier distribution
    const tierStats = await this.databaseService.drizzleClient
      .select({
        tierId: this.getCustomersTable().tierId,
        customerCount: sql<number>`count(*)`,
        totalOrderValue: sql<number>`SUM(total_order_value)`,
        avgOrderValue: sql<number>`AVG(total_order_value)`
      })
      .from(this.getCustomersTable())
      .where(and(
        this.getCustomersTable().tenantId.eq(tenantId),
        this.getCustomersTable().tierId.isNotNull()
      ))
      .groupBy(this.getCustomersTable().tierId);

    // Calculate discount utilization
    const discountStats = await this.databaseService.drizzleClient
      .select({
        discountType: sql`'volume_discount'`,
        totalDiscounts: sql<number>`count(*)`,
        totalDiscountAmount: sql<number>`SUM(discount_amount)`
      })
      .from(this.getOrderDiscountsTable())
      .where(and(
        this.getOrderDiscountsTable().tenantId.eq(tenantId),
        this.getOrderDiscountsTable().createdAt.gte(startDate)
      ))
      .union(
        await this.databaseService.drizzleClient
          .select({
            discountType: sql`'tier_discount'`,
            totalDiscounts: sql<number>`count(*)`,
            totalDiscountAmount: sql<number>`SUM(discount_amount)`
          })
          .from(this.getOrderDiscountsTable())
          .where(and(
            this.getOrderDiscountsTable().tenantId.eq(tenantId),
            this.getOrderDiscountsTable().createdAt.gte(startDate)
          ))
      );

    const result = {
      tierDistribution: tierStats,
      discountUtilization: discountStats,
      averageDiscountRate: 0, // Would calculate from actual orders
      topPerformingTiers: [], // Would calculate based on revenue
      underUtilizedDiscounts: [] // Would calculate based on usage
    };

    await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
    return result;
  }

  // Private helper methods
  private async getProductPrice(productId: string): Promise<any> {
    // Get product price from products table
    const products = await this.databaseService.drizzleClient
      .select()
      .from(this.getProductsTable())
      .where(this.getProductsTable().id.eq(productId))
      .limit(1);

    return products[0] || null;
  }

  private async getCustomerTier(customerId: string, tenantId: string): Promise<CustomerTier | null> {
    const cacheKey = `customer_tier:${tenantId}:${customerId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const customers = await this.databaseService.drizzleClient
      .select({
        tierId: this.getCustomersTable().tierId
      })
      .from(this.getCustomersTable())
      .where(and(
        this.getCustomersTable().id.eq(customerId),
        this.getCustomersTable().tenantId.eq(tenantId)
      ))
      .limit(1);

    if (customers.length === 0 || !customers[0].tierId) {
      await this.cacheService.set(cacheKey, null, 1800);
      return null;
    }

    const tiers = await this.databaseService.drizzleClient
      .select()
      .from(this.getCustomerTiersTable())
      .where(and(
        this.getCustomerTiersTable().id.eq(customers[0].tierId),
        this.getCustomerTiersTable().isActive.eq(true)
      ))
      .limit(1);

    const tier = tiers[0] || null;
    await this.cacheService.set(cacheKey, tier, 1800);
    return tier;
  }

  private async getApplicablePricingRules(
    productId: string,
    quantity: number,
    customerId: string,
    tierId: string | undefined,
    tenantId: string
  ): Promise<PricingRule[]> {
    const rules = await this.getPricingRules(tenantId);

    return rules.filter(rule => {
      // Check if rule applies to this product/customer/quantity
      const productMatch = !rule.productId || rule.productId === productId;
      const customerMatch = !rule.customerId || rule.customerId === customerId;
      const tierMatch = !rule.tierId || rule.tierId === tierId;
      const categoryMatch = !rule.categoryId; // Simplified - would check product category
      const quantityMatch = quantity >= rule.minQuantity;
      const dateMatch = (!rule.startDate || new Date() >= rule.startDate) &&
                       (!rule.endDate || new Date() <= rule.endDate);

      return productMatch && customerMatch && tierMatch && categoryMatch && quantityMatch && dateMatch;
    });
  }

  private async getApplicableVolumeDiscounts(
    productId: string,
    categoryId: string | undefined,
    quantity: number,
    tierId: string | undefined,
    tenantId: string
  ): Promise<VolumeDiscount[]> {
    const discounts = await this.getVolumeDiscounts(tenantId);

    return discounts.filter(discount => {
      // Check if discount applies to this product/quantity
      const productMatch = !discount.productId || discount.productId === productId;
      const categoryMatch = !discount.categoryId || discount.categoryId === categoryId;
      const tierMatch = !discount.tierId || discount.tierId === tierId;
      const quantityMatch = quantity >= discount.minQuantity &&
                           (!discount.maxQuantity || quantity <= discount.maxQuantity);
      const dateMatch = (!discount.startDate || new Date() >= discount.startDate) &&
                       (!discount.endDate || new Date() <= discount.endDate);

      return productMatch && categoryMatch && tierMatch && quantityMatch && dateMatch;
    });
  }

  private getCustomerTiersTable() {
    return sql`b2b_customer_tiers`;
  }

  private getVolumeDiscountsTable() {
    return sql`b2b_volume_discounts`;
  }

  private getPricingRulesTable() {
    return sql`b2b_pricing_rules`;
  }

  private getCustomersTable() {
    return sql`customers`;
  }

  private getProductsTable() {
    return sql`products`;
  }

  private getOrderDiscountsTable() {
    return sql`order_discounts`;
  }
}
