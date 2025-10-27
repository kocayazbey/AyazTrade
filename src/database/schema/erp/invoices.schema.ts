import { pgTable, text, timestamp, integer, varchar, decimal, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey().$default(() => createId()),
  tenantId: text('tenant_id').notNull(),
  customerId: text('customer_id').notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  items: jsonb('items').notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  discountRate: decimal('discount_rate', { precision: 5, scale: 2 }),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  paymentTerms: varchar('payment_terms', { length: 100 }).notNull(),
  notes: text('notes'),
  reference: varchar('reference', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
