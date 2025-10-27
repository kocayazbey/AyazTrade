import { pgTable, uuid, varchar, text, decimal, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';

export const carbonFootprint = pgTable(
  'carbon_footprint',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    productId: uuid('product_id'),
    orderId: uuid('order_id'),
    shipmentId: uuid('shipment_id'),
    type: varchar('type', { length: 50 }).notNull(), // 'product', 'order', 'shipment', 'operation'
    category: varchar('category', { length: 100 }).notNull(), // 'manufacturing', 'transportation', 'packaging', 'energy'
    co2Emissions: decimal('co2_emissions', { precision: 10, scale: 4 }).notNull(), // kg CO2
    unit: varchar('unit', { length: 20 }).default('kg'),
    source: varchar('source', { length: 100 }).notNull(), // 'calculation', 'database', 'api'
    methodology: varchar('methodology', { length: 100 }),
    factors: jsonb('factors').$type<Record<string, any>>().default({}),
    offsetCredits: decimal('offset_credits', { precision: 10, scale: 4 }).default('0'),
    isOffset: boolean('is_offset').default(false),
    offsetProvider: varchar('offset_provider', { length: 255 }),
    offsetProject: varchar('offset_project', { length: 255 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('carbon_footprint_tenant_idx').on(table.tenantId),
    productIdx: index('carbon_footprint_product_idx').on(table.productId),
    orderIdx: index('carbon_footprint_order_idx').on(table.orderId),
    typeIdx: index('carbon_footprint_type_idx').on(table.type),
    categoryIdx: index('carbon_footprint_category_idx').on(table.category),
    createdAtIdx: index('carbon_footprint_created_at_idx').on(table.createdAt),
  }),
);

export type CarbonFootprint = typeof carbonFootprint.$inferSelect;
export type NewCarbonFootprint = typeof carbonFootprint.$inferInsert;
