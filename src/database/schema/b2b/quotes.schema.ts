import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteNumber: varchar('quote_number', { length: 50 }).unique().notNull(),
    
    customerId: uuid('customer_id').notNull(),
    salesRepId: uuid('sales_rep_id'),
    
    status: varchar('status', { length: 20 }).default('draft'), // draft, pending, approved, rejected, expired, converted
    
    validUntil: timestamp('valid_until').notNull(),
    expiresAt: timestamp('expires_at'),
    
    items: jsonb('items').$type<Array<{
      productId: string;
      sku: string;
      name: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      tax: number;
      total: number;
    }>>().default([]),
    
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    tax: decimal('tax', { precision: 12, scale: 2 }).default('0'),
    discount: decimal('discount', { precision: 12, scale: 2 }).default('0'),
    shipping: decimal('shipping', { precision: 12, scale: 2 }).default('0'),
    total: decimal('total', { precision: 12, scale: 2 }).notNull(),
    
    currency: varchar('currency', { length: 3 }).default('TRY'),
    
    terms: text('terms'),
    notes: text('notes'),
    internalNotes: text('internal_notes'),
    
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at'),
    rejectedBy: uuid('rejected_by'),
    rejectedAt: timestamp('rejected_at'),
    rejectionReason: text('rejection_reason'),
    
    convertedToOrderId: uuid('converted_to_order_id'),
    convertedAt: timestamp('converted_at'),
    
    version: integer('version').default(1),
    parentQuoteId: uuid('parent_quote_id'),
    
    customFields: jsonb('custom_fields').$type<Record<string, any>>().default({}),
    
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    quoteNumberIdx: index('quotes_quote_number_idx').on(table.quoteNumber),
    customerIdx: index('quotes_customer_idx').on(table.customerId),
    salesRepIdx: index('quotes_sales_rep_idx').on(table.salesRepId),
    statusIdx: index('quotes_status_idx').on(table.status),
    createdAtIdx: index('quotes_created_at_idx').on(table.createdAt),
    validUntilIdx: index('quotes_valid_until_idx').on(table.validUntil),
  }),
);

export const quoteHistory = pgTable(
  'quote_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteId: uuid('quote_id').notNull(),
    
    action: varchar('action', { length: 50 }).notNull(), // created, updated, sent, approved, rejected, expired, converted
    comment: text('comment'),
    
    changedBy: uuid('changed_by'),
    changedAt: timestamp('changed_at').defaultNow().notNull(),
    
    oldValue: jsonb('old_value').$type<Record<string, any>>(),
    newValue: jsonb('new_value').$type<Record<string, any>>(),
  },
  (table) => ({
    quoteIdx: index('quote_history_quote_idx').on(table.quoteId),
    changedAtIdx: index('quote_history_changed_at_idx').on(table.changedAt),
  }),
);

export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractNumber: varchar('contract_number', { length: 50 }).unique().notNull(),
    
    customerId: uuid('customer_id').notNull(),
    salesRepId: uuid('sales_rep_id'),
    
    type: varchar('type', { length: 30 }).default('master_agreement'), // master_agreement, volume_commitment, special_pricing, framework_agreement
    
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    autoRenew: integer('auto_renew').default(0), // 0=no, 1=yes
    renewalPeriod: integer('renewal_period'), // months
    
    status: varchar('status', { length: 20 }).default('draft'), // draft, pending_approval, active, expired, terminated, suspended
    
    terms: text('terms'),
    paymentTerms: varchar('payment_terms', { length: 20 }), // net15, net30, net60, net90
    
    volumeCommitment: decimal('volume_commitment', { precision: 12, scale: 2 }),
    currentVolume: decimal('current_volume', { precision: 12, scale: 2 }).default('0'),
    
    discountRate: decimal('discount_rate', { precision: 5, scale: 2 }),
    
    pricingRules: jsonb('pricing_rules').$type<Array<{
      productId?: string;
      categoryId?: string;
      minQuantity: number;
      price: number;
      discountPercent?: number;
    }>>().default([]),
    
    documents: jsonb('documents').$type<Array<{
      type: string;
      name: string;
      url: string;
      uploadedAt: string;
    }>>().default([]),
    
    createdBy: uuid('created_by').notNull(),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at'),
    terminatedBy: uuid('terminated_by'),
    terminatedAt: timestamp('terminated_at'),
    terminationReason: text('termination_reason'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    contractNumberIdx: index('contracts_contract_number_idx').on(table.contractNumber),
    customerIdx: index('contracts_customer_idx').on(table.customerId),
    statusIdx: index('contracts_status_idx').on(table.status),
    endDateIdx: index('contracts_end_date_idx').on(table.endDate),
  }),
);

