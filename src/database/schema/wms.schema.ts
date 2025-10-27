import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, date, index } from 'drizzle-orm/pg-core';

/**
 * WMS Schema for AyazTrade
 * Adapted from AyazLogistics 3PL WMS for single-company manufacturing/retail use
 */

// Note: For AyazTrade, we keep tenantId for future multi-store support
// but remove 3PL-specific customerId references from core WMS tables

export const warehouses = pgTable('wms_warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }), // 'main', 'distribution', 'production', 'returns'
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
  zone: varchar('zone', { length: 50 }), // 'receiving', 'storage', 'picking', 'packing', 'shipping', 'production'
  aisle: varchar('aisle', { length: 20 }),
  rack: varchar('rack', { length: 20 }),
  shelf: varchar('shelf', { length: 20 }),
  bin: varchar('bin', { length: 20 }),
  locationType: varchar('location_type', { length: 50 }), // 'pallet', 'shelf', 'floor', 'bulk', 'pickface'
  capacity: decimal('capacity', { precision: 12, scale: 2 }),
  maxWeight: decimal('max_weight', { precision: 12, scale: 2 }),
  isOccupied: boolean('is_occupied').default(false),
  isLocked: boolean('is_locked').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  warehouseIdx: index('locations_warehouse_idx').on(table.warehouseId),
  zoneIdx: index('locations_zone_idx').on(table.zone),
  codeIdx: index('locations_code_idx').on(table.code),
}));

export const wmsProducts = pgTable('wms_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  barcode: varchar('barcode', { length: 100 }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  // Physical properties for warehouse operations
  weight: decimal('weight', { precision: 12, scale: 3 }),
  weightUnit: varchar('weight_unit', { length: 10 }).default('kg'),
  length: decimal('length', { precision: 12, scale: 2 }),
  width: decimal('width', { precision: 12, scale: 2 }),
  height: decimal('height', { precision: 12, scale: 2 }),
  dimensionUnit: varchar('dimension_unit', { length: 10 }).default('cm'),
  // WMS-specific properties
  isHazmat: boolean('is_hazmat').default(false),
  isPerishable: boolean('is_perishable').default(false),
  requiresSerialNumber: boolean('requires_serial_number').default(false),
  requiresLotNumber: boolean('requires_lot_number').default(false),
  shelfLife: integer('shelf_life_days'), // days
  storageTemp: varchar('storage_temp', { length: 50 }), // 'ambient', 'refrigerated', 'frozen'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  skuIdx: index('wms_products_sku_idx').on(table.sku),
  barcodeIdx: index('wms_products_barcode_idx').on(table.barcode),
}));

export const inventory = pgTable('wms_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .references(() => locations.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => wmsProducts.id, { onDelete: 'cascade' }),
  lotNumber: varchar('lot_number', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  quantityOnHand: integer('quantity_on_hand').default(0),
  quantityAvailable: integer('quantity_available').default(0),
  quantityAllocated: integer('quantity_allocated').default(0),
  quantityReserved: integer('quantity_reserved').default(0),
  manufactureDate: date('manufacture_date'),
  expiryDate: date('expiry_date'),
  receivedDate: date('received_date'),
  status: varchar('status', { length: 20 }).default('available'), // 'available', 'allocated', 'hold', 'quarantine', 'damaged'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  warehouseIdx: index('inventory_warehouse_idx').on(table.warehouseId),
  inventoryProductIdx: index('inventory_product_idx').on(table.productId),
  locationIdx: index('inventory_location_idx').on(table.locationId),
  lotIdx: index('inventory_lot_idx').on(table.lotNumber),
}));

export const receivingOrders = pgTable('wms_receiving_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  receivingNumber: varchar('receiving_number', { length: 50 }).notNull().unique(),
  receivingType: varchar('receiving_type', { length: 50 }), // 'purchase_order', 'transfer', 'production', 'return'
  poNumber: varchar('po_number', { length: 50 }),
  supplier: varchar('supplier', { length: 255 }),
  referenceNumber: varchar('reference_number', { length: 100 }),
  expectedDate: timestamp('expected_date'),
  receivedDate: timestamp('received_date'),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'in_progress', 'completed', 'cancelled'
  receivedBy: varchar('received_by', { length: 100 }),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('receiving_status_idx').on(table.status),
  warehouseIdx: index('receiving_warehouse_idx').on(table.warehouseId),
}));

