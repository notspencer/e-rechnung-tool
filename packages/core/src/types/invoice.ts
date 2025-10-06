/**
 * Core domain types for invoices
 */

import type { ValidationResult } from './validation.js';

export type InvoiceFormat =
    | 'xrechnung_ubl'
    | 'xrechnung_cii'
    | 'zugferd_cii'
    | 'facturx'
    | 'unknown';

export type InvoiceType = 'e_invoice' | 'other';

export type InvoiceStatus = 'PENDING' | 'VALID' | 'FAILED' | 'ARCHIVED' | 'MANUAL';

export type InvoiceSource = 'email' | 'manual_upload' | 'imap';

export interface PartyInfo {
    name: string;
    vatId?: string;
    address: {
        country: string;
        city?: string;
        postalCode?: string;
        street?: string;
    };
    contact?: {
        email?: string;
        phone?: string;
    };
}

export interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    netAmount: number;
    taxRate: number;
    taxAmount: number;
}

export interface PaymentTerms {
    dueDate?: string;
    paymentMeans?: {
        iban?: string;
        bic?: string;
        accountHolder?: string;
    };
    terms?: string;
}

export interface ParsedInvoice {
    invoiceNumber: string;
    issueDate: string;
    currency: string;
    seller: PartyInfo;
    buyer: PartyInfo;
    totals: {
        net: number;
        tax: number;
        gross: number;
    };
    lineItems: LineItem[];
    paymentTerms?: PaymentTerms;
    references?: {
        purchaseOrder?: string;
        contract?: string;
    };
}

export interface Invoice {
    id: string;
    tenantId: string;
    supplierId?: string;
    type: InvoiceType;
    format: InvoiceFormat;
    status: InvoiceStatus;
    invoiceNumber: string;
    issueDate: string;
    currency: string;
    totals: {
        net: number;
        tax: number;
        gross: number;
    };
    seller: PartyInfo;
    buyer: PartyInfo;
    lineItems: LineItem[];
    paymentTerms?: PaymentTerms;
    references?: {
        purchaseOrder?: string;
        contract?: string;
    };
    validation: ValidationResult;
    manualData?: Record<string, unknown>;
    xmlBlobKey?: string;
    pdfBlobKey?: string;
    checksum: string;
    source: InvoiceSource;
    receivedAt: string;
    archivedAt?: string;
    createdAt: string;
}
