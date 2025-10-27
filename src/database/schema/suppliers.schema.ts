import { pgTable, text, varchar, numeric, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const suppliers = pgTable('suppliers', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique(),
  contactPerson: varchar('contact_person', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 100 }),
  taxNumber: varchar('tax_number', { length: 50 }),
  status: varchar('status', { length: 20 }).default('active'),
  paymentTerms: varchar('payment_terms', { length: 100 }).default('Net 30'),
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).default('0'),
  balance: numeric('balance', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const insertSupplierSchema = createInsertSchema(suppliers, {
  name: z.string().min(1, 'Supplier name is required'),
  email: z.string().email('Invalid email format').optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
});

export const selectSupplierSchema = createSelectSchema(suppliers);

export type Supplier = z.infer<typeof selectSupplierSchema>;
export type NewSupplier = z.infer<typeof insertSupplierSchema>;
