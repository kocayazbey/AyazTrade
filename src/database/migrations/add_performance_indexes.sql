-- Add Performance Indexes to AyazTrade Database
-- Migration: Add missing database indexes for performance optimization
-- Date: 2024-12-19

-- Products table indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_updated_at ON products(updated_at);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX idx_products_low_stock_threshold ON products(low_stock_threshold);
CREATE INDEX idx_products_track_inventory ON products(track_inventory);
CREATE INDEX idx_products_allow_backorders ON products(allow_backorders);

-- Product variants indexes
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_active ON product_variants(is_active);
CREATE INDEX idx_product_variants_stock_quantity ON product_variants(stock_quantity);
CREATE INDEX idx_product_variants_price ON product_variants(price);
CREATE INDEX idx_product_variants_created_at ON product_variants(created_at);

-- Categories indexes
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- Brands indexes
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_active ON brands(is_active);

-- Customers indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_customer_type ON customers(customer_type);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_email_verified ON customers(email_verified);
CREATE INDEX idx_customers_phone_verified ON customers(phone_verified);
CREATE INDEX idx_customers_accepts_marketing ON customers(accepts_marketing);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_customers_last_login_at ON customers(last_login_at);
CREATE INDEX idx_customers_total_orders ON customers(total_orders);
CREATE INDEX idx_customers_total_spent ON customers(total_spent);

-- Orders indexes
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_updated_at ON orders(updated_at);
CREATE INDEX idx_orders_shipped_at ON orders(shipped_at);
CREATE INDEX idx_orders_delivered_at ON orders(delivered_at);
CREATE INDEX idx_orders_total_amount ON orders(total_amount);
CREATE INDEX idx_orders_currency ON orders(currency);

-- Order items indexes
CREATE INDEX idx_order_items_quantity ON order_items(quantity);
CREATE INDEX idx_order_items_price ON order_items(price);
CREATE INDEX idx_order_items_total ON order_items(total);

-- Cart indexes
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_session_id ON carts(session_id);
CREATE INDEX idx_carts_created_at ON carts(created_at);
CREATE INDEX idx_carts_updated_at ON carts(updated_at);

-- Cart items indexes
CREATE INDEX idx_cart_items_quantity ON cart_items(quantity);
CREATE INDEX idx_cart_items_price ON cart_items(price);
CREATE INDEX idx_cart_items_total ON cart_items(total);

-- Addresses indexes
CREATE INDEX idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX idx_addresses_type ON addresses(type);
CREATE INDEX idx_addresses_is_default ON addresses(is_default);
CREATE INDEX idx_addresses_city ON addresses(city);
CREATE INDEX idx_addresses_country ON addresses(country);

-- Product reviews indexes
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_product_reviews_approved ON product_reviews(is_approved);
CREATE INDEX idx_product_reviews_created_at ON product_reviews(created_at);

-- Wishlist indexes
CREATE INDEX idx_wishlist_items_created_at ON wishlist_items(created_at);

-- Coupons indexes
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupons_type ON coupons(type);
CREATE INDEX idx_coupons_starts_at ON coupons(starts_at);
CREATE INDEX idx_coupons_expires_at ON coupons(expires_at);
CREATE INDEX idx_coupons_usage_limit ON coupons(usage_limit);
CREATE INDEX idx_coupons_used_count ON coupons(used_count);

-- Payments indexes
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_amount ON payments(amount);
CREATE INDEX idx_payments_currency ON payments(currency);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);

-- Refunds indexes
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at);
CREATE INDEX idx_refunds_amount ON refunds(amount);
CREATE INDEX idx_refunds_reason ON refunds(reason);

-- Shipments indexes
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_carrier ON shipments(carrier);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_created_at ON shipments(created_at);
CREATE INDEX idx_shipments_shipped_at ON shipments(shipped_at);
CREATE INDEX idx_shipments_delivered_at ON shipments(delivered_at);

-- Inventory indexes
CREATE INDEX idx_inventory_items_warehouse_id ON inventory_items(warehouse_id);
CREATE INDEX idx_inventory_items_quantity ON inventory_items(quantity);
CREATE INDEX idx_inventory_items_reserved_quantity ON inventory_items(reserved_quantity);
CREATE INDEX idx_inventory_items_available_quantity ON inventory_items(available_quantity);

-- Inventory transactions indexes
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(type);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_quantity ON inventory_transactions(quantity);

