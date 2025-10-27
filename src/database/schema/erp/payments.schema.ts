import { pgTable, text, timestamp, integer, varchar, decimal, boolean, date } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const payments = pgTable('payments', {
  id: text('id').primaryKey().$default(() => createId()),
  tenantId: text('tenant_id').notNull(),
  invoiceId: text('invoice_id'),
  customerId: text('customer_id').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  paymentDate: date('payment_date').notNull(),
  reference: varchar('reference', { length: 255 }),
  notes: text('notes'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  transactionId: varchar('transaction_id', { length: 255 }),
  bankAccount: varchar('bank_account', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
