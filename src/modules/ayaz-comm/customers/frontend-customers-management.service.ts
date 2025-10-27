import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, or, like, gte, lte, inArray } from 'drizzle-orm';

export interface Customer {
  id: string;
  customerNumber: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  phone?: string;
  type: 'individual' | 'business';
  status: 'active' | 'inactive' | 'suspended' | 'blocked';
  tier?: string;
  segment?: string;
  addresses: CustomerAddress[];
  preferences: CustomerPreferences;
  tags: string[];
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
  firstOrderDate?: Date;
  accountManager?: string;
  creditLimit?: number;
  currentCredit: number;
  metadata: Record<string, any>;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  type: 'billing' | 'shipping' | 'both';
  isDefault: boolean;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isActive: boolean;
}

export interface CustomerPreferences {
  emailMarketing: boolean;
  smsMarketing: boolean;
  notifications: {
    orderUpdates: boolean;
    promotions: boolean;
    newsletters: boolean;
    reviews: boolean;
  };
  language: string;
  currency: string;
  timezone: string;
  preferredContactMethod: 'email' | 'phone' | 'sms';
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  type: 'static' | 'dynamic';
  criteria: SegmentCriteria;
  customerCount: number;
  isActive: boolean;
  color: string;
  icon: string;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentCriteria {
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in' | 'between';
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;
  groups: Array<{
    conditions: Array<any>;
    logicalOperator: 'AND' | 'OR';
  }>;
}

export interface CustomerUpdateRequest {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  type?: 'individual' | 'business';
  status?: 'active' | 'inactive' | 'suspended' | 'blocked';
  tier?: string;
  segment?: string;
  preferences?: Partial<CustomerPreferences>;
  tags?: string[];
  notes?: string;
  accountManager?: string;
  creditLimit?: number;
  metadata?: Record<string, any>;
}

export interface BulkCustomerUpdateRequest {
  customerIds: string[];
  updates: CustomerUpdateRequest;
  filters?: {
    type?: string;
    status?: string;
    tier?: string;
    segment?: string;
    tags?: string[];
    totalSpentRange?: { min: number; max: number };
  };
}

@Injectable()
export class FrontendCustomersManagementService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async getCustomers(filters: any, tenantId: string): Promise<{
    data: Customer[];
    total: number;
    page: number;
    totalPages: number;
    summary: {
      totalCustomers: number;
      activeCustomers: number;
      inactiveCustomers: number;
      businessCustomers: number;
      individualCustomers: number;
      newCustomers: number; // Last 30 days
      totalRevenue: number;
      averageOrderValue: number;
    };
  }> {
    const cacheKey = `frontend_customers:${tenantId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = this.getCustomersTable().tenantId.eq(tenantId);

    // Apply filters
    if (filters.type) {
      whereClause = and(whereClause, this.getCustomersTable().type.eq(filters.type));
    }

    if (filters.status) {
      whereClause = and(whereClause, this.getCustomersTable().status.eq(filters.status));
    }

    if (filters.tier) {
      whereClause = and(whereClause, this.getCustomersTable().tier.eq(filters.tier));
    }

    if (filters.segment) {
      whereClause = and(whereClause, this.getCustomersTable().segment.eq(filters.segment));
    }

    if (filters.search) {
      whereClause = and(whereClause,
        or(
          this.getCustomersTable().firstName.like(`%${filters.search}%`),
          this.getCustomersTable().lastName.like(`%${filters.search}%`),
          this.getCustomersTable().companyName.like(`%${filters.search}%`),
          this.getCustomersTable().email.like(`%${filters.search}%`),
          this.getCustomersTable().customerNumber.like(`%${filters.search}%`)
        )
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClause = and(whereClause,
        this.getCustomersTable().tags.overlapsWith(filters.tags)
      );
    }

    if (filters.totalSpentMin) {
      whereClause = and(whereClause, this.getCustomersTable().totalSpent.gte(filters.totalSpentMin));
    }

    if (filters.totalSpentMax) {
      whereClause = and(whereClause, this.getCustomersTable().totalSpent.lte(filters.totalSpentMax));
    }

    const [customers, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select()
        .from(this.getCustomersTable())
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(this.getCustomersTable().createdAt),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(this.getCustomersTable())
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);

    // Get full customer details
    const fullCustomers = await Promise.all(
      customers.map(customer => this.getCustomer(customer.id))
    );

    // Calculate summary
    const summary = await this.calculateCustomerSummary(tenantId, filters);

    const result = {
      data: fullCustomers.filter(Boolean),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary
    };

    await this.cacheService.set(cacheKey, result, 300); // Cache for 5 minutes
    return result;
  }

  async getCustomer(customerId: string): Promise<Customer> {
    const cacheKey = `frontend_customer:${customerId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const results = await this.databaseService.drizzleClient
      .select({
        customer: this.getCustomersTable(),
        address: this.getCustomerAddressesTable()
      })
      .from(this.getCustomersTable())
      .leftJoin(this.getCustomerAddressesTable(), this.getCustomerAddressesTable().customerId.eq(this.getCustomersTable().id))
      .where(this.getCustomersTable().id.eq(customerId));

    if (results.length === 0) return null;

    const customerData = results[0];
    const customer: Customer = {
      id: customerData.customer.id,
      customerNumber: customerData.customer.customerNumber,
      firstName: customerData.customer.firstName,
      lastName: customerData.customer.lastName,
      companyName: customerData.customer.companyName,
      email: customerData.customer.email,
      phone: customerData.customer.phone,
      type: customerData.customer.type,
      status: customerData.customer.status,
      tier: customerData.customer.tier,
      segment: customerData.customer.segment,
      addresses: results.filter(r => r.address).map(r => ({
        id: r.address.id,
        customerId: r.address.customerId,
        type: r.address.type,
        isDefault: r.address.isDefault,
        firstName: r.address.firstName,
        lastName: r.address.lastName,
        company: r.address.company,
        address1: r.address.address1,
        address2: r.address.address2,
        city: r.address.city,
        state: r.address.state,
        zipCode: r.address.zipCode,
        country: r.address.country,
        phone: r.address.phone,
        isActive: r.address.isActive
      })),
      preferences: customerData.customer.preferences || {
        emailMarketing: true,
        smsMarketing: false,
        notifications: {
          orderUpdates: true,
          promotions: true,
          newsletters: false,
          reviews: true
        },
        language: 'en',
        currency: 'USD',
        timezone: 'UTC',
        preferredContactMethod: 'email'
      },
      tags: customerData.customer.tags || [],
      notes: customerData.customer.notes,
      totalOrders: customerData.customer.totalOrders || 0,
      totalSpent: customerData.customer.totalSpent || 0,
      averageOrderValue: customerData.customer.averageOrderValue || 0,
      lastOrderDate: customerData.customer.lastOrderDate,
      firstOrderDate: customerData.customer.firstOrderDate,
      accountManager: customerData.customer.accountManager,
      creditLimit: customerData.customer.creditLimit,
      currentCredit: customerData.customer.currentCredit || 0,
      metadata: customerData.customer.metadata || {},
      tenantId: customerData.customer.tenantId,
      createdBy: customerData.customer.createdBy,
      updatedBy: customerData.customer.updatedBy,
      createdAt: customerData.customer.createdAt,
      updatedAt: customerData.customer.updatedAt
    };

    await this.cacheService.set(cacheKey, customer, 900); // Cache for 15 minutes
    return customer;
  }

  async createCustomer(customerData: {
    firstName: string;
    lastName: string;
    companyName?: string;
    email: string;
    phone?: string;
    type: 'individual' | 'business';
    tier?: string;
    addresses?: any[];
    preferences?: CustomerPreferences;
    tags?: string[];
    notes?: string;
    accountManager?: string;
    creditLimit?: number;
    metadata?: any;
  }, tenantId: string, userId: string): Promise<Customer> {

    // Check if email already exists
    const existingCustomer = await this.findCustomerByEmail(customerData.email, tenantId);
    if (existingCustomer) {
      throw new BadRequestException(`Customer with email ${customerData.email} already exists`);
    }

    const customerNumber = await this.generateCustomerNumber(tenantId);

    const [customer] = await this.databaseService.drizzleClient
      .insert(this.getCustomersTable())
      .values({
        id: `customer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        customerNumber,
        ...customerData,
        status: 'active',
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        currentCredit: 0,
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create customer addresses
    if (customerData.addresses && customerData.addresses.length > 0) {
      await this.createCustomerAddresses(customer.id, customerData.addresses, userId);
    }

    // Clear customers cache
    await this.cacheService.del(`frontend_customers:${tenantId}`);
    await this.cacheService.del(`frontend_customer:${customer.id}`);

    this.loggerService.log(`Customer created: ${customer.firstName} ${customer.lastName} (${customer.email})`, 'FrontendCustomersManagementService');
    return await this.getCustomer(customer.id);
  }

  async updateCustomer(customerId: string, updateData: CustomerUpdateRequest, tenantId: string, userId: string): Promise<Customer> {
    const customer = await this.getCustomer(customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== customer.email) {
      const existingCustomer = await this.findCustomerByEmail(updateData.email, tenantId);
      if (existingCustomer) {
        throw new BadRequestException(`Customer with email ${updateData.email} already exists`);
      }
    }

    const [updatedCustomer] = await this.databaseService.drizzleClient
      .update(this.getCustomersTable())
      .set({
        ...updateData,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(and(
        this.getCustomersTable().id.eq(customerId),
        this.getCustomersTable().tenantId.eq(tenantId)
      ))
      .returning();

    // Update addresses if provided
    if (updateData.addresses) {
      await this.updateCustomerAddresses(customerId, updateData.addresses, userId);
    }

    // Clear cache
    await this.cacheService.del(`frontend_customer:${customerId}`);
    await this.cacheService.del(`frontend_customers:${tenantId}`);

    this.loggerService.log(`Customer updated: ${customerId} - ${JSON.stringify(updateData)}`, 'FrontendCustomersManagementService');
    return await this.getCustomer(customerId);
  }

  async deleteCustomer(customerId: string, tenantId: string, userId: string): Promise<void> {
    const customer = await this.getCustomer(customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Soft delete - set status to inactive
    await this.databaseService.drizzleClient
      .update(this.getCustomersTable())
      .set({
        status: 'inactive',
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(and(
        this.getCustomersTable().id.eq(customerId),
        this.getCustomersTable().tenantId.eq(tenantId)
      ));

    // Clear cache
    await this.cacheService.del(`frontend_customer:${customerId}`);
    await this.cacheService.del(`frontend_customers:${tenantId}`);

    this.loggerService.log(`Customer deleted (deactivated): ${customerId}`, 'FrontendCustomersManagementService');
  }

  async bulkUpdateCustomers(updateRequest: BulkCustomerUpdateRequest, tenantId: string, userId: string): Promise<{
    success: boolean;
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{ customerId: string; error: string }>;
    summary: {
      customersUpdated: number;
      tiersChanged: number;
      statusChanged: number;
      segmentsChanged: number;
    };
  }> {
    try {
      this.loggerService.log(`Starting bulk customer update: ${updateRequest.customerIds.length} customers`, 'FrontendCustomersManagementService');

      const result = {
        success: false,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        summary: {
          customersUpdated: 0,
          tiersChanged: 0,
          statusChanged: 0,
          segmentsChanged: 0
        }
      };

      // Get customers based on IDs or filters
      const customers = updateRequest.filters
        ? await this.getCustomersByFilters(updateRequest.filters, tenantId)
        : await this.getCustomersByIds(updateRequest.customerIds, tenantId);

      result.processed = customers.length;

      // Update each customer
      for (const customer of customers) {
        try {
          const updateData: any = updateRequest.updates;

          // Track what changed
          if (updateData.tier && updateData.tier !== customer.tier) {
            result.summary.tiersChanged++;
          }
          if (updateData.status && updateData.status !== customer.status) {
            result.summary.statusChanged++;
          }
          if (updateData.segment && updateData.segment !== customer.segment) {
            result.summary.segmentsChanged++;
          }

          await this.updateCustomer(customer.id, updateData, tenantId, userId);
          result.successful++;
          result.summary.customersUpdated++;

        } catch (error) {
          result.failed++;
          result.errors.push({
            customerId: customer.id,
            error: error.message
          });
        }
      }

      result.success = result.successful > 0;

      // Clear cache
      await this.cacheService.del(`frontend_customers:${tenantId}`);

      this.loggerService.log(`Bulk customer update completed: ${result.successful} successful, ${result.failed} failed`, 'FrontendCustomersManagementService');

      return result;

    } catch (error) {
      this.loggerService.error(`Error in bulk customer update`, error, 'FrontendCustomersManagementService');
      throw error;
    }
  }

  async createCustomerSegment(segmentData: {
    name: string;
    description: string;
    type: 'static' | 'dynamic';
    criteria: SegmentCriteria;
    color: string;
    icon: string;
  }, tenantId: string, userId: string): Promise<CustomerSegment> {

    const segmentId = `segment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const [segment] = await this.databaseService.drizzleClient
      .insert(this.getCustomerSegmentsTable())
      .values({
        id: segmentId,
        ...segmentData,
        isActive: true,
        customerCount: 0, // Will be calculated
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Calculate initial customer count
    await this.updateSegmentCustomerCount(segmentId, tenantId);

    // Clear segments cache
    await this.cacheService.del(`customer_segments:${tenantId}`);

    this.loggerService.log(`Customer segment created: ${segment.name}`, 'FrontendCustomersManagementService');
    return await this.getCustomerSegment(segmentId);
  }

  async updateSegmentCustomers(segmentId: string, tenantId: string): Promise<number> {
    // For dynamic segments, recalculate customer membership
    const segment = await this.getCustomerSegment(segmentId);
    if (!segment) {
      throw new NotFoundException('Customer segment not found');
    }

    if (segment.type === 'dynamic') {
      // Get customers matching criteria
      const matchingCustomers = await this.getCustomersBySegmentCriteria(segment.criteria, tenantId);

      // Update customer segments
      await this.databaseService.drizzleClient
        .update(this.getCustomersTable())
        .set({
          segment: matchingCustomers.includes(this.getCustomersTable().id) ? segmentId : null,
          updatedAt: new Date()
        })
        .where(this.getCustomersTable().tenantId.eq(tenantId));

      // Update segment count
      await this.updateSegmentCustomerCount(segmentId, tenantId);
    }

    return await this.getSegmentCustomerCount(segmentId);
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

    const fullSegment: CustomerSegment = {
      ...segment,
      customerCount
    };

    await this.cacheService.set(cacheKey, fullSegment, 1800);
    return fullSegment;
  }

  async getCustomerAnalytics(tenantId: string, days: number = 90): Promise<any> {
    const cacheKey = `frontend_customer_analytics:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Customer acquisition metrics
    const acquisitionMetrics = await this.databaseService.drizzleClient
      .select({
        totalCustomers: sql<number>`count(*)`,
        newCustomers: sql<number>`count(*) FILTER (WHERE created_at >= ${startDate})`,
        activeCustomers: sql<number>`count(*) FILTER (WHERE status = 'active')`,
        businessCustomers: sql<number>`count(*) FILTER (WHERE type = 'business')`,
        individualCustomers: sql<number>`count(*) FILTER (WHERE type = 'individual')`,
        totalRevenue: sql<number>`SUM(total_spent)`,
        avgOrderValue: sql<number>`AVG(average_order_value)`,
        avgOrdersPerCustomer: sql<number>`AVG(total_orders)`
      })
      .from(this.getCustomersTable())
      .where(this.getCustomersTable().tenantId.eq(tenantId));

    // Customer lifecycle metrics
    const lifecycleMetrics = await this.databaseService.drizzleClient
      .select({
        newCustomers: sql<number>`count(*) FILTER (WHERE created_at >= ${startDate})`,
        returningCustomers: sql<number>`count(*) FILTER (WHERE last_order_date >= ${startDate})`,
        churnedCustomers: sql<number>`count(*) FILTER (WHERE status = 'inactive' AND last_order_date < ${startDate})`,
        highValueCustomers: sql<number>`count(*) FILTER (WHERE total_spent >= 10000)`,
        averageLifetime: sql<number>`AVG(EXTRACT(EPOCH FROM (last_order_date - created_at))/86400) FILTER (WHERE last_order_date IS NOT NULL)`
      })
      .from(this.getCustomersTable())
      .where(this.getCustomersTable().tenantId.eq(tenantId));

    // Tier and segment distribution
    const tierDistribution = await this.databaseService.drizzleClient
      .select({
        tier: this.getCustomersTable().tier,
        customerCount: sql<number>`count(*)`,
        totalRevenue: sql<number>`SUM(total_spent)`
      })
      .from(this.getCustomersTable())
      .where(this.getCustomersTable().tenantId.eq(tenantId))
      .groupBy(this.getCustomersTable().tier);

    const segmentDistribution = await this.databaseService.drizzleClient
      .select({
        segment: this.getCustomersTable().segment,
        customerCount: sql<number>`count(*)`,
        totalRevenue: sql<number>`SUM(total_spent)`
      })
      .from(this.getCustomersTable())
      .where(this.getCustomersTable().tenantId.eq(tenantId))
      .groupBy(this.getCustomersTable().segment);

    const result = {
      totalCustomers: Number(acquisitionMetrics[0].totalCustomers) || 0,
      newCustomers: Number(acquisitionMetrics[0].newCustomers) || 0,
      activeCustomers: Number(acquisitionMetrics[0].activeCustomers) || 0,
      businessCustomers: Number(acquisitionMetrics[0].businessCustomers) || 0,
      individualCustomers: Number(acquisitionMetrics[0].individualCustomers) || 0,
      totalRevenue: Number(acquisitionMetrics[0].totalRevenue) || 0,
      avgOrderValue: Number(acquisitionMetrics[0].avgOrderValue) || 0,
      avgOrdersPerCustomer: Number(acquisitionMetrics[0].avgOrdersPerCustomer) || 0,
      lifecycle: {
        returningCustomers: Number(lifecycleMetrics[0].returningCustomers) || 0,
        churnedCustomers: Number(lifecycleMetrics[0].churnedCustomers) || 0,
        highValueCustomers: Number(lifecycleMetrics[0].highValueCustomers) || 0,
        averageLifetime: Number(lifecycleMetrics[0].averageLifetime) || 0
      },
      tierDistribution,
      segmentDistribution,
      growthRate: 0, // Would calculate month-over-month growth
      retentionRate: 0, // Would calculate customer retention
      acquisitionCost: 0 // Would calculate CAC
    };

    await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
    return result;
  }

  // Private helper methods
  private async generateCustomerNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const count = await this.databaseService.drizzleClient
      .select({ count: sql<number>`count(*)` })
      .from(this.getCustomersTable())
      .where(this.getCustomersTable().customerNumber.like(`CUST-${year}${month}-%`));

    const sequence = String(Number(count[0].count) + 1).padStart(4, '0');
    return `CUST-${year}${month}-${sequence}`;
  }

  private async findCustomerByEmail(email: string, tenantId: string): Promise<Customer | null> {
    const customers = await this.databaseService.drizzleClient
      .select()
      .from(this.getCustomersTable())
      .where(and(
        this.getCustomersTable().email.eq(email),
        this.getCustomersTable().tenantId.eq(tenantId)
      ))
      .limit(1);

    if (customers.length === 0) return null;

    return await this.getCustomer(customers[0].id);
  }

  private async createCustomerAddresses(customerId: string, addresses: any[], userId: string): Promise<void> {
    // Set first address as default if no default specified
    if (addresses.length > 0 && !addresses.some(a => a.isDefault)) {
      addresses[0].isDefault = true;
    }

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];

      await this.databaseService.drizzleClient
        .insert(this.getCustomerAddressesTable())
        .values({
          id: `addr-${Date.now()}-${i}`,
          customerId,
          ...address,
          isActive: true
        });
    }
  }

  private async updateCustomerAddresses(customerId: string, addresses: any[], userId: string): Promise<void> {
    // Delete existing addresses
    await this.databaseService.drizzleClient
      .delete(this.getCustomerAddressesTable())
      .where(this.getCustomerAddressesTable().customerId.eq(customerId));

    // Create new addresses
    await this.createCustomerAddresses(customerId, addresses, userId);
  }

  private async calculateCustomerSummary(tenantId: string, filters: any): Promise<any> {
    let whereClause = this.getCustomersTable().tenantId.eq(tenantId);

    // Apply same filters as main query
    if (filters.type) {
      whereClause = and(whereClause, this.getCustomersTable().type.eq(filters.type));
    }

    if (filters.status) {
      whereClause = and(whereClause, this.getCustomersTable().status.eq(filters.status));
    }

    const summary = await this.databaseService.drizzleClient
      .select({
        totalCustomers: sql<number>`count(*)`,
        activeCustomers: sql<number>`count(*) FILTER (WHERE status = 'active')`,
        inactiveCustomers: sql<number>`count(*) FILTER (WHERE status = 'inactive')`,
        businessCustomers: sql<number>`count(*) FILTER (WHERE type = 'business')`,
        individualCustomers: sql<number>`count(*) FILTER (WHERE type = 'individual')`,
        totalRevenue: sql<number>`SUM(total_spent)`,
        averageOrderValue: sql<number>`AVG(average_order_value)`
      })
      .from(this.getCustomersTable())
      .where(whereClause);

    return {
      totalCustomers: Number(summary[0].totalCustomers) || 0,
      activeCustomers: Number(summary[0].activeCustomers) || 0,
      inactiveCustomers: Number(summary[0].inactiveCustomers) || 0,
      businessCustomers: Number(summary[0].businessCustomers) || 0,
      individualCustomers: Number(summary[0].individualCustomers) || 0,
      totalRevenue: Number(summary[0].totalRevenue) || 0,
      averageOrderValue: Number(summary[0].averageOrderValue) || 0
    };
  }

  private async getCustomersByIds(customerIds: string[], tenantId: string): Promise<Customer[]> {
    const customers = await this.databaseService.drizzleClient
      .select()
      .from(this.getCustomersTable())
      .where(and(
        this.getCustomersTable().tenantId.eq(tenantId),
        inArray(this.getCustomersTable().id, customerIds)
      ));

    return await Promise.all(
      customers.map(customer => this.getCustomer(customer.id))
    );
  }

  private async getCustomersByFilters(filters: any, tenantId: string): Promise<Customer[]> {
    let whereClause = this.getCustomersTable().tenantId.eq(tenantId);

    if (filters.type) {
      whereClause = and(whereClause, this.getCustomersTable().type.eq(filters.type));
    }

    if (filters.status) {
      whereClause = and(whereClause, this.getCustomersTable().status.eq(filters.status));
    }

    if (filters.tier) {
      whereClause = and(whereClause, this.getCustomersTable().tier.eq(filters.tier));
    }

    if (filters.segment) {
      whereClause = and(whereClause, this.getCustomersTable().segment.eq(filters.segment));
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClause = and(whereClause,
        this.getCustomersTable().tags.overlapsWith(filters.tags)
      );
    }

    if (filters.totalSpentRange) {
      whereClause = and(
        whereClause,
        this.getCustomersTable().totalSpent.gte(filters.totalSpentRange.min),
        this.getCustomersTable().totalSpent.lte(filters.totalSpentRange.max)
      );
    }

    const customers = await this.databaseService.drizzleClient
      .select()
      .from(this.getCustomersTable())
      .where(whereClause)
      .limit(1000); // Limit for bulk operations

    return await Promise.all(
      customers.map(customer => this.getCustomer(customer.id))
    );
  }

  private async getCustomersBySegmentCriteria(criteria: SegmentCriteria, tenantId: string): Promise<string[]> {
    // This would evaluate the segment criteria and return matching customer IDs
    // For now, return all active customers
    const customers = await this.databaseService.drizzleClient
      .select({ id: this.getCustomersTable().id })
      .from(this.getCustomersTable())
      .where(and(
        this.getCustomersTable().tenantId.eq(tenantId),
        this.getCustomersTable().status.eq('active')
      ));

    return customers.map(c => c.id);
  }

  private async updateSegmentCustomerCount(segmentId: string, tenantId: string): Promise<void> {
    const count = await this.databaseService.drizzleClient
      .select({ count: sql<number>`count(*)` })
      .from(this.getCustomersTable())
      .where(and(
        this.getCustomersTable().tenantId.eq(tenantId),
        this.getCustomersTable().segment.eq(segmentId)
      ));

    await this.databaseService.drizzleClient
      .update(this.getCustomerSegmentsTable())
      .set({
        customerCount: Number(count[0].count) || 0,
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

  private getCustomersTable() {
    return sql`customers`;
  }

  private getCustomerAddressesTable() {
    return sql`customer_addresses`;
  }

  private getCustomerSegmentsTable() {
    return sql`customer_segments`;
  }
}
