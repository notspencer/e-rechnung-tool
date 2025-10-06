/**
 * Parties validation rules (SELL-01 through BUY-02)
 */

import type { ParsedInvoice, ValidationIssue } from '@e-rechnung/core';

export function validateSeller(invoice: ParsedInvoice): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // SELL-01: Missing seller name
    if (!invoice.seller.name || invoice.seller.name.trim() === '') {
        issues.push({
            code: 'SELL-01',
            message: 'Seller name is required',
            path: 'Invoice/AccountingSupplierParty/Party/PartyName',
        });
    }

    // SELL-02: Missing seller address
    if (!invoice.seller.address || !invoice.seller.address.country) {
        issues.push({
            code: 'SELL-02',
            message: 'Seller postal address (minimum: country) is required',
            path: 'Invoice/AccountingSupplierParty/Party/PostalAddress',
        });
    }

    // SELL-03: Missing seller VAT ID
    if (!invoice.seller.vatId || invoice.seller.vatId.trim() === '') {
        issues.push({
            code: 'SELL-03',
            message: 'Seller VAT ID or tax registration number is required',
            path: 'Invoice/AccountingSupplierParty/Party/PartyTaxScheme/CompanyID',
        });
    }

    return issues;
}

export function validateBuyer(invoice: ParsedInvoice): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // BUY-01: Missing buyer name
    if (!invoice.buyer.name || invoice.buyer.name.trim() === '') {
        issues.push({
            code: 'BUY-01',
            message: 'Buyer name is required',
            path: 'Invoice/AccountingCustomerParty/Party/PartyName',
        });
    }

    // BUY-02: Missing buyer address
    if (!invoice.buyer.address || !invoice.buyer.address.country) {
        issues.push({
            code: 'BUY-02',
            message: 'Buyer postal address (minimum: country) is required',
            path: 'Invoice/AccountingCustomerParty/Party/PostalAddress',
        });
    }

    return issues;
}
