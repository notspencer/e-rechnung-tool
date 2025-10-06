/**
 * Tests for invoice core validation rules
 */

import { describe, it, expect } from 'vitest';
import { validateInvoiceNumber, validateIssueDate } from './invoice-core.rules.js';
import type { ParsedInvoice } from '@e-rechnung/core';

describe('validateInvoiceNumber', () => {
    it('should pass when invoice number is present', () => {
        const invoice: ParsedInvoice = {
            invoiceNumber: 'INV-2024-001',
            issueDate: '2024-01-01',
            currency: 'EUR',
            seller: { name: 'ACME', address: { country: 'DE' } },
            buyer: { name: 'Customer', address: { country: 'DE' } },
            totals: { net: 100, tax: 19, gross: 119 },
            lineItems: [],
        };

        const result = validateInvoiceNumber(invoice);
        expect(result).toHaveLength(0);
    });

    it('should fail when invoice number is missing', () => {
        const invoice: ParsedInvoice = {
            invoiceNumber: '',
            issueDate: '2024-01-01',
            currency: 'EUR',
            seller: { name: 'ACME', address: { country: 'DE' } },
            buyer: { name: 'Customer', address: { country: 'DE' } },
            totals: { net: 100, tax: 19, gross: 119 },
            lineItems: [],
        };

        const result = validateInvoiceNumber(invoice);
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('INV-01');
        expect(result[0].message).toBe('Invoice number is required');
    });

    it('should fail when invoice number is whitespace only', () => {
        const invoice: ParsedInvoice = {
            invoiceNumber: '   ',
            issueDate: '2024-01-01',
            currency: 'EUR',
            seller: { name: 'ACME', address: { country: 'DE' } },
            buyer: { name: 'Customer', address: { country: 'DE' } },
            totals: { net: 100, tax: 19, gross: 119 },
            lineItems: [],
        };

        const result = validateInvoiceNumber(invoice);
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('INV-01');
    });
});

describe('validateIssueDate', () => {
    it('should pass when issue date is valid and not in future', () => {
        const invoice: ParsedInvoice = {
            invoiceNumber: 'INV-2024-001',
            issueDate: '2024-01-01',
            currency: 'EUR',
            seller: { name: 'ACME', address: { country: 'DE' } },
            buyer: { name: 'Customer', address: { country: 'DE' } },
            totals: { net: 100, tax: 19, gross: 119 },
            lineItems: [],
        };

        const result = validateIssueDate(invoice);
        expect(result).toHaveLength(0);
    });

    it('should fail when issue date is missing', () => {
        const invoice: ParsedInvoice = {
            invoiceNumber: 'INV-2024-001',
            issueDate: '',
            currency: 'EUR',
            seller: { name: 'ACME', address: { country: 'DE' } },
            buyer: { name: 'Customer', address: { country: 'DE' } },
            totals: { net: 100, tax: 19, gross: 119 },
            lineItems: [],
        };

        const result = validateIssueDate(invoice);
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('INV-02');
        expect(result[0].message).toBe('Invoice issue date is required');
    });

    it('should fail when issue date is invalid', () => {
        const invoice: ParsedInvoice = {
            invoiceNumber: 'INV-2024-001',
            issueDate: 'invalid-date',
            currency: 'EUR',
            seller: { name: 'ACME', address: { country: 'DE' } },
            buyer: { name: 'Customer', address: { country: 'DE' } },
            totals: { net: 100, tax: 19, gross: 119 },
            lineItems: [],
        };

        const result = validateIssueDate(invoice);
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('INV-03');
        expect(result[0].message).toContain('must be a valid date');
    });

    it('should fail when issue date is in the future', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureDateString = futureDate.toISOString().split('T')[0];

        const invoice: ParsedInvoice = {
            invoiceNumber: 'INV-2024-001',
            issueDate: futureDateString,
            currency: 'EUR',
            seller: { name: 'ACME', address: { country: 'DE' } },
            buyer: { name: 'Customer', address: { country: 'DE' } },
            totals: { net: 100, tax: 19, gross: 119 },
            lineItems: [],
        };

        const result = validateIssueDate(invoice);
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('INV-03');
        expect(result[0].message).toContain('must not be in the future');
    });
});
