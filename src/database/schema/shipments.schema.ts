import { pgTable, varchar, decimal, timestamp, jsonb, index, integer } from 'drizzle-orm/pg-core';

export const shipments = pgTable(
  'shipments',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    orderId: varchar('order_id', { length: 50 }).notNull(),
    carrier: varchar('carrier', { length: 100 }).notNull(),
    service: varchar('service', { length: 100 }).notNull(),
    trackingNumber: varchar('tracking_number', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    fromAddress: jsonb('from_address').notNull(),
    toAddress: jsonb('to_address').notNull(),
    packages: jsonb('packages').notNull(),
    shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).notNull(),
    weight: decimal('weight', { precision: 10, scale: 2 }),
    dimensions: jsonb('dimensions'),
    labelUrl: varchar('label_url', { length: 500 }),
    estimatedDelivery: timestamp('estimated_delivery'),
    actualDelivery: timestamp('actual_delivery'),
    signature: varchar('signature', { length: 500 }),
    deliveryInstructions: varchar('delivery_instructions', { length: 1000 }),
    cancellationReason: varchar('cancellation_reason', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    shippedAt: timestamp('shipped_at'),
    deliveredAt: timestamp('delivered_at'),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => ({
    orderIdIdx: index('shipments_order_id_idx').on(table.orderId),
    trackingNumberIdx: index('shipments_tracking_number_idx').on(table.trackingNumber),
    statusIdx: index('shipments_status_idx').on(table.status),
    createdAtIdx: index('shipments_created_at_idx').on(table.createdAt),
  }),
);

export const trackingEvents = pgTable(
  'tracking_events',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    shipmentId: varchar('shipment_id', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    location: varchar('location', { length: 200 }),
    description: varchar('description', { length: 500 }),
    metadata: jsonb('metadata'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    shipmentIdIdx: index('tracking_events_shipment_id_idx').on(table.shipmentId),
    timestampIdx: index('tracking_events_timestamp_idx').on(table.timestamp),
  }),
);

export const pickupSchedules = pgTable(
  'pickup_schedules',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    shipmentId: varchar('shipment_id', { length: 50 }).notNull(),
    scheduledDate: timestamp('scheduled_date').notNull(),
    scheduledTime: varchar('scheduled_time', { length: 20 }),
    status: varchar('status', { length: 50 }).notNull(),
    actualPickupTime: timestamp('actual_pickup_time'),
    notes: varchar('notes', { length: 1000 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    shipmentIdIdx: index('pickup_schedules_shipment_id_idx').on(table.shipmentId),
    statusIdx: index('pickup_schedules_status_idx').on(table.status),
  }),
);

export const shippingRates = pgTable(
  'shipping_rates',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    carrier: varchar('carrier', { length: 100 }).notNull(),
    service: varchar('service', { length: 100 }).notNull(),
    zoneFrom: varchar('zone_from', { length: 50 }),
    zoneTo: varchar('zone_to', { length: 50 }),
    weightMin: decimal('weight_min', { precision: 10, scale: 2 }),
    weightMax: decimal('weight_max', { precision: 10, scale: 2 }),
    baseRate: decimal('base_rate', { precision: 10, scale: 2 }).notNull(),
    perKgRate: decimal('per_kg_rate', { precision: 10, scale: 2 }),
    estimatedDays: integer('estimated_days'),
    isActive: varchar('is_active', { length: 10 }).default('true'),
    validFrom: timestamp('valid_from'),
    validUntil: timestamp('valid_until'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    carrierIdx: index('shipments_carrier_idx').on(table.carrier),
    zoneIdx: index('shipments_zone_idx').on(table.zoneFrom, table.zoneTo),
  }),
);

