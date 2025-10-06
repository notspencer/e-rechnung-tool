/**
 * EN 16931 validation engine implementation
 */

import type { ParsedInvoice, ValidationResult, ValidationEngine } from '@e-rechnung/core';
import {
    validateInvoiceNumber,
    validateIssueDate,
    validateCurrency,
    validateTotals,
    validateLineItems,
    validateSeller,
    validateBuyer,
    validateTax,
    validatePaymentWarnings,
    validateReferenceWarnings,
    validateContactWarnings,
} from '../rules/index.js';

export class En16931ValidationEngine implements ValidationEngine {
    async validate(invoice: ParsedInvoice): Promise<ValidationResult> {
        const errors: ValidationResult['errors'] = [];
        const warnings: ValidationResult['warnings'] = [];

        // FAIL rules (critical)
        errors.push(...validateInvoiceNumber(invoice));
        errors.push(...validateIssueDate(invoice));
        errors.push(...validateCurrency(invoice));
        errors.push(...validateTotals(invoice));
        errors.push(...validateLineItems(invoice));
        errors.push(...validateSeller(invoice));
        errors.push(...validateBuyer(invoice));
        errors.push(...validateTax(invoice));

        // WARN rules (best practices)
        warnings.push(...validatePaymentWarnings(invoice));
        warnings.push(...validateReferenceWarnings(invoice));
        warnings.push(...validateContactWarnings(invoice));

        // Determine overall status
        const status: ValidationResult['status'] = errors.length === 0 ? 'PASS' : 'FAIL';

        return {
            status,
            errors,
            warnings,
        };
    }
}

// Default export
export const validationEngine = new En16931ValidationEngine();
