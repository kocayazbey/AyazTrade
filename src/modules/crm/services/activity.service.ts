import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../core/database/database.service';
import { activities, users, customers, leads, contacts } from '../../../database/schema/crm.schema';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { CreateActivityDto, ActivityType, ActivityStatus, ActivityPriority } from '../dto/create-activity.dto';

export interface UpdateActivityDto {
  activityType?: ActivityType;
  subject?: string;
  description?: string;
  relatedTo?: string;
  relatedId?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  priority?: ActivityPriority;
  status?: ActivityStatus;
  assignedTo?: string;
  notes?: string;
  outcome?: string;
  metadata?: Record<string, any>;
}

export interface Activity {
  id: string;
  activityType: string;
  subject: string;
  description?: string;
  relatedTo?: string;
  relatedId?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  priority: string;
  status: string;
  assignedTo?: string;
  notes?: string;
  outcome?: string;
  metadata?: Record<string, any>;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ActivityService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async create(createActivityDto: CreateActivityDto, tenantId: string, userId: string): Promise<Activity> {
    // Validate related entity exists if provided
    if (createActivityDto.relatedId && createActivityDto.relatedTo) {
      await this.validateRelatedEntity(createActivityDto.relatedId, createActivityDto.relatedTo, tenantId);
    }

    const [activity] = await this.databaseService.drizzleClient
      .insert(activities)
      .values({
      ...createActivityDto,
      tenantId,
      createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    // Clear activities cache for this tenant
    await this.cacheService.del(`crm_activities:${tenantId}`);

    // Create reminder if scheduled
    if (createActivityDto.scheduledAt) {
      await this.createActivityReminder(activity, tenantId);
    }

    this.loggerService.log(`Activity created: ${activity.id} (${activity.subject})`, 'ActivityService');
    return activity;
  }

  async findAll(tenantId: string, filters?: any): Promise<{ data: Activity[]; total: number; page: number; totalPages: number }> {
    const page = parseInt(filters?.page) || 1;
    const limit = Math.min(parseInt(filters?.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(activities.tenantId, tenantId)];

    // Filter by activity type
    if (filters?.type) {
      conditions.push(eq(activities.activityType, filters.type));
    }

    // Filter by status
    if (filters?.status) {
      conditions.push(eq(activities.status, filters.status));
    }

    // Filter by priority
    if (filters?.priority) {
      conditions.push(eq(activities.priority, filters.priority));
    }

    // Filter by assigned user
    if (filters?.assignedTo) {
      conditions.push(eq(activities.assignedTo, filters.assignedTo));
    }

    // Filter by related entity
    if (filters?.relatedTo) {
      conditions.push(eq(activities.relatedTo, filters.relatedTo));
    }

    if (filters?.relatedId) {
      conditions.push(eq(activities.relatedId, filters.relatedId));
    }

    // Filter by date range
    if (filters?.startDate) {
      conditions.push(gte(activities.scheduledAt, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(activities.scheduledAt, new Date(filters.endDate)));
    }

    // Filter by overdue (scheduled in past and not completed)
    if (filters?.overdue === 'true') {
      conditions.push(
        and(
          lte(activities.scheduledAt, new Date()),
          sql`${activities.status} NOT IN ('completed', 'cancelled')`
        )
      );
    }

    // Search by subject or description
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          like(activities.subject, searchTerm),
          like(activities.description, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [results, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select({
          ...activities,
          assignedUser: users,
          customer: customers,
          lead: leads,
          contact: contacts,
        })
        .from(activities)
        .leftJoin(users, eq(activities.assignedTo, users.id))
        .leftJoin(customers, and(eq(activities.relatedId, customers.id), eq(activities.relatedTo, 'customer')))
        .leftJoin(leads, and(eq(activities.relatedId, leads.id), eq(activities.relatedTo, 'lead')))
        .leftJoin(contacts, and(eq(activities.relatedId, contacts.id), eq(activities.relatedTo, 'contact')))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(activities.scheduledAt), desc(activities.createdAt)),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);

    return {
      data: results.map(r => ({
        ...r.activities,
        assignedUser: r.assignedUser,
        customer: r.customers,
        lead: r.leads,
        contact: r.contacts,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrev: page > 1,
    };
  }

  async findOne(id: string, tenantId: string): Promise<Activity | null> {
    const results = await this.databaseService.drizzleClient
      .select({
        ...activities,
        assignedUser: users,
        customer: customers,
        lead: leads,
        contact: contacts,
      })
      .from(activities)
      .leftJoin(users, eq(activities.assignedTo, users.id))
      .leftJoin(customers, and(eq(activities.relatedId, customers.id), eq(activities.relatedTo, 'customer')))
      .leftJoin(leads, and(eq(activities.relatedId, leads.id), eq(activities.relatedTo, 'lead')))
      .leftJoin(contacts, and(eq(activities.relatedId, contacts.id), eq(activities.relatedTo, 'contact')))
      .where(and(eq(activities.id, id), eq(activities.tenantId, tenantId)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return {
      ...results[0].activities,
      assignedUser: results[0].assignedUser,
      customer: results[0].customers,
      lead: results[0].leads,
      contact: results[0].contacts,
    };
  }

  async update(id: string, updateActivityDto: UpdateActivityDto, tenantId: string, userId: string): Promise<Activity | null> {
    // Check if activity exists
    const existingActivity = await this.findOne(id, tenantId);
    if (!existingActivity) {
      throw new NotFoundException('Activity not found');
    }

    // Validate related entity if being updated
    if (updateActivityDto.relatedId && updateActivityDto.relatedTo) {
      await this.validateRelatedEntity(updateActivityDto.relatedId, updateActivityDto.relatedTo, tenantId);
    }

    const [updatedActivity] = await this.databaseService.drizzleClient
      .update(activities)
      .set({
      ...updateActivityDto,
        updatedBy: userId,
      updatedAt: new Date(),
      })
      .where(and(eq(activities.id, id), eq(activities.tenantId, tenantId)))
      .returning();

    // Clear activities cache for this tenant
    await this.cacheService.del(`crm_activities:${tenantId}`);

    // Update reminder if scheduled time changed
    if (updateActivityDto.scheduledAt && updateActivityDto.scheduledAt !== existingActivity.scheduledAt) {
      await this.updateActivityReminder(updatedActivity, tenantId);
    }

    this.loggerService.log(`Activity updated: ${id}`, 'ActivityService');
    return updatedActivity;
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const [deletedActivity] = await this.databaseService.drizzleClient
      .update(activities)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, id), eq(activities.tenantId, tenantId)))
      .returning();

    if (!deletedActivity) {
      throw new NotFoundException('Activity not found');
    }

    // Clear activities cache for this tenant
    await this.cacheService.del(`crm_activities:${tenantId}`);

    // Remove reminder
    await this.removeActivityReminder(deletedActivity.id, tenantId);

    this.loggerService.log(`Activity removed: ${id}`, 'ActivityService');
    return true;
  }

  async completeActivity(id: string, tenantId: string, userId: string, outcome?: string): Promise<Activity | null> {
    return this.update(id, {
      status: 'completed',
      completedAt: new Date(),
      outcome,
      metadata: {
        completedBy: userId,
        completedAt: new Date(),
      }
    }, tenantId, userId);
  }

  async getStats(tenantId: string): Promise<{
    totalActivities: number;
    pendingActivities: number;
    completedToday: number;
    overdueActivities: number;
    activitiesByType: Record<string, number>;
    activitiesByStatus: Record<string, number>;
    upcomingActivities: number;
  }> {
    const cacheKey = `crm_activity_stats:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all activities for this tenant
    const allActivities = await this.databaseService.drizzleClient
      .select()
      .from(activities)
      .where(eq(activities.tenantId, tenantId));

    // Calculate statistics
    const stats = {
      totalActivities: allActivities.length,
      pendingActivities: allActivities.filter(a => a.status === 'pending').length,
      completedToday: allActivities.filter(a =>
        a.status === 'completed' &&
        a.completedAt &&
        a.completedAt >= today &&
        a.completedAt < tomorrow
      ).length,
      overdueActivities: allActivities.filter(a =>
        a.scheduledAt &&
        a.scheduledAt < new Date() &&
        !['completed', 'cancelled'].includes(a.status)
      ).length,
      activitiesByType: {} as Record<string, number>,
      activitiesByStatus: {} as Record<string, number>,
      upcomingActivities: allActivities.filter(a =>
        a.scheduledAt &&
        a.scheduledAt >= new Date() &&
        a.scheduledAt < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && // Next 7 days
        !['completed', 'cancelled'].includes(a.status)
      ).length,
    };

    // Count by type and status
    allActivities.forEach(activity => {
      stats.activitiesByType[activity.activityType] = (stats.activitiesByType[activity.activityType] || 0) + 1;
      stats.activitiesByStatus[activity.status] = (stats.activitiesByStatus[activity.status] || 0) + 1;
    });

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, stats, 300);
    return stats;
  }

  async getActivitiesByRelatedEntity(relatedTo: string, relatedId: string, tenantId: string, filters?: any): Promise<Activity[]> {
    const conditions = [
      eq(activities.tenantId, tenantId),
      eq(activities.relatedTo, relatedTo),
      eq(activities.relatedId, relatedId)
    ];

    if (filters?.type) {
      conditions.push(eq(activities.activityType, filters.type));
    }

    if (filters?.status) {
      conditions.push(eq(activities.status, filters.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const results = await this.databaseService.drizzleClient
      .select({
        ...activities,
        assignedUser: users,
      })
      .from(activities)
      .leftJoin(users, eq(activities.assignedTo, users.id))
      .where(whereClause)
      .orderBy(desc(activities.createdAt));

    return results.map(r => ({
      ...r.activities,
      assignedUser: r.assignedUser,
    }));
  }

  async getUpcomingActivities(tenantId: string, days: number = 7, userId?: string): Promise<Activity[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const conditions = [
      eq(activities.tenantId, tenantId),
      gte(activities.scheduledAt, new Date()),
      lte(activities.scheduledAt, futureDate),
      sql`${activities.status} NOT IN ('completed', 'cancelled')`
    ];

    if (userId) {
      conditions.push(eq(activities.assignedTo, userId));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const results = await this.databaseService.drizzleClient
      .select({
        ...activities,
        assignedUser: users,
        customer: customers,
        lead: leads,
        contact: contacts,
      })
      .from(activities)
      .leftJoin(users, eq(activities.assignedTo, users.id))
      .leftJoin(customers, and(eq(activities.relatedId, customers.id), eq(activities.relatedTo, 'customer')))
      .leftJoin(leads, and(eq(activities.relatedId, leads.id), eq(activities.relatedTo, 'lead')))
      .leftJoin(contacts, and(eq(activities.relatedId, contacts.id), eq(activities.relatedTo, 'contact')))
      .where(whereClause)
      .orderBy(asc(activities.scheduledAt));

    return results.map(r => ({
      ...r.activities,
      assignedUser: r.assignedUser,
      customer: r.customers,
      lead: r.leads,
      contact: r.contacts,
    }));
  }

  async getOverdueActivities(tenantId: string, userId?: string): Promise<Activity[]> {
    const conditions = [
      eq(activities.tenantId, tenantId),
      lte(activities.scheduledAt, new Date()),
      sql`${activities.status} NOT IN ('completed', 'cancelled')`
    ];

    if (userId) {
      conditions.push(eq(activities.assignedTo, userId));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const results = await this.databaseService.drizzleClient
      .select({
        ...activities,
        assignedUser: users,
        customer: customers,
        lead: leads,
        contact: contacts,
      })
      .from(activities)
      .leftJoin(users, eq(activities.assignedTo, users.id))
      .leftJoin(customers, and(eq(activities.relatedId, customers.id), eq(activities.relatedTo, 'customer')))
      .leftJoin(leads, and(eq(activities.relatedId, leads.id), eq(activities.relatedTo, 'lead')))
      .leftJoin(contacts, and(eq(activities.relatedId, contacts.id), eq(activities.relatedTo, 'contact')))
      .where(whereClause)
      .orderBy(asc(activities.scheduledAt));

    return results.map(r => ({
      ...r.activities,
      assignedUser: r.assignedUser,
      customer: r.customers,
      lead: r.leads,
      contact: r.contacts,
    }));
  }

  async getActivitiesByUser(userId: string, tenantId: string, filters?: any): Promise<Activity[]> {
    const conditions = [
      eq(activities.tenantId, tenantId),
      eq(activities.assignedTo, userId)
    ];

    if (filters?.type) {
      conditions.push(eq(activities.activityType, filters.type));
    }

    if (filters?.status) {
      conditions.push(eq(activities.status, filters.status));
    }

    if (filters?.startDate) {
      conditions.push(gte(activities.scheduledAt, new Date(filters.startDate)));
    }

    if (filters?.endDate) {
      conditions.push(lte(activities.scheduledAt, new Date(filters.endDate)));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const results = await this.databaseService.drizzleClient
      .select({
        ...activities,
        assignedUser: users,
        customer: customers,
        lead: leads,
        contact: contacts,
      })
      .from(activities)
      .leftJoin(users, eq(activities.assignedTo, users.id))
      .leftJoin(customers, and(eq(activities.relatedId, customers.id), eq(activities.relatedTo, 'customer')))
      .leftJoin(leads, and(eq(activities.relatedId, leads.id), eq(activities.relatedTo, 'lead')))
      .leftJoin(contacts, and(eq(activities.relatedId, contacts.id), eq(activities.relatedTo, 'contact')))
      .where(whereClause)
      .orderBy(desc(activities.scheduledAt));

    return results.map(r => ({
      ...r.activities,
      assignedUser: r.assignedUser,
      customer: r.customers,
      lead: r.leads,
      contact: r.contacts,
    }));
  }

  async bulkUpdate(updates: Array<{id: string, data: UpdateActivityDto}>, tenantId: string, userId: string): Promise<{
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

    // Clear activities cache for this tenant
    await this.cacheService.del(`crm_activities:${tenantId}`);

    return {
      total: updates.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  async searchActivities(searchTerm: string, tenantId: string, limit: number = 20): Promise<{
    data: Activity[];
    total: number;
    searchTerm: string;
  }> {
    const searchConditions = [
      eq(activities.tenantId, tenantId),
      or(
        like(activities.subject, `%${searchTerm}%`),
        like(activities.description, `%${searchTerm}%`),
        like(activities.notes, `%${searchTerm}%`)
      )
    ];

    const results = await this.databaseService.drizzleClient
      .select({
        ...activities,
        assignedUser: users,
        customer: customers,
        lead: leads,
        contact: contacts,
      })
      .from(activities)
      .leftJoin(users, eq(activities.assignedTo, users.id))
      .leftJoin(customers, and(eq(activities.relatedId, customers.id), eq(activities.relatedTo, 'customer')))
      .leftJoin(leads, and(eq(activities.relatedId, leads.id), eq(activities.relatedTo, 'lead')))
      .leftJoin(contacts, and(eq(activities.relatedId, contacts.id), eq(activities.relatedTo, 'contact')))
      .where(and(...searchConditions))
      .limit(limit)
      .orderBy(desc(activities.createdAt));

    return {
      data: results.map(r => ({
        ...r.activities,
        assignedUser: r.assignedUser,
        customer: r.customers,
        lead: r.leads,
        contact: r.contacts,
      })),
      total: results.length,
      searchTerm
    };
  }

  private async validateRelatedEntity(relatedId: string, relatedTo: string, tenantId: string): Promise<void> {
    let table;
    switch (relatedTo) {
      case 'customer':
        table = customers;
        break;
      case 'lead':
        table = leads;
        break;
      case 'contact':
        table = contacts;
        break;
      default:
        throw new BadRequestException(`Invalid related entity type: ${relatedTo}`);
    }

    const entity = await this.databaseService.drizzleClient
      .select()
      .from(table)
      .where(and(eq(table.id, relatedId), eq(table.tenantId, tenantId)))
      .limit(1);

    if (entity.length === 0) {
      throw new BadRequestException(`Related ${relatedTo} not found`);
    }
  }

  private async createActivityReminder(activity: Activity, tenantId: string): Promise<void> {
    // TODO: Implement reminder system (could use a job queue or external service)
    this.loggerService.log(`Reminder created for activity: ${activity.id}`, 'ActivityService');
  }

  private async updateActivityReminder(activity: Activity, tenantId: string): Promise<void> {
    // TODO: Update reminder
    this.loggerService.log(`Reminder updated for activity: ${activity.id}`, 'ActivityService');
  }

  private async removeActivityReminder(activityId: string, tenantId: string): Promise<void> {
    // TODO: Remove reminder
    this.loggerService.log(`Reminder removed for activity: ${activityId}`, 'ActivityService');
  }
}
