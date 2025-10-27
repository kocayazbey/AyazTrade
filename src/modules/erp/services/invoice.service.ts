import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { invoices } from '../../../database/schema/erp/invoices.schema';
import { eq, and, desc, sql, count, lt } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export interface CreateInvoiceDto {
  customerId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate?: number;
  discountAmount?: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentTerms: string;
  notes?: string;
  reference?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
}

export interface UpdateInvoiceDto {
  customerId?: string;
  invoiceNumber?: string;
  issueDate?: Date;
  dueDate?: Date;
  items?: InvoiceItem[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discountRate?: number;
  discountAmount?: number;
  total?: number;
  currency?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentTerms?: string;
  notes?: string;
  reference?: string;
}

export interface Invoice {
  id: string;
  customerId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate?: number;
  discountAmount?: number;
  total: number;
  currency: string;
  status: string;
  paymentTerms: string;
  notes?: string;
  reference?: string;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class InvoiceService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createInvoiceDto: CreateInvoiceDto, tenantId: string, userId: string): Promise<Invoice> {
    const invoiceId = createId();
    const now = new Date();
    
    const newInvoice = {
      id: invoiceId,
      tenantId,
      customerId: createInvoiceDto.customerId,
      invoiceNumber: createInvoiceDto.invoiceNumber,
      issueDate: createInvoiceDto.issueDate,
      dueDate: createInvoiceDto.dueDate,
      items: createInvoiceDto.items,
      subtotal: createInvoiceDto.subtotal.toString(),
      taxRate: createInvoiceDto.taxRate.toString(),
      taxAmount: createInvoiceDto.taxAmount.toString(),
      discountRate: createInvoiceDto.discountRate?.toString() || null,
      discountAmount: createInvoiceDto.discountAmount?.toString() || null,
      total: createInvoiceDto.total.toString(),
      currency: createInvoiceDto.currency,
      status: createInvoiceDto.status,
      paymentTerms: createInvoiceDto.paymentTerms,
      notes: createInvoiceDto.notes || null,
      reference: createInvoiceDto.reference || null,
      isActive: true,
      createdBy: userId,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    const [invoice] = await this.databaseService.drizzleClient
      .insert(invoices)
      .values(newInvoice)
      .returning();
    
    return this.mapInvoiceFromDb(invoice);
  }

  async findAll(tenantId: string, filters?: any): Promise<{ data: Invoice[]; total: number; page: number; totalPages: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(invoices.tenantId, tenantId), eq(invoices.isActive, true)];
    
    if (filters?.status) {
      conditions.push(eq(invoices.status, filters.status));
    }
    if (filters?.customerId) {
      conditions.push(eq(invoices.customerId, filters.customerId));
    }

    // Get total count
    const [totalResult] = await this.databaseService.drizzleClient
      .select({ count: count() })
      .from(invoices)
      .where(and(...conditions));

    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    const dbInvoices = await this.databaseService.drizzleClient
      .select()
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: dbInvoices.map(i => this.mapInvoiceFromDb(i)),
      total,
      page,
      totalPages,
    };
  }

  async findOne(id: string, tenantId: string): Promise<Invoice | null> {
    const [invoice] = await this.databaseService.drizzleClient
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId), eq(invoices.isActive, true)))
      .limit(1);

    if (!invoice) {
      return null;
    }

    return this.mapInvoiceFromDb(invoice);
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto, tenantId: string, userId?: string): Promise<Invoice | null> {
    const existingInvoice = await this.findOne(id, tenantId);
    if (!existingInvoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updateInvoiceDto.customerId !== undefined) updateData.customerId = updateInvoiceDto.customerId;
    if (updateInvoiceDto.invoiceNumber !== undefined) updateData.invoiceNumber = updateInvoiceDto.invoiceNumber;
    if (updateInvoiceDto.issueDate !== undefined) updateData.issueDate = updateInvoiceDto.issueDate;
    if (updateInvoiceDto.dueDate !== undefined) updateData.dueDate = updateInvoiceDto.dueDate;
    if (updateInvoiceDto.items !== undefined) updateData.items = updateInvoiceDto.items;
    if (updateInvoiceDto.subtotal !== undefined) updateData.subtotal = updateInvoiceDto.subtotal.toString();
    if (updateInvoiceDto.taxRate !== undefined) updateData.taxRate = updateInvoiceDto.taxRate.toString();
    if (updateInvoiceDto.taxAmount !== undefined) updateData.taxAmount = updateInvoiceDto.taxAmount.toString();
    if (updateInvoiceDto.discountRate !== undefined) updateData.discountRate = updateInvoiceDto.discountRate.toString();
    if (updateInvoiceDto.discountAmount !== undefined) updateData.discountAmount = updateInvoiceDto.discountAmount.toString();
    if (updateInvoiceDto.total !== undefined) updateData.total = updateInvoiceDto.total.toString();
    if (updateInvoiceDto.currency !== undefined) updateData.currency = updateInvoiceDto.currency;
    if (updateInvoiceDto.status !== undefined) updateData.status = updateInvoiceDto.status;
    if (updateInvoiceDto.paymentTerms !== undefined) updateData.paymentTerms = updateInvoiceDto.paymentTerms;
    if (updateInvoiceDto.notes !== undefined) updateData.notes = updateInvoiceDto.notes;
    if (updateInvoiceDto.reference !== undefined) updateData.reference = updateInvoiceDto.reference;
    if (userId) updateData.updatedBy = userId;

    const [updatedInvoice] = await this.databaseService.drizzleClient
      .update(invoices)
      .set(updateData)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .returning();

    return updatedInvoice ? this.mapInvoiceFromDb(updatedInvoice) : null;
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.databaseService.drizzleClient
      .update(invoices)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .returning();

    return result.length > 0;
  }

  async getStats(tenantId: string): Promise<{
    totalInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
  }> {
    const [stats] = await this.databaseService.drizzleClient
      .select({
        totalInvoices: sql<number>`COUNT(*)::int`,
        paidInvoices: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'paid')::int`,
        overdueInvoices: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'overdue')::int`,
        totalAmount: sql<number>`COALESCE(SUM(${invoices.total}::numeric), 0)::numeric`,
        paidAmount: sql<number>`COALESCE(SUM(${invoices.total}::numeric) FILTER (WHERE ${invoices.status} = 'paid'), 0)::numeric`,
      })
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.isActive, true)));

    const totalAmount = Number(stats?.totalAmount || 0);
    const paidAmount = Number(stats?.paidAmount || 0);
    const outstandingAmount = totalAmount - paidAmount;

    return {
      totalInvoices: stats?.totalInvoices || 0,
      paidInvoices: stats?.paidInvoices || 0,
      overdueInvoices: stats?.overdueInvoices || 0,
      totalAmount,
      paidAmount,
      outstandingAmount,
    };
  }

  async markAsPaid(id: string, tenantId: string, paymentDate?: Date): Promise<Invoice | null> {
    return this.update(id, { 
      status: 'paid' 
    }, tenantId);
  }

  async sendInvoice(id: string, tenantId: string): Promise<Invoice | null> {
    return this.update(id, { 
      status: 'sent' 
    }, tenantId);
  }

  async getOverdueInvoices(tenantId: string): Promise<Invoice[]> {
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = await this.databaseService.drizzleClient
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.isActive, true),
          sql`${invoices.status} != 'paid'`,
          sql`${invoices.status} != 'cancelled'`,
          sql`${invoices.dueDate} < ${today}`
        )
      )
      .orderBy(desc(invoices.dueDate));

    return overdueInvoices.map(i => this.mapInvoiceFromDb(i));
  }

  async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    
    // Get the latest invoice number for this year
    const [latest] = await this.databaseService.drizzleClient
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          sql`${invoices.invoiceNumber} LIKE ${`INV-${year}-%`}`
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(1);

    let sequence = 1;
    if (latest?.invoiceNumber) {
      const match = latest.invoiceNumber.match(new RegExp(`INV-${year}-(\\d+)`));
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `INV-${year}-${sequence.toString().padStart(3, '0')}`;
  }

  private mapInvoiceFromDb(dbInvoice: any): Invoice {
    return {
      id: dbInvoice.id,
      customerId: dbInvoice.customerId,
      invoiceNumber: dbInvoice.invoiceNumber,
      issueDate: dbInvoice.issueDate,
      dueDate: dbInvoice.dueDate,
      items: dbInvoice.items as InvoiceItem[],
      subtotal: Number(dbInvoice.subtotal),
      taxRate: Number(dbInvoice.taxRate),
      taxAmount: Number(dbInvoice.taxAmount),
      discountRate: dbInvoice.discountRate ? Number(dbInvoice.discountRate) : undefined,
      discountAmount: dbInvoice.discountAmount ? Number(dbInvoice.discountAmount) : undefined,
      total: Number(dbInvoice.total),
      currency: dbInvoice.currency,
      status: dbInvoice.status,
      paymentTerms: dbInvoice.paymentTerms,
      notes: dbInvoice.notes || undefined,
      reference: dbInvoice.reference || undefined,
      tenantId: dbInvoice.tenantId,
      createdBy: dbInvoice.createdBy,
      createdAt: dbInvoice.createdAt,
      updatedAt: dbInvoice.updatedAt,
    };
  }
}
