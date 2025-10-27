// Core schemas
export * from './core/tenants.schema';
export * from './core/users.schema';
export * from './core/permissions.schema';

// E-commerce schemas
export * from './products.schema';
export * from './orders.schema';
export * from './customers.schema';
export * from './reviews.schema';
export * from './suppliers.schema';

// Re-export e-commerce customers with alias to avoid conflict
export { customers as eCommerceCustomers } from './customers.schema';
export * from './promotions.schema';
export * from './payments.schema';
export * from './wishlist.schema';
export * from './carts.schema';

// CRM schemas
export * from './crm.schema';

// ERP schemas
export * from './erp-finance.schema';
export * from './erp-hr.schema';

// WMS schemas
export * from './wms.schema';
export * from './wms/inventory.schema';

// B2B schemas
export * from './b2b/quotes.schema';

// Notifications
export * from './notifications.schema';

// Additional schemas
export * from './inventory-movements.schema';
export * from './shipping-rates.schema';
export * from './trades.schema';
export * from './warehouses.schema';
export * from './inventory-locations.schema';
export * from './reports.schema';
export * from './webhooks.schema';
export * from './carbon-footprint.schema';

// Re-export warehouses with alias to avoid conflicts
export { warehouses as mainWarehouses } from './warehouses.schema';
export { warehouses as wmsWarehouses } from './wms.schema';
