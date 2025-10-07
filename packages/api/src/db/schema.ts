/**
 * Database schema definitions using Drizzle ORM
 */

import { pgTable, uuid, text, timestamp, numeric, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['OWNER', 'FINANCE', 'READONLY']);
export const invoiceTypeEnum = pgEnum('invoice_type', ['e_invoice', 'other']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['PENDING', 'VALID', 'FAILED', 'ARCHIVED', 'MANUAL']);
export const invoiceSourceEnum = pgEnum('invoice_source', ['email', 'manual_upload', 'imap']);
export const eventTypeEnum = pgEnum('event_type', [
    'invoice_received',
    'validation_completed',
    'invoice_archived',
    'manual_edit',
    'export_created',
    'invoice_viewed',
    'invoice_downloaded',
    'api_key_used',
]);
export const exportStatusEnum = pgEnum('export_status', ['PENDING', 'COMPLETED', 'FAILED']);

// Tables
export const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    emailAddress: text('email_address').unique(),
    emailToken: text('email_token'),
    claimedDomains: jsonb('claimed_domains').$type<string[]>().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    emailVerifiedAt: timestamp('email_verified_at'),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userTenants = pgTable('user_tenants', {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull().default('READONLY'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
    pk: { columns: [table.userId, table.tenantId] },
}));

export const apiKeys = pgTable('api_keys', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    prefix: text('prefix').notNull(),
    secretHash: text('secret_hash').notNull(),
    scopes: text('scopes').array().notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at'),
});

export const suppliers = pgTable('suppliers', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    vatId: text('vat_id'),
    email: text('email'),
    address: jsonb('address'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    supplierId: uuid('supplier_id').references(() => suppliers.id),
    type: invoiceTypeEnum('type').notNull(),
    format: text('format').notNull(),
    status: invoiceStatusEnum('status').notNull().default('PENDING'),
    invoiceNumber: text('invoice_number').notNull(),
    issueDate: text('issue_date').notNull(),
    currency: text('currency').notNull(),
    totalNet: numeric('total_net', { precision: 12, scale: 2 }).notNull(),
    totalTax: numeric('total_tax', { precision: 12, scale: 2 }).notNull(),
    totalGross: numeric('total_gross', { precision: 12, scale: 2 }).notNull(),
    sellerData: jsonb('seller_data').notNull(),
    buyerData: jsonb('buyer_data').notNull(),
    lineItems: jsonb('line_items').notNull(),
    paymentTerms: jsonb('payment_terms'),
    validation: jsonb('validation').notNull(),
    manualData: jsonb('manual_data'),
    xmlBlobKey: text('xml_blob_key'),
    pdfBlobKey: text('pdf_blob_key'),
    checksum: text('checksum').notNull(),
    source: invoiceSourceEnum('source').notNull(),
    receivedAt: timestamp('received_at').notNull().defaultNow(),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const events = pgTable('events', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    invoiceId: uuid('invoice_id').references(() => invoices.id),
    type: eventTypeEnum('type').notNull(),
    payload: jsonb('payload').notNull(),
    userId: uuid('user_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const exports = pgTable('exports', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    status: exportStatusEnum('status').notNull().default('PENDING'),
    format: text('format').notNull(),
    fromDate: text('from_date').notNull(),
    toDate: text('to_date').notNull(),
    filters: jsonb('filters'),
    invoiceCount: numeric('invoice_count', { precision: 10, scale: 0 }),
    blobKey: text('blob_key'),
    checksum: text('checksum'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
});

export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    revoked: boolean('revoked').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
    users: many(userTenants),
    apiKeys: many(apiKeys),
    suppliers: many(suppliers),
    invoices: many(invoices),
    events: many(events),
    exports: many(exports),
}));

export const usersRelations = relations(users, ({ many }) => ({
    tenants: many(userTenants),
    events: many(events),
}));

export const userTenantsRelations = relations(userTenants, ({ one }) => ({
    user: one(users, {
        fields: [userTenants.userId],
        references: [users.id],
    }),
    tenant: one(tenants, {
        fields: [userTenants.tenantId],
        references: [tenants.id],
    }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
    tenant: one(tenants, {
        fields: [apiKeys.tenantId],
        references: [tenants.id],
    }),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [suppliers.tenantId],
        references: [tenants.id],
    }),
    invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [invoices.tenantId],
        references: [tenants.id],
    }),
    supplier: one(suppliers, {
        fields: [invoices.supplierId],
        references: [suppliers.id],
    }),
    events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
    tenant: one(tenants, {
        fields: [events.tenantId],
        references: [tenants.id],
    }),
    invoice: one(invoices, {
        fields: [events.invoiceId],
        references: [invoices.id],
    }),
    user: one(users, {
        fields: [events.userId],
        references: [users.id],
    }),
}));

export const exportsRelations = relations(exports, ({ one }) => ({
    tenant: one(tenants, {
        fields: [exports.tenantId],
        references: [tenants.id],
    }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
    user: one(users, {
        fields: [refreshTokens.userId],
        references: [users.id],
    }),
    tenant: one(tenants, {
        fields: [refreshTokens.tenantId],
        references: [tenants.id],
    }),
}));
