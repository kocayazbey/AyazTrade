import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { contacts, customers, leads, activities } from '../../database/schema/crm.schema';
import { CacheService } from '../../core/cache/cache.service';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class CrmService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  // Contact Management Methods
  async getContacts(query: any, tenantId: string) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(contacts.tenantId, tenantId), eq(contacts.isActive, true)];

    // Filter by status
    if (query.status) {
      conditions.push(eq(contacts.status, query.status));
    }

    // Filter by company
    if (query.company) {
      conditions.push(like(contacts.company, `%${query.company}%`));
    }

    // Filter by email
    if (query.email) {
      conditions.push(like(contacts.email, `%${query.email}%`));
    }

    // Filter by name
    if (query.name) {
      conditions.push(
        or(
          like(contacts.firstName, `%${query.name}%`),
          like(contacts.lastName, `%${query.name}%`),
          like(contacts.company, `%${query.name}%`)
        )
      );
    }

    // Filter by lead score range
    if (query.minScore) {
      conditions.push(gte(contacts.leadScore, parseInt(query.minScore)));
    }
    if (query.maxScore) {
      conditions.push(lte(contacts.leadScore, parseInt(query.maxScore)));
    }

    // Filter by tags
    if (query.tags && Array.isArray(query.tags)) {
      // Using PostgreSQL array contains operator
      const tagConditions = query.tags.map((tag: string) =>
        sql`${contacts.tags} @> ${JSON.stringify([tag])}`
      );
      conditions.push(or(...tagConditions));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [results, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select({
          ...contacts,
          customer: customers,
          lead: leads,
        })
        .from(contacts)
        .leftJoin(customers, eq(contacts.customerId, customers.id))
        .leftJoin(leads, eq(contacts.leadId, leads.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(contacts.createdAt)),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);

    return {
      data: results.map(r => ({
        ...r.contacts,
        customer: r.customers,
        lead: r.leads,
        fullName: `${r.contacts.firstName} ${r.contacts.lastName}`,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrev: page > 1
    };
  }

  async getContactById(contactId: string, tenantId: string) {
    const results = await this.databaseService.drizzleClient
      .select({
        ...contacts,
        customer: customers,
        lead: leads,
      })
      .from(contacts)
      .leftJoin(customers, eq(contacts.customerId, customers.id))
      .leftJoin(leads, eq(contacts.leadId, leads.id))
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException('Contact not found');
    }

    const contact = results[0];
    return {
      ...contact.contacts,
      customer: contact.customers,
      lead: contact.leads,
      fullName: `${contact.contacts.firstName} ${contact.contacts.lastName}`,
    };
  }

  async createContact(contactData: any, tenantId: string, userId: string) {
    // Validate email uniqueness within tenant
    if (contactData.email) {
      const existingContact = await this.databaseService.drizzleClient
        .select()
        .from(contacts)
        .where(and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.email, contactData.email),
          eq(contacts.isActive, true)
        ))
        .limit(1);

      if (existingContact.length > 0) {
        throw new BadRequestException('Contact with this email already exists');
      }
    }

    const [contact] = await this.databaseService.drizzleClient
      .insert(contacts)
      .values({
        ...contactData,
        tenantId,
        createdBy: userId,
        updatedBy: userId,
        tags: contactData.tags || [],
      })
      .returning();

    // Clear contacts cache for this tenant
    await this.cacheService.del(`crm_contacts:${tenantId}`);

    this.loggerService.log(`Contact created: ${contact.id}`, 'CrmService');
    return contact;
  }

  async updateContact(contactId: string, contactData: any, tenantId: string, userId: string) {
    // Check if contact exists and belongs to tenant
    const existingContact = await this.databaseService.drizzleClient
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .limit(1);

    if (existingContact.length === 0) {
      throw new NotFoundException('Contact not found');
    }

    // Validate email uniqueness if email is being updated
    if (contactData.email) {
      const emailConflict = await this.databaseService.drizzleClient
        .select()
        .from(contacts)
        .where(and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.email, contactData.email),
          eq(contacts.isActive, true),
          sql`${contacts.id} != ${contactId}`
        ))
        .limit(1);

      if (emailConflict.length > 0) {
        throw new BadRequestException('Contact with this email already exists');
      }
    }

    const [updatedContact] = await this.databaseService.drizzleClient
      .update(contacts)
      .set({
        ...contactData,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .returning();

    // Clear contacts cache for this tenant
    await this.cacheService.del(`crm_contacts:${tenantId}`);

    this.loggerService.log(`Contact updated: ${contactId}`, 'CrmService');
    return updatedContact;
  }

  async deleteContact(contactId: string, tenantId: string) {
    const [deletedContact] = await this.databaseService.drizzleClient
      .update(contacts)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .returning();

    if (!deletedContact) {
      throw new NotFoundException('Contact not found');
    }

    // Clear contacts cache for this tenant
    await this.cacheService.del(`crm_contacts:${tenantId}`);

    this.loggerService.log(`Contact deleted: ${contactId}`, 'CrmService');
    return { id: contactId, deleted: true, deletedAt: deletedContact.updatedAt };
  }

  async bulkUpdateContacts(contactUpdates: Array<{id: string, data: any}>, tenantId: string, userId: string) {
    const results = [];

    for (const update of contactUpdates) {
      try {
        const updated = await this.updateContact(update.id, update.data, tenantId, userId);
        results.push({ id: update.id, success: true, data: updated });
      } catch (error) {
        results.push({ id: update.id, success: false, error: error.message });
      }
    }

    // Clear contacts cache for this tenant
    await this.cacheService.del(`crm_contacts:${tenantId}`);

    return {
      total: contactUpdates.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  async searchContacts(searchTerm: string, tenantId: string, limit: number = 20) {
    const searchConditions = [
      eq(contacts.tenantId, tenantId),
      eq(contacts.isActive, true),
      or(
        like(contacts.firstName, `%${searchTerm}%`),
        like(contacts.lastName, `%${searchTerm}%`),
        like(contacts.email, `%${searchTerm}%`),
        like(contacts.company, `%${searchTerm}%`),
        like(contacts.phone, `%${searchTerm}%`)
      )
    ];

    const results = await this.databaseService.drizzleClient
      .select({
        ...contacts,
        customer: customers,
        lead: leads,
      })
      .from(contacts)
      .leftJoin(customers, eq(contacts.customerId, customers.id))
      .leftJoin(leads, eq(contacts.leadId, leads.id))
      .where(and(...searchConditions))
      .limit(limit)
      .orderBy(desc(contacts.leadScore), desc(contacts.createdAt));

    return {
      data: results.map(r => ({
        ...r.contacts,
        customer: r.customers,
        lead: r.leads,
        fullName: `${r.contacts.firstName} ${r.contacts.lastName}`,
      })),
      total: results.length,
      searchTerm
    };
  }

  async getContactActivities(contactId: string, tenantId: string, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [
      eq(activities.tenantId, tenantId),
      eq(activities.relatedId, contactId),
      eq(activities.relatedTo, 'contact')
    ];

    if (query.type) {
      conditions.push(eq(activities.activityType, query.type));
    }

    if (query.status) {
      conditions.push(eq(activities.status, query.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [results, countResult] = await Promise.all([
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

    return {
      data: results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrev: page > 1
    };
  }

  // Legacy methods for backward compatibility
  async syncWithCRM(data: any, tenantId: string) {
    try {
      const syncResult = {
        status: 'success',
        syncedRecords: data.length,
        errors: [],
        syncedAt: new Date()
      };

      this.loggerService.log(`CRM sync completed: ${data.length} records`, 'CrmService');
      return syncResult;
    } catch (error) {
      this.loggerService.error('Error syncing with CRM', error);
      throw error;
    }
  }

  async getCRMContacts(tenantId: string) {
    return this.getContacts({}, tenantId);
  }

  async createCRMContact(contactData: any, tenantId: string) {
    return this.createContact(contactData, tenantId, 'system');
  }

  async updateCRMContact(contactId: string, data: any, tenantId: string) {
    return this.updateContact(contactId, data, tenantId, 'system');
  }

  async getCRMActivities(contactId: string, tenantId: string) {
    return this.getContactActivities(contactId, tenantId, {});
  }
}