export const customerPricing = pgTable(
  'customer_pricing',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    productId: uuid('product_id').notNull(),
    
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    
    minQuantity: integer('min_quantity').default(1),
    maxQuantity: integer('max_quantity'),
    
    validFrom: timestamp('valid_from').defaultNow(),
    validUntil: timestamp('valid_until'),
    
    priceListId: uuid('price_list_id'),
    contractId: uuid('contract_id'),
    
    isActive: integer('is_active').default(1),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    customerIdx: index('customer_pricing_customer_idx').on(table.customerId),
    pricingProductIdx: index('customer_pricing_product_idx').on(table.productId),
    priceListIdx: index('customer_pricing_price_list_idx').on(table.priceListId),
  }),
);

export const priceLists = pgTable(
  'price_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).unique().notNull(),
    description: text('description'),
    
    currency: varchar('currency', { length: 3 }).default('TRY'),
    
    validFrom: timestamp('valid_from').defaultNow(),
    validUntil: timestamp('valid_until'),
    
    customerGroups: jsonb('customer_groups').$type<string[]>().default([]),
    customerIds: jsonb('customer_ids').$type<string[]>().default([]),
    
    isActive: integer('is_active').default(1),
    isDefault: integer('is_default').default(0),
    
    priority: integer('priority').default(0),
    
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index('price_lists_code_idx').on(table.code),
    isActiveIdx: index('price_lists_is_active_idx').on(table.isActive),
  }),
);

export const priceListItems = pgTable(
  'price_list_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    priceListId: uuid('price_list_id').notNull(),
    productId: uuid('product_id').notNull(),
    
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    
    minQuantity: integer('min_quantity').default(1),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    priceListIdx: index('price_list_items_price_list_idx').on(table.priceListId),
    itemsProductIdx: index('price_list_items_product_idx').on(table.productId),
  }),
);

