/**
 * Zod schemas for invoice validation
 */

import { z } from 'zod';

export const PartyInfoSchema = z.object({
    name: z.string().min(1),
    vatId: z.string().optional(),
    address: z.object({
        country: z.string().min(2).max(2), // ISO country code
        city: z.string().optional(),
        postalCode: z.string().optional(),
        street: z.string().optional(),
    }),
    contact: z.object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
    }).optional(),
});

export const LineItemSchema = z.object({
    id: z.string(),
    description: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().nonnegative(),
    netAmount: z.number().nonnegative(),
    taxRate: z.number().min(0).max(100),
    taxAmount: z.number().nonnegative(),
});

export const PaymentTermsSchema = z.object({
    dueDate: z.string().optional(),
    paymentMeans: z.object({
        iban: z.string().optional(),
        bic: z.string().optional(),
        accountHolder: z.string().optional(),
    }).optional(),
    terms: z.string().optional(),
}).optional();

export const ParsedInvoiceSchema = z.object({
    invoiceNumber: z.string().min(1),
    issueDate: z.string(), // ISO date string
    currency: z.string().length(3), // ISO currency code
    seller: PartyInfoSchema,
    buyer: PartyInfoSchema,
    totals: z.object({
        net: z.number().nonnegative(),
        tax: z.number().nonnegative(),
        gross: z.number().nonnegative(),
    }),
    lineItems: z.array(LineItemSchema).min(1),
    paymentTerms: PaymentTermsSchema,
    references: z.object({
        purchaseOrder: z.string().optional(),
        contract: z.string().optional(),
    }).optional(),
});

export const InvoiceFormatSchema = z.enum([
    'xrechnung_ubl',
    'xrechnung_cii',
    'zugferd_cii',
    'facturx',
    'unknown',
]);

export const InvoiceTypeSchema = z.enum(['e_invoice', 'other']);

export const InvoiceStatusSchema = z.enum([
    'PENDING',
    'VALID',
    'FAILED',
    'ARCHIVED',
    'MANUAL',
]);

export const InvoiceSourceSchema = z.enum(['email', 'manual_upload', 'imap']);

export const ValidationIssueSchema = z.object({
    code: z.string(),
    message: z.string(),
    path: z.string().optional(),
    value: z.unknown().optional(),
});

export const ValidationResultSchema = z.object({
    status: z.enum(['PASS', 'FAIL']),
    errors: z.array(ValidationIssueSchema),
    warnings: z.array(ValidationIssueSchema),
});

export const InvoiceSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    supplierId: z.string().uuid().optional(),
    type: InvoiceTypeSchema,
    format: InvoiceFormatSchema,
    status: InvoiceStatusSchema,
    invoiceNumber: z.string().min(1),
    issueDate: z.string(),
    currency: z.string().length(3),
    totals: z.object({
        net: z.number().nonnegative(),
        tax: z.number().nonnegative(),
        gross: z.number().nonnegative(),
    }),
    seller: PartyInfoSchema,
    buyer: PartyInfoSchema,
    lineItems: z.array(LineItemSchema),
    paymentTerms: PaymentTermsSchema,
    references: z.object({
        purchaseOrder: z.string().optional(),
        contract: z.string().optional(),
    }).optional(),
    validation: ValidationResultSchema,
    manualData: z.record(z.unknown()).optional(),
    xmlBlobKey: z.string().optional(),
    pdfBlobKey: z.string().optional(),
    checksum: z.string(),
    source: InvoiceSourceSchema,
    receivedAt: z.string(),
    archivedAt: z.string().optional(),
    createdAt: z.string(),
});

// Schemas only - types are exported from types/index.ts
