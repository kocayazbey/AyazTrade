import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, date, index } from 'drizzle-orm/pg-core';
import { warehouses, locations, wmsProducts, pallets } from './wms.schema';

/**
 * WMS Advanced Schema for AyazTrade
 * Advanced WMS features: AGV, RFID, Voice Picking, Kitting, etc.
 */

export const zones = pgTable('wms_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  zoneType: varchar('zone_type', { length: 20 }).notNull(), // 'receiving', 'storage', 'picking', 'packing', 'shipping', 'production', 'quarantine'
  priority: integer('priority').default(50),
  velocityClass: varchar('velocity_class', { length: 1 }), // 'A', 'B', 'C' for ABC analysis
  accessType: varchar('access_type', { length: 20 }), // 'open', 'restricted', 'secure'
  maxHeight: decimal('max_height', { precision: 5, scale: 2 }),
  aisleWidth: decimal('aisle_width', { precision: 5, scale: 2 }),
  pickingStrategy: varchar('picking_strategy', { length: 20 }), // 'FIFO', 'FEFO', 'LIFO'
  replenishmentType: varchar('replenishment_type', { length: 20 }), // 'manual', 'auto', 'scheduled'
  allowedEquipment: jsonb('allowed_equipment'), // ['forklift', 'reach_truck', 'agv']
  restrictions: jsonb('restrictions'),
  metadata: jsonb('metadata'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  codeIdx: index('zones_code_idx').on(table.code),
  warehouseIdx: index('zones_warehouse_idx').on(table.warehouseId),
}));

export const pickingCarts = pgTable('wms_picking_carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartNumber: varchar('cart_number', { length: 20 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  cartType: varchar('cart_type', { length: 20 }), // 'standard', 'multi_order', 'batch'
  capacity: integer('capacity'),
  currentLoad: integer('current_load').default(0),
  status: varchar('status', { length: 20 }).default('available'), // 'available', 'in_use', 'maintenance'
  assignedPicker: varchar('assigned_picker', { length: 100 }),
  currentLocation: varchar('current_location', { length: 50 }),
  orders: jsonb('orders'),
  items: jsonb('items'),
  metadata: jsonb('metadata'),
  lastUpdate: timestamp('last_update').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const forkliftTasks = pgTable('wms_forklift_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskNumber: varchar('task_number', { length: 30 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  taskType: varchar('task_type', { length: 20 }).notNull(), // 'putaway', 'replenishment', 'transfer', 'loading'
  forkliftType: varchar('forklift_type', { length: 10 }).notNull(), // 'RT' (Reach Truck), 'TT' (Turret Truck), 'ST' (Stacker)
  fromLocation: varchar('from_location', { length: 50 }),
  toLocation: varchar('to_location', { length: 50 }),
  palletId: uuid('pallet_id')
    .references(() => pallets.id),
  productInfo: jsonb('product_info'),
  priority: varchar('priority', { length: 10 }).default('normal'),
  status: varchar('status', { length: 20 }).default('pending'),
  assignedTo: varchar('assigned_to', { length: 100 }),
  estimatedDuration: integer('estimated_duration'), // minutes
  actualDuration: integer('actual_duration'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  statusIdx: index('forklift_tasks_status_idx').on(table.status),
}));

