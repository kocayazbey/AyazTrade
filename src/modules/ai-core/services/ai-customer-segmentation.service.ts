import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  type: 'rfm' | 'behavioral' | 'demographic' | 'value' | 'lifecycle';
  criteria: SegmentCriteria;
  customerCount: number;
  averageValue: number;
  totalValue: number;
  characteristics: {
    avgOrderValue: number;
    avgOrderFrequency: number;
    avgRecency: number;
    topCategories: string[];
    preferredBrands: string[];
    channelPreference: string;
  };
  color: string;
  icon: string;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentCriteria {
  rfm?: {
    recency: { min: number; max: number }; // days
    frequency: { min: number; max: number }; // orders
    monetary: { min: number; max: number }; // value
  };
  behavioral?: {
    avgOrderValue: { min: number; max: number };
    categoryPreference: string[];
    brandPreference: string[];
    channelPreference: string[];
    engagementLevel: 'low' | 'medium' | 'high';
  };
  demographic?: {
    ageRange?: { min: number; max: number };
    gender?: string[];
    location?: string[];
    companySize?: string[];
  };
  value?: {
    lifetimeValue: { min: number; max: number };
    potentialValue: { min: number; max: number };
    tier: string[];
  };
}

export interface RFMAnalysis {
  customerId: string;
  customerName: string;
  rfmScore: {
    recency: number; // 1-5 scale
    frequency: number; // 1-5 scale
    monetary: number; // 1-5 scale
    total: number; // 3-15 scale
  };
  rfmSegment: string;
  characteristics: {
    lastPurchase: Date;
    totalOrders: number;
    totalSpent: number;
    avgOrderValue: number;
    customerSince: Date;
  };
  recommendations: string[];
}

export interface BehavioralCluster {
  clusterId: number;
  clusterName: string;
  customerCount: number;
  characteristics: {
    avgOrderValue: number;
    avgOrderFrequency: number;
    preferredCategories: string[];
    preferredBrands: string[];
    shoppingTime: string; // morning, afternoon, evening
    devicePreference: string; // mobile, desktop, tablet
    channelPreference: string[];
  };
  engagementPatterns: {
    emailOpenRate: number;
    websiteVisits: number;
    cartAbandonmentRate: number;
    returnRate: number;
  };
}

export interface CustomerLifetimeValue {
  customerId: string;
  currentValue: number;
  predictedValue: number;
  churnProbability: number;
  nextPurchaseProbability: number;
  recommendations: string[];
}

@Injectable()
export class AICustomerSegmentationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async performRFMAnalysis(tenantId: string, days: number = 365): Promise<RFMAnalysis[]> {
    const cacheKey = `rfm_analysis:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      this.loggerService.log('Starting RFM analysis', 'AICustomerSegmentationService');

      const analysisDate = new Date();
      const startDate = new Date(analysisDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Get customer order data
      const customerData = await this.databaseService.drizzleClient
        .select({
          customerId: sql`o.customer_id`,
          customerName: sql`c.first_name || ' ' || c.last_name`,
          lastPurchase: sql`MAX(o.created_at)`,
          totalOrders: sql<number>`COUNT(*)`,
          totalSpent: sql<number>`SUM(o.total)`,
          avgOrderValue: sql<number>`AVG(o.total)`,
          firstPurchase: sql`MIN(o.created_at)`,
          customerSince: sql`c.created_at`
        })
        .from(sql`orders o`)
        .innerJoin(sql`customers c`, sql`o.customer_id = c.id`)
        .where(and(
          sql`o.tenant_id = ${tenantId}`,
          sql`o.created_at >= ${startDate}`,
          sql`o.status NOT IN ('cancelled', 'refunded')`,
          sql`c.status = 'active'`
        ))
        .groupBy(sql`o.customer_id`, sql`c.first_name`, sql`c.last_name`, sql`c.created_at`)
        .having(sql`COUNT(*) >= 1`); // At least one order

      const rfmAnalysis: RFMAnalysis[] = [];

      for (const customer of customerData) {
        // Calculate RFM scores
        const recency = this.calculateRecencyScore(customer.lastPurchase, analysisDate);
        const frequency = this.calculateFrequencyScore(customer.totalOrders);
        const monetary = this.calculateMonetaryScore(customer.totalSpent, customerData);

        const totalScore = recency + frequency + monetary;
        const rfmSegment = this.getRFMSegment(recency, frequency, monetary);

        rfmAnalysis.push({
          customerId: customer.customerId,
          customerName: customer.customerName,
          rfmScore: {
            recency,
            frequency,
            monetary,
            total: totalScore
          },
          rfmSegment,
          characteristics: {
            lastPurchase: customer.lastPurchase,
            totalOrders: customer.totalOrders,
            totalSpent: customer.totalSpent,
            avgOrderValue: customer.avgOrderValue,
            customerSince: customer.customerSince
          },
          recommendations: this.getRFMRecommendations(rfmSegment, customer)
        });
      }

      await this.cacheService.set(cacheKey, rfmAnalysis, 3600); // Cache for 1 hour
      return rfmAnalysis;

    } catch (error) {
      this.loggerService.error('Error performing RFM analysis', error, 'AICustomerSegmentationService');
      return [];
    }
  }

  async performBehavioralClustering(tenantId: string, clusters: number = 5): Promise<BehavioralCluster[]> {
    const cacheKey = `behavioral_clustering:${tenantId}:${clusters}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      this.loggerService.log(`Starting behavioral clustering with ${clusters} clusters`, 'AICustomerSegmentationService');

