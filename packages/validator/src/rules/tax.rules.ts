/**
 * Tax validation rules (TAX-01 through TAX-04)
 */

import type { ParsedInvoice, ValidationIssue } from '@e-rechnung/core';

const TAX_ROUNDING_TOLERANCE = 0.05;

export function validateTax(invoice: ParsedInvoice): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Calculate total tax from line items
    const lineTaxTotal = invoice.lineItems.reduce((sum, line) => sum + line.taxAmount, 0);
    const invoiceTaxTotal = invoice.totals.tax;

    // TAX-01: Missing tax breakdown (simplified - check if we have tax amounts)
    if (lineTaxTotal === 0 && invoiceTaxTotal === 0) {
        issues.push({
            code: 'TAX-01',
            message: 'Tax breakdown is required (categories, rates, amounts)',
            path: 'Invoice/TaxTotal/TaxSubtotal',
        });
    }

    // TAX-04: Tax calculation mismatch
    const taxDifference = Math.abs(lineTaxTotal - invoiceTaxTotal);
    if (taxDifference > TAX_ROUNDING_TOLERANCE) {
        issues.push({
            code: 'TAX-04',
            message: `Sum of line item taxes does not match invoice tax total (${lineTaxTotal} vs ${invoiceTaxTotal})`,
            path: 'Invoice/TaxTotal',
            value: { lineTotal: lineTaxTotal, invoiceTotal: invoiceTaxTotal },
        });
    }

    return issues;
}
