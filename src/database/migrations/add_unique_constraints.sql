-- Add Unique Constraints to AyazTrade Database
-- Migration: Add missing unique constraints to database tables
-- Date: 2024-12-19

-- Products unique constraints
ALTER TABLE products ADD CONSTRAINT uk_products_sku UNIQUE (sku);
ALTER TABLE products ADD CONSTRAINT uk_products_slug UNIQUE (slug);

-- Product variants unique constraints
ALTER TABLE product_variants ADD CONSTRAINT uk_product_variants_sku UNIQUE (sku);

-- Categories unique constraints
ALTER TABLE categories ADD CONSTRAINT uk_categories_slug UNIQUE (slug);

-- Brands unique constraints
ALTER TABLE brands ADD CONSTRAINT uk_brands_slug UNIQUE (slug);

-- Customers unique constraints
ALTER TABLE customers ADD CONSTRAINT uk_customers_email UNIQUE (email);
ALTER TABLE customers ADD CONSTRAINT uk_customers_phone UNIQUE (phone);

-- Orders unique constraints
ALTER TABLE orders ADD CONSTRAINT uk_orders_order_number UNIQUE (order_number);

-- Coupons unique constraints
ALTER TABLE coupons ADD CONSTRAINT uk_coupons_code UNIQUE (code);

-- Payments unique constraints
ALTER TABLE payments ADD CONSTRAINT uk_payments_transaction_id UNIQUE (transaction_id);

-- Shipments unique constraints
ALTER TABLE shipments ADD CONSTRAINT uk_shipments_tracking_number UNIQUE (tracking_number);

-- CRM customers unique constraints
ALTER TABLE crm_customers ADD CONSTRAINT uk_crm_customers_customer_number UNIQUE (customer_number);
ALTER TABLE crm_customers ADD CONSTRAINT uk_crm_customers_email UNIQUE (email);

-- ERP employees unique constraints
ALTER TABLE erp_employees ADD CONSTRAINT uk_erp_employees_employee_number UNIQUE (employee_number);
ALTER TABLE erp_employees ADD CONSTRAINT uk_erp_employees_email UNIQUE (email);

-- API keys unique constraints
ALTER TABLE api_keys ADD CONSTRAINT uk_api_keys_key UNIQUE (key);

-- User sessions unique constraints
ALTER TABLE user_sessions ADD CONSTRAINT uk_user_sessions_session_id UNIQUE (session_id);

-- Composite unique constraints
ALTER TABLE customer_addresses ADD CONSTRAINT uk_customer_addresses_default 
UNIQUE (customer_id, is_default) WHERE is_default = true;

ALTER TABLE product_reviews ADD CONSTRAINT uk_product_reviews_customer_product 
UNIQUE (customer_id, product_id);

ALTER TABLE wishlist_items ADD CONSTRAINT uk_wishlist_items_customer_product 
UNIQUE (customer_id, product_id);

ALTER TABLE coupon_usage ADD CONSTRAINT uk_coupon_usage_customer_coupon 
UNIQUE (customer_id, coupon_id);

ALTER TABLE inventory_items ADD CONSTRAINT uk_inventory_items_product_variant_location 
UNIQUE (product_id, variant_id, location_id);

ALTER TABLE warehouse_locations ADD CONSTRAINT uk_warehouse_locations_warehouse_zone_aisle_rack_shelf_position 
UNIQUE (warehouse_id, zone, aisle, rack, shelf, position);

ALTER TABLE crm_leads ADD CONSTRAINT uk_crm_leads_email_phone 
UNIQUE (email, phone);

ALTER TABLE crm_quotes ADD CONSTRAINT uk_crm_quotes_quote_number 
UNIQUE (quote_number);

ALTER TABLE erp_payrolls ADD CONSTRAINT uk_erp_payrolls_employee_pay_period 
UNIQUE (employee_id, pay_period_start, pay_period_end);

ALTER TABLE webhook_endpoints ADD CONSTRAINT uk_webhook_endpoints_tenant_url 
UNIQUE (tenant_id, url);

ALTER TABLE rate_limit_entries ADD CONSTRAINT uk_rate_limit_entries_key_window 
UNIQUE (key, window_start);

ALTER TABLE user_permissions ADD CONSTRAINT uk_user_permissions_user_permission_resource 
UNIQUE (user_id, permission, resource);

ALTER TABLE user_roles ADD CONSTRAINT uk_user_roles_user_role 
UNIQUE (user_id, role);
