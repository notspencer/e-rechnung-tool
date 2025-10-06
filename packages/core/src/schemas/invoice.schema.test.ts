/**
 * Tests for invoice schemas
 */

import { describe, it, expect } from 'vitest';
import { ParsedInvoiceSchema, InvoiceSchema } from './invoice.schema.js';

describe('ParsedInvoiceSchema', () => {
    it('should validate a valid parsed invoice', () => {
        const validInvoice = {
            invoiceNumber: 'INV-2024-001',
            issueDate: '2024-01-01',
            currency: 'EUR',
            seller: {
                name: 'ACME GmbH',
                vatId: 'DE123456789',
                address: {
                    country: 'DE',
                    city: 'Berlin',
                    postalCode: '10115',
                },
            },
            buyer: {
                name: 'Customer Ltd',
                vatId: 'DE987654321',
                address: {
                    country: 'DE',
                    city: 'Munich',
                },
            },
            totals: {
                net: 100.00,
                tax: 19.00,
                gross: 119.00,
            },
            lineItems: [
                {
                    id: '1',
                    description: 'Consulting services',
                    quantity: 10,
                    unit: 'HUR',
                    unitPrice: 10.00,
                    netAmount: 100.00,
                    taxRate: 19.00,
                    taxAmount: 19.00,
                },
            ],
        };

        const result = ParsedInvoiceSchema.safeParse(validInvoice);
        expect(result.success).toBe(true);
    });

    it('should reject invoice with missing required fields', () => {
        const invalidInvoice = {
            invoiceNumber: 'INV-2024-001',
            // Missing issueDate, currency, seller, buyer, totals, lineItems
        };

        const result = ParsedInvoiceSchema.safeParse(invalidInvoice);
        expect(result.success).toBe(false);
    });

    it('should reject invoice with invalid currency', () => {
        const invalidInvoice = {
            invoiceNumber: 'INV-2024-001',
            issueDate: '2024-01-01',
            currency: 'INVALID', // Invalid currency code
            seller: {
                name: 'ACME GmbH',
                address: { country: 'DE' },
            },
            buyer: {
                name: 'Customer Ltd',
                address: { country: 'DE' },
            },
            totals: {
                net: 100.00,
                tax: 19.00,
                gross: 119.00,
            },
            lineItems: [
                {
                    id: '1',
                    description: 'Services',
                    quantity: 1,
                    unit: 'C62',
                    unitPrice: 100.00,
                    netAmount: 100.00,
                    taxRate: 19.00,
                    taxAmount: 19.00,
                },
            ],
        };

        const result = ParsedInvoiceSchema.safeParse(invalidInvoice);
        expect(result.success).toBe(false);
    });

    it('should reject invoice with negative totals', () => {
        const invalidInvoice = {
            invoiceNumber: 'INV-2024-001',
            issueDate: '2024-01-01',
            currency: 'EUR',
            seller: {
                name: 'ACME GmbH',
                address: { country: 'DE' },
            },
            buyer: {
                name: 'Customer Ltd',
                address: { country: 'DE' },
            },
            totals: {
                net: -100.00, // Negative amount
                tax: 19.00,
                gross: 119.00,
            },
            lineItems: [
                {
                    id: '1',
                    description: 'Services',
                    quantity: 1,
                    unit: 'C62',
                    unitPrice: 100.00,
                    netAmount: 100.00,
                    taxRate: 19.00,
                    taxAmount: 19.00,
                },
            ],
        };

        const result = ParsedInvoiceSchema.safeParse(invalidInvoice);
        expect(result.success).toBe(false);
    });
});

describe('InvoiceSchema', () => {
    it('should validate a complete invoice', () => {
        const validInvoice = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            tenantId: '123e4567-e89b-12d3-a456-426614174001',
            type: 'e_invoice',
            format: 'xrechnung_ubl',
            status: 'VALID',
            invoiceNumber: 'INV-2024-001',
            issueDate: '2024-01-01',
            currency: 'EUR',
            totals: {
                net: 100.00,
                tax: 19.00,
                gross: 119.00,
            },
            seller: {
                name: 'ACME GmbH',
                address: { country: 'DE' },
            },
            buyer: {
                name: 'Customer Ltd',
                address: { country: 'DE' },
            },
            lineItems: [
                {
                    id: '1',
                    description: 'Services',
                    quantity: 1,
                    unit: 'C62',
                    unitPrice: 100.00,
                    netAmount: 100.00,
                    taxRate: 19.00,
                    taxAmount: 19.00,
                },
            ],
            validation: {
                status: 'PASS',
                errors: [],
                warnings: [],
            },
            checksum: 'sha256:abc123',
            source: 'email',
            receivedAt: '2024-01-01T10:00:00Z',
            createdAt: '2024-01-01T10:00:00Z',
        };

        const result = InvoiceSchema.safeParse(validInvoice);
        expect(result.success).toBe(true);
    });
});
