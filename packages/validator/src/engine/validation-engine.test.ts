/**
 * Tests for validation engine
 */

import { describe, it, expect } from 'vitest';
import { En16931ValidationEngine } from './validation-engine.js';
import type { ParsedInvoice } from '@e-rechnung/core';

describe('En16931ValidationEngine', () => {
    const validator = new En16931ValidationEngine();

    it('should pass validation for a complete valid invoice', async () => {
        const validInvoice: ParsedInvoice = {
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
            paymentTerms: {
                dueDate: '2024-02-01',
                paymentMeans: {
                    iban: 'DE89370400440532013000',
                    bic: 'COBADEFFXXX',
                },
            },
        };

        const result = await validator.validate(validInvoice);

        expect(result.status).toBe('PASS');
        expect(result.errors).toHaveLength(0);
        expect(result.warnings.length).toBeGreaterThan(0); // Should have some warnings
    });

    it('should fail validation for invoice with missing required fields', async () => {
        const invalidInvoice: ParsedInvoice = {
            invoiceNumber: '', // Missing invoice number
            issueDate: '', // Missing issue date
            currency: '', // Missing currency
            seller: {
                name: '', // Missing seller name
                address: {
                    country: '', // Missing country
                },
            },
            buyer: {
                name: '', // Missing buyer name
                address: {
                    country: '', // Missing country
                },
            },
            totals: {
                net: 0,
                tax: 0,
                gross: 0,
            },
            lineItems: [], // Missing line items
        };

        const result = await validator.validate(invalidInvoice);

        expect(result.status).toBe('FAIL');
        expect(result.errors.length).toBeGreaterThan(0);

        // Check for specific error codes
        const errorCodes = result.errors.map(e => e.code);
        expect(errorCodes).toContain('INV-01'); // Missing invoice number
        expect(errorCodes).toContain('INV-02'); // Missing issue date
        expect(errorCodes).toContain('CUR-01'); // Missing currency
        expect(errorCodes).toContain('SELL-01'); // Missing seller name
        expect(errorCodes).toContain('BUY-01'); // Missing buyer name
        expect(errorCodes).toContain('LIN-01'); // Missing line items
    });

    it('should fail validation for invoice with totals mismatch', async () => {
        const invalidInvoice: ParsedInvoice = {
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
                net: 100.00,
                tax: 19.00,
                gross: 150.00, // Incorrect: should be 119.00
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

        const result = await validator.validate(invalidInvoice);

        expect(result.status).toBe('FAIL');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('SUM-02');
        expect(result.errors[0].message).toContain('totals are inconsistent');
    });

    it('should generate warnings for missing optional fields', async () => {
        const invoice: ParsedInvoice = {
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
            // Missing payment terms, references, contact info
        };

        const result = await validator.validate(invoice);

        expect(result.status).toBe('PASS');
        expect(result.errors).toHaveLength(0);
        expect(result.warnings.length).toBeGreaterThan(0);

        // Check for specific warning codes
        const warningCodes = result.warnings.map(w => w.code);
        expect(warningCodes).toContain('PAY-01'); // Missing payment instructions
        expect(warningCodes).toContain('REF-01'); // Missing purchase order reference
        expect(warningCodes).toContain('CONT-01'); // Missing seller contact
    });
});
