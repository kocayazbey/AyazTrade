import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, or, gte, lte, desc } from 'drizzle-orm';
import { leads, activities, deals, quotes, contacts } from '../../../database/schema/crm.schema';

export interface CRMDashboardMetrics {
  overview: {
    totalLeads: number;
    totalOpportunities: number;
    totalQuotes: number;
    totalRevenue: number;
    conversionRate: number;
    averageDealSize: number;
  };
  pipeline: {
    stages: Array<{
      stageId: string;
      stageName: string;
      dealCount: number;
      totalValue: number;
      averageAge: number;
      conversionRate: number;
    }>;
    forecast: {
      monthly: number;
      quarterly: number;
      yearly: number;
    };
    trends: Array<{
      date: string;
      leads: number;
      opportunities: number;
      closedDeals: number;
      revenue: number;
    }>;
  };
  activities: {
    recentActivities: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      leadId?: string;
      dealId?: string;
      userId: string;
      userName: string;
      createdAt: Date;
    }>;
    upcomingActivities: Array<{
      id: string;
      type: string;
      title: string;
      dueDate: Date;
      assignedTo: string;
      priority: string;
    }>;
    activityStats: {
      totalActivities: number;
      completedToday: number;
      overdue: number;
      scheduled: number;
    };
  };
  performance: {
    salesReps: Array<{
      userId: string;
      userName: string;
      leadsCount: number;
      dealsCount: number;
      revenue: number;
      conversionRate: number;
      activitiesCount: number;
    }>;
    sources: Array<{
      source: string;
      leadsCount: number;
      conversionRate: number;
      revenue: number;
      costPerLead: number;
    }>;
    goals: {
      monthlyTarget: number;
      monthlyAchieved: number;
      quarterlyTarget: number;
      quarterlyAchieved: number;
      yearlyTarget: number;
      yearlyAchieved: number;
    };
  };
  insights: Array<{
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    description: string;
    impact: string;
    recommendation: string;
    data?: any;
  }>;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'call' | 'email' | 'meeting' | 'demo' | 'quote' | 'note' | 'task';
  title: string;
  description: string;
  outcome?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  userId: string;
  userName: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  customerId: string;
  customerName: string;
  value: number;
  currency: string;
  probability: number;
  stageId: string;
  stageName: string;
  expectedCloseDate: Date;
  actualCloseDate?: Date;
  ownerId: string;
  ownerName: string;
  source: string;
  tags: string[];
  activities: LeadActivity[];
  quotes: Array<{
    quoteId: string;
    quoteNumber: string;
    value: number;
    status: string;
    createdDate: Date;
  }>;
  status: 'open' | 'won' | 'lost' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FrontendCRMDashboardService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async getDashboardMetrics(tenantId: string, days: number = 30): Promise<CRMDashboardMetrics> {
    const cacheKey = `frontend_crm_dashboard:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Overview metrics
    const overview = await this.getOverviewMetrics(tenantId, startDate);

    // Pipeline metrics
    const pipeline = await this.getPipelineMetrics(tenantId, startDate);

    // Activities metrics
    const activities = await this.getActivitiesMetrics(tenantId, startDate);

    // Performance metrics
    const performance = await this.getPerformanceMetrics(tenantId, startDate);

    // Insights
    const insights = await this.generateInsights(tenantId, startDate);

    const result: CRMDashboardMetrics = {
      overview,
      pipeline,
      activities,
      performance,
      insights
    };

    await this.cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
    return result;
  }

  async getLeadsDashboard(tenantId: string, filters: any): Promise<{
    data: any[];
    total: number;
    summary: {
      totalLeads: number;
      newLeads: number;
      qualifiedLeads: number;
      convertedLeads: number;
      conversionRate: number;
      averageScore: number;
    };
  }> {
    const cacheKey = `frontend_leads_dashboard:${tenantId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = leads.tenantId.eq(tenantId);

    // Apply filters
    if (filters.status) {
      whereClause = and(whereClause, leads.status.eq(filters.status));
    }

    if (filters.source) {
      whereClause = and(whereClause, leads.source.eq(filters.source));
    }

    if (filters.assignedTo) {
      whereClause = and(whereClause, leads.assignedTo.eq(filters.assignedTo));
    }

    if (filters.scoreRange) {
      whereClause = and(
        whereClause,
        leads.leadScore.gte(filters.scoreRange.min),
        leads.leadScore.lte(filters.scoreRange.max)
      );
    }

    if (filters.dateRange) {
      whereClause = and(
        whereClause,
        leads.createdAt.gte(filters.dateRange.start),
        leads.createdAt.lte(filters.dateRange.end)
      );
    }

    const [leadsData, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select()
        .from(leads)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(leads.createdAt)),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);

    // Calculate summary
    const summary = await this.getLeadsSummary(tenantId, filters);

    const result = {
      data: leadsData,
      total,
      summary
    };

    await this.cacheService.set(cacheKey, result, 900); // Cache for 15 minutes
    return result;
  }

  async getOpportunitiesDashboard(tenantId: string, filters: any): Promise<{
    data: Opportunity[];
    total: number;
    summary: {
      totalOpportunities: number;
      totalValue: number;
      averageValue: number;
      winRate: number;
      averageTimeToClose: number;
      opportunitiesByStage: Record<string, number>;
    };
  }> {
    const cacheKey = `frontend_opportunities_dashboard:${tenantId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    // Get opportunities with related data
    const opportunities = await this.databaseService.drizzleClient
      .select({
        deal: deals,
        lead: leads,
        activities: activities,
        quotes: quotes
      })
      .from(deals)
      .leftJoin(leads, leads.id.eq(deals.leadId))
      .leftJoin(activities, activities.dealId.eq(deals.id))
      .leftJoin(quotes, quotes.dealId.eq(deals.id))
      .where(and(
        deals.tenantId.eq(tenantId),
        // Apply filters
        filters.stageId ? deals.stageId.eq(filters.stageId) : undefined,
        filters.ownerId ? deals.ownerId.eq(filters.ownerId) : undefined,
        filters.dateRange ? deals.createdAt.gte(filters.dateRange.start) : undefined,
        filters.dateRange ? deals.createdAt.lte(filters.dateRange.end) : undefined
      ))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(deals.createdAt));

    const total = opportunities.length; // Simplified - would need count query

    // Transform to Opportunity objects
    const opportunityData: Opportunity[] = [];
    const opportunitiesByDeal = new Map();

    for (const opp of opportunities) {
      if (!opportunitiesByDeal.has(opp.deal.id)) {
        opportunitiesByDeal.set(opp.deal.id, {
          ...opp.deal,
          activities: [],
          quotes: []
        });
      }

      const deal = opportunitiesByDeal.get(opp.deal.id);

      if (opp.activities) {
        deal.activities.push({
          id: opp.activities.id,
          leadId: opp.activities.leadId,
          type: opp.activities.type,
          title: opp.activities.title,
          description: opp.activities.description,
          outcome: opp.activities.outcome,
          scheduledAt: opp.activities.scheduledAt,
          completedAt: opp.activities.completedAt,
          userId: opp.activities.userId,
          userName: opp.activities.userName,
          metadata: opp.activities.metadata,
          createdAt: opp.activities.createdAt
        });
      }

      if (opp.quotes) {
        deal.quotes.push({
          quoteId: opp.quotes.id,
          quoteNumber: opp.quotes.quoteNumber,
          value: opp.quotes.total,
          status: opp.quotes.status,
          createdDate: opp.quotes.createdAt
        });
      }
    }

    // Calculate summary
    const summary = await this.getOpportunitiesSummary(tenantId, filters);

    const result = {
      data: Array.from(opportunitiesByDeal.values()),
      total,
      summary
    };

    await this.cacheService.set(cacheKey, result, 900);
    return result;
  }

  async getActivitiesDashboard(tenantId: string, filters: any): Promise<{
    data: LeadActivity[];
    total: number;
    summary: {
      totalActivities: number;
      completedToday: number;
      upcoming: number;
      overdue: number;
      byType: Record<string, number>;
      byUser: Record<string, number>;
    };
  }> {
    const cacheKey = `frontend_activities_dashboard:${tenantId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = activities.tenantId.eq(tenantId);

    // Apply filters
    if (filters.type) {
      whereClause = and(whereClause, activities.type.eq(filters.type));
    }

    if (filters.userId) {
      whereClause = and(whereClause, activities.userId.eq(filters.userId));
    }

    if (filters.leadId) {
      whereClause = and(whereClause, activities.leadId.eq(filters.leadId));
    }

    if (filters.dealId) {
      whereClause = and(whereClause, activities.dealId.eq(filters.dealId));
    }

    if (filters.dateRange) {
      whereClause = and(
        whereClause,
        activities.createdAt.gte(filters.dateRange.start),
        activities.createdAt.lte(filters.dateRange.end)
      );
    }

    const [activitiesData, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select()
        .from(activities)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(activities.createdAt)),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);

    // Calculate summary
    const summary = await this.getActivitiesSummary(tenantId, filters);

    const result = {
      data: activitiesData,
      total,
      summary
    };

    await this.cacheService.set(cacheKey, result, 600); // Cache for 10 minutes
    return result;
  }

  async getSalesFunnel(tenantId: string, days: number = 90): Promise<{
    stages: Array<{
      stageId: string;
      stageName: string;
      leadCount: number;
      opportunityCount: number;
      conversionRate: number;
      averageTime: number;
      totalValue: number;
    }>;
    conversionRates: {
      leadToOpportunity: number;
      opportunityToQuote: number;
      quoteToDeal: number;
      overall: number;
    };
    bottlenecks: Array<{
      stage: string;
      issue: string;
      impact: string;
      recommendation: string;
    }>;
  }> {
    const cacheKey = `frontend_sales_funnel:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get stage-wise metrics
    const stages = await this.databaseService.drizzleClient
      .select({
        stageId: deals.stageId,
        stageName: deals.stageName,
        opportunityCount: sql<number>`count(*)`,
        totalValue: sql<number>`SUM(value)`,
        averageTime: sql<number>`AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)`
      })
      .from(deals)
      .where(and(
        deals.tenantId.eq(tenantId),
        deals.createdAt.gte(startDate)
      ))
      .groupBy(deals.stageId, deals.stageName);

    // Get lead conversion metrics
    const leadMetrics = await this.databaseService.drizzleClient
      .select({
        totalLeads: sql<number>`count(*)`,
        convertedToOpportunities: sql<number>`count(*) FILTER (WHERE status = 'qualified')`,
        convertedToDeals: sql<number>`count(*) FILTER (WHERE converted_at IS NOT NULL)`
      })
      .from(leads)
      .where(and(
        leads.tenantId.eq(tenantId),
        leads.createdAt.gte(startDate)
      ));

    const metrics = leadMetrics[0];
    const totalLeads = Number(metrics.totalLeads) || 0;
    const convertedToOpportunities = Number(metrics.convertedToOpportunities) || 0;
    const convertedToDeals = Number(metrics.convertedToDeals) || 0;

    // Calculate conversion rates
    const conversionRates = {
      leadToOpportunity: totalLeads > 0 ? (convertedToOpportunities / totalLeads) * 100 : 0,
      opportunityToQuote: 0, // Would calculate from quotes data
      quoteToDeal: 0, // Would calculate from deals data
      overall: totalLeads > 0 ? (convertedToDeals / totalLeads) * 100 : 0
    };

    // Identify bottlenecks
    const bottlenecks = await this.identifyBottlenecks(tenantId, startDate);

    const result = {
      stages: stages.map(stage => ({
        ...stage,
        leadCount: 0, // Would get from lead stages
        conversionRate: 0, // Would calculate stage-to-stage conversion
        averageTime: Number(stage.averageTime) || 0
      })),
      conversionRates,
      bottlenecks
    };

    await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
    return result;
  }

  // Private helper methods
  private async getOverviewMetrics(tenantId: string, startDate: Date): Promise<any> {
    const metrics = await this.databaseService.drizzleClient
      .select({
        totalLeads: sql<number>`count(*)`,
        totalOpportunities: sql<number>`count(*)`,
        totalQuotes: sql<number>`count(*)`,
        totalRevenue: sql<number>`SUM(value)`,
        convertedLeads: sql<number>`count(*) FILTER (WHERE converted_at IS NOT NULL)`,
        wonDeals: sql<number>`count(*) FILTER (WHERE status = 'won')`
      })
      .from(leads)
      .where(and(
        leads.tenantId.eq(tenantId),
        leads.createdAt.gte(startDate)
      ));

    const data = metrics[0];
    const totalLeads = Number(data.totalLeads) || 0;
    const convertedLeads = Number(data.convertedLeads) || 0;
    const totalOpportunities = Number(data.totalOpportunities) || 0;
    const wonDeals = Number(data.wonDeals) || 0;

    return {
      totalLeads,
      totalOpportunities: totalOpportunities,
      totalQuotes: Number(data.totalQuotes) || 0,
      totalRevenue: Number(data.totalRevenue) || 0,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
      averageDealSize: wonDeals > 0 ? (Number(data.totalRevenue) || 0) / wonDeals : 0
    };
  }

  private async getPipelineMetrics(tenantId: string, startDate: Date): Promise<any> {
    // Get pipeline stages
    const stages = await this.databaseService.drizzleClient
      .select({
        stageId: deals.stageId,
        stageName: deals.stageName,
        dealCount: sql<number>`count(*)`,
        totalValue: sql<number>`SUM(value)`,
        averageAge: sql<number>`AVG(EXTRACT(EPOCH FROM (CURRENT_DATE - created_at)))`
      })
      .from(deals)
      .where(and(
        deals.tenantId.eq(tenantId),
        deals.createdAt.gte(startDate)
      ))
      .groupBy(deals.stageId, deals.stageName);

    // Get forecast
    const forecast = await this.calculateForecast(tenantId);

    return {
      stages: stages.map(stage => ({
        ...stage,
        conversionRate: 0, // Would calculate stage conversion
        averageAge: Number(stage.averageAge) || 0
      })),
      forecast,
      trends: [] // Would calculate daily/weekly trends
    };
  }

  private async getActivitiesMetrics(tenantId: string, startDate: Date): Promise<any> {
    // Get recent activities
    const recentActivities = await this.databaseService.drizzleClient
      .select()
      .from(activities)
      .where(and(
        activities.tenantId.eq(tenantId),
        activities.createdAt.gte(startDate)
      ))
      .orderBy(desc(activities.createdAt))
      .limit(10);

    // Get upcoming activities
    const upcomingActivities = await this.databaseService.drizzleClient
      .select()
      .from(activities)
      .where(and(
        activities.tenantId.eq(tenantId),
        activities.scheduledAt.gte(new Date()),
        activities.completedAt.isNull()
      ))
      .orderBy(activities.scheduledAt)
      .limit(10);

    // Get activity statistics
    const activityStats = await this.databaseService.drizzleClient
      .select({
        totalActivities: sql<number>`count(*)`,
        completedToday: sql<number>`count(*) FILTER (WHERE completed_at::date = CURRENT_DATE)`,
        overdue: sql<number>`count(*) FILTER (WHERE scheduled_at < CURRENT_DATE AND completed_at IS NULL)`,
        scheduled: sql<number>`count(*) FILTER (WHERE scheduled_at >= CURRENT_DATE AND completed_at IS NULL)`
      })
      .from(activities)
      .where(and(
        activities.tenantId.eq(tenantId),
        activities.createdAt.gte(startDate)
      ));

    return {
      recentActivities: recentActivities.map(activity => ({
        ...activity,
        userName: activity.userName || 'Unknown User'
      })),
      upcomingActivities: upcomingActivities.map(activity => ({
        ...activity,
        assignedTo: activity.userName || 'Unknown User',
        priority: activity.priority || 'medium'
      })),
      activityStats: {
        totalActivities: Number(activityStats[0].totalActivities) || 0,
        completedToday: Number(activityStats[0].completedToday) || 0,
        overdue: Number(activityStats[0].overdue) || 0,
        scheduled: Number(activityStats[0].scheduled) || 0
      }
    };
  }

  private async getPerformanceMetrics(tenantId: string, startDate: Date): Promise<any> {
    // Get sales rep performance
    const salesReps = await this.databaseService.drizzleClient
      .select({
        userId: deals.ownerId,
        userName: deals.ownerName,
        leadsCount: sql<number>`count(DISTINCT leads.id)`,
        dealsCount: sql<number>`count(*)`,
        revenue: sql<number>`SUM(CASE WHEN status = 'won' THEN value ELSE 0 END)`,
        conversionRate: sql<number>`count(CASE WHEN status = 'won' THEN 1 END)::float / count(*) * 100`
      })
      .from(deals)
      .leftJoin(leads, leads.id.eq(deals.leadId))
      .where(and(
        deals.tenantId.eq(tenantId),
        deals.createdAt.gte(startDate)
      ))
      .groupBy(deals.ownerId, deals.ownerName);

    // Get source performance
    const sources = await this.databaseService.drizzleClient
      .select({
        source: leads.source,
        leadsCount: sql<number>`count(*)`,
        conversionRate: sql<number>`count(CASE WHEN converted_at IS NOT NULL THEN 1 END)::float / count(*) * 100`,
        revenue: sql<number>`SUM(CASE WHEN converted_at IS NOT NULL THEN estimated_value ELSE 0 END)`
      })
      .from(leads)
      .where(and(
        leads.tenantId.eq(tenantId),
        leads.createdAt.gte(startDate)
      ))
      .groupBy(leads.source);

    // Get goals
    const goals = await this.getSalesGoals(tenantId);

    return {
      salesReps: salesReps.map(rep => ({
        ...rep,
        conversionRate: Number(rep.conversionRate) || 0,
        revenue: Number(rep.revenue) || 0,
        activitiesCount: 0 // Would get from activities
      })),
      sources: sources.map(source => ({
        ...source,
        conversionRate: Number(source.conversionRate) || 0,
        revenue: Number(source.revenue) || 0,
        costPerLead: 0 // Would calculate from marketing spend
      })),
      goals
    };
  }

  private async generateInsights(tenantId: string, startDate: Date): Promise<any[]> {
    const insights = [];

    // Lead quality insight
    const leadQuality = await this.analyzeLeadQuality(tenantId, startDate);
    if (leadQuality.conversionRate < 15) {
      insights.push({
        type: 'warning',
        title: 'Low Lead Quality',
        description: `Lead conversion rate is ${leadQuality.conversionRate.toFixed(1)}%, below target`,
        impact: 'Reduced sales efficiency and lower ROI',
        recommendation: 'Review lead sources and qualification criteria'
      });
    }

    // Pipeline velocity insight
    const pipelineVelocity = await this.analyzePipelineVelocity(tenantId, startDate);
    if (pipelineVelocity.averageTimeToClose > 45) {
      insights.push({
        type: 'info',
        title: 'Slow Pipeline Movement',
        description: `Average time to close deals is ${pipelineVelocity.averageTimeToClose.toFixed(0)} days`,
        impact: 'Increased sales cycle and cash flow impact',
        recommendation: 'Improve follow-up processes and remove bottlenecks'
      });
    }

    // Activity engagement insight
    const activityEngagement = await this.analyzeActivityEngagement(tenantId, startDate);
    if (activityEngagement.overdueActivities > activityEngagement.totalActivities * 0.1) {
      insights.push({
        type: 'warning',
        title: 'High Overdue Activities',
        description: `${activityEngagement.overdueActivities} activities are overdue`,
        impact: 'Missed opportunities and poor customer experience',
        recommendation: 'Improve activity scheduling and follow-up processes'
      });
    }

    return insights;
  }

  private async getLeadsSummary(tenantId: string, filters: any): Promise<any> {
    let whereClause = leads.tenantId.eq(tenantId);

    // Apply same filters as main query
    if (filters.status) {
      whereClause = and(whereClause, leads.status.eq(filters.status));
    }

    if (filters.dateRange) {
      whereClause = and(
        whereClause,
        leads.createdAt.gte(filters.dateRange.start),
        leads.createdAt.lte(filters.dateRange.end)
      );
    }

    const summary = await this.databaseService.drizzleClient
      .select({
        totalLeads: sql<number>`count(*)`,
        newLeads: sql<number>`count(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')`,
        qualifiedLeads: sql<number>`count(*) FILTER (WHERE status = 'qualified')`,
        convertedLeads: sql<number>`count(*) FILTER (WHERE converted_at IS NOT NULL)`,
        averageScore: sql<number>`AVG(lead_score)`
      })
      .from(leads)
      .where(whereClause);

    const data = summary[0];
    return {
      totalLeads: Number(data.totalLeads) || 0,
      newLeads: Number(data.newLeads) || 0,
      qualifiedLeads: Number(data.qualifiedLeads) || 0,
      convertedLeads: Number(data.convertedLeads) || 0,
      conversionRate: Number(data.totalLeads) > 0 ? (Number(data.convertedLeads) / Number(data.totalLeads)) * 100 : 0,
      averageScore: Number(data.averageScore) || 0
    };
  }

  private async getOpportunitiesSummary(tenantId: string, filters: any): Promise<any> {
    let whereClause = deals.tenantId.eq(tenantId);

    // Apply same filters as main query
    if (filters.stageId) {
      whereClause = and(whereClause, deals.stageId.eq(filters.stageId));
    }

    if (filters.dateRange) {
      whereClause = and(
        whereClause,
        deals.createdAt.gte(filters.dateRange.start),
        deals.createdAt.lte(filters.dateRange.end)
      );
    }

    const summary = await this.databaseService.drizzleClient
      .select({
        totalOpportunities: sql<number>`count(*)`,
        totalValue: sql<number>`SUM(value)`,
        averageValue: sql<number>`AVG(value)`,
        winRate: sql<number>`count(CASE WHEN status = 'won' THEN 1 END)::float / count(*) * 100`,
        averageTimeToClose: sql<number>`AVG(EXTRACT(EPOCH FROM (actual_close_date - created_at))/86400) FILTER (WHERE actual_close_date IS NOT NULL)`
      })
      .from(deals)
      .where(whereClause);

    const data = summary[0];
    return {
      totalOpportunities: Number(data.totalOpportunities) || 0,
      totalValue: Number(data.totalValue) || 0,
      averageValue: Number(data.averageValue) || 0,
      winRate: Number(data.winRate) || 0,
      averageTimeToClose: Number(data.averageTimeToClose) || 0
    };
  }

  private async getActivitiesSummary(tenantId: string, filters: any): Promise<any> {
    let whereClause = activities.tenantId.eq(tenantId);

    // Apply same filters as main query
    if (filters.type) {
      whereClause = and(whereClause, activities.type.eq(filters.type));
    }

    if (filters.dateRange) {
      whereClause = and(
        whereClause,
        activities.createdAt.gte(filters.dateRange.start),
        activities.createdAt.lte(filters.dateRange.end)
      );
    }

    const summary = await this.databaseService.drizzleClient
      .select({
        totalActivities: sql<number>`count(*)`,
        completedToday: sql<number>`count(*) FILTER (WHERE completed_at::date = CURRENT_DATE)`,
        overdue: sql<number>`count(*) FILTER (WHERE scheduled_at < CURRENT_DATE AND completed_at IS NULL)`,
        scheduled: sql<number>`count(*) FILTER (WHERE scheduled_at >= CURRENT_DATE AND completed_at IS NULL)`
      })
      .from(activities)
      .where(whereClause);

    // Get by type
    const byType = await this.databaseService.drizzleClient
      .select({
        type: activities.type,
        count: sql<number>`count(*)`
      })
      .from(activities)
      .where(whereClause)
      .groupBy(activities.type);

    // Get by user
    const byUser = await this.databaseService.drizzleClient
      .select({
        userId: activities.userId,
        userName: activities.userName,
        count: sql<number>`count(*)`
      })
      .from(activities)
      .where(whereClause)
      .groupBy(activities.userId, activities.userName);

    const data = summary[0];
    return {
      totalActivities: Number(data.totalActivities) || 0,
      completedToday: Number(data.completedToday) || 0,
      overdue: Number(data.overdue) || 0,
      scheduled: Number(data.scheduled) || 0,
      byType: Object.fromEntries(byType.map(t => [t.type, Number(t.count)])),
      byUser: Object.fromEntries(byUser.map(u => [u.userName || u.userId, Number(u.count)]))
    };
  }

  private async calculateForecast(tenantId: string): Promise<any> {
    // Calculate sales forecast based on pipeline
    const forecastData = await this.databaseService.drizzleClient
      .select({
        monthly: sql<number>`SUM(value * probability / 100) FILTER (WHERE expected_close_date <= CURRENT_DATE + INTERVAL '30 days')`,
        quarterly: sql<number>`SUM(value * probability / 100) FILTER (WHERE expected_close_date <= CURRENT_DATE + INTERVAL '90 days')`,
        yearly: sql<number>`SUM(value * probability / 100) FILTER (WHERE expected_close_date <= CURRENT_DATE + INTERVAL '365 days')`
      })
      .from(deals)
      .where(and(
        deals.tenantId.eq(tenantId),
        deals.status.eq('open')
      ));

    const data = forecastData[0];
    return {
      monthly: Number(data.monthly) || 0,
      quarterly: Number(data.quarterly) || 0,
      yearly: Number(data.yearly) || 0
    };
  }

  private async getSalesGoals(tenantId: string): Promise<any> {
    // Get sales goals from goals table
    // For now, return mock data
    return {
      monthlyTarget: 100000,
      monthlyAchieved: 75000,
      quarterlyTarget: 300000,
      quarterlyAchieved: 225000,
      yearlyTarget: 1200000,
      yearlyAchieved: 900000
    };
  }

  private async analyzeLeadQuality(tenantId: string, startDate: Date): Promise<any> {
    const qualityData = await this.databaseService.drizzleClient
      .select({
        totalLeads: sql<number>`count(*)`,
        convertedLeads: sql<number>`count(*) FILTER (WHERE converted_at IS NOT NULL)`,
        averageScore: sql<number>`AVG(lead_score)`
      })
      .from(leads)
      .where(and(
        leads.tenantId.eq(tenantId),
        leads.createdAt.gte(startDate)
      ));

    const data = qualityData[0];
    return {
      totalLeads: Number(data.totalLeads) || 0,
      convertedLeads: Number(data.convertedLeads) || 0,
      conversionRate: Number(data.totalLeads) > 0 ? (Number(data.convertedLeads) / Number(data.totalLeads)) * 100 : 0,
      averageScore: Number(data.averageScore) || 0
    };
  }

  private async analyzePipelineVelocity(tenantId: string, startDate: Date): Promise<any> {
    const velocityData = await this.databaseService.drizzleClient
      .select({
        totalDeals: sql<number>`count(*)`,
        closedDeals: sql<number>`count(*) FILTER (WHERE status IN ('won', 'lost'))`,
        averageTimeToClose: sql<number>`AVG(EXTRACT(EPOCH FROM (actual_close_date - created_at))/86400) FILTER (WHERE actual_close_date IS NOT NULL)`
      })
      .from(deals)
      .where(and(
        deals.tenantId.eq(tenantId),
        deals.createdAt.gte(startDate)
      ));

    const data = velocityData[0];
    return {
      totalDeals: Number(data.totalDeals) || 0,
      closedDeals: Number(data.closedDeals) || 0,
      averageTimeToClose: Number(data.averageTimeToClose) || 0
    };
  }

  private async analyzeActivityEngagement(tenantId: string, startDate: Date): Promise<any> {
    const engagementData = await this.databaseService.drizzleClient
      .select({
        totalActivities: sql<number>`count(*)`,
        overdueActivities: sql<number>`count(*) FILTER (WHERE scheduled_at < CURRENT_DATE AND completed_at IS NULL)`,
        completedActivities: sql<number>`count(*) FILTER (WHERE completed_at IS NOT NULL)`
      })
      .from(activities)
      .where(and(
        activities.tenantId.eq(tenantId),
        activities.createdAt.gte(startDate)
      ));

    const data = engagementData[0];
    return {
      totalActivities: Number(data.totalActivities) || 0,
      overdueActivities: Number(data.overdueActivities) || 0,
      completedActivities: Number(data.completedActivities) || 0
    };
  }

  private async identifyBottlenecks(tenantId: string, startDate: Date): Promise<any[]> {
    // Identify pipeline bottlenecks
    // For now, return mock data
    return [
      {
        stage: 'Proposal',
        issue: 'Long approval times',
        impact: 'Delays deal closure',
        recommendation: 'Streamline approval workflow'
      },
      {
        stage: 'Negotiation',
        issue: 'Price sensitivity',
        impact: 'Lower win rates',
        recommendation: 'Improve value proposition'
      }
    ];
  }
}
