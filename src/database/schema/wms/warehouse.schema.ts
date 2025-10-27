import { pgTable, text, timestamp, integer, varchar, decimal, boolean, jsonb } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey().$default(() => createId()),
  tenantId: text('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).notNull().default('Turkey'),
  postalCode: varchar('postal_code', { length: 20 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  capacity: decimal('capacity', { precision: 10, scale: 2 }),
  currentCapacity: decimal('current_capacity', { precision: 10, scale: 2 }).default('0'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const warehouseLocations = pgTable('warehouse_locations', {
  id: text('id').primaryKey().$default(() => createId()),
  tenantId: text('tenant_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'zone', 'aisle', 'rack', 'shelf', 'bin'
  parentId: text('parent_id'),
  capacity: decimal('capacity', { precision: 10, scale: 2 }),
  currentCapacity: decimal('current_capacity', { precision: 10, scale: 2 }).default('0'),
  coordinates: jsonb('coordinates'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
export type WarehouseLocation = typeof warehouseLocations.$inferSelect;
export type NewWarehouseLocation = typeof warehouseLocations.$inferInsert;