-- Warehouses indexes
CREATE INDEX idx_warehouses_active ON warehouses(is_active);
CREATE INDEX idx_warehouses_city ON warehouses(city);
CREATE INDEX idx_warehouses_country ON warehouses(country);

-- Warehouse locations indexes
CREATE INDEX idx_warehouse_locations_zone ON warehouse_locations(zone);
CREATE INDEX idx_warehouse_locations_aisle ON warehouse_locations(aisle);
CREATE INDEX idx_warehouse_locations_rack ON warehouse_locations(rack);
CREATE INDEX idx_warehouse_locations_shelf ON warehouse_locations(shelf);
CREATE INDEX idx_warehouse_locations_position ON warehouse_locations(position);

-- CRM customers indexes
CREATE INDEX idx_crm_customers_customer_number ON crm_customers(customer_number);
CREATE INDEX idx_crm_customers_company_name ON crm_customers(company_name);
CREATE INDEX idx_crm_customers_email ON crm_customers(email);
CREATE INDEX idx_crm_customers_phone ON crm_customers(phone);
CREATE INDEX idx_crm_customers_customer_type ON crm_customers(customer_type);
CREATE INDEX idx_crm_customers_active ON crm_customers(is_active);
CREATE INDEX idx_crm_customers_created_at ON crm_customers(created_at);

-- CRM leads indexes
CREATE INDEX idx_crm_leads_status ON crm_leads(status);
CREATE INDEX idx_crm_leads_source ON crm_leads(source);
CREATE INDEX idx_crm_leads_priority ON crm_leads(priority);
CREATE INDEX idx_crm_leads_created_at ON crm_leads(created_at);
CREATE INDEX idx_crm_leads_updated_at ON crm_leads(updated_at);

-- CRM quotes indexes
CREATE INDEX idx_crm_quotes_status ON crm_quotes(status);
CREATE INDEX idx_crm_quotes_total_amount ON crm_quotes(total_amount);
CREATE INDEX idx_crm_quotes_created_at ON crm_quotes(created_at);
CREATE INDEX idx_crm_quotes_expires_at ON crm_quotes(expires_at);

-- ERP employees indexes
CREATE INDEX idx_erp_employees_employee_number ON erp_employees(employee_number);
CREATE INDEX idx_erp_employees_email ON erp_employees(email);
CREATE INDEX idx_erp_employees_department ON erp_employees(department);
CREATE INDEX idx_erp_employees_position ON erp_employees(position);
CREATE INDEX idx_erp_employees_status ON erp_employees(status);
CREATE INDEX idx_erp_employees_hire_date ON erp_employees(hire_date);
CREATE INDEX idx_erp_employees_termination_date ON erp_employees(termination_date);

-- ERP payrolls indexes
CREATE INDEX idx_erp_payrolls_pay_period_start ON erp_payrolls(pay_period_start);
CREATE INDEX idx_erp_payrolls_pay_period_end ON erp_payrolls(pay_period_end);
CREATE INDEX idx_erp_payrolls_status ON erp_payrolls(status);
CREATE INDEX idx_erp_payrolls_created_at ON erp_payrolls(created_at);

-- Analytics events indexes
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_ip_address ON analytics_events(ip_address);

-- Notifications indexes
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- File attachments indexes
CREATE INDEX idx_file_attachments_file_name ON file_attachments(file_name);
CREATE INDEX idx_file_attachments_file_type ON file_attachments(file_type);
CREATE INDEX idx_file_attachments_file_size ON file_attachments(file_size);
CREATE INDEX idx_file_attachments_created_at ON file_attachments(created_at);

-- Comments indexes
CREATE INDEX idx_comments_entity_type ON comments(entity_type);
CREATE INDEX idx_comments_entity_id ON comments(entity_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Entity tags indexes
CREATE INDEX idx_entity_tags_entity_type ON entity_tags(entity_type);
CREATE INDEX idx_entity_tags_entity_id ON entity_tags(entity_id);
CREATE INDEX idx_entity_tags_tag_name ON entity_tags(tag_name);

-- Webhook endpoints indexes
CREATE INDEX idx_webhook_endpoints_url ON webhook_endpoints(url);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active);
CREATE INDEX idx_webhook_endpoints_created_at ON webhook_endpoints(created_at);

-- Webhook deliveries indexes
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);
CREATE INDEX idx_webhook_deliveries_attempted_at ON webhook_deliveries(attempted_at);

