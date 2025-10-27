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

export const warehouses = pgTable(
  'warehouses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 20 }).unique().notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // 'main', 'satellite', 'cold_storage', 'hazardous'
    status: varchar('status', { length: 50 }).default('active').notNull(),
    address: jsonb('address').notNull(),
    contactInfo: jsonb('contact_info'),
    capacity: decimal('capacity', { precision: 10, scale: 2 }),
    usedCapacity: decimal('used_capacity', { precision: 10, scale: 2 }).default('0'),
    dimensions: jsonb('dimensions'), // length, width, height
    features: jsonb('features'), // temperature control, security, etc.
    operatingHours: jsonb('operating_hours'),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata'),
    tenantId: uuid('tenant_id').notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index('warehouses_code_idx').on(table.code),
    typeIdx: index('warehouses_type_idx').on(table.type),
    statusIdx: index('warehouses_status_idx').on(table.status),
    activeIdx: index('warehouses_active_idx').on(table.isActive),
    tenantIdx: index('warehouses_tenant_idx').on(table.tenantId),
  }),
);

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
