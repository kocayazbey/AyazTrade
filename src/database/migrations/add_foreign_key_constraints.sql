-- Add Foreign Key Constraints to AyazTrade Database
-- Migration: Add missing foreign key constraints
-- Date: 2024-12-19

-- Products table constraints
ALTER TABLE products 
ADD CONSTRAINT fk_products_category 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE products 
ADD CONSTRAINT fk_products_brand 
FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;

ALTER TABLE products 
ADD CONSTRAINT fk_products_vendor 
FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

-- Product variants constraints
ALTER TABLE product_variants 
ADD CONSTRAINT fk_product_variants_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Orders table constraints
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

ALTER TABLE orders 
ADD CONSTRAINT fk_orders_shipping_address 
FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE SET NULL;

ALTER TABLE orders 
ADD CONSTRAINT fk_orders_billing_address 
FOREIGN KEY (billing_address_id) REFERENCES addresses(id) ON DELETE SET NULL;

-- Order items constraints
ALTER TABLE order_items 
ADD CONSTRAINT fk_order_items_order 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE order_items 
ADD CONSTRAINT fk_order_items_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE order_items 
ADD CONSTRAINT fk_order_items_variant 
FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

-- Cart constraints
ALTER TABLE cart_items 
ADD CONSTRAINT fk_cart_items_cart 
FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE;

ALTER TABLE cart_items 
ADD CONSTRAINT fk_cart_items_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE cart_items 
ADD CONSTRAINT fk_cart_items_variant 
FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

-- Customer addresses constraints
ALTER TABLE customer_addresses 
ADD CONSTRAINT fk_customer_addresses_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Reviews constraints
ALTER TABLE product_reviews 
ADD CONSTRAINT fk_product_reviews_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE product_reviews 
ADD CONSTRAINT fk_product_reviews_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Wishlist constraints
ALTER TABLE wishlist_items 
ADD CONSTRAINT fk_wishlist_items_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE wishlist_items 
ADD CONSTRAINT fk_wishlist_items_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Coupons constraints
ALTER TABLE coupon_usage 
ADD CONSTRAINT fk_coupon_usage_coupon 
FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE;

ALTER TABLE coupon_usage 
ADD CONSTRAINT fk_coupon_usage_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE coupon_usage 
ADD CONSTRAINT fk_coupon_usage_order 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Payments constraints
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_order 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

ALTER TABLE payments 
ADD CONSTRAINT fk_payments_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

-- Refunds constraints
ALTER TABLE refunds 
ADD CONSTRAINT fk_refunds_payment 
FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT;

ALTER TABLE refunds 
ADD CONSTRAINT fk_refunds_order 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

-- Shipping constraints
ALTER TABLE shipments 
ADD CONSTRAINT fk_shipments_order 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

-- Inventory constraints
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_variant 
FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_order 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- WMS constraints
ALTER TABLE warehouse_locations 
ADD CONSTRAINT fk_warehouse_locations_warehouse 
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;

ALTER TABLE inventory_items 
ADD CONSTRAINT fk_inventory_items_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE inventory_items 
ADD CONSTRAINT fk_inventory_items_variant 
FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;

ALTER TABLE inventory_items 
ADD CONSTRAINT fk_inventory_items_location 
FOREIGN KEY (location_id) REFERENCES warehouse_locations(id) ON DELETE SET NULL;

