import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';
import { leads, activities, deals, quotes } from '../../../database/schema/crm.schema';

export interface ConversionMetrics {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageConversionTime: number;
  conversionBySource: Record<string, { leads: number; converted: number; rate: number }>;
  conversionByChannel: Record<string, { leads: number; converted: number; rate: number }>;
  conversionByTimeframe: {
    within7Days: number;
    within30Days: number;
    within90Days: number;
    over90Days: number;
  };
  conversionFunnel: Array<{
    stage: string;
    leads: number;
    conversionRate: number;
    dropOffRate: number;
  }>;
  revenueAttribution: {
    totalRevenue: number;
    averageDealValue: number;
    revenueBySource: Record<string, number>;
    revenueByChannel: Record<string, number>;
  };
}

export interface ConversionJourney {
  leadId: string;
  leadNumber: string;
  customerName: string;
  source: string;
  conversionDate: Date;
  timeToConvert: number; // days
  touchpoints: Array<{
    type: 'email' | 'call' | 'meeting' | 'demo' | 'quote' | 'proposal';
    date: Date;
    outcome: string;
    userId: string;
  }>;
  quotes: Array<{
    quoteId: string;
    quoteNumber: string;
    value: number;
    status: string;
    createdDate: Date;
  }>;
  finalDeal: {
    dealId: string;
    value: number;
    closeDate: Date;
  };
  conversionScore: number;
}

export interface LeadScoringImpact {
  scoreRanges: Array<{
    minScore: number;
    maxScore: number;
    leads: number;
    converted: number;
    conversionRate: number;
  }>;
  scoreThresholds: {
    hot: number;
    warm: number;
    cold: number;
  };
  scoreEffectiveness: {
    aboveThreshold: number;
    belowThreshold: number;
  };
}

