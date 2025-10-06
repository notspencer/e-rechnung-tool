/**
 * Zod schemas for API request/response validation
 */

import { z } from 'zod';

// Authentication schemas
export const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export const LoginResponseSchema = z.object({
    user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(['OWNER', 'FINANCE', 'READONLY']),
    }),
    token: z.string(),
    expiresIn: z.number(),
});

export const CreateApiKeyRequestSchema = z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.enum(['ingest:email', 'ingest:upload', 'read:invoice', 'export'])),
});

export const ApiKeyResponseSchema = z.object({
    id: z.string().uuid(),
    prefix: z.string(),
    secret: z.string(),
    scopes: z.array(z.string()),
    createdAt: z.string(),
});

// Invoice schemas
export const InvoiceUploadRequestSchema = z.object({
    source: z.enum(['manual_upload']),
});

export const InvoiceResponseSchema = z.object({
    id: z.string().uuid(),
    type: z.enum(['e_invoice', 'other']),
    format: z.string(),
    status: z.enum(['VALID', 'PENDING', 'FAILED']),
    validation: z.object({
        status: z.enum(['PASS', 'FAIL']),
        errors: z.array(z.object({
            code: z.string(),
            message: z.string(),
            path: z.string().optional(),
        })),
        warnings: z.array(z.object({
            code: z.string(),
            message: z.string(),
            path: z.string().optional(),
        })),
    }),
    invoiceNumber: z.string(),
    issueDate: z.string(),
    totalGross: z.number(),
    currency: z.string(),
    receivedAt: z.string(),
});

export const InvoiceListQuerySchema = z.object({
    status: z.enum(['PENDING', 'VALID', 'FAILED', 'ARCHIVED', 'MANUAL']).optional(),
    type: z.enum(['e_invoice', 'other']).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
});

export const ManualDataRequestSchema = z.object({
    invoiceNumber: z.string().min(1),
    issueDate: z.string(),
    sellerName: z.string().min(1),
    totalGross: z.number().positive(),
    currency: z.string().length(3),
    lineItems: z.array(z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        netAmount: z.number().nonnegative(),
    })).min(1),
});

// Export schemas
export const CreateExportRequestSchema = z.object({
    fromDate: z.string(),
    toDate: z.string(),
    format: z.enum(['csv', 'json']),
    includeXml: z.boolean().default(true),
    filters: z.object({
        status: z.array(z.string()).optional(),
        type: z.array(z.string()).optional(),
    }).optional(),
});

export const ExportResponseSchema = z.object({
    exportId: z.string().uuid(),
    status: z.enum(['PENDING', 'COMPLETED', 'FAILED']),
    format: z.string(),
    fromDate: z.string(),
    toDate: z.string(),
    invoiceCount: z.number(),
    downloadUrl: z.string().optional(),
    expiresAt: z.string().optional(),
    createdAt: z.string(),
    completedAt: z.string().optional(),
});

// Analytics schemas
export const AnalyticsQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
});

export const AnalyticsResponseSchema = z.object({
    period: z.object({
        from: z.string(),
        to: z.string(),
    }),
    totals: z.object({
        invoicesReceived: z.number(),
        eInvoices: z.number(),
        otherInvoices: z.number(),
        archived: z.number(),
    }),
    autoPassRate: z.number(),
    medianTimeToArchiveMinutes: z.number(),
    p90TimeToArchiveMinutes: z.number(),
    supplierConversion: z.object({
        suppliersWithOtherInvoices: z.number(),
        convertedToEInvoice: z.number(),
        conversionRate: z.number(),
    }),
});

// Schemas only - types are exported from types/index.ts
