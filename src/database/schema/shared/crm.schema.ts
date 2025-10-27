import { pgTable, uuid, varchar, text, timestamp, integer, decimal, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';
import { users } from '../core/users.schema';

export const customers = pgTable('crm_customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerNumber: varchar('customer_number', { length: 50 }).notNull().unique(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  website: varchar('website', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  billingAddress: text('billing_address'),
  shippingAddress: text('shipping_address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  country: varchar('country', { length: 50 }),
  postalCode: varchar('postal_code', { length: 20 }),
  customerType: varchar('customer_type', { length: 50 }),
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  taxId: varchar('tax_id', { length: 50 }),
  salesRepId: uuid('sales_rep_id').references(() => users.id),
  customFields: jsonb('custom_fields'),
  tags: jsonb('tags'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dealers = pgTable('crm_dealers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  dealerNumber: varchar('dealer_number', { length: 50 }).notNull().unique(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  region: varchar('region', { length: 100 }),
  dealerType: varchar('dealer_type', { length: 50 }),
  contractStartDate: date('contract_start_date'),
  contractEndDate: date('contract_end_date'),
  discountRate: decimal('discount_rate', { precision: 5, scale: 2 }),
  salesTarget: decimal('sales_target', { precision: 15, scale: 2 }),
  currentSales: decimal('current_sales', { precision: 15, scale: 2 }).default('0'),
  performanceRating: integer('performance_rating'),
  salesRepId: uuid('sales_rep_id').references(() => users.id),
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const leads = pgTable('crm_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  leadNumber: varchar('lead_number', { length: 50 }).notNull().unique(),
  companyName: varchar('company_name', { length: 255 }),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  source: varchar('source', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('new'),
  leadScore: integer('lead_score'),
  estimatedValue: decimal('estimated_value', { precision: 15, scale: 2 }),
  assignedTo: uuid('assigned_to').references(() => users.id),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  convertedAt: timestamp('converted_at'),
  convertedToCustomerId: uuid('converted_to_customer_id').references(() => customers.id),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const slaAgreements = pgTable('crm_sla_agreements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  agreementNumber: varchar('agreement_number', { length: 50 }).notNull().unique(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  responseTime: integer('response_time'), // minutes
  resolutionTime: integer('resolution_time'), // hours
  deliveryTime: integer('delivery_time'), // hours
  accuracyTarget: decimal('accuracy_target', { precision: 5, scale: 2 }), // percentage
  uptime: decimal('uptime', { precision: 5, scale: 2 }), // percentage
  penalties: jsonb('penalties'),
  status: varchar('status', { length: 20 }).default('active'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const activities = pgTable('crm_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  activityType: varchar('activity_type', { length: 50 }).notNull(), // 'call', 'email', 'meeting', 'task', 'note'
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description'),
  relatedTo: varchar('related_to', { length: 50 }), // 'customer', 'lead', 'dealer'
  relatedId: uuid('related_id'),
  scheduledAt: timestamp('scheduled_at'),
  completedAt: timestamp('completed_at'),
  status: varchar('status', { length: 20 }).default('pending'),
  priority: varchar('priority', { length: 20 }).default('normal'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Dealer = typeof dealers.$inferSelect;
export type NewDealer = typeof dealers.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type SLAAgreement = typeof slaAgreements.$inferSelect;
export type NewSLAAgreement = typeof slaAgreements.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