export const creditLimits = pgTable(
  'credit_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').unique().notNull(),
    
    creditLimit: decimal('credit_limit', { precision: 12, scale: 2 }).notNull(),
    availableCredit: decimal('available_credit', { precision: 12, scale: 2 }).notNull(),
    usedCredit: decimal('used_credit', { precision: 12, scale: 2 }).default('0'),
    
    paymentTerms: varchar('payment_terms', { length: 20 }).default('net30'), // immediate, net15, net30, net60, net90, net120
    paymentTermsDays: integer('payment_terms_days').default(30),
    
    status: varchar('status', { length: 20 }).default('active'), // active, hold, suspended, cancelled
    
    overdueAmount: decimal('overdue_amount', { precision: 12, scale: 2 }).default('0'),
    
    lastReviewDate: timestamp('last_review_date'),
    nextReviewDate: timestamp('next_review_date'),
    
    notes: text('notes'),
    
    createdBy: uuid('created_by').notNull(),
    updatedBy: uuid('updated_by'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    customerIdx: index('credit_limits_customer_idx').on(table.customerId),
    statusIdx: index('credit_limits_status_idx').on(table.status),
  }),
);

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    poNumber: varchar('po_number', { length: 50 }).unique().notNull(),
    
    customerId: uuid('customer_id').notNull(),
    
    type: varchar('type', { length: 20 }).default('standard'), // standard, blanket, release, drop_ship
    
    status: varchar('status', { length: 20 }).default('draft'), // draft, submitted, approved, rejected, in_progress, completed, cancelled
    
    parentPOId: uuid('parent_po_id'),
    
    items: jsonb('items').$type<Array<{
      lineNumber: number;
      productId: string;
      sku: string;
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
      deliveryDate?: string;
      status?: string;
    }>>().default([]),
    
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    tax: decimal('tax', { precision: 12, scale: 2 }).default('0'),
    total: decimal('total', { precision: 12, scale: 2 }).notNull(),
    
    currency: varchar('currency', { length: 3 }).default('TRY'),
    
    requestedDeliveryDate: timestamp('requested_delivery_date'),
    confirmedDeliveryDate: timestamp('confirmed_delivery_date'),
    
    shippingAddress: jsonb('shipping_address').$type<{
      name: string;
      address: string;
      city: string;
      state: string;
      country: string;
      zip: string;
      phone: string;
    }>().notNull(),
    
    billingAddress: jsonb('billing_address').$type<{
      name: string;
      address: string;
      city: string;
      state: string;
      country: string;
      zip: string;
      phone: string;
    }>().notNull(),
    
    paymentTerms: varchar('payment_terms', { length: 20 }),
    incoterms: varchar('incoterms', { length: 10 }), // EXW, FOB, CIF, DDP, etc.
    
    specialInstructions: text('special_instructions'),
    terms: text('terms'),
    
    approvalStatus: varchar('approval_status', { length: 20 }).default('pending'), // pending, approved, rejected
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at'),
    approverComments: text('approver_comments'),
    
    submittedBy: uuid('submitted_by'),
    submittedAt: timestamp('submitted_at'),
    
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    poNumberIdx: index('purchase_orders_po_number_idx').on(table.poNumber),
    customerIdx: index('purchase_orders_customer_idx').on(table.customerId),
    statusIdx: index('purchase_orders_status_idx').on(table.status),
    parentPOIdx: index('purchase_orders_parent_po_idx').on(table.parentPOId),
  }),
);

export const accountUsers = pgTable(
  'account_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull(),
    userId: uuid('user_id').notNull(),
    
    role: varchar('role', { length: 20 }).notNull(), // buyer, approver, admin, viewer, finance
    
    budgetLimit: decimal('budget_limit', { precision: 12, scale: 2 }),
    approvalLimit: decimal('approval_limit', { precision: 12, scale: 2 }),
    
    permissions: jsonb('permissions').$type<{
      canCreateOrder: boolean;
      canApproveOrder: boolean;
      canViewPricing: boolean;
      canManageUsers: boolean;
      canViewInvoices: boolean;
      canRequestQuotes: boolean;
      canManageContracts: boolean;
    }>().default({} as any),

    isActive: integer('is_active').default(1),
    
    lastLoginAt: timestamp('last_login_at'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    accountIdx: index('account_users_account_idx').on(table.accountId),
    userIdx: index('account_users_user_idx').on(table.userId),
    roleIdx: index('account_users_role_idx').on(table.role),
  }),
);

export const accountHierarchy = pgTable(
  'account_hierarchy',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    parentCustomerId: uuid('parent_customer_id'),
    
    level: integer('level').default(0),
    path: text('path'),
    
    canViewParentOrders: integer('can_view_parent_orders').default(0),
    canViewChildOrders: integer('can_view_child_orders').default(0),
    
    inheritPricing: integer('inherit_pricing').default(1),
    inheritCreditLimit: integer('inherit_credit_limit').default(0),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    customerIdx: index('account_hierarchy_customer_idx').on(table.customerId),
    parentIdx: index('account_hierarchy_parent_idx').on(table.parentCustomerId),
  }),
);

