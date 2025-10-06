/**
 * Validation types and interfaces
 */

export type ValidationStatus = 'PASS' | 'FAIL';

export interface ValidationIssue {
    code: string;
    message: string;
    path?: string;
    value?: unknown;
}

export interface ValidationResult {
    status: ValidationStatus;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
}

export interface ValidationEngine {
    validate(invoice: ParsedInvoice): Promise<ValidationResult>;
}

// Import ParsedInvoice from invoice types
import type { ParsedInvoice } from './invoice.js';
