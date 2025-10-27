import { pgTable, text, timestamp, integer, varchar, decimal, boolean, jsonb, date, check } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const inventory = pgTable('inventory', {
  id: text('id').primaryKey().$default(() => createId()),
  tenantId: text('tenant_id').notNull(),
  productId: text('product_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  locationId: text('location_id'),
  sku: varchar('sku', { length: 100 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  reservedQuantity: decimal('reserved_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  availableQuantity: decimal('available_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }),
  totalValue: decimal('total_value', { precision: 10, scale: 2 }),
  batchNumber: varchar('batch_number', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  expiryDate: date('expiry_date'),
  status: varchar('status', { length: 50 }).notNull().default('available'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
},
(table) => ({
  // Business constraints - removed for migration generation
}));

export const inventoryMovements = pgTable('inventory_movements', {
  id: text('id').primaryKey().$default(() => createId()),
  tenantId: text('tenant_id').notNull(),
  inventoryId: text('inventory_id').notNull(),
  movementType: varchar('movement_type', { length: 50 }).notNull(), // 'in', 'out', 'transfer', 'adjustment'
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }),
  totalValue: decimal('total_value', { precision: 10, scale: 2 }),
  reference: varchar('reference', { length: 255 }),
  referenceId: text('reference_id'),
  notes: text('notes'),
  movementDate: timestamp('movement_date').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const inventoryTransfers = pgTable('inventory_transfers', {
  id: text('id').primaryKey().$default(() => createId()),
  tenantId: text('tenant_id').notNull(),
  transferNumber: varchar('transfer_number', { length: 100 }).notNull(),
  fromWarehouseId: text('from_warehouse_id').notNull(),
  toWarehouseId: text('to_warehouse_id').notNull(),
  fromLocationId: text('from_location_id'),
  toLocationId: text('to_location_id'),
  items: jsonb('items').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  requestedDate: timestamp('requested_date').notNull(),
  completedDate: timestamp('completed_date'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert;
export type InventoryTransfer = typeof inventoryTransfers.$inferSelect;
export type NewInventoryTransfer = typeof inventoryTransfers.$inferInsert;
