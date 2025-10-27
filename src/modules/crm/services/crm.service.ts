import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { contacts, customers, leads, activities, slaAgreements } from '../../database/schema/crm.schema';
import { CacheService } from '../../core/cache/cache.service';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class CRMService {
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

    this.loggerService.log(`Contact created: ${contact.id}`, 'CRMService');
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

    this.loggerService.log(`Contact updated: ${contactId}`, 'CRMService');
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

    this.loggerService.log(`Contact deleted: ${contactId}`, 'CRMService');
    return { id: contactId, deleted: true, deletedAt: deletedContact.updatedAt };
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
  async getCustomers(tenantId: string, query: any) {
    // Redirect to contacts for now
    return this.getContacts(query, tenantId);
  }

  async getCustomerStats(tenantId: string) {
    return {
      totalCustomers: 150,
      activeCustomers: 142,
      newThisMonth: 12,
      averageOrderValue: 2500
    };
  }

  async createCustomer(data: any, tenantId: string, userId: string) {
    return this.createContact(data, tenantId, userId);
  }

  async getCustomerById(customerId: string, tenantId: string) {
    return this.getContactById(customerId, tenantId);
  }

  async updateCustomer(customerId: string, data: any, tenantId: string) {
    return this.updateContact(customerId, data, tenantId, 'system');
  }

  async getLeads(tenantId: string, query: any) {
    return {
      data: [
        {
          id: '1',
          name: 'Prospect A',
          email: 'prospect@example.com',
          source: 'website',
          status: 'new',
          score: 85,
          createdAt: new Date().toISOString()
        }
      ],
      total: 1,
      page: 1,
      totalPages: 1
    };
  }

  async getLeadStats(tenantId: string) {
    return {
      totalLeads: 45,
      newLeads: 8,
      qualifiedLeads: 12,
      convertedLeads: 5
    };
  }

  async createLead(data: any, tenantId: string, userId: string) {
    return {
      id: Date.now().toString(),
      ...data,
      tenantId,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };
  }

  async getLeadById(leadId: string, tenantId: string) {
    return {
      id: leadId,
      name: 'Prospect A',
      email: 'prospect@example.com',
      source: 'website',
      status: 'new',
      score: 85,
      createdAt: new Date().toISOString(),
      activities: []
    };
  }

  async deleteLead(leadId: string, tenantId: string) {
    const [deletedLead] = await this.databaseService.drizzleClient
      .update(leads)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
      .returning();

    if (!deletedLead) {
      throw new NotFoundException('Lead not found');
    }

    await this.cacheService.del(`crm_leads:${tenantId}`);
    this.loggerService.log(`Lead deleted: ${leadId}`, 'CRMService');
    return { id: leadId, deleted: true, deletedAt: deletedLead.updatedAt };
  }

  async getLeadById(leadId: string, tenantId: string) {
    const [lead] = await this.databaseService.drizzleClient
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
      .limit(1);

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async updateLead(leadId: string, data: any, tenantId: string) {
    const [updatedLead] = await this.databaseService.drizzleClient
      .update(leads)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
      .returning();

    if (!updatedLead) {
      throw new NotFoundException('Lead not found');
    }

    await this.cacheService.del(`crm_leads:${tenantId}`);
    this.loggerService.log(`Lead updated: ${leadId}`, 'CRMService');
    return updatedLead;
  }

  async convertLeadToCustomer(leadId: string, tenantId: string, userId: string) {
    return {
      customer: {
        id: Date.now().toString(),
        name: 'Converted Customer',
        email: 'customer@example.com',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      lead: {
        id: leadId,
        status: 'converted',
        convertedAt: new Date().toISOString()
      }
    };
  }

  async getDealers(tenantId: string, filters: any) {
    return {
      data: [
        {
          id: '1',
          name: 'Dealer A',
          location: 'İstanbul',
          status: 'active',
          commission: 5.5
        }
      ],
      total: 1
    };
  }

  async createDealer(data: any, tenantId: string, userId: string) {
    return {
      id: Date.now().toString(),
      ...data,
      tenantId,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };
  }

  async getActivities(tenantId: string, filters: any) {
    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(activities.tenantId, tenantId)];

    if (filters.type) {
      conditions.push(eq(activities.activityType, filters.type));
    }

    if (filters.status) {
      conditions.push(eq(activities.status, filters.status));
    }

    if (filters.relatedTo) {
      conditions.push(eq(activities.relatedTo, filters.relatedTo));
    }

    if (filters.relatedId) {
      conditions.push(eq(activities.relatedId, filters.relatedId));
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

  async createActivity(data: any, tenantId: string, userId: string) {
    const [activity] = await this.databaseService.drizzleClient
      .insert(activities)
      .values({
        ...data,
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await this.cacheService.del(`crm_activities:${tenantId}`);
    this.loggerService.log(`Activity created: ${activity.id}`, 'CRMService');
    return activity;
  }

  async updateActivity(activityId: string, data: any, tenantId: string) {
    const [updatedActivity] = await this.databaseService.drizzleClient
      .update(activities)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)))
      .returning();

    if (!updatedActivity) {
      throw new NotFoundException('Activity not found');
    }

    await this.cacheService.del(`crm_activities:${tenantId}`);
    this.loggerService.log(`Activity updated: ${activityId}`, 'CRMService');
    return updatedActivity;
  }

  async deleteActivity(activityId: string, tenantId: string) {
    await this.databaseService.drizzleClient
      .delete(activities)
      .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));

    await this.cacheService.del(`crm_activities:${tenantId}`);
    this.loggerService.log(`Activity deleted: ${activityId}`, 'CRMService');
    return { id: activityId, deleted: true };
  }

  // Quotes methods - using SLA Agreements table as contracts/quotes
  async getQuotes(tenantId: string, filters: any) {
    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(slaAgreements.tenantId, tenantId)];

    if (filters.status) {
      conditions.push(eq(slaAgreements.status, filters.status));
    }

    if (filters.customerId) {
      conditions.push(eq(slaAgreements.customerId, filters.customerId));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [results, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select()
        .from(slaAgreements)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(slaAgreements.createdAt)),
      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(slaAgreements)
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

  async createQuote(data: any, tenantId: string, userId: string) {
    const [quote] = await this.databaseService.drizzleClient
      .insert(slaAgreements)
      .values({
        ...data,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await this.cacheService.del(`crm_quotes:${tenantId}`);
    this.loggerService.log(`Quote created: ${quote.id}`, 'CRMService');
    return quote;
  }

  async getQuote(quoteId: string, tenantId: string) {
    const [quote] = await this.databaseService.drizzleClient
      .select()
      .from(slaAgreements)
      .where(and(eq(slaAgreements.id, quoteId), eq(slaAgreements.tenantId, tenantId)))
      .limit(1);

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async updateQuote(quoteId: string, data: any, tenantId: string, userId: string) {
    const [updatedQuote] = await this.databaseService.drizzleClient
      .update(slaAgreements)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(slaAgreements.id, quoteId), eq(slaAgreements.tenantId, tenantId)))
      .returning();

    if (!updatedQuote) {
      throw new NotFoundException('Quote not found');
    }

    await this.cacheService.del(`crm_quotes:${tenantId}`);
    this.loggerService.log(`Quote updated: ${quoteId}`, 'CRMService');
    return updatedQuote;
  }

  async sendQuote(quoteId: string, tenantId: string, userId: string) {
    const quote = await this.getQuote(quoteId, tenantId);
    // In real implementation, send email/SMS to customer
    return { ...quote, sentAt: new Date(), sentBy: userId };
  }

  // Contracts - same as quotes but different naming
  async getContracts(tenantId: string, filters: any) {
    return this.getQuotes(tenantId, filters);
  }

  async createContract(data: any, tenantId: string, userId: string) {
    return this.createQuote(data, tenantId, userId);
  }

  async getContract(contractId: string, tenantId: string) {
    return this.getQuote(contractId, tenantId);
  }

  async updateContract(contractId: string, data: any, tenantId: string, userId: string) {
    return this.updateQuote(contractId, data, tenantId, userId);
  }

  async deleteContract(contractId: string, tenantId: string) {
    await this.databaseService.drizzleClient
      .delete(slaAgreements)
      .where(and(eq(slaAgreements.id, contractId), eq(slaAgreements.tenantId, tenantId)));

    await this.cacheService.del(`crm_contracts:${tenantId}`);
    this.loggerService.log(`Contract deleted: ${contractId}`, 'CRMService');
    return { id: contractId, deleted: true };
  }

  async getQuotesStatistics(tenantId: string) {
    const [total, active, expired, pending] = await Promise.all([
      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(slaAgreements)
        .where(eq(slaAgreements.tenantId, tenantId)),
      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(slaAgreements)
        .where(and(eq(slaAgreements.tenantId, tenantId), eq(slaAgreements.status, 'active'))),
      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(slaAgreements)
        .where(and(eq(slaAgreements.tenantId, tenantId), eq(slaAgreements.status, 'expired'))),
      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(slaAgreements)
        .where(and(eq(slaAgreements.tenantId, tenantId), eq(slaAgreements.status, 'pending'))),
    ]);

    return {
      total: Number(total[0].count),
      active: Number(active[0].count),
      expired: Number(expired[0].count),
      pending: Number(pending[0].count),
    };
  }
}