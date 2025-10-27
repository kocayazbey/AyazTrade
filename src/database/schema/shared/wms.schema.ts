import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';
import { users } from '../core/users.schema';

export const warehouses = pgTable('wms_warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 50 }),
  totalArea: decimal('total_area', { precision: 12, scale: 2 }),
  usableArea: decimal('usable_area', { precision: 12, scale: 2 }),
  areaUnit: varchar('area_unit', { length: 10 }).default('sqm'),
  status: varchar('status', { length: 20 }).default('active'),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const locations = pgTable('wms_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  zone: varchar('zone', { length: 50 }),
  aisle: varchar('aisle', { length: 20 }),
  rack: varchar('rack', { length: 20 }),
  shelf: varchar('shelf', { length: 20 }),
  bin: varchar('bin', { length: 20 }),
  locationType: varchar('location_type', { length: 50 }),
  capacity: decimal('capacity', { precision: 12, scale: 2 }),
  maxWeight: decimal('max_weight', { precision: 12, scale: 2 }),
  isOccupied: boolean('is_occupied').default(false),
  isLocked: boolean('is_locked').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const products = pgTable('wms_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }).notNull(),
  barcode: varchar('barcode', { length: 100 }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  weight: decimal('weight', { precision: 12, scale: 3 }),
  length: decimal('length', { precision: 12, scale: 2 }),
  width: decimal('width', { precision: 12, scale: 2 }),
  height: decimal('height', { precision: 12, scale: 2 }),
  isHazmat: boolean('is_hazmat').default(false),
  isPerishable: boolean('is_perishable').default(false),
  requiresSerialNumber: boolean('requires_serial_number').default(false),
  requiresLotNumber: boolean('requires_lot_number').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const inventory = pgTable('wms_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .references(() => locations.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  lotNumber: varchar('lot_number', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  quantityOnHand: integer('quantity_on_hand').default(0),
  quantityAvailable: integer('quantity_available').default(0),
  quantityAllocated: integer('quantity_allocated').default(0),
  expiryDate: date('expiry_date'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const receivingOrders = pgTable('wms_receiving_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  receivingNumber: varchar('receiving_number', { length: 50 }).notNull().unique(),
  poNumber: varchar('po_number', { length: 50 }),
  supplier: varchar('supplier', { length: 255 }),
  expectedDate: timestamp('expected_date'),
  receivedDate: timestamp('received_date'),
  status: varchar('status', { length: 20 }).default('pending'),
  receivedBy: uuid('received_by').references(() => users.id),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const pickingOrders = pgTable('wms_picking_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  pickingNumber: varchar('picking_number', { length: 50 }).notNull().unique(),
  orderNumber: varchar('order_number', { length: 50 }),
  pickingStrategy: varchar('picking_strategy', { length: 50 }),
  pickingType: varchar('picking_type', { length: 50 }),
  assignedTo: uuid('assigned_to').references(() => users.id),
  priority: varchar('priority', { length: 20 }).default('normal'),
  status: varchar('status', { length: 20 }).default('pending'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const shipments = pgTable('wms_shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  shipmentNumber: varchar('shipment_number', { length: 50 }).notNull().unique(),
  carrier: varchar('carrier', { length: 255 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  shipToName: varchar('ship_to_name', { length: 255 }),
  shipToAddress: text('ship_to_address'),
  status: varchar('status', { length: 20 }).default('preparing'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type ReceivingOrder = typeof receivingOrders.$inferSelect;
export type NewReceivingOrder = typeof receivingOrders.$inferInsert;
export type PickingOrder = typeof pickingOrders.$inferSelect;
export type NewPickingOrder = typeof pickingOrders.$inferInsert;
export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;