export const receivingItems = pgTable('wms_receiving_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  receivingOrderId: uuid('receiving_order_id')
    .notNull()
    .references(() => receivingOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => wmsProducts.id),
  expectedQuantity: integer('expected_quantity').notNull(),
  receivedQuantity: integer('received_quantity').default(0),
  damagedQuantity: integer('damaged_quantity').default(0),
  lotNumber: varchar('lot_number', { length: 100 }),
  serialNumbers: jsonb('serial_numbers').$type<string[]>(),
  manufactureDate: date('manufacture_date'),
  expiryDate: date('expiry_date'),
  condition: varchar('condition', { length: 20 }).default('good'), // 'good', 'damaged', 'expired'
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const pickingOrders = pgTable('wms_picking_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  pickingNumber: varchar('picking_number', { length: 50 }).notNull().unique(),
  orderNumber: varchar('order_number', { length: 50 }), // Reference to sales order
  pickingStrategy: varchar('picking_strategy', { length: 50 }), // 'wave', 'batch', 'zone', 'discrete'
  pickingType: varchar('picking_type', { length: 50 }), // 'sales', 'transfer', 'production'
  assignedTo: varchar('assigned_to', { length: 100 }),
  priority: varchar('priority', { length: 20 }).default('normal'), // 'low', 'normal', 'high', 'urgent'
  status: varchar('status', { length: 20 }).default('pending'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('picking_status_idx').on(table.status),
  warehouseIdx: index('picking_warehouse_idx').on(table.warehouseId),
}));

