import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  decimal,
  integer,
  index,
} from 'drizzle-orm/pg-core';

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    email: varchar('email', { length: 255 }).unique().notNull(),
    phone: varchar('phone', { length: 50 }),
    
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    
    password: varchar('password', { length: 255 }).notNull(),
    
    // Customer Type
    customerType: varchar('customer_type', { length: 20 }).default('retail'), // retail, wholesale, b2b
    
    // Company Info (for B2B)
    companyName: varchar('company_name', { length: 255 }),
    taxId: varchar('tax_id', { length: 50 }),
    taxOffice: varchar('tax_office', { length: 100 }),
    
    // Status
    status: varchar('status', { length: 20 }).default('active'), // active, inactive, blocked
    emailVerified: boolean('email_verified').default(false),
    phoneVerified: boolean('phone_verified').default(false),
    
    // Marketing
    acceptsMarketing: boolean('accepts_marketing').default(false),
    
    // Locale
    language: varchar('language', { length: 10 }).default('tr'),
    currency: varchar('currency', { length: 3 }).default('TRY'),
    timezone: varchar('timezone', { length: 50 }).default('Europe/Istanbul'),
    
    // Profile
    avatar: varchar('avatar', { length: 500 }),
    dateOfBirth: timestamp('date_of_birth'),
    gender: varchar('gender', { length: 20 }),
    
    // Stats
    totalOrders: integer('total_orders').default(0),
    totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).default('0'),
    averageOrderValue: decimal('average_order_value', { precision: 12, scale: 2 }).default('0'),
    
    // Last Activity
    lastOrderAt: timestamp('last_order_at'),
    lastLoginAt: timestamp('last_login_at'),
    
    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    tags: jsonb('tags').$type<string[]>().default([]),
    
    // Notes
    note: text('note'),
    
    // Social
    googleId: varchar('google_id', { length: 255 }),
    facebookId: varchar('facebook_id', { length: 255 }),
    
    // Dates
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: index('customers_email_idx').on(table.email),
    phoneIdx: index('customers_phone_idx').on(table.phone),
    customerTypeIdx: index('customers_type_idx').on(table.customerType),
    taxIdIdx: index('customers_tax_id_idx').on(table.taxId),
  }),
);

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    company: varchar('company', { length: 255 }),
    
    address1: varchar('address1', { length: 500 }).notNull(),
    address2: varchar('address2', { length: 500 }),
    city: varchar('city', { length: 100 }).notNull(),
    province: varchar('province', { length: 100 }).notNull(),
    country: varchar('country', { length: 100 }).notNull().default('Turkey'),
    zip: varchar('zip', { length: 20 }),
    
    phone: varchar('phone', { length: 50 }),
    
    isDefault: boolean('is_default').default(false),
    isBilling: boolean('is_billing').default(false),
    isShipping: boolean('is_shipping').default(true),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    addressesCustomerIdx: index('customer_addresses_customer_idx').on(table.customerId),
  }),
);

export const customerWishlists = pgTable(
  'customer_wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    productId: uuid('product_id').notNull(),
    variantId: uuid('variant_id'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wishlistsCustomerIdx: index('wishlists_customer_idx').on(table.customerId),
    wishlistsProductIdx: index('wishlists_product_idx').on(table.productId),
  }),
);

export const customerReviews = pgTable(
  'customer_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    productId: uuid('product_id').notNull(),
    orderId: uuid('order_id'),
    
    rating: integer('rating').notNull(), // 1-5
    title: varchar('title', { length: 255 }),
    comment: text('comment'),
    
    images: jsonb('images').$type<string[]>().default([]),
    
    isVerifiedPurchase: boolean('is_verified_purchase').default(false),
    isApproved: boolean('is_approved').default(false),
    
    helpfulCount: integer('helpful_count').default(0),
    unhelpfulCount: integer('unhelpful_count').default(0),
    
    response: text('response'),
    respondedAt: timestamp('responded_at'),
    respondedBy: uuid('responded_by'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    reviewsCustomerIdx: index('customer_reviews_customer_idx').on(table.customerId),
    reviewsProductIdx: index('customer_reviews_product_idx').on(table.productId),
    orderIdx: index('reviews_order_idx').on(table.orderId),
  }),
);

export const customerGroups = pgTable(
  'customer_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    
    discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).default('0'),
    
    isActive: boolean('is_active').default(true),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
);

export const customerGroupMembers = pgTable(
  'customer_group_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    groupId: uuid('group_id').notNull(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    membersCustomerIdx: index('group_members_customer_idx').on(table.customerId),
    membersGroupIdx: index('group_members_group_idx').on(table.groupId),
  }),
);

