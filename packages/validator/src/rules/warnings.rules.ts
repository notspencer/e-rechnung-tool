/**
 * Warning rules (WARN level - PAY-01, PERF-01, REF-01, CONT-01)
 */

import type { ParsedInvoice, ValidationIssue } from '@e-rechnung/core';

export function validatePaymentWarnings(invoice: ParsedInvoice): ValidationIssue[] {
    const warnings: ValidationIssue[] = [];

    // PAY-01: Missing payment instructions
    if (!invoice.paymentTerms?.paymentMeans?.iban && !invoice.paymentTerms?.terms) {
        warnings.push({
            code: 'PAY-01',
            message: 'Payment instructions (bank details or terms) are recommended for faster payment',
            path: 'Invoice/PaymentMeans',
        });
    }

    // PAY-02: Missing payment due date
    if (!invoice.paymentTerms?.dueDate) {
        warnings.push({
            code: 'PAY-02',
            message: 'Payment due date is missing; consider adding it to improve cash flow',
            path: 'Invoice/PaymentMeans/PaymentDueDate',
        });
    }

    return warnings;
}

export function validateReferenceWarnings(invoice: ParsedInvoice): ValidationIssue[] {
    const warnings: ValidationIssue[] = [];

    // REF-01: Missing purchase order reference
    if (!invoice.references?.purchaseOrder) {
        warnings.push({
            code: 'REF-01',
            message: 'Purchase order reference is missing; include it if provided by buyer',
            path: 'Invoice/OrderReference/ID',
        });
    }

    // REF-02: Missing contract reference
    if (!invoice.references?.contract) {
        warnings.push({
            code: 'REF-02',
            message: 'Contract reference is recommended for contracted services',
            path: 'Invoice/ContractDocumentReference/ID',
        });
    }

    return warnings;
}

export function validateContactWarnings(invoice: ParsedInvoice): ValidationIssue[] {
    const warnings: ValidationIssue[] = [];

    // CONT-01: Missing seller contact
    if (!invoice.seller.contact?.email && !invoice.seller.contact?.phone) {
        warnings.push({
            code: 'CONT-01',
            message: 'Seller contact information (email/phone) is recommended for inquiries',
            path: 'Invoice/AccountingSupplierParty/Party/Contact',
        });
    }

    return warnings;
}