export const pickingItems = pgTable('wms_picking_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  pickingOrderId: uuid('picking_order_id')
    .notNull()
    .references(() => pickingOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => wmsProducts.id),
  fromLocationId: uuid('from_location_id')
    .references(() => locations.id),
  requestedQuantity: integer('requested_quantity').notNull(),
  pickedQuantity: integer('picked_quantity').default(0),
  lotNumber: varchar('lot_number', { length: 100 }),
  serialNumbers: jsonb('serial_numbers').$type<string[]>(),
  status: varchar('status', { length: 20 }).default('pending'),
  pickedAt: timestamp('picked_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const shipments = pgTable('wms_shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  shipmentNumber: varchar('shipment_number', { length: 50 }).notNull().unique(),
  orderNumber: varchar('order_number', { length: 50 }),
  carrier: varchar('carrier', { length: 255 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  shipToName: varchar('ship_to_name', { length: 255 }),
  shipToAddress: text('ship_to_address'),
  shipToCity: varchar('ship_to_city', { length: 100 }),
  shipToCountry: varchar('ship_to_country', { length: 50 }),
  status: varchar('status', { length: 20 }).default('preparing'), // 'preparing', 'packed', 'shipped', 'delivered', 'cancelled'
  packedAt: timestamp('packed_at'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('wms_shipments_status_idx').on(table.status),
}));

export const cycleCounts = pgTable('wms_cycle_counts', {
  id: uuid('id').primaryKey().defaultRandom(),
  countNumber: varchar('count_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  countType: varchar('count_type', { length: 50 }), // 'cycle', 'full', 'spot', 'dynamic'
  strategy: varchar('strategy', { length: 50 }), // 'ABC', 'random', 'zone', 'velocity'
  scheduledDate: date('scheduled_date'),
  status: varchar('status', { length: 20 }).default('planned'),
  countedBy: varchar('counted_by', { length: 100 }),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  totalVariance: decimal('total_variance', { precision: 15, scale: 2 }),
  variancePercentage: decimal('variance_percentage', { precision: 5, scale: 2 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const countItems = pgTable('wms_count_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleCountId: uuid('cycle_count_id')
    .notNull()
    .references(() => cycleCounts.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .references(() => locations.id),
  productId: uuid('product_id')
    .references(() => wmsProducts.id),
  systemQuantity: integer('system_quantity').notNull(),
  countedQuantity: integer('counted_quantity'),
  variance: integer('variance'),
  variancePercentage: decimal('variance_percentage', { precision: 5, scale: 2 }),
  lotNumber: varchar('lot_number', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  status: varchar('status', { length: 20 }).default('pending'),
  countedAt: timestamp('counted_at'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
});

export const stockMovements = pgTable('wms_stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  movementNumber: varchar('movement_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => wmsProducts.id),
  movementType: varchar('movement_type', { length: 50 }).notNull(), // 'in', 'out', 'transfer', 'adjustment'
  movementReason: varchar('movement_reason', { length: 100 }), // 'receiving', 'picking', 'sale', 'production', 'transfer', 'adjustment', 'damaged', 'expired'
  fromLocationId: uuid('from_location_id')
    .references(() => locations.id),
  toLocationId: uuid('to_location_id')
    .references(() => locations.id),
  quantity: integer('quantity').notNull(),
  lotNumber: varchar('lot_number', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  referenceType: varchar('reference_type', { length: 50 }), // 'receiving_order', 'picking_order', 'transfer', 'adjustment'
  referenceId: uuid('reference_id'),
  referenceNumber: varchar('reference_number', { length: 50 }),
  movementDate: timestamp('movement_date').notNull().defaultNow(),
  performedBy: varchar('performed_by', { length: 100 }),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  movementsProductIdx: index('movements_product_idx').on(table.productId),
  dateIdx: index('movements_date_idx').on(table.movementDate),
  typeIdx: index('movements_type_idx').on(table.movementType),
}));

export const waves = pgTable('wms_waves', {
  id: uuid('id').primaryKey().defaultRandom(),
  waveNumber: varchar('wave_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  waveType: varchar('wave_type', { length: 50 }), // 'sales', 'transfer', 'production'
  pickingStrategy: varchar('picking_strategy', { length: 50 }),
  status: varchar('status', { length: 20 }).default('planned'),
  totalOrders: integer('total_orders'),
  totalLines: integer('total_lines'),
  totalQuantity: integer('total_quantity'),
  releasedAt: timestamp('released_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const pallets = pgTable('wms_pallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  palletNumber: varchar('pallet_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id),
  locationId: uuid('location_id')
    .references(() => locations.id),
  palletType: varchar('pallet_type', { length: 50 }), // 'euro', 'standard', 'custom'
  status: varchar('status', { length: 20 }).default('empty'), // 'empty', 'partial', 'full', 'sealed', 'shipped'
  totalWeight: decimal('total_weight', { precision: 12, scale: 3 }),
  totalHeight: decimal('total_height', { precision: 12, scale: 2 }),
  items: jsonb('items'), // Array of { productId, sku, quantity, lotNumber }
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const putawayTasks = pgTable('wms_putaway_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskNumber: varchar('task_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  receivingOrderId: uuid('receiving_order_id')
    .references(() => receivingOrders.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => wmsProducts.id),
  quantity: integer('quantity').notNull(),
  fromLocation: varchar('from_location', { length: 100 }), // staging area
  toLocationId: uuid('to_location_id')
    .references(() => locations.id),
  suggestedLocationId: uuid('suggested_location_id')
    .references(() => locations.id),
  palletId: uuid('pallet_id')
    .references(() => pallets.id),
  priority: varchar('priority', { length: 20 }).default('normal'),
  status: varchar('status', { length: 20 }).default('pending'),
  assignedTo: varchar('assigned_to', { length: 100 }),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const replenishmentTasks = pgTable('wms_replenishment_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskNumber: varchar('task_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => wmsProducts.id),
  fromLocationId: uuid('from_location_id')
    .notNull()
    .references(() => locations.id),
  toLocationId: uuid('to_location_id')
    .notNull()
    .references(() => locations.id),
  requestedQuantity: integer('requested_quantity').notNull(),
  transferredQuantity: integer('transferred_quantity').default(0),
  priority: varchar('priority', { length: 20 }).default('normal'),
  status: varchar('status', { length: 20 }).default('pending'),
  assignedTo: varchar('assigned_to', { length: 100 }),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Type exports
export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type WMSProduct = typeof wmsProducts.$inferSelect;
export type NewWMSProduct = typeof wmsProducts.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type ReceivingOrder = typeof receivingOrders.$inferSelect;
export type NewReceivingOrder = typeof receivingOrders.$inferInsert;
export type ReceivingItem = typeof receivingItems.$inferSelect;
export type PickingOrder = typeof pickingOrders.$inferSelect;
export type NewPickingOrder = typeof pickingOrders.$inferInsert;
export type PickingItem = typeof pickingItems.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;
export type CycleCount = typeof cycleCounts.$inferSelect;
export type Wave = typeof waves.$inferSelect;
export type Pallet = typeof pallets.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type PutawayTask = typeof putawayTasks.$inferSelect;
export type ReplenishmentTask = typeof replenishmentTasks.$inferSelect;

