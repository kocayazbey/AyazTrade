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

export const trades = pgTable(
  'trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tradeNumber: varchar('trade_number', { length: 50 }).unique().notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'buy', 'sell', 'exchange'
    status: varchar('status', { length: 50 }).notNull(), // 'pending', 'completed', 'cancelled'
    productId: uuid('product_id').notNull(),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
    totalValue: decimal('total_value', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    counterparty: varchar('counterparty', { length: 100 }),
    counterpartyType: varchar('counterparty_type', { length: 50 }), // 'individual', 'company', 'broker'
    tradeDate: timestamp('trade_date').notNull(),
    settlementDate: timestamp('settlement_date'),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    tenantId: uuid('tenant_id').notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('trades_type_idx').on(table.type),
    statusIdx: index('trades_status_idx').on(table.status),
    productIdx: index('trades_product_idx').on(table.productId),
    tradeDateIdx: index('trades_trade_date_idx').on(table.tradeDate),
    tenantIdx: index('trades_tenant_idx').on(table.tenantId),
  }),
);

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
