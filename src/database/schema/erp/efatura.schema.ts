import { pgTable, text, timestamp, integer, varchar, decimal, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const efatura = pgTable('efatura', {
  id: text('id').primaryKey().$default(() => createId()),
  tenantId: text('tenant_id').notNull(),
  invoiceId: text('invoice_id').notNull(),
  customerId: text('customer_id').notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('TRY'),
  taxNumber: varchar('tax_number', { length: 20 }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).notNull().default('Turkey'),
  postalCode: varchar('postal_code', { length: 20 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  items: jsonb('items').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  errorMessage: text('error_message'),
  deliveryDate: timestamp('delivery_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type EFatura = typeof efatura.$inferSelect;
export type NewEFatura = typeof efatura.$inferInsert;
