import { pgTable, varchar, decimal, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const payments = pgTable(
  'payments',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    orderId: varchar('order_id', { length: 50 }).notNull(),
    customerId: varchar('customer_id', { length: 50 }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
    method: varchar('method', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    provider: varchar('provider', { length: 50 }),
    providerTransactionId: varchar('provider_transaction_id', { length: 255 }),
    providerResponse: jsonb('provider_response'),
    customerInfo: jsonb('customer_info'),
    metadata: jsonb('metadata'),
    failureReason: varchar('failure_reason', { length: 500 }),
    // Idempotency fields
    idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
    idempotencyExpiry: timestamp('idempotency_expiry'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => ({
    orderIdIdx: index('payments_order_id_idx').on(table.orderId),
    customerIdIdx: index('payments_customer_id_idx').on(table.customerId),
    statusIdx: index('payments_status_idx').on(table.status),
    idempotencyKeyIdx: index('payments_idempotency_key_idx').on(table.idempotencyKey),
    createdAtIdx: index('payments_created_at_idx').on(table.createdAt),
  }),
);

export const refunds = pgTable(
  'refunds',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    paymentId: varchar('payment_id', { length: 50 }).notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    reason: varchar('reason', { length: 500 }),
    status: varchar('status', { length: 50 }).notNull(),
    providerRefundId: varchar('provider_refund_id', { length: 255 }),
    providerResponse: jsonb('provider_response'),
    processedBy: varchar('processed_by', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    paymentIdIdx: index('refunds_payment_id_idx').on(table.paymentId),
    statusIdx: index('refunds_status_idx').on(table.status),
  }),
);

export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    customerId: varchar('customer_id', { length: 50 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerMethodId: varchar('provider_method_id', { length: 255 }),
    last4: varchar('last4', { length: 4 }),
    brand: varchar('brand', { length: 50 }),
    expiryMonth: varchar('expiry_month', { length: 2 }),
    expiryYear: varchar('expiry_year', { length: 4 }),
    isDefault: varchar('is_default', { length: 10 }).default('false'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    customerIdIdx: index('payment_methods_customer_id_idx').on(table.customerId),
  }),
);

