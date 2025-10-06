/**
 * Line items validation rules (LIN-01 through LIN-05)
 */

import type { ParsedInvoice, ValidationIssue } from '@e-rechnung/core';

const ROUNDING_TOLERANCE = 0.01;

export function validateLineItems(invoice: ParsedInvoice): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // LIN-01: No line items
    if (!invoice.lineItems || invoice.lineItems.length === 0) {
        issues.push({
            code: 'LIN-01',
            message: 'Invoice must contain at least one line item',
            path: 'Invoice/InvoiceLine',
        });
        return issues;
    }

    // Validate each line item
    invoice.lineItems.forEach((lineItem, index) => {
        const linePath = `Invoice/InvoiceLine[${index + 1}]`;

        // LIN-02: Missing description
        if (!lineItem.description || lineItem.description.trim() === '') {
            issues.push({
                code: 'LIN-02',
                message: `Line item ${lineItem.id} is missing a description`,
                path: `${linePath}/Item/Name`,
            });
        }

        // LIN-03: Missing quantity
        if (lineItem.quantity === undefined || lineItem.quantity <= 0) {
            issues.push({
                code: 'LIN-03',
                message: `Line item ${lineItem.id} is missing quantity`,
                path: `${linePath}/InvoicedQuantity`,
                value: lineItem.quantity,
            });
        }

        // LIN-04: Missing unit price
        if (lineItem.unitPrice === undefined || lineItem.unitPrice < 0) {
            issues.push({
                code: 'LIN-04',
                message: `Line item ${lineItem.id} is missing unit price`,
                path: `${linePath}/Price/PriceAmount`,
                value: lineItem.unitPrice,
            });
        }

        // LIN-05: Line amount mismatch
        if (lineItem.quantity !== undefined && lineItem.unitPrice !== undefined) {
            const calculatedNet = lineItem.quantity * lineItem.unitPrice;
            const difference = Math.abs(calculatedNet - lineItem.netAmount);

            if (difference > ROUNDING_TOLERANCE) {
                issues.push({
                    code: 'LIN-05',
                    message: `Line item ${lineItem.id}: quantity × price ≠ line total (${lineItem.quantity} × ${lineItem.unitPrice} = ${calculatedNet}, got ${lineItem.netAmount})`,
                    path: `${linePath}/LineExtensionAmount`,
                    value: { calculated: calculatedNet, actual: lineItem.netAmount },
                });
            }
        }
    });

    return issues;
}