-- CRM constraints
ALTER TABLE crm_customers 
ADD CONSTRAINT fk_crm_customers_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE crm_customers 
ADD CONSTRAINT fk_crm_customers_sales_rep 
FOREIGN KEY (sales_rep_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE crm_leads 
ADD CONSTRAINT fk_crm_leads_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE crm_leads 
ADD CONSTRAINT fk_crm_leads_assigned_to 
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE crm_quotes 
ADD CONSTRAINT fk_crm_quotes_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE crm_quotes 
ADD CONSTRAINT fk_crm_quotes_customer 
FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE;

ALTER TABLE crm_quotes 
ADD CONSTRAINT fk_crm_quotes_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ERP constraints
ALTER TABLE erp_employees 
ADD CONSTRAINT fk_erp_employees_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE erp_payrolls 
ADD CONSTRAINT fk_erp_payrolls_employee 
FOREIGN KEY (employee_id) REFERENCES erp_employees(id) ON DELETE CASCADE;

ALTER TABLE erp_payrolls 
ADD CONSTRAINT fk_erp_payrolls_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Analytics constraints
ALTER TABLE analytics_events 
ADD CONSTRAINT fk_analytics_events_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE analytics_events 
ADD CONSTRAINT fk_analytics_events_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Notifications constraints
ALTER TABLE notifications 
ADD CONSTRAINT fk_notifications_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notifications 
ADD CONSTRAINT fk_notifications_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Audit constraints
ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- File attachments constraints
ALTER TABLE file_attachments 
ADD CONSTRAINT fk_file_attachments_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE file_attachments 
ADD CONSTRAINT fk_file_attachments_uploaded_by 
FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- Comments constraints
ALTER TABLE comments 
ADD CONSTRAINT fk_comments_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE comments 
ADD CONSTRAINT fk_comments_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Tags constraints
ALTER TABLE entity_tags 
ADD CONSTRAINT fk_entity_tags_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Webhooks constraints
ALTER TABLE webhook_endpoints 
ADD CONSTRAINT fk_webhook_endpoints_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE webhook_deliveries 
ADD CONSTRAINT fk_webhook_deliveries_endpoint 
FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints(id) ON DELETE CASCADE;

-- API keys constraints
ALTER TABLE api_keys 
ADD CONSTRAINT fk_api_keys_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE api_keys 
ADD CONSTRAINT fk_api_keys_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Rate limiting constraints
ALTER TABLE rate_limit_entries 
ADD CONSTRAINT fk_rate_limit_entries_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Session constraints
ALTER TABLE user_sessions 
ADD CONSTRAINT fk_user_sessions_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Permission constraints
ALTER TABLE user_permissions 
ADD CONSTRAINT fk_user_permissions_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_permissions 
ADD CONSTRAINT fk_user_permissions_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Role constraints
ALTER TABLE user_roles 
ADD CONSTRAINT fk_user_roles_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT fk_user_roles_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Add indexes for foreign keys to improve performance
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_vendor_id ON products(vendor_id);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_shipping_address_id ON orders(shipping_address_id);
CREATE INDEX idx_orders_billing_address_id ON orders(billing_address_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_cart_items_variant_id ON cart_items(variant_id);
CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_customer_id ON product_reviews(customer_id);
CREATE INDEX idx_wishlist_items_customer_id ON wishlist_items(customer_id);
CREATE INDEX idx_wishlist_items_product_id ON wishlist_items(product_id);
CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_customer_id ON coupon_usage(customer_id);
CREATE INDEX idx_coupon_usage_order_id ON coupon_usage(order_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_variant_id ON inventory_transactions(variant_id);
CREATE INDEX idx_inventory_transactions_order_id ON inventory_transactions(order_id);
CREATE INDEX idx_warehouse_locations_warehouse_id ON warehouse_locations(warehouse_id);
CREATE INDEX idx_inventory_items_product_id ON inventory_items(product_id);
CREATE INDEX idx_inventory_items_variant_id ON inventory_items(variant_id);
CREATE INDEX idx_inventory_items_location_id ON inventory_items(location_id);
CREATE INDEX idx_crm_customers_tenant_id ON crm_customers(tenant_id);
CREATE INDEX idx_crm_customers_sales_rep_id ON crm_customers(sales_rep_id);
CREATE INDEX idx_crm_leads_tenant_id ON crm_leads(tenant_id);
CREATE INDEX idx_crm_leads_assigned_to ON crm_leads(assigned_to);
CREATE INDEX idx_crm_quotes_tenant_id ON crm_quotes(tenant_id);
CREATE INDEX idx_crm_quotes_customer_id ON crm_quotes(customer_id);
CREATE INDEX idx_crm_quotes_created_by ON crm_quotes(created_by);
CREATE INDEX idx_erp_employees_tenant_id ON erp_employees(tenant_id);
CREATE INDEX idx_erp_payrolls_employee_id ON erp_payrolls(employee_id);
CREATE INDEX idx_erp_payrolls_tenant_id ON erp_payrolls(tenant_id);
CREATE INDEX idx_analytics_events_tenant_id ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_file_attachments_tenant_id ON file_attachments(tenant_id);
CREATE INDEX idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX idx_comments_tenant_id ON comments(tenant_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_entity_tags_tenant_id ON entity_tags(tenant_id);
CREATE INDEX idx_webhook_endpoints_tenant_id ON webhook_endpoints(tenant_id);
CREATE INDEX idx_webhook_deliveries_endpoint_id ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_rate_limit_entries_tenant_id ON rate_limit_entries(tenant_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_tenant_id ON user_permissions(tenant_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);
