import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'sales', 'inventory', 'financial', 'custom'
    category: varchar('category', { length: 50 }),
    description: text('description'),
    query: text('query'), // SQL query or report definition
    parameters: jsonb('parameters'), // report parameters
    filters: jsonb('filters'), // default filters
    format: varchar('format', { length: 20 }).default('pdf').notNull(), // 'pdf', 'excel', 'csv', 'json'
    schedule: jsonb('schedule'), // cron expression for scheduled reports
    isScheduled: boolean('is_scheduled').default(false).notNull(),
    isPublic: boolean('is_public').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata'),
    tenantId: uuid('tenant_id').notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('reports_type_idx').on(table.type),
    categoryIdx: index('reports_category_idx').on(table.category),
    scheduledIdx: index('reports_scheduled_idx').on(table.isScheduled),
    publicIdx: index('reports_public_idx').on(table.isPublic),
    activeIdx: index('reports_active_idx').on(table.isActive),
    tenantIdx: index('reports_tenant_idx').on(table.tenantId),
  }),
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
