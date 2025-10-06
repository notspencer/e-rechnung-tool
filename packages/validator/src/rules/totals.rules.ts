/**
 * Totals validation rules (SUM-01, SUM-02, SUM-03)
 */

import type { ParsedInvoice, ValidationIssue } from '@e-rechnung/core';

const ROUNDING_TOLERANCE = 0.01;

export function validateTotals(invoice: ParsedInvoice): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const { net, tax, gross } = invoice.totals;

    // SUM-01: Missing totals
    if (net === undefined || tax === undefined || gross === undefined) {
        issues.push({
            code: 'SUM-01',
            message: 'Invoice totals (net, tax, gross) are required',
            path: 'Invoice/LegalMonetaryTotal',
        });
        return issues;
    }

    // SUM-02: Totals mismatch
    const calculatedGross = net + tax;
    const difference = Math.abs(calculatedGross - gross);

    if (difference > ROUNDING_TOLERANCE) {
        issues.push({
            code: 'SUM-02',
            message: `Invoice totals are inconsistent: Net (${net}) + Tax (${tax}) ≠ Gross (${gross})`,
            path: 'Invoice/LegalMonetaryTotal',
            value: { net, tax, gross, calculated: calculatedGross },
        });
    }

    // SUM-03: Negative totals (for standard invoices)
    if (gross < 0) {
        issues.push({
            code: 'SUM-03',
            message: 'Total gross amount cannot be negative for standard invoices',
            path: 'Invoice/LegalMonetaryTotal',
            value: gross,
        });
    }

    return issues;
}
