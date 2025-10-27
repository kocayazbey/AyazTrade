import { pgTable, uuid, varchar, text, decimal, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';

export const shippingRates = pgTable(
  'shipping_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    carrier: varchar('carrier', { length: 100 }).notNull(), // 'arac', 'yurtici', 'mng', 'ptt'
    service: varchar('service', { length: 100 }).notNull(), // 'standard', 'express', 'overnight'
    cost: decimal('cost', { precision: 12, scale: 2 }).notNull(),
    freeShippingThreshold: decimal('free_shipping_threshold', { precision: 12, scale: 2 }),
    transitDays: integer('transit_days').notNull(),
    estimatedDays: integer('estimated_days'),
    weightLimit: decimal('weight_limit', { precision: 10, scale: 3 }), // kg
    dimensionLimit: jsonb('dimension_limit').$type<{
      length: number;
      width: number;
      height: number;
    }>(),
    conditions: jsonb('conditions').$type<Record<string, any>>().default({}),
    zones: jsonb('zones').$type<string[]>().default([]), // delivery zones
    isActive: boolean('is_active').default(true),
    isDefault: boolean('is_default').default(false),
    sortOrder: integer('sort_order').default(0),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('shipping_rates_tenant_idx').on(table.tenantId),
    carrierIdx: index('shipping_rates_carrier_idx').on(table.carrier),
    isActiveIdx: index('shipping_rates_is_active_idx').on(table.isActive),
    sortOrderIdx: index('shipping_rates_sort_order_idx').on(table.sortOrder),
  }),
);

export type ShippingRate = typeof shippingRates.$inferSelect;
export type NewShippingRate = typeof shippingRates.$inferInsert;