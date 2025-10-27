import { pgTable, text, timestamp, integer, varchar, decimal, boolean, date } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const contracts = pgTable('contracts', {
  id: text('id').primaryKey().$default(() => createId()),
  tenantId: text('tenant_id').notNull(),
  customerId: text('customer_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  contractType: varchar('contract_type', { length: 50 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  paymentTerms: varchar('payment_terms', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  terms: text('terms').notNull(),
  notes: text('notes'),
  autoRenewal: boolean('auto_renewal').notNull().default(false),
  renewalPeriod: integer('renewal_period'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
