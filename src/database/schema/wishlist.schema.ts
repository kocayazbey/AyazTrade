import { pgTable, varchar, timestamp, index, decimal, text } from 'drizzle-orm/pg-core';

export const wishlists = pgTable(
  'wishlists',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    customerId: varchar('customer_id', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    isDefault: varchar('is_default', { length: 10 }).default('false'),
    isPublic: varchar('is_public', { length: 10 }).default('false'),
    shareToken: varchar('share_token', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    customerIdIdx: index('wishlists_customer_id_idx').on(table.customerId),
  }),
);

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    wishlistId: varchar('wishlist_id', { length: 50 }).notNull(),
    productId: varchar('product_id', { length: 50 }).notNull(),
    variantId: varchar('variant_id', { length: 50 }),
    addedAt: timestamp('added_at').defaultNow().notNull(),
    notes: text('notes'),
  },
  (table) => ({
    wishlistIdIdx: index('wishlist_items_wishlist_id_idx').on(table.wishlistId),
    productIdIdx: index('wishlist_items_product_id_idx').on(table.productId),
  }),
);

export const priceAlerts = pgTable(
  'price_alerts',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    customerId: varchar('customer_id', { length: 50 }).notNull(),
    productId: varchar('product_id', { length: 50 }).notNull(),
    variantId: varchar('variant_id', { length: 50 }),
    targetPrice: decimal('target_price', { precision: 10, scale: 2 }).notNull(),
    currentPrice: decimal('current_price', { precision: 10, scale: 2 }),
    isActive: varchar('is_active', { length: 10 }).default('true'),
    notifiedAt: timestamp('notified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    customerIdIdx: index('price_alerts_customer_id_idx').on(table.customerId),
    productIdIdx: index('price_alerts_product_id_idx').on(table.productId),
    isActiveIdx: index('price_alerts_is_active_idx').on(table.isActive),
  }),
);

export const stockAlerts = pgTable(
  'stock_alerts',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    customerId: varchar('customer_id', { length: 50 }).notNull(),
    productId: varchar('product_id', { length: 50 }).notNull(),
    variantId: varchar('variant_id', { length: 50 }),
    isActive: varchar('is_active', { length: 10 }).default('true'),
    notifiedAt: timestamp('notified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    customerIdIdx: index('stock_alerts_customer_id_idx').on(table.customerId),
    productIdIdx: index('stock_alerts_product_id_idx').on(table.productId),
  }),
);

