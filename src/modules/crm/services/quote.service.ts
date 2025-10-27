import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { quotes } from '../../../database/schema/crm/quotes.schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export interface CreateQuoteDto {
  leadId?: string;
  customerId?: string;
  title: string;
  description?: string;
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate?: number;
  discountAmount?: number;
  total: number;
  validUntil: Date;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
}

export interface QuoteItem {
  productId: string;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface UpdateQuoteDto {
  title?: string;
  description?: string;
  items?: QuoteItem[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discountRate?: number;
  discountAmount?: number;
  total?: number;
  validUntil?: Date;
  status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
}

export interface Quote {
  id: string;
  leadId?: string;
  customerId?: string;
  title: string;
  description?: string;
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate?: number;
  discountAmount?: number;
  total: number;
  validUntil: Date;
  status: string;
  notes?: string;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class QuoteService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createQuoteDto: CreateQuoteDto, tenantId: string, userId: string): Promise<Quote> {
    const quoteId = createId();
    const now = new Date();
    
    const newQuote = {
      id: quoteId,
      tenantId,
      leadId: createQuoteDto.leadId || null,
      customerId: createQuoteDto.customerId || null,
      title: createQuoteDto.title,
      description: createQuoteDto.description || null,
      items: createQuoteDto.items,
      subtotal: createQuoteDto.subtotal.toString(),
      taxRate: createQuoteDto.taxRate.toString(),
      taxAmount: createQuoteDto.taxAmount.toString(),
      discountRate: createQuoteDto.discountRate?.toString() || null,
      discountAmount: createQuoteDto.discountAmount?.toString() || null,
      total: createQuoteDto.total.toString(),
      currency: 'USD',
      validUntil: createQuoteDto.validUntil,
      status: createQuoteDto.status,
      notes: createQuoteDto.notes || null,
      isActive: true,
      createdBy: userId,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    const [quote] = await this.databaseService.drizzleClient
      .insert(quotes)
      .values(newQuote)
      .returning();
    
    return this.mapQuoteFromDb(quote);
  }

  async findAll(tenantId: string, filters?: any): Promise<{ data: Quote[]; total: number; page: number; totalPages: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(quotes.tenantId, tenantId), eq(quotes.isActive, true)];
    
    if (filters?.status) {
      conditions.push(eq(quotes.status, filters.status));
    }
    if (filters?.customerId) {
      conditions.push(eq(quotes.customerId, filters.customerId));
    }
    if (filters?.leadId) {
      conditions.push(eq(quotes.leadId, filters.leadId));
    }

    // Get total count
    const [totalResult] = await this.databaseService.drizzleClient
      .select({ count: count() })
      .from(quotes)
      .where(and(...conditions));

    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    const dbQuotes = await this.databaseService.drizzleClient
      .select()
      .from(quotes)
      .where(and(...conditions))
      .orderBy(desc(quotes.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: dbQuotes.map(q => this.mapQuoteFromDb(q)),
      total,
      page,
      totalPages,
    };
  }

  async findOne(id: string, tenantId: string): Promise<Quote | null> {
    const [quote] = await this.databaseService.drizzleClient
      .select()
      .from(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, tenantId), eq(quotes.isActive, true)))
      .limit(1);

    if (!quote) {
      return null;
    }

    return this.mapQuoteFromDb(quote);
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto, tenantId: string, userId?: string): Promise<Quote | null> {
    const existingQuote = await this.findOne(id, tenantId);
    if (!existingQuote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updateQuoteDto.title !== undefined) updateData.title = updateQuoteDto.title;
    if (updateQuoteDto.description !== undefined) updateData.description = updateQuoteDto.description;
    if (updateQuoteDto.items !== undefined) updateData.items = updateQuoteDto.items;
    if (updateQuoteDto.subtotal !== undefined) updateData.subtotal = updateQuoteDto.subtotal.toString();
    if (updateQuoteDto.taxRate !== undefined) updateData.taxRate = updateQuoteDto.taxRate.toString();
    if (updateQuoteDto.taxAmount !== undefined) updateData.taxAmount = updateQuoteDto.taxAmount.toString();
    if (updateQuoteDto.discountRate !== undefined) updateData.discountRate = updateQuoteDto.discountRate.toString();
    if (updateQuoteDto.discountAmount !== undefined) updateData.discountAmount = updateQuoteDto.discountAmount.toString();
    if (updateQuoteDto.total !== undefined) updateData.total = updateQuoteDto.total.toString();
    if (updateQuoteDto.validUntil !== undefined) updateData.validUntil = updateQuoteDto.validUntil;
    if (updateQuoteDto.status !== undefined) updateData.status = updateQuoteDto.status;
    if (updateQuoteDto.notes !== undefined) updateData.notes = updateQuoteDto.notes;
    if (userId) updateData.updatedBy = userId;

    const [updatedQuote] = await this.databaseService.drizzleClient
      .update(quotes)
      .set(updateData)
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, tenantId)))
      .returning();

    return updatedQuote ? this.mapQuoteFromDb(updatedQuote) : null;
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.databaseService.drizzleClient
      .update(quotes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, tenantId)))
      .returning();

    return result.length > 0;
  }

  async getStats(tenantId: string): Promise<{
    totalQuotes: number;
    draftQuotes: number;
    sentQuotes: number;
    acceptedQuotes: number;
    totalValue: number;
    averageValue: number;
  }> {
    const [stats] = await this.databaseService.drizzleClient
      .select({
        totalQuotes: sql<number>`COUNT(*)::int`,
        draftQuotes: sql<number>`COUNT(*) FILTER (WHERE ${quotes.status} = 'draft')::int`,
        sentQuotes: sql<number>`COUNT(*) FILTER (WHERE ${quotes.status} = 'sent')::int`,
        acceptedQuotes: sql<number>`COUNT(*) FILTER (WHERE ${quotes.status} = 'accepted')::int`,
        totalValue: sql<number>`COALESCE(SUM(${quotes.total}::numeric), 0)::numeric`,
      })
      .from(quotes)
      .where(and(eq(quotes.tenantId, tenantId), eq(quotes.isActive, true)));

    const totalQuotes = stats?.totalQuotes || 0;
    const totalValue = Number(stats?.totalValue || 0);
    const averageValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

    return {
      totalQuotes: stats?.totalQuotes || 0,
      draftQuotes: stats?.draftQuotes || 0,
      sentQuotes: stats?.sentQuotes || 0,
      acceptedQuotes: stats?.acceptedQuotes || 0,
      totalValue,
      averageValue,
    };
  }

  async sendQuote(id: string, tenantId: string): Promise<Quote | null> {
    return this.update(id, { status: 'sent' }, tenantId);
  }

  async acceptQuote(id: string, tenantId: string): Promise<Quote | null> {
    return this.update(id, { status: 'accepted' }, tenantId);
  }

  async rejectQuote(id: string, tenantId: string, reason?: string): Promise<Quote | null> {
    return this.update(id, { status: 'rejected', notes: reason }, tenantId);
  }

  private mapQuoteFromDb(dbQuote: any): Quote {
    return {
      id: dbQuote.id,
      leadId: dbQuote.leadId || undefined,
      customerId: dbQuote.customerId || undefined,
      title: dbQuote.title,
      description: dbQuote.description || undefined,
      items: dbQuote.items as QuoteItem[],
      subtotal: Number(dbQuote.subtotal),
      taxRate: Number(dbQuote.taxRate),
      taxAmount: Number(dbQuote.taxAmount),
      discountRate: dbQuote.discountRate ? Number(dbQuote.discountRate) : undefined,
      discountAmount: dbQuote.discountAmount ? Number(dbQuote.discountAmount) : undefined,
      total: Number(dbQuote.total),
      validUntil: dbQuote.validUntil,
      status: dbQuote.status,
      notes: dbQuote.notes || undefined,
      tenantId: dbQuote.tenantId,
      createdBy: dbQuote.createdBy,
      createdAt: dbQuote.createdAt,
      updatedAt: dbQuote.updatedAt,
    };
  }
}