@Injectable()
export class ConversionTrackingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async getConversionMetrics(tenantId: string, startDate?: Date, endDate?: Date): Promise<ConversionMetrics> {
    const cacheKey = `conversion_metrics:${tenantId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const defaultStartDate = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const defaultEndDate = endDate || new Date();

    // Get total leads and converted leads
    const leadStats = await this.databaseService.drizzleClient
      .select({
        totalLeads: sql<number>`count(*)`,
        convertedLeads: sql<number>`count(*) FILTER (WHERE converted_at IS NOT NULL AND converted_at BETWEEN ${defaultStartDate} AND ${defaultEndDate})`
      })
      .from(leads)
      .where(and(
        leads.tenantId.eq(tenantId),
        leads.createdAt.gte(defaultStartDate)
      ));

    const totalLeads = Number(leadStats[0].totalLeads) || 0;
    const convertedLeads = Number(leadStats[0].convertedLeads) || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Get conversion by source
    const sourceStats = await this.databaseService.drizzleClient
      .select({
        source: leads.source,
        totalLeads: sql<number>`count(*)`,
        convertedLeads: sql<number>`count(*) FILTER (WHERE converted_at IS NOT NULL)`
      })
      .from(leads)
      .where(and(
        leads.tenantId.eq(tenantId),
        leads.createdAt.gte(defaultStartDate)
      ))
      .groupBy(leads.source);

    const conversionBySource: Record<string, { leads: number; converted: number; rate: number }> = {};
    for (const stat of sourceStats) {
      const leads = Number(stat.totalLeads) || 0;
      const converted = Number(stat.convertedLeads) || 0;
      conversionBySource[stat.source] = {
        leads,
        converted,
        rate: leads > 0 ? (converted / leads) * 100 : 0
      };
    }

    // Get conversion by timeframe
    const conversionByTimeframe = await this.calculateConversionByTimeframe(tenantId, defaultStartDate, defaultEndDate);

    // Get conversion funnel
    const conversionFunnel = await this.calculateConversionFunnel(tenantId, defaultStartDate, defaultEndDate);

    // Get revenue attribution
    const revenueAttribution = await this.calculateRevenueAttribution(tenantId, defaultStartDate, defaultEndDate);

    // Calculate average conversion time
    const avgConversionTime = await this.calculateAverageConversionTime(tenantId, defaultStartDate, defaultEndDate);

    const result: ConversionMetrics = {
      totalLeads,
      convertedLeads,
      conversionRate,
      averageConversionTime: avgConversionTime,
      conversionBySource,
      conversionByChannel: {}, // Would calculate based on campaign/channel data
      conversionByTimeframe,
      conversionFunnel,
      revenueAttribution
    };

    await this.cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
    return result;
  }

  async getConversionJourney(leadId: string, tenantId: string): Promise<ConversionJourney> {
    // Get lead details
    const lead = await this.databaseService.drizzleClient
      .select()
      .from(leads)
      .where(and(
        leads.id.eq(leadId),
        leads.tenantId.eq(tenantId)
      ))
      .limit(1);

    if (lead.length === 0) {
      throw new Error('Lead not found');
    }

    const leadData = lead[0];

    // Get all activities for this lead
    const activities = await this.databaseService.drizzleClient
      .select()
      .from(activities)
      .where(and(
        activities.leadId.eq(leadId),
        activities.tenantId.eq(tenantId)
      ))
      .orderBy(activities.createdAt);

    // Get quotes for this lead
    const leadQuotes = await this.databaseService.drizzleClient
      .select()
      .from(quotes)
      .where(and(
        quotes.leadId.eq(leadId),
        quotes.tenantId.eq(tenantId)
      ))
      .orderBy(quotes.createdAt);

    // Get final deal if converted
    let finalDeal = null;
    if (leadData.convertedToCustomerId) {
      // In real implementation, this would query deals table
      finalDeal = {
        dealId: 'deal-123',
        value: 50000,
        closeDate: leadData.convertedAt
      };
    }

    // Calculate conversion score
    const conversionScore = await this.calculateConversionScore(leadId, tenantId);

    return {
      leadId,
      leadNumber: leadData.leadNumber,
      customerName: leadData.contactName,
      source: leadData.source,
      conversionDate: leadData.convertedAt,
      timeToConvert: leadData.convertedAt
        ? Math.floor((leadData.convertedAt.getTime() - leadData.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      touchpoints: activities.map(activity => ({
        type: this.mapActivityToTouchpoint(activity.type),
        date: activity.createdAt,
        outcome: activity.outcome || 'completed',
        userId: activity.userId
      })),
      quotes: leadQuotes.map(quote => ({
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        value: quote.total,
        status: quote.status,
        createdDate: quote.createdAt
      })),
      finalDeal,
      conversionScore
    };
  }

  async getLeadScoringImpact(tenantId: string, days: number = 90): Promise<LeadScoringImpact> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get leads with scores and their conversion status
    const leadScoringData = await this.databaseService.drizzleClient
      .select({
        leadScore: leads.leadScore,
        converted: sql<boolean>`converted_at IS NOT NULL`,
        createdAt: leads.createdAt,
        convertedAt: leads.convertedAt
      })
      .from(leads)
      .where(and(
        leads.tenantId.eq(tenantId),
        leads.createdAt.gte(startDate),
        leads.leadScore.isNotNull()
      ))
      .orderBy(leads.leadScore);

    // Group by score ranges
    const scoreRanges = [
      { minScore: 0, maxScore: 25, leads: 0, converted: 0 },
      { minScore: 26, maxScore: 50, leads: 0, converted: 0 },
      { minScore: 51, maxScore: 75, leads: 0, converted: 0 },
      { minScore: 76, maxScore: 100, leads: 0, converted: 0 }
    ];

    for (const lead of leadScoringData) {
      const score = Number(lead.leadScore) || 0;
      const range = scoreRanges.find(r => score >= r.minScore && score <= r.maxScore);
      if (range) {
        range.leads++;
        if (lead.converted) {
          range.converted++;
        }
      }
    }

    const scoreRangesWithRates = scoreRanges.map(range => ({
      ...range,
      conversionRate: range.leads > 0 ? (range.converted / range.leads) * 100 : 0
    }));

    // Calculate score thresholds
    const scoreThresholds = await this.calculateOptimalScoreThresholds(leadScoringData);

    const result: LeadScoringImpact = {
      scoreRanges: scoreRangesWithRates,
      scoreThresholds,
      scoreEffectiveness: {
        aboveThreshold: 0, // Would calculate based on threshold performance
        belowThreshold: 0
      }
    };

    return result;
  }

  async getConversionInsights(tenantId: string, days: number = 30): Promise<Array<{
    type: 'improvement' | 'warning' | 'success';
    title: string;
    description: string;
    impact: string;
    recommendation: string;
  }>> {
    const metrics = await this.getConversionMetrics(tenantId, new Date(Date.now() - days * 24 * 60 * 60 * 1000));

    const insights = [];

    // Check conversion rate
    if (metrics.conversionRate < 10) {
      insights.push({
        type: 'warning',
        title: 'Low Conversion Rate',
        description: `Current conversion rate is ${metrics.conversionRate.toFixed(1)}%, below industry average`,
        impact: 'Reduced revenue and sales efficiency',
        recommendation: 'Review lead qualification criteria and improve follow-up processes'
      });
    }

    // Check average conversion time
    if (metrics.averageConversionTime > 60) {
      insights.push({
        type: 'improvement',
        title: 'Long Conversion Cycle',
        description: `Average time to convert is ${metrics.averageConversionTime.toFixed(0)} days`,
        impact: 'Increased sales costs and lower pipeline velocity',
        recommendation: 'Streamline sales process and improve lead nurturing'
      });
    }

    // Check source performance
    const underperformingSources = Object.entries(metrics.conversionBySource)
      .filter(([_, data]) => data.rate < 5)
      .map(([source, _]) => source);

    if (underperformingSources.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Underperforming Lead Sources',
        description: `Sources with low conversion: ${underperformingSources.join(', ')}`,
        impact: 'Wasted marketing spend and poor lead quality',
        recommendation: 'Optimize or pause underperforming channels'
      });
    }

    return insights;
  }

  // Private helper methods
  private async calculateConversionByTimeframe(tenantId: string, startDate: Date, endDate: Date): Promise<any> {
    const conversionData = await this.databaseService.drizzleClient
      .select({
        createdAt: leads.createdAt,
        convertedAt: leads.convertedAt
      })
      .from(leads)
      .where(and(
        leads.tenantId.eq(tenantId),
        leads.createdAt.gte(startDate),
        leads.convertedAt.isNotNull(),
        leads.convertedAt.lte(endDate)
      ));

    let within7Days = 0;
    let within30Days = 0;
    let within90Days = 0;
    let over90Days = 0;

    for (const lead of conversionData) {
      if (!lead.convertedAt) continue;

      const daysToConvert = Math.floor((lead.convertedAt.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      if (daysToConvert <= 7) within7Days++;
      else if (daysToConvert <= 30) within30Days++;
      else if (daysToConvert <= 90) within90Days++;
      else over90Days++;
    }

    const total = conversionData.length;
    return {
      within7Days: total > 0 ? (within7Days / total) * 100 : 0,
      within30Days: total > 0 ? (within30Days / total) * 100 : 0,
      within90Days: total > 0 ? (within90Days / total) * 100 : 0,
      over90Days: total > 0 ? (over90Days / total) * 100 : 0
    };
  }

  private async calculateConversionFunnel(tenantId: string, startDate: Date, endDate: Date): Promise<Array<any>> {
    // Simplified funnel - in real implementation would track actual stages
    return [
      { stage: 'New Lead', leads: 1000, conversionRate: 100, dropOffRate: 0 },
      { stage: 'Qualified', leads: 750, conversionRate: 75, dropOffRate: 25 },
      { stage: 'Proposal', leads: 500, conversionRate: 50, dropOffRate: 33 },
      { stage: 'Negotiation', leads: 300, conversionRate: 30, dropOffRate: 40 },
      { stage: 'Closed Won', leads: 200, conversionRate: 20, dropOffRate: 33 }
    ];
  }

  private async calculateRevenueAttribution(tenantId: string, startDate: Date, endDate: Date): Promise<any> {
    // Simplified calculation - would integrate with actual deal and revenue data
    return {
      totalRevenue: 2500000,
      averageDealValue: 12500,
      revenueBySource: {
        'Website': 800000,
        'Referral': 600000,
        'Social Media': 400000,
        'Direct': 300000,
        'Events': 200000,
        'Other': 200000
      },
      revenueByChannel: {
        'Organic Search': 500000,
        'Paid Ads': 300000,
        'Email Marketing': 250000,
        'Content Marketing': 200000
      }
    };
  }

  private async calculateAverageConversionTime(tenantId: string, startDate: Date, endDate: Date): Promise<number> {
    const conversionData = await this.databaseService.drizzleClient
      .select({
        createdAt: leads.createdAt,
        convertedAt: leads.convertedAt
      })
      .from(leads)
      .where(and(
        leads.tenantId.eq(tenantId),
        leads.createdAt.gte(startDate),
        leads.convertedAt.isNotNull(),
        leads.convertedAt.lte(endDate)
      ));

    if (conversionData.length === 0) return 0;

    const totalDays = conversionData.reduce((sum, lead) => {
      if (!lead.convertedAt) return sum;
      return sum + Math.floor((lead.convertedAt.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);

    return totalDays / conversionData.length;
  }

  private async calculateConversionScore(leadId: string, tenantId: string): Promise<number> {
    // Calculate conversion probability based on lead data and behavior
    const lead = await this.databaseService.drizzleClient
      .select()
      .from(leads)
      .where(and(
        leads.id.eq(leadId),
        leads.tenantId.eq(tenantId)
      ))
      .limit(1);

    if (lead.length === 0) return 0;

    const leadData = lead[0];
    let score = 0;

    // Base score from lead score
    score += (Number(leadData.leadScore) || 0) * 0.4;

    // Recency bonus
    const daysSinceCreated = Math.floor((Date.now() - leadData.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated < 7) score += 20;
    else if (daysSinceCreated < 30) score += 10;

    // Engagement bonus (simplified)
    const activityCount = await this.databaseService.drizzleClient
      .select({ count: sql<number>`count(*)` })
      .from(activities)
      .where(and(
        activities.leadId.eq(leadId),
        activities.tenantId.eq(tenantId)
      ));

    const engagementBonus = Math.min(Number(activityCount[0].count) * 5, 30);
    score += engagementBonus;

    // Source bonus
    const sourceBonuses = {
      'Referral': 15,
      'Website': 10,
      'Direct': 20,
      'Social Media': 5,
      'Events': 25,
      'Other': 0
    };

    score += sourceBonuses[leadData.source] || 0;

    return Math.min(score, 100);
  }

  private async calculateOptimalScoreThresholds(leadScoringData: any[]): Promise<any> {
    // Calculate optimal thresholds based on historical data
    const convertedLeads = leadScoringData.filter(lead => lead.converted);
    const avgConvertedScore = convertedLeads.length > 0
      ? convertedLeads.reduce((sum, lead) => sum + (Number(lead.leadScore) || 0), 0) / convertedLeads.length
      : 50;

    return {
      hot: Math.min(avgConvertedScore + 20, 90),
      warm: Math.min(avgConvertedScore, 70),
      cold: Math.max(avgConvertedScore - 20, 10)
    };
  }

  private mapActivityToTouchpoint(activityType: string): 'email' | 'call' | 'meeting' | 'demo' | 'quote' | 'proposal' {
    switch (activityType) {
      case 'email_sent':
      case 'email_opened':
      case 'email_clicked':
        return 'email';
      case 'call_made':
      case 'call_received':
        return 'call';
      case 'meeting_scheduled':
      case 'meeting_completed':
        return 'meeting';
      case 'demo_scheduled':
      case 'demo_completed':
        return 'demo';
      case 'quote_sent':
      case 'quote_viewed':
        return 'quote';
      case 'proposal_sent':
        return 'proposal';
      default:
        return 'email'; // Default fallback
    }
  }
}
