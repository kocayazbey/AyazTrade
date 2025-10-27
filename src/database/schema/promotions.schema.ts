import { pgTable, varchar, decimal, integer, timestamp, jsonb, index, text } from 'drizzle-orm/pg-core';

export const promotions = pgTable(
  'promotions',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(),
    value: decimal('value', { precision: 10, scale: 2 }).notNull(),
    conditions: jsonb('conditions'),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    usageLimit: integer('usage_limit'),
    usageCount: integer('usage_count').default(0),
    applicableProducts: jsonb('applicable_products'),
    applicableCategories: jsonb('applicable_categories'),
    minimumPurchase: decimal('minimum_purchase', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('promotions_status_idx').on(table.status),
    startDateIdx: index('promotions_start_date_idx').on(table.startDate),
  }),
);

export const coupons = pgTable(
  'coupons',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    type: varchar('type', { length: 50 }).notNull(),
    value: decimal('value', { precision: 10, scale: 2 }).notNull(),
    minimumPurchase: decimal('minimum_purchase', { precision: 10, scale: 2 }),
    maximumDiscount: decimal('maximum_discount', { precision: 10, scale: 2 }),
    usageLimit: integer('usage_limit'),
    usageLimitPerCustomer: integer('usage_limit_per_customer'),
    usageCount: integer('usage_count').default(0),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    applicableProducts: jsonb('applicable_products'),
    applicableCategories: jsonb('applicable_categories'),
    excludedProducts: jsonb('excluded_products'),
    isActive: varchar('is_active', { length: 10 }).default('true'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index('coupons_code_idx').on(table.code),
    isActiveIdx: index('coupons_is_active_idx').on(table.isActive),
  }),
);

export const flashSales = pgTable(
  'flash_sales',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    products: jsonb('products').notNull(),
    discountPercentage: integer('discount_percentage').notNull(),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    maxQuantityPerCustomer: integer('max_quantity_per_customer'),
    totalQuantity: integer('total_quantity'),
    soldQuantity: integer('sold_quantity').default(0),
    isActive: varchar('is_active', { length: 10 }).default('false'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    isActiveIdx: index('flash_sales_is_active_idx').on(table.isActive),
    startTimeIdx: index('flash_sales_start_time_idx').on(table.startTime),
  }),
);

export const bundles = pgTable(
  'bundles',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    products: jsonb('products').notNull(),
    bundlePrice: decimal('bundle_price', { precision: 10, scale: 2 }),
    discountPercentage: integer('discount_percentage'),
    minimumQuantity: integer('minimum_quantity'),
    isActive: varchar('is_active', { length: 10 }).default('true'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    isActiveIdx: index('bundles_is_active_idx').on(table.isActive),
  }),
);