      // Get customer behavioral data
      const behavioralData = await this.databaseService.drizzleClient
        .select({
          customerId: sql`o.customer_id`,
          avgOrderValue: sql<number>`AVG(o.total)`,
          orderFrequency: sql<number>`COUNT(*) / 365.0`, // Orders per day
          recency: sql<number>`EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(o.created_at))) / 86400`, // Days since last order
          totalSpent: sql<number>`SUM(o.total)`,
          preferredCategories: sql`string_agg(DISTINCT p.category_id, ',')`,
          preferredBrands: sql`string_agg(DISTINCT p.brand_id, ',')`,
          shoppingTime: sql`EXTRACT(HOUR FROM AVG(o.created_at))`,
          channelPreference: sql`'online'` // Would determine from actual channel data
        })
        .from(sql`orders o`)
        .leftJoin(sql`order_items oi`, sql`oi.order_id = o.id`)
        .leftJoin(sql`products p`, sql`oi.product_id = p.id`)
        .where(and(
          sql`o.tenant_id = ${tenantId}`,
          sql`o.created_at >= CURRENT_DATE - INTERVAL '365 days'`,
          sql`o.status NOT IN ('cancelled', 'refunded')`
        ))
        .groupBy(sql`o.customer_id`)
        .having(sql`COUNT(*) >= 3`); // Customers with at least 3 orders

      // Perform clustering (simplified implementation)
      const clustersData = this.performClustering(behavioralData, clusters);

