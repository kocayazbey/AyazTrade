import { pgTable, text, timestamp, integer, varchar, boolean } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const activities = pgTable('activities', {
  id: text('id').primaryKey().$default(() => createId()),
  tenantId: text('tenant_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description'),
  customerId: text('customer_id'),
  leadId: text('lead_id'),
  contactId: text('contact_id'),
  scheduledAt: timestamp('scheduled_at'),
  completedAt: timestamp('completed_at'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  assignedTo: text('assigned_to'),
  notes: text('notes'),
  outcome: text('outcome'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
