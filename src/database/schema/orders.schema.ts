import {
  pgTable,
  uuid,
  varchar,
  decimal,
  integer,
  boolean,
  timestamp,
  jsonb,
  text,
  index,
  pgEnum,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const orderStatusEnum = pgEnum('order_status', [
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'credit_card', 'debit_card', 'bank_transfer', 'cash_on_delivery', 'digital_wallet'
]);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    orderNumber: varchar('order_number', { length: 50 }).unique().notNull(),

    // Status
    status: orderStatusEnum('status').default('pending').notNull(),
    paymentStatus: paymentStatusEnum('payment_status').default('pending').notNull(),

    // Pricing
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    tax: decimal('tax', { precision: 12, scale: 2 }).default('0'),
    shipping: decimal('shipping', { precision: 12, scale: 2 }).default('0'),
    discount: decimal('discount', { precision: 12, scale: 2 }).default('0'),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    
    // Payment
    paymentMethod: paymentMethodEnum('payment_method'),
    paymentId: varchar('payment_id', { length: 255 }),
    paymentReference: varchar('payment_reference', { length: 255 }),
    
    // Coupon
    couponCode: varchar('coupon_code', { length: 50 }),
    couponDiscount: decimal('coupon_discount', { precision: 12, scale: 2 }).default('0'),
    
    // Addresses
    shippingAddress: jsonb('shipping_address').$type<{
      firstName: string;
      lastName: string;
      company?: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
      phone?: string;
    }>().notNull(),
    
    billingAddress: jsonb('billing_address').$type<{
      firstName: string;
      lastName: string;
      company?: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
      phone?: string;
    }>(),
    
    // Shipping
    shippingMethod: varchar('shipping_method', { length: 100 }),
    trackingNumber: varchar('tracking_number', { length: 100 }),
    estimatedDelivery: timestamp('estimated_delivery'),
    
    // Notes
    notes: text('notes'),
    internalNotes: text('internal_notes'),
    
    // Dates
    orderDate: timestamp('order_date').defaultNow().notNull(),
    shippedAt: timestamp('shipped_at'),
    deliveredAt: timestamp('delivered_at'),
    cancelledAt: timestamp('cancelled_at'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('orders_user_idx').on(table.userId),
    orderNumberIdx: index('orders_order_number_idx').on(table.orderNumber),
    statusIdx: index('orders_status_idx').on(table.status),
    paymentStatusIdx: index('orders_payment_status_idx').on(table.paymentStatus),
    createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
    orderDateIdx: index('orders_order_date_idx').on(table.orderDate),
    statusPaymentIdx: index('orders_status_payment_idx').on(table.status, table.paymentStatus),
    userCreatedIdx: index('orders_user_created_idx').on(table.userId, table.createdAt),
    trackingIdx: index('orders_tracking_idx').on(table.trackingNumber),
    // Business constraints - removed for migration generation
  }),
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull(),
    productId: uuid('product_id').notNull(),
    variantId: uuid('variant_id'),
    
    quantity: integer('quantity').notNull(),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: decimal('compare_at_price', { precision: 12, scale: 2 }),
    
    // Product snapshot
    productName: varchar('product_name', { length: 500 }).notNull(),
    productSku: varchar('product_sku', { length: 100 }).notNull(),
    productImage: varchar('product_image', { length: 500 }),
    
    // Options & Attributes
    options: jsonb('options').$type<Record<string, any>>().default({}),
    attributes: jsonb('attributes').$type<Record<string, any>>().default({}),
    
    // Totals
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index('order_items_order_idx').on(table.orderId),
    productIdx: index('order_items_product_idx').on(table.productId),
    orderProductIdx: index('order_items_order_product_idx').on(table.orderId, table.productId),
  }),
);

export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull(),
    status: orderStatusEnum('status').notNull(),
    paymentStatus: paymentStatusEnum('payment_status'),
    
    notes: text('notes'),
    changedBy: uuid('changed_by'), // User ID who made the change
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index('order_status_history_order_idx').on(table.orderId),
  }),
);