import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, check } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  metadata: jsonb('metadata'),

  // MFA fields
  mfaSecret: text('mfa_secret'), // Encrypted TOTP secret
  mfaBackupCodes: text('mfa_backup_codes'), // Encrypted backup codes
  mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
  mfaEnabledAt: timestamp('mfa_enabled_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
},
(table) => ({
  // Business constraints - removed for migration generation
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

