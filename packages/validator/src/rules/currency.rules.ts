/**
 * Currency validation rules (CUR-01, CUR-02)
 */

import type { ParsedInvoice, ValidationIssue } from '@e-rechnung/core';

// Valid ISO 4217 currency codes (subset for common European currencies)
const VALID_CURRENCIES = new Set([
    'EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF',
    'RON', 'BGN', 'HRK', 'RSD', 'MKD', 'ALL', 'BAM', 'MKD', 'MDL', 'UAH'
]);

export function validateCurrency(invoice: ParsedInvoice): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!invoice.currency || invoice.currency.trim() === '') {
        issues.push({
            code: 'CUR-01',
            message: 'Currency code is required',
            path: 'Invoice/DocumentCurrencyCode',
        });
        return issues;
    }

    const currency = invoice.currency.toUpperCase();
    if (!VALID_CURRENCIES.has(currency)) {
        issues.push({
            code: 'CUR-02',
            message: `Currency code must be a valid ISO 4217 code (e.g., EUR, USD). Found: ${currency}`,
            path: 'Invoice/DocumentCurrencyCode',
            value: currency,
        });
    }

    return issues;
}
