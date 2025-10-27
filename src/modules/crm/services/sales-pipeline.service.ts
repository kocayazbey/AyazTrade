import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface SalesStage {
  id: string;
  name: string;
  description: string;
  order: number;
  probability: number;
  isActive: boolean;
  isWon: boolean;
  isLost: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Deal {
  id: string;
  title: string;
  description: string;
  customerId: string;
  stageId: string;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate: Date;
  actualCloseDate?: Date;
  ownerId: string;
  source: string;
  tags: string[];
  customFields: Record<string, any>;
  status: 'open' | 'won' | 'lost' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

interface DealActivity {
  id: string;
  dealId: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'stage_change' | 'value_change';
  description: string;
  userId: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

interface PipelineForecast {
  period: string;
  totalValue: number;
  wonValue: number;
  lostValue: number;
  openValue: number;
  dealCount: number;
  averageDealSize: number;
  winRate: number;
  stageDistribution: Record<string, number>;
}

interface SalesGoal {
  id: string;
  userId: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  target: number;
  achieved: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'failed';
  createdAt: Date;
}

@Injectable()
export class SalesPipelineService {
  private readonly logger = new Logger(SalesPipelineService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createSalesStage(stage: Omit<SalesStage, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalesStage> {
    const stageId = `stage-${Date.now()}`;
    
    const newStage: SalesStage = {
      id: stageId,
      ...stage,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveSalesStage(newStage);
    
    this.logger.log(`Created sales stage: ${stageId}`);
    return newStage;
  }

  async getSalesStages(): Promise<SalesStage[]> {
    const result = await this.db.execute(`
      SELECT * FROM sales_stages
      WHERE is_active = true
      ORDER BY "order" ASC
    `);
    
    return result.rows;
  }

  async updateSalesStage(stageId: string, updates: Partial<SalesStage>): Promise<SalesStage> {
    const existing = await this.getSalesStage(stageId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveSalesStage(updated);
    
    this.logger.log(`Updated sales stage: ${stageId}`);
    return updated;
  }

  async createDeal(deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    const dealId = `deal-${Date.now()}`;
    
    const newDeal: Deal = {
      id: dealId,
      ...deal,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveDeal(newDeal);
    
    this.logger.log(`Created deal: ${dealId}`);
    return newDeal;
  }

  async getDeals(filters?: {
    stageId?: string;
    ownerId?: string;
    status?: string;
    customerId?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<Deal[]> {
    let query = 'SELECT * FROM deals WHERE 1=1';
    const params = [];
    
    if (filters?.stageId) {
      query += ' AND stage_id = $' + (params.length + 1);
      params.push(filters.stageId);
    }
    
    if (filters?.ownerId) {
      query += ' AND owner_id = $' + (params.length + 1);
      params.push(filters.ownerId);
    }
    
    if (filters?.status) {
      query += ' AND status = $' + (params.length + 1);
      params.push(filters.status);
    }
    
    if (filters?.customerId) {
      query += ' AND customer_id = $' + (params.length + 1);
      params.push(filters.customerId);
    }
    
    if (filters?.dateRange) {
      query += ' AND created_at BETWEEN $' + (params.length + 1) + ' AND $' + (params.length + 2);
      params.push(filters.dateRange.start, filters.dateRange.end);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      customFields: JSON.parse(row.custom_fields || '{}')
    }));
  }

  async updateDeal(dealId: string, updates: Partial<Deal>): Promise<Deal> {
    const existing = await this.getDeal(dealId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveDeal(updated);
    
    // Log activity if stage changed
    if (updates.stageId && updates.stageId !== existing.stageId) {
      await this.logDealActivity(dealId, 'stage_change', `Stage changed to ${updates.stageId}`, 'system');
    }
    
    // Log activity if value changed
    if (updates.value && updates.value !== existing.value) {
      await this.logDealActivity(dealId, 'value_change', `Value changed from ${existing.value} to ${updates.value}`, 'system');
    }
    
    this.logger.log(`Updated deal: ${dealId}`);
    return updated;
  }

  async moveDealToStage(dealId: string, stageId: string, userId: string): Promise<void> {
    const deal = await this.getDeal(dealId);
    const stage = await this.getSalesStage(stageId);
    
    deal.stageId = stageId;
    deal.probability = stage.probability;
    deal.updatedAt = new Date();
    
    await this.saveDeal(deal);
    
    // Log stage change activity
    await this.logDealActivity(dealId, 'stage_change', `Moved to stage: ${stage.name}`, userId);
    
    this.logger.log(`Moved deal ${dealId} to stage ${stageId}`);
  }

  async closeDeal(dealId: string, status: 'won' | 'lost', actualCloseDate?: Date, userId?: string): Promise<void> {
    const deal = await this.getDeal(dealId);
    
    deal.status = status;
    deal.actualCloseDate = actualCloseDate || new Date();
    deal.updatedAt = new Date();
    
    await this.saveDeal(deal);
    
    // Log close activity
    await this.logDealActivity(dealId, 'note', `Deal ${status}`, userId || 'system');
    
    this.logger.log(`Closed deal ${dealId} as ${status}`);
  }

  async getDealActivities(dealId: string): Promise<DealActivity[]> {
    const result = await this.db.execute(`
      SELECT * FROM deal_activities
      WHERE deal_id = $1
      ORDER BY created_at DESC
    `, [dealId]);
    
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async logDealActivity(dealId: string, type: string, description: string, userId: string, metadata?: Record<string, any>): Promise<DealActivity> {
    const activityId = `activity-${Date.now()}`;
    
    const activity: DealActivity = {
      id: activityId,
      dealId,
      type: type as any,
      description,
      userId,
      metadata: metadata || {},
      createdAt: new Date()
    };
    
    await this.saveDealActivity(activity);
    
    this.logger.log(`Logged deal activity: ${activityId}`);
    return activity;
  }

  async getPipelineForecast(period: 'monthly' | 'quarterly' | 'yearly', startDate: Date, endDate: Date): Promise<PipelineForecast> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as deal_count,
        SUM(value) as total_value,
        SUM(CASE WHEN status = 'won' THEN value ELSE 0 END) as won_value,
        SUM(CASE WHEN status = 'lost' THEN value ELSE 0 END) as lost_value,
        SUM(CASE WHEN status = 'open' THEN value ELSE 0 END) as open_value,
        AVG(value) as avg_deal_size,
        (SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as win_rate
      FROM deals
      WHERE created_at BETWEEN $1 AND $2
    `, [startDate, endDate]);
    
    const stats = result.rows[0];
    const totalValue = parseFloat(stats.total_value) || 0;
    const wonValue = parseFloat(stats.won_value) || 0;
    const lostValue = parseFloat(stats.lost_value) || 0;
    const openValue = parseFloat(stats.open_value) || 0;
    const dealCount = parseInt(stats.deal_count) || 0;
    const averageDealSize = parseFloat(stats.avg_deal_size) || 0;
    const winRate = parseFloat(stats.win_rate) || 0;
    
    // Get stage distribution
    const stageResult = await this.db.execute(`
      SELECT 
        s.name as stage_name,
        COUNT(d.id) as deal_count,
        SUM(d.value) as stage_value
      FROM sales_stages s
      LEFT JOIN deals d ON s.id = d.stage_id AND d.created_at BETWEEN $1 AND $2
      GROUP BY s.id, s.name
      ORDER BY s."order"
    `, [startDate, endDate]);
    
    const stageDistribution: Record<string, number> = {};
    stageResult.rows.forEach(row => {
      stageDistribution[row.stage_name] = parseInt(row.stage_value) || 0;
    });
    
    return {
      period,
      totalValue,
      wonValue,
      lostValue,
      openValue,
      dealCount,
      averageDealSize,
      winRate,
      stageDistribution
    };
  }

  async createSalesGoal(goal: Omit<SalesGoal, 'id' | 'createdAt'>): Promise<SalesGoal> {
    const goalId = `goal-${Date.now()}`;
    
    const newGoal: SalesGoal = {
      id: goalId,
      ...goal,
      createdAt: new Date()
    };

    await this.saveSalesGoal(newGoal);
    
    this.logger.log(`Created sales goal: ${goalId}`);
    return newGoal;
  }

  async getSalesGoals(userId?: string, period?: string): Promise<SalesGoal[]> {
    let query = 'SELECT * FROM sales_goals';
    const params = [];
    
    if (userId) {
      query += ' WHERE user_id = $1';
      params.push(userId);
    }
    
    if (period) {
      query += userId ? ' AND period = $2' : ' WHERE period = $1';
      params.push(period);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    return result.rows;
  }

  async updateSalesGoal(goalId: string, updates: Partial<SalesGoal>): Promise<SalesGoal> {
    const existing = await this.getSalesGoal(goalId);
    const updated = {
      ...existing,
      ...updates
    };
    
    await this.saveSalesGoal(updated);
    
    this.logger.log(`Updated sales goal: ${goalId}`);
    return updated;
  }

  async getSalesAnalytics(userId?: string, period?: string): Promise<{
    totalDeals: number;
    wonDeals: number;
    lostDeals: number;
    totalValue: number;
    wonValue: number;
    lostValue: number;
    averageDealSize: number;
    winRate: number;
    averageSalesCycle: number;
    topPerformingStages: Array<{ stage: string; count: number; value: number }>;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_deals,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_deals,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_deals,
        SUM(value) as total_value,
        SUM(CASE WHEN status = 'won' THEN value ELSE 0 END) as won_value,
        SUM(CASE WHEN status = 'lost' THEN value ELSE 0 END) as lost_value,
        AVG(value) as avg_deal_size,
        (SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as win_rate,
        AVG(EXTRACT(EPOCH FROM (actual_close_date - created_at))) as avg_sales_cycle
      FROM deals
      ${userId ? 'WHERE owner_id = $1' : ''}
    `, userId ? [userId] : []);
    
    const stats = result.rows[0];
    
    // Get top performing stages
    const stageResult = await this.db.execute(`
      SELECT 
        s.name as stage_name,
        COUNT(d.id) as deal_count,
        SUM(d.value) as stage_value
      FROM sales_stages s
      LEFT JOIN deals d ON s.id = d.stage_id
      ${userId ? 'WHERE d.owner_id = $1' : ''}
      GROUP BY s.id, s.name
      ORDER BY stage_value DESC
      LIMIT 5
    `, userId ? [userId] : []);
    
    const topPerformingStages = stageResult.rows.map(row => ({
      stage: row.stage_name,
      count: parseInt(row.deal_count) || 0,
      value: parseFloat(row.stage_value) || 0
    }));
    
    return {
      totalDeals: parseInt(stats.total_deals) || 0,
      wonDeals: parseInt(stats.won_deals) || 0,
      lostDeals: parseInt(stats.lost_deals) || 0,
      totalValue: parseFloat(stats.total_value) || 0,
      wonValue: parseFloat(stats.won_value) || 0,
      lostValue: parseFloat(stats.lost_value) || 0,
      averageDealSize: parseFloat(stats.avg_deal_size) || 0,
      winRate: parseFloat(stats.win_rate) || 0,
      averageSalesCycle: parseFloat(stats.avg_sales_cycle) || 0,
      topPerformingStages
    };
  }

  private async getSalesStage(stageId: string): Promise<SalesStage> {
    const result = await this.db.execute(`
      SELECT * FROM sales_stages WHERE id = $1
    `, [stageId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Sales stage not found: ${stageId}`);
    }
    
    return result.rows[0];
  }

  private async saveSalesStage(stage: SalesStage): Promise<void> {
    await this.db.execute(`
      INSERT INTO sales_stages (id, name, description, "order", probability, is_active, is_won, is_lost, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        "order" = EXCLUDED."order",
        probability = EXCLUDED.probability,
        is_active = EXCLUDED.is_active,
        is_won = EXCLUDED.is_won,
        is_lost = EXCLUDED.is_lost,
        updated_at = EXCLUDED.updated_at
    `, [
      stage.id,
      stage.name,
      stage.description,
      stage.order,
      stage.probability,
      stage.isActive,
      stage.isWon,
      stage.isLost,
      stage.createdAt,
      stage.updatedAt
    ]);
  }

  private async getDeal(dealId: string): Promise<Deal> {
    const result = await this.db.execute(`
      SELECT * FROM deals WHERE id = $1
    `, [dealId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Deal not found: ${dealId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      customFields: JSON.parse(row.custom_fields || '{}')
    };
  }

  private async saveDeal(deal: Deal): Promise<void> {
    await this.db.execute(`
      INSERT INTO deals (id, title, description, customer_id, stage_id, value, currency, probability, expected_close_date, actual_close_date, owner_id, source, tags, custom_fields, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        customer_id = EXCLUDED.customer_id,
        stage_id = EXCLUDED.stage_id,
        value = EXCLUDED.value,
        currency = EXCLUDED.currency,
        probability = EXCLUDED.probability,
        expected_close_date = EXCLUDED.expected_close_date,
        actual_close_date = EXCLUDED.actual_close_date,
        owner_id = EXCLUDED.owner_id,
        source = EXCLUDED.source,
        tags = EXCLUDED.tags,
        custom_fields = EXCLUDED.custom_fields,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      deal.id,
      deal.title,
      deal.description,
      deal.customerId,
      deal.stageId,
      deal.value,
      deal.currency,
      deal.probability,
      deal.expectedCloseDate,
      deal.actualCloseDate,
      deal.ownerId,
      deal.source,
      JSON.stringify(deal.tags),
      JSON.stringify(deal.customFields),
      deal.status,
      deal.createdAt,
      deal.updatedAt
    ]);
  }

  private async saveDealActivity(activity: DealActivity): Promise<void> {
    await this.db.execute(`
      INSERT INTO deal_activities (id, deal_id, type, description, user_id, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      activity.id,
      activity.dealId,
      activity.type,
      activity.description,
      activity.userId,
      JSON.stringify(activity.metadata),
      activity.createdAt
    ]);
  }

  private async getSalesGoal(goalId: string): Promise<SalesGoal> {
    const result = await this.db.execute(`
      SELECT * FROM sales_goals WHERE id = $1
    `, [goalId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Sales goal not found: ${goalId}`);
    }
    
    return result.rows[0];
  }

  private async saveSalesGoal(goal: SalesGoal): Promise<void> {
    await this.db.execute(`
      INSERT INTO sales_goals (id, user_id, period, target, achieved, start_date, end_date, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        period = EXCLUDED.period,
        target = EXCLUDED.target,
        achieved = EXCLUDED.achieved,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status
    `, [
      goal.id,
      goal.userId,
      goal.period,
      goal.target,
      goal.achieved,
      goal.startDate,
      goal.endDate,
      goal.status,
      goal.createdAt
    ]);
  }
}
