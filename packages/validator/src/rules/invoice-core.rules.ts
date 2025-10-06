/**
 * Core invoice validation rules (INV-01 through INV-03)
 */

import type { ParsedInvoice, ValidationIssue } from '@e-rechnung/core';

export function validateInvoiceNumber(invoice: ParsedInvoice): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === '') {
        issues.push({
            code: 'INV-01',
            message: 'Invoice number is required',
            path: 'Invoice/ID',
        });
    }

    return issues;
}

export function validateIssueDate(invoice: ParsedInvoice): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!invoice.issueDate) {
        issues.push({
            code: 'INV-02',
            message: 'Invoice issue date is required',
            path: 'Invoice/IssueDate',
        });
        return issues;
    }

    // Check if date is valid
    const issueDate = new Date(invoice.issueDate);
    if (isNaN(issueDate.getTime())) {
        issues.push({
            code: 'INV-03',
            message: 'Invoice issue date must be a valid date',
            path: 'Invoice/IssueDate',
            value: invoice.issueDate,
        });
        return issues;
    }

    // Check if date is not in the future
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    if (issueDate > now) {
        issues.push({
            code: 'INV-03',
            message: 'Invoice issue date must not be in the future',
            path: 'Invoice/IssueDate',
            value: invoice.issueDate,
        });
    }

    return issues;
}
