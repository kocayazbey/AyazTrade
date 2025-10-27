import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, date } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const dashboards = pgTable('analytics_dashboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  dashboardType: varchar('dashboard_type', { length: 50 }),
  config: jsonb('config'),
  widgets: jsonb('widgets'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reports = pgTable('analytics_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  reportNumber: varchar('report_number', { length: 50 }).notNull().unique(),
  reportName: varchar('report_name', { length: 255 }).notNull(),
  reportType: varchar('report_type', { length: 50 }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  data: jsonb('data'),
  summary: jsonb('summary'),
  generatedAt: timestamp('generated_at').notNull(),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const kpis = pgTable('analytics_kpis', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  kpiName: varchar('kpi_name', { length: 255 }).notNull(),
  kpiType: varchar('kpi_type', { length: 50 }),
  category: varchar('category', { length: 50 }),
  targetValue: decimal('target_value', { precision: 15, scale: 2 }),
  actualValue: decimal('actual_value', { precision: 15, scale: 2 }),
  unit: varchar('unit', { length: 20 }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  achievementRate: decimal('achievement_rate', { precision: 5, scale: 2 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type KPI = typeof kpis.$inferSelect;
export type NewKPI = typeof kpis.$inferInsert;

