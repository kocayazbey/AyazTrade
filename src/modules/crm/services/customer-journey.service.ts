import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface CustomerJourney {
  id: string;
  customerId: string;
  stage: 'awareness' | 'interest' | 'consideration' | 'purchase' | 'retention' | 'advocacy';
  touchpoints: CustomerTouchpoint[];
  currentScore: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerTouchpoint {
  id: string;
  type: 'website_visit' | 'email_open' | 'email_click' | 'social_engagement' | 'purchase' | 'support_ticket' | 'review' | 'referral';
  channel: 'web' | 'email' | 'social' | 'mobile' | 'store' | 'phone';
  timestamp: Date;
  value: number;
  metadata: Record<string, any>;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface JourneyStage {
  id: string;
  name: string;
  description: string;
  order: number;
  criteria: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface JourneyAnalytics {
  totalCustomers: number;
  stageDistribution: Record<string, number>;
  averageJourneyTime: number;
  conversionRates: Record<string, number>;
  topTouchpoints: Array<{
    type: string;
    count: number;
    value: number;
  }>;
  dropoffPoints: Array<{
    fromStage: string;
    toStage: string;
    dropoffRate: number;
  }>;
}

interface JourneyInsight {
  customerId: string;
  insight: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  category: 'engagement' | 'conversion' | 'retention' | 'satisfaction';
}

@Injectable()
export class CustomerJourneyService {
  private readonly logger = new Logger(CustomerJourneyService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createCustomerJourney(customerId: string): Promise<CustomerJourney> {
    const journeyId = `journey-${Date.now()}`;
    
    const journey: CustomerJourney = {
      id: journeyId,
      customerId,
      stage: 'awareness',
      touchpoints: [],
      currentScore: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveCustomerJourney(journey);
    
    this.logger.log(`Created customer journey: ${journeyId}`);
    return journey;
  }

  async getCustomerJourney(customerId: string): Promise<CustomerJourney | null> {
    const result = await this.db.execute(`
      SELECT * FROM customer_journeys
      WHERE customer_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `, [customerId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      ...row,
      touchpoints: JSON.parse(row.touchpoints || '[]')
    };
  }

  async addTouchpoint(customerId: string, touchpoint: Omit<CustomerTouchpoint, 'id'>): Promise<CustomerTouchpoint> {
    const touchpointId = `touchpoint-${Date.now()}`;
    
    const newTouchpoint: CustomerTouchpoint = {
      id: touchpointId,
      ...touchpoint
    };
    
    const journey = await this.getCustomerJourney(customerId);
    if (!journey) {
      throw new Error(`Customer journey not found for customer: ${customerId}`);
    }
    
    journey.touchpoints.push(newTouchpoint);
    journey.currentScore += touchpoint.value;
    journey.lastActivity = new Date();
    journey.updatedAt = new Date();
    
    // Update journey stage based on touchpoints
    const newStage = this.determineJourneyStage(journey);
    if (newStage !== journey.stage) {
      journey.stage = newStage as any;
      this.logger.log(`Customer ${customerId} moved to stage: ${newStage}`);
    }
    
    await this.saveCustomerJourney(journey);
    
    this.logger.log(`Added touchpoint: ${touchpointId}`);
    return newTouchpoint;
  }

  async updateJourneyStage(customerId: string, stage: string): Promise<void> {
    const journey = await this.getCustomerJourney(customerId);
    if (!journey) {
      throw new Error(`Customer journey not found for customer: ${customerId}`);
    }
    
    journey.stage = stage as any;
    journey.updatedAt = new Date();
    
    await this.saveCustomerJourney(journey);
    
    this.logger.log(`Updated journey stage for customer ${customerId}: ${stage}`);
  }

  async getJourneyTouchpoints(customerId: string, type?: string): Promise<CustomerTouchpoint[]> {
    const journey = await this.getCustomerJourney(customerId);
    if (!journey) {
      return [];
    }
    
    let touchpoints = journey.touchpoints;
    
    if (type) {
      touchpoints = touchpoints.filter(tp => tp.type === type);
    }
    
    return touchpoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createJourneyStage(stage: Omit<JourneyStage, 'id' | 'createdAt' | 'updatedAt'>): Promise<JourneyStage> {
    const stageId = `stage-${Date.now()}`;
    
    const newStage: JourneyStage = {
      id: stageId,
      ...stage,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveJourneyStage(newStage);
    
    this.logger.log(`Created journey stage: ${stageId}`);
    return newStage;
  }

  async getJourneyStages(): Promise<JourneyStage[]> {
    const result = await this.db.execute(`
      SELECT * FROM journey_stages
      WHERE is_active = true
      ORDER BY "order" ASC
    `);
    
    return result.rows.map(row => ({
      ...row,
      criteria: JSON.parse(row.criteria || '{}')
    }));
  }

  async getJourneyAnalytics(period: string = '30d'): Promise<JourneyAnalytics> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(DISTINCT customer_id) as total_customers,
        stage,
        COUNT(*) as stage_count
      FROM customer_journeys
      WHERE updated_at >= NOW() - INTERVAL '${period}'
      GROUP BY stage
    `);
    
    const totalCustomers = result.rows.reduce((sum, row) => sum + parseInt(row.stage_count), 0);
    const stageDistribution: Record<string, number> = {};
    
    result.rows.forEach(row => {
      stageDistribution[row.stage] = parseInt(row.stage_count);
    });
    
    // Get average journey time
    const timeResult = await this.db.execute(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_journey_time
      FROM customer_journeys
      WHERE updated_at >= NOW() - INTERVAL '${period}'
    `);
    
    const averageJourneyTime = parseFloat(timeResult.rows[0]?.avg_journey_time) || 0;
    
    // Get conversion rates
    const conversionResult = await this.db.execute(`
      SELECT 
        stage,
        COUNT(*) as stage_count,
        SUM(CASE WHEN stage = 'purchase' THEN 1 ELSE 0 END) as conversions
      FROM customer_journeys
      WHERE updated_at >= NOW() - INTERVAL '${period}'
      GROUP BY stage
    `);
    
    const conversionRates: Record<string, number> = {};
    conversionResult.rows.forEach(row => {
      const stageCount = parseInt(row.stage_count);
      const conversions = parseInt(row.conversions);
      conversionRates[row.stage] = stageCount > 0 ? (conversions / stageCount) * 100 : 0;
    });
    
    // Get top touchpoints
    const touchpointResult = await this.db.execute(`
      SELECT 
        touchpoint_type,
        COUNT(*) as touchpoint_count,
        SUM(value) as total_value
      FROM customer_touchpoints
      WHERE timestamp >= NOW() - INTERVAL '${period}'
      GROUP BY touchpoint_type
      ORDER BY touchpoint_count DESC
      LIMIT 10
    `);
    
    const topTouchpoints = touchpointResult.rows.map(row => ({
      type: row.touchpoint_type,
      count: parseInt(row.touchpoint_count),
      value: parseFloat(row.total_value) || 0
    }));
    
    // Get dropoff points
    const dropoffResult = await this.db.execute(`
      SELECT 
        from_stage,
        to_stage,
        COUNT(*) as dropoff_count,
        (COUNT(*)::float / (SELECT COUNT(*) FROM customer_journeys WHERE updated_at >= NOW() - INTERVAL '${period}')) * 100) as dropoff_rate
      FROM journey_transitions
      WHERE timestamp >= NOW() - INTERVAL '${period}'
      GROUP BY from_stage, to_stage
      HAVING COUNT(*) > 1
      ORDER BY dropoff_rate DESC
    `);
    
    const dropoffPoints = dropoffResult.rows.map(row => ({
      fromStage: row.from_stage,
      toStage: row.to_stage,
      dropoffRate: parseFloat(row.dropoff_rate) || 0
    }));
    
    return {
      totalCustomers,
      stageDistribution,
      averageJourneyTime,
      conversionRates,
      topTouchpoints,
      dropoffPoints
    };
  }

  async getJourneyInsights(customerId: string): Promise<JourneyInsight[]> {
    const journey = await this.getCustomerJourney(customerId);
    if (!journey) {
      return [];
    }
    
    const insights: JourneyInsight[] = [];
    
    // Analyze engagement
    const recentTouchpoints = journey.touchpoints
      .filter(tp => tp.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .length;
    
    if (recentTouchpoints < 2) {
      insights.push({
        customerId,
        insight: 'Low engagement in the last 7 days',
        recommendation: 'Send re-engagement email or offer',
        priority: 'high',
        confidence: 0.8,
        category: 'engagement'
      });
    }
    
    // Analyze conversion potential
    if (journey.stage === 'consideration' && journey.currentScore > 50) {
      insights.push({
        customerId,
        insight: 'High conversion potential',
        recommendation: 'Send personalized offer or demo',
        priority: 'high',
        confidence: 0.9,
        category: 'conversion'
      });
    }
    
    // Analyze retention risk
    const lastActivity = journey.lastActivity;
    const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysSinceActivity > 30) {
      insights.push({
        customerId,
        insight: 'At risk of churning',
        recommendation: 'Send retention campaign or loyalty offer',
        priority: 'high',
        confidence: 0.7,
        category: 'retention'
      });
    }
    
    // Analyze satisfaction
    const negativeTouchpoints = journey.touchpoints.filter(tp => tp.sentiment === 'negative').length;
    const totalTouchpoints = journey.touchpoints.length;
    
    if (totalTouchpoints > 0 && (negativeTouchpoints / totalTouchpoints) > 0.3) {
      insights.push({
        customerId,
        insight: 'Multiple negative interactions',
        recommendation: 'Reach out to address concerns',
        priority: 'high',
        confidence: 0.8,
        category: 'satisfaction'
      });
    }
    
    return insights;
  }

  async getCustomerJourneyMap(): Promise<{
    stages: Array<{
      name: string;
      customers: number;
      averageTime: number;
      conversionRate: number;
    }>;
    transitions: Array<{
      from: string;
      to: string;
      count: number;
      rate: number;
    }>;
  }> {
    const stages = await this.getJourneyStages();
    const stageData = await this.db.execute(`
      SELECT 
        stage,
        COUNT(*) as customer_count,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_time
      FROM customer_journeys
      GROUP BY stage
    `);
    
    const stageMap = stageData.rows.map(row => ({
      name: row.stage,
      customers: parseInt(row.customer_count),
      averageTime: parseFloat(row.avg_time) || 0,
      conversionRate: 0 // Mock conversion rate
    }));
    
    const transitionData = await this.db.execute(`
      SELECT 
        from_stage,
        to_stage,
        COUNT(*) as transition_count
      FROM journey_transitions
      GROUP BY from_stage, to_stage
      ORDER BY transition_count DESC
    `);
    
    const transitions = transitionData.rows.map(row => ({
      from: row.from_stage,
      to: row.to_stage,
      count: parseInt(row.transition_count),
      rate: 0 // Mock transition rate
    }));
    
    return {
      stages: stageMap,
      transitions
    };
  }

  private determineJourneyStage(journey: CustomerJourney): string {
    const touchpoints = journey.touchpoints;
    const score = journey.currentScore;
    
    // Simple stage determination logic
    if (score >= 100) return 'advocacy';
    if (score >= 80) return 'retention';
    if (score >= 60) return 'purchase';
    if (score >= 40) return 'consideration';
    if (score >= 20) return 'interest';
    return 'awareness';
  }

  private async saveCustomerJourney(journey: CustomerJourney): Promise<void> {
    await this.db.execute(`
      INSERT INTO customer_journeys (id, customer_id, stage, touchpoints, current_score, last_activity, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (customer_id) DO UPDATE SET
        stage = EXCLUDED.stage,
        touchpoints = EXCLUDED.touchpoints,
        current_score = EXCLUDED.current_score,
        last_activity = EXCLUDED.last_activity,
        updated_at = EXCLUDED.updated_at
    `, [
      journey.id,
      journey.customerId,
      journey.stage,
      JSON.stringify(journey.touchpoints),
      journey.currentScore,
      journey.lastActivity,
      journey.createdAt,
      journey.updatedAt
    ]);
  }

  private async saveJourneyStage(stage: JourneyStage): Promise<void> {
    await this.db.execute(`
      INSERT INTO journey_stages (id, name, description, "order", criteria, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      stage.id,
      stage.name,
      stage.description,
      stage.order,
      JSON.stringify(stage.criteria),
      stage.isActive,
      stage.createdAt,
      stage.updatedAt
    ]);
  }
}
