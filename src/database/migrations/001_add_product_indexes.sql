-- Add indexes for product filtering and sorting performance
-- These indexes will improve query performance for common product operations

-- Index for product status filtering
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Index for brand filtering
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- Index for price range filtering
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Index for created_at sorting (most common sort order)
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Index for updated_at sorting
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at DESC);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_products_status_category ON products(status, category_id);

-- Composite index for status and price range queries
CREATE INDEX IF NOT EXISTS idx_products_status_price ON products(status, price);

-- Index for SKU lookups (unique constraint should already exist)
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Index for name searches (partial text matching)
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Index for stock quantity filtering
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);

-- Index for featured products
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);

-- Index for product visibility
CREATE INDEX IF NOT EXISTS idx_products_is_visible ON products(is_visible);

-- Composite index for visible, active products with stock
CREATE INDEX IF NOT EXISTS idx_products_visible_active_stock ON products(is_visible, status, stock_quantity) WHERE status = 'active' AND is_visible = true AND stock_quantity > 0;