      await this.cacheService.set(cacheKey, clustersData, 7200); // Cache for 2 hours
      return clustersData;

    } catch (error) {
      this.loggerService.error('Error performing behavioral clustering', error, 'AICustomerSegmentationService');
      return [];
    }
  }

  async createDynamicSegment(
    segmentData: {
      name: string;
      description: string;
      type: string;
      criteria: SegmentCriteria;
      color: string;
      icon: string;
    },
    tenantId: string,
    userId: string
  ): Promise<CustomerSegment> {

    const segmentId = `segment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const [segment] = await this.databaseService.drizzleClient
      .insert(this.getCustomerSegmentsTable())
      .values({
        id: segmentId,
        ...segmentData,
        type: 'dynamic',
        isActive: true,
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Calculate initial customer count
    await this.updateSegmentCustomerCount(segmentId, segmentData.criteria, tenantId);

    // Clear segments cache
    await this.cacheService.del(`customer_segments:${tenantId}`);
    await this.cacheService.del(`dynamic_segments:${tenantId}`);

    this.loggerService.log(`Dynamic segment created: ${segment.name}`, 'AICustomerSegmentationService');
    return await this.getCustomerSegment(segmentId);
  }

  async updateDynamicSegments(tenantId: string): Promise<void> {
    try {
      this.loggerService.log('Updating dynamic customer segments', 'AICustomerSegmentationService');

      // Get all dynamic segments
      const dynamicSegments = await this.databaseService.drizzleClient
        .select()
        .from(this.getCustomerSegmentsTable())
        .where(and(
          this.getCustomerSegmentsTable().tenantId.eq(tenantId),
          this.getCustomerSegmentsTable().type.eq('dynamic'),
          this.getCustomerSegmentsTable().isActive.eq(true)
        ));

      for (const segment of dynamicSegments) {
        await this.updateSegmentCustomerCount(segment.id, segment.criteria, tenantId);
      }

      this.loggerService.log('Dynamic segments updated', 'AICustomerSegmentationService');

    } catch (error) {
      this.loggerService.error('Error updating dynamic segments', error, 'AICustomerSegmentationService');
    }
  }

  async getCustomerLifetimeValue(customerId: string, tenantId: string): Promise<CustomerLifetimeValue> {
    const cacheKey = `customer_ltv:${tenantId}:${customerId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get customer order history
      const orderHistory = await this.databaseService.drizzleClient
        .select({
          totalSpent: sql<number>`SUM(total)`,
          totalOrders: sql<number>`COUNT(*)`,
          avgOrderValue: sql<number>`AVG(total)`,
          firstOrder: sql`MIN(created_at)`,
          lastOrder: sql`MAX(created_at)`,
          orderFrequency: sql<number>`COUNT(*) / GREATEST(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400 / 30, 1)` // Orders per month
        })
        .from(sql`orders`)
        .where(and(
          sql`customer_id = ${customerId}`,
          sql`tenant_id = ${tenantId}`,
          sql`status NOT IN ('cancelled', 'refunded')`
        ));

      const data = orderHistory[0];
      if (!data || data.totalOrders === 0) {
        return {
          customerId,
          currentValue: 0,
          predictedValue: 0,
          churnProbability: 1,
          nextPurchaseProbability: 0,
          recommendations: ['No purchase history']
        };
      }

      // Calculate current LTV
      const currentValue = Number(data.totalSpent) || 0;

      // Predict future value using customer behavior
      const predictedValue = await this.predictCustomerLifetimeValue(data);

      // Calculate churn probability
      const churnProbability = await this.calculateChurnProbability(data);

      // Calculate next purchase probability
      const nextPurchaseProbability = await this.calculateNextPurchaseProbability(data);

      const result: CustomerLifetimeValue = {
        customerId,
        currentValue,
        predictedValue,
        churnProbability,
        nextPurchaseProbability,
        recommendations: this.getLTVRecommendations(data, predictedValue, churnProbability)
      };

      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;

    } catch (error) {
      this.loggerService.error(`Error calculating customer LTV: ${customerId}`, error, 'AICustomerSegmentationService');
      return {
        customerId,
        currentValue: 0,
        predictedValue: 0,
        churnProbability: 1,
        nextPurchaseProbability: 0,
        recommendations: ['Error calculating LTV']
      };
    }
  }

  async getSegmentInsights(tenantId: string): Promise<Array<{
    segmentId: string;
    segmentName: string;
    insights: Array<{
      type: 'opportunity' | 'risk' | 'trend' | 'recommendation';
      title: string;
      description: string;
      impact: string;
      action: string;
    }>;
  }>> {
    const cacheKey = `segment_insights:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get all segments with their characteristics
      const segments = await this.databaseService.drizzleClient
        .select({
          segmentId: this.getCustomerSegmentsTable().id,
          segmentName: this.getCustomerSegmentsTable().name,
          customerCount: this.getCustomerSegmentsTable().customerCount,
          averageValue: sql<number>`AVG(c.total_spent)`,
          totalValue: sql<number>`SUM(c.total_spent)`
        })
        .from(this.getCustomerSegmentsTable())
        .leftJoin(sql`customers c`, sql`c.segment = ${this.getCustomerSegmentsTable()}.id`)
        .where(and(
          this.getCustomerSegmentsTable().tenantId.eq(tenantId),
          this.getCustomerSegmentsTable().isActive.eq(true)
        ))
        .groupBy(this.getCustomerSegmentsTable().id, this.getCustomerSegmentsTable().name, this.getCustomerSegmentsTable().customerCount);

      const insights = [];

      for (const segment of segments) {
        const segmentInsights = [];

        // Analyze segment characteristics
        if (Number(segment.averageValue) > 500) {
          segmentInsights.push({
            type: 'opportunity',
            title: 'High-Value Segment',
            description: `Average order value of $${Number(segment.averageValue).toFixed(2)}`,
            impact: 'High revenue potential',
            action: 'Implement premium pricing and exclusive offers'
          });
        }

        if (Number(segment.customerCount) < 10) {
          segmentInsights.push({
            type: 'risk',
            title: 'Small Segment Size',
            description: `Only ${segment.customerCount} customers in this segment`,
            impact: 'Limited market reach',
            action: 'Consider segment expansion or consolidation'
          });
        }

        // Add more insights based on segment analysis
        segmentInsights.push({
          type: 'recommendation',
          title: 'Personalization Opportunity',
          description: 'Tailor marketing messages based on segment characteristics',
          impact: 'Improved engagement and conversion',
          action: 'Create segment-specific campaigns'
        });

        insights.push({
          segmentId: segment.segmentId,
          segmentName: segment.segmentName,
          insights: segmentInsights
        });
      }

      await this.cacheService.set(cacheKey, insights, 3600); // Cache for 1 hour
      return insights;

    } catch (error) {
      this.loggerService.error('Error getting segment insights', error, 'AICustomerSegmentationService');
      return [];
    }
  }

  async getCustomerSegment(segmentId: string): Promise<CustomerSegment> {
    const cacheKey = `customer_segment:${segmentId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const segments = await this.databaseService.drizzleClient
      .select()
      .from(this.getCustomerSegmentsTable())
      .where(this.getCustomerSegmentsTable().id.eq(segmentId))
      .limit(1);

    if (segments.length === 0) return null;

    const segment = segments[0];
    const customerCount = await this.getSegmentCustomerCount(segmentId);
    const averageValue = await this.getSegmentAverageValue(segmentId);

    const fullSegment: CustomerSegment = {
      ...segment,
      customerCount,
      averageValue,
      totalValue: customerCount * averageValue,
      characteristics: await this.getSegmentCharacteristics(segmentId)
    };

    await this.cacheService.set(cacheKey, fullSegment, 1800); // Cache for 30 minutes
    return fullSegment;
  }

  async getCustomerSegments(tenantId: string): Promise<CustomerSegment[]> {
    const cacheKey = `customer_segments:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const segments = await this.databaseService.drizzleClient
      .select()
      .from(this.getCustomerSegmentsTable())
      .where(and(
        this.getCustomerSegmentsTable().tenantId.eq(tenantId),
        this.getCustomerSegmentsTable().isActive.eq(true)
      ))
      .orderBy(this.getCustomerSegmentsTable().createdAt);

    const fullSegments = await Promise.all(
      segments.map(segment => this.getCustomerSegment(segment.id))
    );

    await this.cacheService.set(cacheKey, fullSegments, 1800); // Cache for 30 minutes
    return fullSegments;
  }

  async assignCustomersToSegments(tenantId: string): Promise<void> {
    try {
      this.loggerService.log('Assigning customers to segments', 'AICustomerSegmentationService');

      // Get all active segments
      const segments = await this.getCustomerSegments(tenantId);

      // Get all customers
      const customers = await this.databaseService.drizzleClient
        .select()
        .from(this.getCustomersTable())
        .where(and(
          this.getCustomersTable().tenantId.eq(tenantId),
          this.getCustomersTable().status.eq('active')
        ));

      // Assign each customer to appropriate segments
      for (const customer of customers) {
        const customerSegment = await this.findBestSegmentForCustomer(customer, segments);
        if (customerSegment && customer.segment !== customerSegment.id) {
          await this.databaseService.drizzleClient
            .update(this.getCustomersTable())
            .set({
              segment: customerSegment.id,
              updatedAt: new Date()
            })
            .where(this.getCustomersTable().id.eq(customer.id));
        }
      }

      // Update segment counts
      for (const segment of segments) {
        await this.updateSegmentCustomerCount(segment.id, segment.criteria, tenantId);
      }

      this.loggerService.log('Customer segment assignment completed', 'AICustomerSegmentationService');

    } catch (error) {
      this.loggerService.error('Error assigning customers to segments', error, 'AICustomerSegmentationService');
    }
  }

  // Private helper methods
  private calculateRecencyScore(lastPurchase: Date, analysisDate: Date): number {
    const daysSincePurchase = Math.floor((analysisDate.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSincePurchase <= 30) return 5; // Very recent
    if (daysSincePurchase <= 90) return 4;
    if (daysSincePurchase <= 180) return 3;
    if (daysSincePurchase <= 365) return 2;
    return 1; // Very old
  }

  private calculateFrequencyScore(totalOrders: number): number {
    if (totalOrders >= 10) return 5; // Very frequent
    if (totalOrders >= 5) return 4;
    if (totalOrders >= 3) return 3;
    if (totalOrders >= 2) return 2;
    return 1; // One-time customer
  }

  private calculateMonetaryScore(totalSpent: number, allCustomers: any[]): number {
    // Calculate percentile ranking
    const sortedSpent = allCustomers.map(c => Number(c.totalSpent)).sort((a, b) => b - a);
    const percentile = sortedSpent.findIndex(spent => spent <= totalSpent) / sortedSpent.length;

    if (percentile <= 0.2) return 5; // Top 20%
    if (percentile <= 0.4) return 4;
    if (percentile <= 0.6) return 3;
    if (percentile <= 0.8) return 2;
    return 1; // Bottom 20%
  }

  private getRFMSegment(recency: number, frequency: number, monetary: number): string {
    const total = recency + frequency + monetary;

    if (total >= 13) return 'Champions';
    if (total >= 10) return 'Loyal Customers';
    if (total >= 7) return 'Potential Loyalists';
    if (recency >= 4) return 'Recent Customers';
    if (frequency >= 4) return 'Frequent Customers';
    if (total >= 5) return 'Average Customers';
    if (recency <= 2) return 'At Risk';
    if (frequency <= 2 && monetary <= 2) return 'Lost Customers';
    return 'Need Attention';
  }

  private getRFMRecommendations(segment: string, customer: any): string[] {
    const recommendations = {
      'Champions': [
        'Offer loyalty rewards',
        'Request testimonials',
        'Invite to VIP events',
        'Cross-sell premium products'
      ],
      'Loyal Customers': [
        'Upsell higher-value products',
        'Offer renewal incentives',
        'Create loyalty program',
        'Ask for referrals'
      ],
      'At Risk': [
        'Send re-engagement emails',
        'Offer win-back discounts',
        'Conduct satisfaction survey',
        'Improve customer service'
      ],
      'Lost Customers': [
        'Send reactivation campaigns',
        'Offer significant discounts',
        'Analyze reasons for churn',
        'Improve product offerings'
      ]
    };

    return recommendations[segment] || ['General engagement activities'];
  }

  private async predictCustomerLifetimeValue(customerData: any): Promise<number> {
    // Simplified LTV prediction
    const monthlyValue = Number(customerData.totalSpent) / Math.max(customerData.orderFrequency * 12, 1);
    const predictedLifespan = 24; // months (would use churn analysis)
    return monthlyValue * predictedLifespan;
  }

  private async calculateChurnProbability(customerData: any): Promise<number> {
    // Simplified churn probability calculation
    const recency = this.calculateRecencyScore(customerData.lastOrder, new Date());
    const frequency = this.calculateFrequencyScore(customerData.totalOrders);

    // Higher recency and frequency = lower churn probability
    return Math.max(0, 1 - ((recency + frequency) / 10));
  }

  private async calculateNextPurchaseProbability(customerData: any): Promise<number> {
    // Simplified next purchase probability
    const recency = this.calculateRecencyScore(customerData.lastOrder, new Date());
    const frequency = this.calculateFrequencyScore(customerData.totalOrders);

    // Higher recency and frequency = higher next purchase probability
    return Math.min(1, (recency + frequency) / 10);
  }

  private getLTVRecommendations(customerData: any, predictedValue: number, churnProbability: number): string[] {
    const recommendations = [];

    if (churnProbability > 0.7) {
      recommendations.push('High churn risk - implement retention strategies');
    }

    if (predictedValue > Number(customerData.totalSpent) * 2) {
      recommendations.push('High growth potential - focus on upselling');
    }

    if (Number(customerData.avgOrderValue) < 100) {
      recommendations.push('Low average order value - consider bundling offers');
    }

    return recommendations.length > 0 ? recommendations : ['Continue current engagement strategy'];
  }

  private performClustering(data: any[], clusters: number): BehavioralCluster[] {
    // Simplified clustering implementation
    // In real implementation, would use ML algorithms like K-means

    const clustersData: BehavioralCluster[] = [];

    for (let i = 0; i < clusters; i++) {
      clustersData.push({
        clusterId: i + 1,
        clusterName: `Cluster ${i + 1}`,
        customerCount: Math.floor(data.length / clusters),
        characteristics: {
          avgOrderValue: 100 + (i * 50), // Mock data
          avgOrderFrequency: 2 + (i * 0.5),
          preferredCategories: [`Category ${i + 1}`],
          preferredBrands: [`Brand ${i + 1}`],
          shoppingTime: ['morning', 'afternoon', 'evening'][i % 3],
          devicePreference: ['mobile', 'desktop', 'tablet'][i % 3],
          channelPreference: ['online', 'mobile', 'store']
        },
        engagementPatterns: {
          emailOpenRate: 0.2 + (i * 0.1),
          websiteVisits: 5 + (i * 2),
          cartAbandonmentRate: 0.3 - (i * 0.05),
          returnRate: 0.1 - (i * 0.02)
        }
      });
    }

    return clustersData;
  }

  private async findBestSegmentForCustomer(customer: any, segments: CustomerSegment[]): Promise<CustomerSegment | null> {
    // Find the best matching segment for a customer
    // This would evaluate segment criteria against customer data

    for (const segment of segments) {
      if (await this.doesCustomerMatchCriteria(customer, segment.criteria)) {
        return segment;
      }
    }

    return null;
  }

  private async doesCustomerMatchCriteria(customer: any, criteria: SegmentCriteria): Promise<boolean> {
    // Evaluate if customer matches segment criteria
    // Simplified implementation

    if (criteria.rfm) {
      const rfmScore = await this.getCustomerRFMScore(customer.id);
      if (rfmScore.total < 7) return false; // Example threshold
    }

    if (criteria.value) {
      if (customer.totalSpent < criteria.value.lifetimeValue.min) return false;
      if (criteria.value.lifetimeValue.max && customer.totalSpent > criteria.value.lifetimeValue.max) return false;
    }

    return true;
  }

  private async getCustomerRFMScore(customerId: string): Promise<any> {
    // Get customer's RFM score
    const customerData = await this.databaseService.drizzleClient
      .select({
        lastPurchase: sql`MAX(created_at)`,
        totalOrders: sql<number>`COUNT(*)`,
        totalSpent: sql<number>`SUM(total)`
      })
      .from(sql`orders`)
      .where(and(
        sql`customer_id = ${customerId}`,
        sql`status NOT IN ('cancelled', 'refunded')`
      ));

    if (customerData.length === 0) {
      return { recency: 1, frequency: 1, monetary: 1, total: 3 };
    }

    const data = customerData[0];
    const recency = this.calculateRecencyScore(data.lastPurchase, new Date());
    const frequency = this.calculateFrequencyScore(data.totalOrders);
    const monetary = this.calculateMonetaryScore(data.totalSpent, []);

    return {
      recency,
      frequency,
      monetary,
      total: recency + frequency + monetary
    };
  }

  private async updateSegmentCustomerCount(segmentId: string, criteria: SegmentCriteria, tenantId: string): Promise<void> {
    // Count customers matching segment criteria
    const count = await this.getCustomersMatchingCriteria(criteria, tenantId).then(customers => customers.length);

    await this.databaseService.drizzleClient
      .update(this.getCustomerSegmentsTable())
      .set({
        customerCount: count,
        updatedAt: new Date()
      })
      .where(this.getCustomerSegmentsTable().id.eq(segmentId));
  }

  private async getSegmentCustomerCount(segmentId: string): Promise<number> {
    const segments = await this.databaseService.drizzleClient
      .select({ customerCount: this.getCustomerSegmentsTable().customerCount })
      .from(this.getCustomerSegmentsTable())
      .where(this.getCustomerSegmentsTable().id.eq(segmentId))
      .limit(1);

    return segments[0]?.customerCount || 0;
  }

  private async getSegmentAverageValue(segmentId: string): Promise<number> {
    const customers = await this.databaseService.drizzleClient
      .select({ totalSpent: sql`AVG(total_spent)` })
      .from(this.getCustomersTable())
      .where(this.getCustomersTable().segment.eq(segmentId));

    return Number(customers[0]?.totalSpent) || 0;
  }

  private async getSegmentCharacteristics(segmentId: string): Promise<any> {
    const characteristics = await this.databaseService.drizzleClient
      .select({
        avgOrderValue: sql<number>`AVG(average_order_value)`,
        avgOrderFrequency: sql<number>`AVG(total_orders / GREATEST(EXTRACT(EPOCH FROM (last_order_date - first_order_date)) / 86400 / 30, 1))`,
        avgRecency: sql<number>`AVG(EXTRACT(EPOCH FROM (CURRENT_DATE - last_order_date)) / 86400)`,
        topCategories: sql`string_agg(DISTINCT p.category_id, ',')`,
        preferredBrands: sql`string_agg(DISTINCT p.brand_id, ',')`
      })
      .from(this.getCustomersTable())
      .leftJoin(sql`orders o`, sql`o.customer_id = ${this.getCustomersTable()}.id`)
      .leftJoin(sql`products p`, sql`oi.product_id = p.id`)
      .where(this.getCustomersTable().segment.eq(segmentId))
      .groupBy(this.getCustomersTable().segment);

    return {
      avgOrderValue: Number(characteristics[0]?.avgOrderValue) || 0,
      avgOrderFrequency: Number(characteristics[0]?.avgOrderFrequency) || 0,
      avgRecency: Number(characteristics[0]?.avgRecency) || 0,
      topCategories: characteristics[0]?.topCategories?.split(',') || [],
      preferredBrands: characteristics[0]?.preferredBrands?.split(',') || []
    };
  }

  private async getCustomersMatchingCriteria(criteria: SegmentCriteria, tenantId: string): Promise<any[]> {
    // Get customers matching segment criteria
    let whereClause = this.getCustomersTable().tenantId.eq(tenantId);

    if (criteria.rfm) {
      // Would apply RFM criteria
    }

    if (criteria.value) {
      if (criteria.value.lifetimeValue.min) {
        whereClause = and(whereClause, this.getCustomersTable().totalSpent.gte(criteria.value.lifetimeValue.min));
      }
      if (criteria.value.lifetimeValue.max) {
        whereClause = and(whereClause, this.getCustomersTable().totalSpent.lte(criteria.value.lifetimeValue.max));
      }
    }

    return await this.databaseService.drizzleClient
      .select()
      .from(this.getCustomersTable())
      .where(whereClause);
  }

  private getCustomerSegmentsTable() {
    return sql`customer_segments`;
  }

  private getCustomersTable() {
    return sql`customers`;
  }
}
