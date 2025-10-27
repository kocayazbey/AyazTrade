import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';

export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    events: jsonb('events').$type<string[]>().notNull(), // ['order.created', 'payment.completed', etc.]
    secret: varchar('secret', { length: 255 }),
    isActive: boolean('is_active').default(true),
    retryCount: integer('retry_count').default(3),
    timeout: integer('timeout').default(30000), // milliseconds
    headers: jsonb('headers').$type<Record<string, string>>().default({}),
    filters: jsonb('filters').$type<Record<string, any>>().default({}),
    lastTriggeredAt: timestamp('last_triggered_at'),
    lastSuccessAt: timestamp('last_success_at'),
    lastFailureAt: timestamp('last_failure_at'),
    failureCount: integer('failure_count').default(0),
    lastErrorMessage: text('last_error_message'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('webhooks_tenant_idx').on(table.tenantId),
    isActiveIdx: index('webhooks_is_active_idx').on(table.isActive),
    lastTriggeredIdx: index('webhooks_last_triggered_idx').on(table.lastTriggeredAt),
  }),
);

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
