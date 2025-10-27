import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../core/database/database.service';
import { leads, activities, users } from '../../../database/schema/crm.schema';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { CreateLeadDto, LeadStatus, LeadSource } from '../dto/create-lead.dto';

export interface UpdateLeadDto {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  source?: LeadSource;
  status?: LeadStatus;
  leadScore?: number;
  estimatedValue?: number;
  assignedTo?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface Lead {
  id: string;
  leadNumber: string;
  companyName?: string;
  contactName: string;
  email?: string;
  phone?: string;
  source: string;
  status: string;
  leadScore?: number;
  estimatedValue?: number;
  assignedTo?: string;
  notes?: string;
  metadata?: Record<string, any>;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  convertedAt?: Date;
  convertedToCustomerId?: string;
}

@Injectable()
export class LeadService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async create(createLeadDto: CreateLeadDto, tenantId: string, userId: string): Promise<Lead> {
    // Generate unique lead number
    const leadNumber = await this.generateLeadNumber(tenantId);

    const [lead] = await this.databaseService.drizzleClient
      .insert(leads)
      .values({
        leadNumber,
        companyName: createLeadDto.companyName,
        contactName: createLeadDto.contactName,
        email: createLeadDto.email,
        phone: createLeadDto.phone,
        source: createLeadDto.source,
        status: createLeadDto.status || 'new',
        leadScore: createLeadDto.leadScore || this.calculateInitialScore(createLeadDto),
        estimatedValue: createLeadDto.estimatedValue,
        assignedTo: createLeadDto.assignedTo,
        notes: createLeadDto.notes,
        metadata: createLeadDto.metadata || {},
        tenantId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    // Clear leads cache for this tenant
    await this.cacheService.del(`crm_leads:${tenantId}`);

    // Create initial activity
    await this.createInitialActivity(lead, tenantId, userId);

    this.loggerService.log(`Lead created: ${lead.id} (${lead.leadNumber})`, 'LeadService');
    return lead;
  }

  async findAll(tenantId: string, filters?: any): Promise<{ data: Lead[]; total: number; page: number; totalPages: number }> {
    const page = parseInt(filters?.page) || 1;
    const limit = Math.min(parseInt(filters?.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(leads.tenantId, tenantId)];

    // Filter by status
    if (filters?.status) {
      conditions.push(eq(leads.status, filters.status));
    }

    // Filter by source
    if (filters?.source) {
      conditions.push(eq(leads.source, filters.source));
    }

    // Filter by assigned user
    if (filters?.assignedTo) {
      conditions.push(eq(leads.assignedTo, filters.assignedTo));
    }

    // Filter by score range
    if (filters?.minScore) {
      conditions.push(gte(leads.leadScore, parseInt(filters.minScore)));
    }
    if (filters?.maxScore) {
      conditions.push(lte(leads.leadScore, parseInt(filters.maxScore)));
    }

    // Filter by value range
    if (filters?.minValue) {
      conditions.push(gte(leads.estimatedValue, parseFloat(filters.minValue)));
    }
    if (filters?.maxValue) {
      conditions.push(lte(leads.estimatedValue, parseFloat(filters.maxValue)));
    }

    // Search by name, company, email
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          like(leads.contactName, searchTerm),
          like(leads.companyName, searchTerm),
          like(leads.email, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [results, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select({
          ...leads,
          assignedUser: users,
        })
        .from(leads)
        .leftJoin(users, eq(leads.assignedTo, users.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(leads.leadScore), desc(leads.createdAt)),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);

    return {
      data: results.map(r => ({
        ...r.leads,
        assignedUser: r.assignedUser,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrev: page > 1,
    };
  }

  async findOne(id: string, tenantId: string): Promise<Lead | null> {
    const results = await this.databaseService.drizzleClient
      .select({
        ...leads,
        assignedUser: users,
      })
      .from(leads)
      .leftJoin(users, eq(leads.assignedTo, users.id))
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return {
      ...results[0].leads,
      assignedUser: results[0].assignedUser,
    };
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, tenantId: string, userId: string): Promise<Lead | null> {
    // Check if lead exists
    const existingLead = await this.findOne(id, tenantId);
    if (!existingLead) {
      throw new NotFoundException('Lead not found');
    }

    // Recalculate score if relevant fields changed
    if (updateLeadDto.source || updateLeadDto.estimatedValue || updateLeadDto.status) {
      updateLeadDto.leadScore = this.calculateScore({
        ...existingLead,
        ...updateLeadDto,
      });
    }

    const [updatedLead] = await this.databaseService.drizzleClient
      .update(leads)
      .set({
        ...updateLeadDto,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)))
      .returning();

    // Clear leads cache for this tenant
    await this.cacheService.del(`crm_leads:${tenantId}`);

    // Create activity for status change
    if (updateLeadDto.status && updateLeadDto.status !== existingLead.status) {
      await this.createStatusChangeActivity(updatedLead, existingLead.status, tenantId, userId);
    }

    this.loggerService.log(`Lead updated: ${id}`, 'LeadService');
    return updatedLead;
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const [deletedLead] = await this.databaseService.drizzleClient
      .update(leads)
      .set({
        status: 'deleted',
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)))
      .returning();

    if (!deletedLead) {
      throw new NotFoundException('Lead not found');
    }

    // Clear leads cache for this tenant
    await this.cacheService.del(`crm_leads:${tenantId}`);

    this.loggerService.log(`Lead deleted: ${id}`, 'LeadService');
    return true;
  }

  async getStats(tenantId: string): Promise<{
    totalLeads: number;
    newLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    averageScore: number;
    totalValue: number;
    leadsBySource: Record<string, number>;
    leadsByStatus: Record<string, number>;
  }> {
    const cacheKey = `crm_lead_stats:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Get all leads for this tenant
    const allLeads = await this.databaseService.drizzleClient
      .select()
      .from(leads)
      .where(eq(leads.tenantId, tenantId));

    // Calculate statistics
    const stats = {
      totalLeads: allLeads.length,
      newLeads: allLeads.filter(l => l.status === 'new').length,
      qualifiedLeads: allLeads.filter(l => l.status === 'qualified').length,
      convertedLeads: allLeads.filter(l => l.status === 'closed-won').length,
      averageScore: allLeads.reduce((sum, l) => sum + (l.leadScore || 0), 0) / allLeads.length || 0,
      totalValue: allLeads.reduce((sum, l) => sum + parseFloat(l.estimatedValue?.toString() || '0'), 0),
      leadsBySource: {} as Record<string, number>,
      leadsByStatus: {} as Record<string, number>,
    };

    // Count by source
    allLeads.forEach(lead => {
      stats.leadsBySource[lead.source] = (stats.leadsBySource[lead.source] || 0) + 1;
      stats.leadsByStatus[lead.status] = (stats.leadsByStatus[lead.status] || 0) + 1;
    });

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, stats, 300);
    return stats;
  }

  async convertToCustomer(id: string, tenantId: string, userId: string, customerData?: any): Promise<{ lead: Lead; customer: any }> {
    const lead = await this.findOne(id, tenantId);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.status === 'closed-won') {
      throw new BadRequestException('Lead is already converted');
    }

    // Update lead status
    await this.update(id, {
      status: 'closed-won',
      convertedAt: new Date(),
      metadata: {
        ...lead.metadata,
        convertedToCustomer: true,
        convertedBy: userId,
        convertedAt: new Date(),
      }
    }, tenantId, userId);

    // TODO: Create actual customer
    const customer = {
      id: `CUST_${Date.now()}`,
      companyName: lead.companyName || `${lead.contactName}`,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      status: 'active',
      tenantId,
      createdBy: userId,
      createdAt: new Date(),
      ...customerData,
    };

    this.loggerService.log(`Lead converted to customer: ${id}`, 'LeadService');
    return {
      lead: await this.findOne(id, tenantId)!,
      customer,
    };
  }

  async updateScore(id: string, score: number, reason: string, tenantId: string, userId: string): Promise<Lead> {
    return this.update(id, {
      leadScore: score,
      metadata: {
        scoreUpdatedBy: userId,
        scoreUpdateReason: reason,
        scoreUpdatedAt: new Date(),
      }
    }, tenantId, userId);
  }

  async assignTo(id: string, assignedTo: string, tenantId: string, userId: string): Promise<Lead> {
    return this.update(id, {
      assignedTo,
      metadata: {
        assignmentUpdatedBy: userId,
        assignmentUpdatedAt: new Date(),
      }
    }, tenantId, userId);
  }

  async bulkUpdate(updates: Array<{id: string, data: UpdateLeadDto}>, tenantId: string, userId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{id: string, success: boolean, error?: string}>;
  }> {
    const results = [];

    for (const update of updates) {
      try {
        await this.update(update.id, update.data, tenantId, userId);
        results.push({ id: update.id, success: true });
      } catch (error) {
        results.push({ id: update.id, success: false, error: error.message });
      }
    }

    // Clear leads cache for this tenant
    await this.cacheService.del(`crm_leads:${tenantId}`);

    return {
      total: updates.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  async searchLeads(searchTerm: string, tenantId: string, limit: number = 20): Promise<{
    data: Lead[];
    total: number;
    searchTerm: string;
  }> {
    const searchConditions = [
      eq(leads.tenantId, tenantId),
      or(
        like(leads.contactName, `%${searchTerm}%`),
        like(leads.companyName, `%${searchTerm}%`),
        like(leads.email, `%${searchTerm}%`),
        like(leads.source, `%${searchTerm}%`)
      )
    ];

    const results = await this.databaseService.drizzleClient
      .select({
        ...leads,
        assignedUser: users,
      })
      .from(leads)
      .leftJoin(users, eq(leads.assignedTo, users.id))
      .where(and(...searchConditions))
      .limit(limit)
      .orderBy(desc(leads.leadScore), desc(leads.createdAt));

    return {
      data: results.map(r => ({
        ...r.leads,
        assignedUser: r.assignedUser,
      })),
      total: results.length,
      searchTerm
    };
  }

  private async generateLeadNumber(tenantId: string): Promise<string> {
    const currentYear = new Date().getFullYear();

    // Get the latest lead number for this tenant and year
    const latestLead = await this.databaseService.drizzleClient
      .select()
      .from(leads)
      .where(and(
        eq(leads.tenantId, tenantId),
        like(leads.leadNumber, `LEAD-${currentYear}-%`)
      ))
      .orderBy(desc(leads.createdAt))
      .limit(1);

    let nextNumber = 1;
    if (latestLead.length > 0) {
      const match = latestLead[0].leadNumber.match(/LEAD-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `LEAD-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
  }

  private calculateInitialScore(leadData: CreateLeadDto): number {
    let score = 0;

    // Base score
    score += 50;

    // Email provided (+20)
    if (leadData.email) score += 20;

    // Phone provided (+15)
    if (leadData.phone) score += 15;

    // Company provided (+10)
    if (leadData.companyName) score += 10;

    // High-value source (+10)
    if (['referral', 'trade_show', 'direct_mail'].includes(leadData.source)) {
      score += 10;
    }

    // Estimated value bonus (0-20 points based on value)
    if (leadData.estimatedValue) {
      const valueScore = Math.min(leadData.estimatedValue / 10000, 20);
      score += Math.floor(valueScore);
    }

    return Math.min(score, 100);
  }

  private calculateScore(leadData: Partial<Lead>): number {
    let score = 0;

    // Base score
    score += 50;

    // Email provided (+20)
    if (leadData.email) score += 20;

    // Phone provided (+15)
    if (leadData.phone) score += 15;

    // Company provided (+10)
    if (leadData.companyName) score += 10;

    // High-value source (+10)
    if (leadData.source && ['referral', 'trade_show', 'direct_mail'].includes(leadData.source)) {
      score += 10;
    }

    // Status-based adjustments
    switch (leadData.status) {
      case 'contacted':
        score += 5;
        break;
      case 'qualified':
        score += 10;
        break;
      case 'proposal':
        score += 15;
        break;
      case 'negotiation':
        score += 20;
        break;
      case 'closed-won':
        score = 100;
        break;
      case 'closed-lost':
        score = 0;
        break;
    }

    // Estimated value bonus (0-20 points based on value)
    if (leadData.estimatedValue) {
      const valueScore = Math.min(parseFloat(leadData.estimatedValue.toString()) / 10000, 20);
      score += Math.floor(valueScore);
    }

    return Math.min(Math.max(score, 0), 100);
  }

  private async createInitialActivity(lead: any, tenantId: string, userId: string): Promise<void> {
    await this.databaseService.drizzleClient
      .insert(activities)
      .values({
        tenantId,
        activityType: 'lead_created',
        subject: `Lead created: ${lead.leadNumber}`,
        description: `New lead created from ${lead.source}`,
        relatedTo: 'lead',
        relatedId: lead.id,
        status: 'completed',
        priority: 'normal',
        assignedTo: lead.assignedTo,
        createdBy: userId,
      });
  }

  private async createStatusChangeActivity(lead: any, oldStatus: string, tenantId: string, userId: string): Promise<void> {
    await this.databaseService.drizzleClient
      .insert(activities)
      .values({
        tenantId,
        activityType: 'status_change',
        subject: `Lead status changed: ${lead.leadNumber}`,
        description: `Status changed from ${oldStatus} to ${lead.status}`,
        relatedTo: 'lead',
        relatedId: lead.id,
        status: 'completed',
        priority: 'normal',
        assignedTo: lead.assignedTo,
        createdBy: userId,
      });
  }
}
