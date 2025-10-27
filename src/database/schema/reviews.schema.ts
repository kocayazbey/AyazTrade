import { pgTable, uuid, varchar, text, decimal, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    productId: uuid('product_id').notNull(),
    customerId: uuid('customer_id').notNull(),
    orderId: uuid('order_id'),
    rating: integer('rating').notNull(), // 1-5 stars
    title: varchar('title', { length: 255 }),
    comment: text('comment'),
    isVerified: boolean('is_verified').default(false),
    isPublic: boolean('is_public').default(true),
    isHelpful: integer('is_helpful').default(0),
    isNotHelpful: integer('is_not_helpful').default(0),
    images: jsonb('images').$type<string[]>().default([]),
    tags: jsonb('tags').$type<string[]>().default([]),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'approved', 'rejected'
    moderatedBy: uuid('moderated_by'),
    moderatedAt: timestamp('moderated_at'),
    moderationNotes: text('moderation_notes'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    productIdx: index('reviews_product_idx').on(table.productId),
    customerIdx: index('reviews_customer_idx').on(table.customerId),
    tenantIdx: index('reviews_tenant_idx').on(table.tenantId),
    ratingIdx: index('reviews_rating_idx').on(table.rating),
    statusIdx: index('reviews_status_idx').on(table.status),
    createdAtIdx: index('reviews_created_at_idx').on(table.createdAt),
  }),
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;