-- API keys indexes
CREATE INDEX idx_api_keys_name ON api_keys(name);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_created_at ON api_keys(created_at);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- Rate limit entries indexes
CREATE INDEX idx_rate_limit_entries_key ON rate_limit_entries(key);
CREATE INDEX idx_rate_limit_entries_window_start ON rate_limit_entries(window_start);
CREATE INDEX idx_rate_limit_entries_created_at ON rate_limit_entries(created_at);

-- User sessions indexes
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_created_at ON user_sessions(created_at);

-- User permissions indexes
CREATE INDEX idx_user_permissions_permission ON user_permissions(permission);
CREATE INDEX idx_user_permissions_resource ON user_permissions(resource);

-- User roles indexes
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Composite indexes for common queries
CREATE INDEX idx_products_category_status ON products(category_id, status);
CREATE INDEX idx_products_price_range ON products(price, status);
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
CREATE INDEX idx_orders_created_status ON orders(created_at, status);
CREATE INDEX idx_order_items_order_product ON order_items(order_id, product_id);
CREATE INDEX idx_cart_items_cart_product ON cart_items(cart_id, product_id);
CREATE INDEX idx_customer_addresses_customer_type ON customer_addresses(customer_id, type);
CREATE INDEX idx_product_reviews_product_rating ON product_reviews(product_id, rating);
CREATE INDEX idx_payments_order_status ON payments(order_id, status);
CREATE INDEX idx_shipments_order_status ON shipments(order_id, status);
CREATE INDEX idx_inventory_items_product_warehouse ON inventory_items(product_id, warehouse_id);
CREATE INDEX idx_crm_leads_status_created ON crm_leads(status, created_at);
CREATE INDEX idx_crm_quotes_customer_status ON crm_quotes(customer_id, status);
CREATE INDEX idx_analytics_events_type_created ON analytics_events(event_type, created_at);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_audit_logs_entity_created ON audit_logs(entity_type, entity_id, created_at);

-- Full-text search indexes
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('turkish', name || ' ' || description));
CREATE INDEX idx_customers_search ON customers USING gin(to_tsvector('turkish', first_name || ' ' || last_name || ' ' || email));
CREATE INDEX idx_orders_search ON orders USING gin(to_tsvector('turkish', order_number));
CREATE INDEX idx_crm_customers_search ON crm_customers USING gin(to_tsvector('turkish', company_name || ' ' || contact_name));
CREATE INDEX idx_crm_leads_search ON crm_leads USING gin(to_tsvector('turkish', title || ' ' || description));

-- Partial indexes for better performance
CREATE INDEX idx_products_active_featured ON products(category_id, price) WHERE is_active = true AND is_featured = true;
CREATE INDEX idx_orders_pending_payment ON orders(customer_id, created_at) WHERE status = 'pending' AND payment_status = 'pending';
CREATE INDEX idx_cart_items_active ON cart_items(cart_id, product_id) WHERE quantity > 0;
CREATE INDEX idx_customers_verified ON customers(email, phone) WHERE email_verified = true AND phone_verified = true;
CREATE INDEX idx_crm_leads_open ON crm_leads(assigned_to, created_at) WHERE status = 'open';
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at) WHERE status = 'unread';
CREATE INDEX idx_audit_logs_recent ON audit_logs(entity_type, entity_id, created_at) WHERE created_at > NOW() - INTERVAL '30 days';

-- Indexes for time-series data
CREATE INDEX idx_analytics_events_hourly ON analytics_events(DATE_TRUNC('hour', created_at), event_type);
CREATE INDEX idx_analytics_events_daily ON analytics_events(DATE_TRUNC('day', created_at), event_type);
CREATE INDEX idx_orders_monthly ON orders(DATE_TRUNC('month', created_at), status);
CREATE INDEX idx_payments_daily ON payments(DATE_TRUNC('day', created_at), status);

-- Indexes for JSONB columns
CREATE INDEX idx_products_attributes ON products USING gin(attributes);
CREATE INDEX idx_products_metadata ON products USING gin(metadata);
CREATE INDEX idx_orders_metadata ON orders USING gin(metadata);
CREATE INDEX idx_customers_metadata ON customers USING gin(metadata);
CREATE INDEX idx_crm_customers_custom_fields ON crm_customers USING gin(custom_fields);
CREATE INDEX idx_crm_leads_custom_fields ON crm_leads USING gin(custom_fields);
