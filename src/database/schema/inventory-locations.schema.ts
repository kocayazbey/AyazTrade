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

export const inventoryLocations = pgTable(
  'inventory_locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    warehouseId: uuid('warehouse_id').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 20 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // 'zone', 'aisle', 'rack', 'shelf', 'bin'
    parentId: uuid('parent_id'), // for hierarchical locations
    level: integer('level').notNull(), // 0 = zone, 1 = aisle, 2 = rack, etc.
    path: varchar('path', { length: 200 }), // full path like "Zone-A/Aisle-1/Rack-2/Shelf-3"
    coordinates: jsonb('coordinates'), // x, y, z coordinates
    dimensions: jsonb('dimensions'), // length, width, height
    capacity: decimal('capacity', { precision: 10, scale: 2 }),
    usedCapacity: decimal('used_capacity', { precision: 10, scale: 2 }).default('0'),
    temperature: decimal('temperature', { precision: 5, scale: 2 }),
    humidity: decimal('humidity', { precision: 5, scale: 2 }),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata'),
    tenantId: uuid('tenant_id').notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    warehouseIdx: index('inventory_locations_warehouse_idx').on(table.warehouseId),
    codeIdx: index('inventory_locations_code_idx').on(table.code),
    typeIdx: index('inventory_locations_type_idx').on(table.type),
    levelIdx: index('inventory_locations_level_idx').on(table.level),
    activeIdx: index('inventory_locations_active_idx').on(table.isActive),
    tenantIdx: index('inventory_locations_tenant_idx').on(table.tenantId),
  }),
);

export type InventoryLocation = typeof inventoryLocations.$inferSelect;
export type NewInventoryLocation = typeof inventoryLocations.$inferInsert;
