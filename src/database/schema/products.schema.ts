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
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sku: varchar('sku', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 500 }).notNull(),
    slug: varchar('slug', { length: 500 }).unique().notNull(),
    description: text('description'),
    shortDescription: text('short_description'),
    
    // Pricing
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: decimal('compare_at_price', { precision: 12, scale: 2 }),
    costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
    
    // B2B Pricing
    wholesalePrice: decimal('wholesale_price', { precision: 12, scale: 2 }),
    minOrderQuantity: integer('min_order_quantity').default(1),
    maxOrderQuantity: integer('max_order_quantity'),
    
    // Inventory
    stockQuantity: integer('stock_quantity').default(0),
    lowStockThreshold: integer('low_stock_threshold').default(10),
    trackInventory: boolean('track_inventory').default(true),
    allowBackorders: boolean('allow_backorders').default(false),
    
    // Categories & Classification
    categoryId: uuid('category_id'),
    brandId: uuid('brand_id'),
    vendorId: uuid('vendor_id'),
    
    // Physical Properties
    weight: decimal('weight', { precision: 10, scale: 3 }),
    weightUnit: varchar('weight_unit', { length: 10 }).default('kg'),
    length: decimal('length', { precision: 10, scale: 2 }),
    width: decimal('width', { precision: 10, scale: 2 }),
    height: decimal('height', { precision: 10, scale: 2 }),
    dimensionUnit: varchar('dimension_unit', { length: 10 }).default('cm'),
    
    // Media
    images: jsonb('images').$type<string[]>().default([]),
    videos: jsonb('videos').$type<string[]>().default([]),
    featuredImage: varchar('featured_image', { length: 500 }),
    
    // Status & Visibility
    status: varchar('status', { length: 20 }).default('draft'), // draft, active, inactive, archived
    visibility: varchar('visibility', { length: 20 }).default('visible'), // visible, hidden, catalog-only
    isDigital: boolean('is_digital').default(false),
    isFeatured: boolean('is_featured').default(false),
    
    // SEO
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    metaKeywords: text('meta_keywords'),
    
    // Variants & Options
    hasVariants: boolean('has_variants').default(false),
    options: jsonb('options').$type<any[]>().default([]),
    
    // Attributes
    attributes: jsonb('attributes').$type<Record<string, any>>().default({}),
    
    // Ratings & Reviews
    averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0'),
    reviewCount: integer('review_count').default(0),
    
    // Sales Data
    totalSold: integer('total_sold').default(0),
    viewCount: integer('view_count').default(0),
    
    // Dates
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    skuIdx: index('products_sku_idx').on(table.sku),
    slugIdx: index('products_slug_idx').on(table.slug),
    categoryIdx: index('products_category_idx').on(table.categoryId),
    brandIdx: index('products_brand_idx').on(table.brandId),
    vendorIdx: index('products_vendor_idx').on(table.vendorId),
    statusIdx: index('products_status_idx').on(table.status),
    priceIdx: index('products_price_idx').on(table.price),
    // Business constraints - removed for migration generation
  }),
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull(),
    sku: varchar('sku', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 500 }),
    
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: decimal('compare_at_price', { precision: 12, scale: 2 }),
    costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
    
    stockQuantity: integer('stock_quantity').default(0),
    
    options: jsonb('options').$type<Record<string, string>>().default({}),
    
    image: varchar('image', { length: 500 }),
    
    isDefault: boolean('is_default').default(false),
    isActive: boolean('is_active').default(true),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    variantsProductIdx: index('variants_product_idx').on(table.productId),
    skuIdx: index('variants_sku_idx').on(table.sku),
  }),
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    description: text('description'),
    
    parentId: uuid('parent_id'),
    
    image: varchar('image', { length: 500 }),
    icon: varchar('icon', { length: 100 }),
    
    position: integer('position').default(0),
    level: integer('level').default(0),
    path: text('path'),
    
    isActive: boolean('is_active').default(true),
    showInMenu: boolean('show_in_menu').default(true),
    
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index('categories_slug_idx').on(table.slug),
    parentIdx: index('categories_parent_idx').on(table.parentId),
  }),
);

export const brands = pgTable(
  'brands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    description: text('description'),
    
    logo: varchar('logo', { length: 500 }),
    website: varchar('website', { length: 500 }),
    
    isActive: boolean('is_active').default(true),
    isFeatured: boolean('is_featured').default(false),
    
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index('brands_slug_idx').on(table.slug),
  }),
);

export const productTags = pgTable(
  'product_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull(),
    tag: varchar('tag', { length: 100 }).notNull(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tagsProductIdx: index('product_tags_product_idx').on(table.productId),
    tagIdx: index('product_tags_tag_idx').on(table.tag),
  }),
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    alt: varchar('alt', { length: 255 }),
    position: integer('position').default(0),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    imagesProductIdx: index('product_images_product_idx').on(table.productId),
  }),
);