export const recurringOrders = pgTable(
  'recurring_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    
    frequency: varchar('frequency', { length: 20 }).notNull(), // daily, weekly, biweekly, monthly, quarterly, yearly
    frequencyValue: integer('frequency_value').default(1),
    
    status: varchar('status', { length: 20 }).default('active'), // active, paused, cancelled, completed
    
    items: jsonb('items').$type<Array<{
      productId: string;
      sku: string;
      quantity: number;
      unitPrice?: number;
    }>>().default([]),
    
    shippingAddressId: uuid('shipping_address_id'),
    
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'),
    
    nextRunDate: timestamp('next_run_date'),
    lastRunDate: timestamp('last_run_date'),
    runCount: integer('run_count').default(0),
    
    maxRuns: integer('max_runs'),
    
    autoProcess: integer('auto_process').default(1),
    
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    customerIdx: index('recurring_orders_customer_idx').on(table.customerId),
    statusIdx: index('recurring_orders_status_idx').on(table.status),
    nextRunDateIdx: index('recurring_orders_next_run_date_idx').on(table.nextRunDate),
  }),
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceNumber: varchar('invoice_number', { length: 50 }).unique().notNull(),
    
    customerId: uuid('customer_id').notNull(),
    orderId: uuid('order_id'),
    
    type: varchar('type', { length: 20 }).default('standard'), // standard, proforma, credit_note, debit_note
    
    status: varchar('status', { length: 20 }).default('draft'), // draft, sent, viewed, paid, overdue, cancelled, refunded
    
    issueDate: timestamp('issue_date').defaultNow().notNull(),
    dueDate: timestamp('due_date').notNull(),
    
    items: jsonb('items').$type<Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      tax: number;
      total: number;
    }>>().default([]),
    
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    taxTotal: decimal('tax_total', { precision: 12, scale: 2 }).default('0'),
    total: decimal('total', { precision: 12, scale: 2 }).notNull(),
    
    paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0'),
    balanceDue: decimal('balance_due', { precision: 12, scale: 2 }).notNull(),
    
    currency: varchar('currency', { length: 3 }).default('TRY'),
    
    taxDetails: jsonb('tax_details').$type<Array<{
      name: string;
      rate: number;
      amount: number;
    }>>().default([]),
    
    paymentTerms: varchar('payment_terms', { length: 20 }),
    
    notes: text('notes'),
    
    pdfUrl: varchar('pdf_url', { length: 500 }),
    
    sentAt: timestamp('sent_at'),
    viewedAt: timestamp('viewed_at'),
    paidAt: timestamp('paid_at'),
    
    eFaturaUUID: varchar('e_fatura_uuid', { length: 100 }),
    eFaturaStatus: varchar('e_fatura_status', { length: 20 }),
    
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    invoiceNumberIdx: index('invoices_invoice_number_idx').on(table.invoiceNumber),
    customerIdx: index('invoices_customer_idx').on(table.customerId),
    orderIdx: index('invoices_order_idx').on(table.orderId),
    statusIdx: index('invoices_status_idx').on(table.status),
    dueDateIdx: index('invoices_due_date_idx').on(table.dueDate),
  }),
);

export const salesReps = pgTable(
  'sales_reps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').unique().notNull(),
    
    code: varchar('code', { length: 50 }).unique().notNull(),
    
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    
    territory: jsonb('territory').$type<{
      cities?: string[];
      regions?: string[];
      countries?: string[];
    }>().default({}),
    
    commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('0'),
    
    targetSalesMonthly: decimal('target_sales_monthly', { precision: 12, scale: 2 }),
    targetSalesYearly: decimal('target_sales_yearly', { precision: 12, scale: 2 }),
    
    achievedSalesMonthly: decimal('achieved_sales_monthly', { precision: 12, scale: 2 }).default('0'),
    achievedSalesYearly: decimal('achieved_sales_yearly', { precision: 12, scale: 2 }).default('0'),
    
    customersAssigned: integer('customers_assigned').default(0),
    
    isActive: integer('is_active').default(1),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('sales_reps_user_idx').on(table.userId),
    codeIdx: index('sales_reps_code_idx').on(table.code),
  }),
);

export const customerSalesRep = pgTable(
  'customer_sales_rep',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    salesRepId: uuid('sales_rep_id').notNull(),
    
    isPrimary: integer('is_primary').default(1),
    
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    assignedBy: uuid('assigned_by'),
  },
  (table) => ({
    customerIdx: index('customer_sales_rep_customer_idx').on(table.customerId),
    salesRepIdx: index('customer_sales_rep_sales_rep_idx').on(table.salesRepId),
  }),
);