export const agvFleet = pgTable('wms_agv_fleet', {
  id: uuid('id').primaryKey().defaultRandom(),
  agvId: varchar('agv_id', { length: 20 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  model: varchar('model', { length: 100 }),
  capacity: decimal('capacity', { precision: 12, scale: 2 }),
  batteryLevel: integer('battery_level').default(100),
  status: varchar('status', { length: 20 }).default('idle'), // 'idle', 'assigned', 'in_transit', 'charging', 'error', 'maintenance'
  currentLocation: varchar('current_location', { length: 100 }),
  currentTask: jsonb('current_task'),
  lastMaintenance: timestamp('last_maintenance'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const agvTasks = pgTable('wms_agv_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskNumber: varchar('task_number', { length: 50 }).notNull().unique(),
  agvId: varchar('agv_id', { length: 20 })
    .notNull(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  taskType: varchar('task_type', { length: 20 }).notNull(), // 'transport', 'putaway', 'retrieval'
  fromLocation: varchar('from_location', { length: 100 }),
  toLocation: varchar('to_location', { length: 100 }),
  palletId: uuid('pallet_id')
    .references(() => pallets.id),
  priority: integer('priority').default(50),
  status: varchar('status', { length: 20 }).default('queued'),
  assignedAt: timestamp('assigned_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const rfidTags = pgTable('wms_rfid_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  epc: varchar('epc', { length: 100 }).notNull().unique(), // Electronic Product Code
  tagType: varchar('tag_type', { length: 20 }), // 'pallet', 'carton', 'item', 'location'
  entityType: varchar('entity_type', { length: 20 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id),
  status: varchar('status', { length: 20 }).default('active'),
  lastRead: timestamp('last_read'),
  lastLocation: varchar('last_location', { length: 100 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  epcIdx: index('rfid_tags_epc_idx').on(table.epc),
}));

export const voicePickingTasks = pgTable('wms_voice_picking_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskNumber: varchar('task_number', { length: 50 }).notNull().unique(),
  pickingOrderId: uuid('picking_order_id').notNull(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  pickerId: varchar('picker_id', { length: 100 }).notNull(),
  currentStep: integer('current_step').default(1),
  totalSteps: integer('total_steps'),
  voiceCommands: jsonb('voice_commands'),
  recognitionAccuracy: decimal('recognition_accuracy', { precision: 5, scale: 2 }),
  status: varchar('status', { length: 20 }).default('in_progress'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const kittingOrders = pgTable('wms_kitting_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  kitNumber: varchar('kit_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  kitProductId: uuid('kit_product_id')
    .notNull()
    .references(() => wmsProducts.id),
  quantity: integer('quantity').notNull(),
  components: jsonb('components'), // Array of { productId, sku, quantityPer Kit }
  status: varchar('status', { length: 20 }).default('planned'),
  assignedTo: varchar('assigned_to', { length: 100 }),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const qualityChecks = pgTable('wms_quality_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  checkNumber: varchar('check_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  checkType: varchar('check_type', { length: 50 }), // 'receiving', 'pre_shipment', 'periodic', 'complaint'
  entityType: varchar('entity_type', { length: 20 }), // 'receiving_order', 'shipment', 'pallet', 'location'
  entityId: uuid('entity_id'),
  productId: uuid('product_id')
    .references(() => wmsProducts.id),
  sampleSize: integer('sample_size'),
  passedCount: integer('passed_count'),
  failedCount: integer('failed_count'),
  passRate: decimal('pass_rate', { precision: 5, scale: 2 }),
  result: varchar('result', { length: 20 }), // 'passed', 'failed', 'conditional'
  defectTypes: jsonb('defect_types'),
  inspector: varchar('inspector', { length: 100 }),
  notes: text('notes'),
  photos: jsonb('photos'),
  performedAt: timestamp('performed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const barcodeStructures = pgTable('wms_barcode_structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  barcodeType: varchar('barcode_type', { length: 20 }), // 'EAN13', 'CODE128', 'QR', 'custom'
  pattern: varchar('pattern', { length: 200 }),
  segments: jsonb('segments'), // { prefix: { start: 0, length: 3 }, productCode: { start: 3, length: 8 }, etc }
  validationRules: jsonb('validation_rules'),
  active: boolean('active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const labelTemplates = pgTable('wms_label_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  labelType: varchar('label_type', { length: 20 }), // 'pallet', 'carton', 'location', 'product', 'shipping'
  format: varchar('format', { length: 10 }), // 'ZPL', 'EPL', 'PDF'
  templateContent: text('template_content'),
  width: integer('width'), // mm
  height: integer('height'), // mm
  dpi: integer('dpi').default(203),
  printerType: varchar('printer_type', { length: 50 }),
  active: boolean('active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const workOrders = pgTable('wms_work_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  workOrderNumber: varchar('work_order_number', { length: 30 }).notNull().unique(),
  productId: uuid('product_id')
    .notNull()
    .references(() => wmsProducts.id),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id),
  plannedQuantity: integer('planned_quantity').notNull(),
  producedQuantity: integer('produced_quantity').default(0),
  status: varchar('status', { length: 20 }).default('planned'), // 'planned', 'in_progress', 'completed', 'cancelled'
  productionLine: varchar('production_line', { length: 50 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  completedAt: timestamp('completed_at'),
  pallets: jsonb('pallets'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const productionHandovers = pgTable('wms_production_handovers', {
  id: uuid('id').primaryKey().defaultRandom(),
  handoverNumber: varchar('handover_number', { length: 30 }).notNull().unique(),
  workOrderId: uuid('work_order_id')
    .notNull()
    .references(() => workOrders.id),
  palletId: uuid('pallet_id')
    .references(() => pallets.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => wmsProducts.id),
  quantity: integer('quantity').notNull(),
  productionDate: timestamp('production_date').notNull(),
  expiryDate: timestamp('expiry_date'),
  lotNumber: varchar('lot_number', { length: 50 }),
  batchNumber: varchar('batch_number', { length: 50 }),
  qualityChecked: boolean('quality_checked').default(false),
  handoverStatus: varchar('handover_status', { length: 20 }).default('pending'), // 'pending', 'approved', 'rejected'
  receivingLocation: varchar('receiving_location', { length: 50 }),
  approvedBy: varchar('approved_by', { length: 100 }),
  approvedAt: timestamp('approved_at'),
  rejectedReason: text('rejected_reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const workflowParameters = pgTable('wms_workflow_parameters', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  category: varchar('category', { length: 30 }), // 'capacity', 'fifo_fefo', 'lot_mixing', 'auto_allocation', 'quality', 'replenishment'
  dataType: varchar('data_type', { length: 20 }).notNull(), // 'STRING', 'NUMBER', 'BOOLEAN', 'ENUM', 'JSON'
  defaultValue: jsonb('default_value'),
  currentValue: jsonb('current_value'),
  possibleValues: jsonb('possible_values'),
  description: text('description'),
  unit: varchar('unit', { length: 20 }),
  minValue: decimal('min_value', { precision: 15, scale: 2 }),
  maxValue: decimal('max_value', { precision: 15, scale: 2 }),
  affectedOperations: jsonb('affected_operations'),
  validationRules: jsonb('validation_rules'),
  requiresApproval: boolean('requires_approval').default(false),
  active: boolean('active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const docks = pgTable('wms_docks', {
  id: uuid('id').primaryKey().defaultRandom(),
  dockNumber: varchar('dock_number', { length: 10 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  dockType: varchar('dock_type', { length: 20 }), // 'receiving', 'shipping', 'cross_dock'
  vehicleTypes: jsonb('vehicle_types'), // ['truck', 'van', 'container']
  maxVehicleSize: jsonb('max_vehicle_size'),
  features: jsonb('features'), // ['dock_leveler', 'dock_seal', 'overhead_door']
  operatingHours: jsonb('operating_hours'),
  status: varchar('status', { length: 20 }).default('available'), // 'available', 'occupied', 'maintenance'
  currentVehicle: varchar('current_vehicle', { length: 50 }),
  currentOperation: varchar('current_operation', { length: 20 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const dockAppointments = pgTable('wms_dock_appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentNumber: varchar('appointment_number', { length: 30 }).notNull().unique(),
  dockId: uuid('dock_id')
    .notNull()
    .references(() => docks.id),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  vehiclePlate: varchar('vehicle_plate', { length: 20 }),
  carrier: varchar('carrier', { length: 100 }),
  purpose: varchar('purpose', { length: 20 }), // 'receiving', 'shipping', 'transfer'
  scheduledTime: timestamp('scheduled_time').notNull(),
  estimatedDuration: integer('estimated_duration'), // minutes
  status: varchar('status', { length: 20 }).default('scheduled'),
  actualArrival: timestamp('actual_arrival'),
  actualDeparture: timestamp('actual_departure'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const yardVehicles = pgTable('wms_yard_vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  plate: varchar('plate', { length: 20 }).notNull(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  vehicleType: varchar('vehicle_type', { length: 20 }), // 'truck', 'trailer', 'van'
  carrier: varchar('carrier', { length: 100 }),
  driverName: varchar('driver_name', { length: 100 }),
  driverPhone: varchar('driver_phone', { length: 20 }),
  purpose: varchar('purpose', { length: 20 }), // 'delivery', 'pickup', 'transfer'
  status: varchar('status', { length: 20 }).default('waiting'), // 'waiting', 'at_dock', 'loading', 'unloading', 'departed'
  arrivalTime: timestamp('arrival_time').defaultNow(),
  departureTime: timestamp('departure_time'),
  appointmentNumber: varchar('appointment_number', { length: 30 }),
  assignedDock: varchar('assigned_dock', { length: 10 }),
  yardLocation: varchar('yard_location', { length: 20 }),
  metadata: jsonb('metadata'),
});

export const cartons = pgTable('wms_cartons', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartonNumber: varchar('carton_number', { length: 30 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  orderNumber: varchar('order_number', { length: 50 }),
  cartonType: varchar('carton_type', { length: 20 }), // 'small', 'medium', 'large', 'custom'
  status: varchar('status', { length: 20 }).default('open'), // 'open', 'sealed', 'shipped', 'delivered'
  items: jsonb('items'), // Array of { productId, sku, quantity, lotNumber }
  weight: decimal('weight', { precision: 10, scale: 3 }),
  dimensions: jsonb('dimensions'), // { length, width, height }
  trackingNumber: varchar('tracking_number', { length: 50 }),
  carrier: varchar('carrier', { length: 100 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  sealedAt: timestamp('sealed_at'),
  shippedAt: timestamp('shipped_at'),
}, (table) => ({
  statusIdx: index('cartons_status_idx').on(table.status),
  orderIdx: index('cartons_order_idx').on(table.orderNumber),
}));

export const slottingRules = pgTable('wms_slotting_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleNumber: varchar('rule_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  ruleName: varchar('rule_name', { length: 100 }).notNull(),
  priority: integer('priority').default(50),
  criteria: jsonb('criteria'), // { velocityClass: 'A', category: 'Electronics', etc }
  targetZones: jsonb('target_zones'),
  allocation: jsonb('allocation'), // Strategy for location allocation
  active: boolean('active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const crossDockOrders = pgTable('wms_cross_dock_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  crossDockNumber: varchar('cross_dock_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  inboundShipment: varchar('inbound_shipment', { length: 50 }),
  outboundShipment: varchar('outbound_shipment', { length: 50 }),
  productId: uuid('product_id')
    .references(() => wmsProducts.id),
  quantity: integer('quantity'),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'matched', 'in_progress', 'completed'
  stagingLocation: varchar('staging_location', { length: 50 }),
  matchedAt: timestamp('matched_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const returnOrders = pgTable('wms_return_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  returnNumber: varchar('return_number', { length: 50 }).notNull().unique(),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  returnType: varchar('return_type', { length: 50 }), // 'customer', 'damaged', 'expired', 'recall'
  originalOrderNumber: varchar('original_order_number', { length: 50 }),
  reason: varchar('reason', { length: 100 }),
  status: varchar('status', { length: 20 }).default('pending'),
  inspectionRequired: boolean('inspection_required').default(true),
  inspectedAt: timestamp('inspected_at'),
  inspectedBy: varchar('inspected_by', { length: 100 }),
  disposition: varchar('disposition', { length: 50 }), // 'restock', 'scrap', 'return_to_supplier', 'repair'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const returnItems = pgTable('wms_return_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  returnOrderId: uuid('return_order_id')
    .notNull()
    .references(() => returnOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => wmsProducts.id),
  quantity: integer('quantity').notNull(),
  condition: varchar('condition', { length: 20 }), // 'sellable', 'damaged', 'defective', 'expired'
  restockable: boolean('restockable').default(false),
  lotNumber: varchar('lot_number', { length: 100 }),
  notes: text('notes'),
  photos: jsonb('photos'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Type exports
export type Zone = typeof zones.$inferSelect;
export type PickingCart = typeof pickingCarts.$inferSelect;
export type ForkliftTask = typeof forkliftTasks.$inferSelect;
export type AGVFleet = typeof agvFleet.$inferSelect;
export type AGVTask = typeof agvTasks.$inferSelect;
export type RFIDTag = typeof rfidTags.$inferSelect;
export type VoicePickingTask = typeof voicePickingTasks.$inferSelect;
export type KittingOrder = typeof kittingOrders.$inferSelect;
export type QualityCheck = typeof qualityChecks.$inferSelect;
export type BarcodeStructure = typeof barcodeStructures.$inferSelect;
export type LabelTemplate = typeof labelTemplates.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;
export type ProductionHandover = typeof productionHandovers.$inferSelect;
export type WorkflowParameter = typeof workflowParameters.$inferSelect;
export type SlottingRule = typeof slottingRules.$inferSelect;
export type CrossDockOrder = typeof crossDockOrders.$inferSelect;
export type ReturnOrder = typeof returnOrders.$inferSelect;
export type ReturnItem = typeof returnItems.$inferSelect;

