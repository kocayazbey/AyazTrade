import { pgTable, uuid, varchar, text, decimal, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    productId: uuid('product_id').notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'in', 'out', 'adjustment', 'transfer'
    quantity: integer('quantity').notNull(),
    oldStock: varchar('old_stock', { length: 20 }),
    newStock: varchar('new_stock', { length: 20 }),
    reason: varchar('reason', { length: 255 }),
    reference: varchar('reference', { length: 255 }), // PO number, transfer ID, etc.
    notes: text('notes'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  },
  (table) => ({
    productIdx: index('inventory_movements_product_idx').on(table.productId),
    tenantIdx: index('inventory_movements_tenant_idx').on(table.tenantId),
    typeIdx: index('inventory_movements_type_idx').on(table.type),
    createdAtIdx: index('inventory_movements_created_at_idx').on(table.createdAt),
  }),
);