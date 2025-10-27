import { pgTable, text, timestamp, uuid, jsonb, varchar, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const auditSeverityEnum = pgEnum('audit_severity', ['low', 'medium', 'high', 'critical']);

export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 100 }).primaryKey(),
  userId: uuid('user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 support
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 255 }),
  metadata: jsonb('metadata'),
  severity: auditSeverityEnum('severity').default('medium').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  refreshToken: varchar('refresh_token', { length: 255 }).notNull(),
  deviceInfo: jsonb('device_info'), // { userAgent, ipAddress, location, etc. }
  isActive: boolean('is_active').default(true).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
