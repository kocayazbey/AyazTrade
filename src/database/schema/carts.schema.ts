import {
  pgTable,
  uuid,
  varchar,
  decimal,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema';

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    sessionId: varchar('session_id', { length: 255 }),
    
    // Coupon & Discount
    couponCode: varchar('coupon_code', { length: 50 }),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
    discountType: varchar('discount_type', { length: 20 }), // percentage, fixed
    
    // Totals
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).default('0'),
    tax: decimal('tax', { precision: 12, scale: 2 }).default('0'),
    shipping: decimal('shipping', { precision: 12, scale: 2 }).default('0'),
    total: decimal('total', { precision: 12, scale: 2 }).default('0'),
    
    // Status
    isActive: boolean('is_active').default(true),
    isAbandoned: boolean('is_abandoned').default(false),
    
    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    
    // Dates
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => ({
    userIdIdx: index('carts_user_id_idx').on(table.userId),
    sessionIdx: index('carts_session_idx').on(table.sessionId),
  }),
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id').notNull(),
    productId: uuid('product_id').notNull(),
    variantId: uuid('variant_id'),
    
    quantity: integer('quantity').notNull().default(1),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: decimal('compare_at_price', { precision: 12, scale: 2 }),
    
    // Options & Attributes
    options: jsonb('options').$type<Record<string, any>>().default({}),
    attributes: jsonb('attributes').$type<Record<string, any>>().default({}),
    
    // Status
    isActive: boolean('is_active').default(true),
    
    // Dates
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    cartIdx: index('cart_items_cart_idx').on(table.cartId),
    productIdx: index('cart_items_product_idx').on(table.productId),
  }),
);

// Drizzle inferred types
export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;