import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'email', 'sms', 'push', 'in_app'
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'sent', 'failed', 'read'
    priority: varchar('priority', { length: 20 }).default('normal'), // 'low', 'normal', 'high', 'urgent'
    channel: varchar('channel', { length: 50 }).notNull(),
    recipient: varchar('recipient', { length: 255 }).notNull(), // email, phone, etc.
    templateId: uuid('template_id'),
    data: jsonb('data').$type<Record<string, any>>().default({}),
    scheduledAt: timestamp('scheduled_at'),
    sentAt: timestamp('sent_at'),
    readAt: timestamp('read_at'),
    failedAt: timestamp('failed_at'),
    retryCount: integer('retry_count').default(0),
    errorMessage: text('error_message'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('notifications_tenant_idx').on(table.tenantId),
    userIdx: index('notifications_user_idx').on(table.userId),
    typeIdx: index('notifications_type_idx').on(table.type),
    statusIdx: index('notifications_status_idx').on(table.status),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
  }),
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;