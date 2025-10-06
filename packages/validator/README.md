# @e-rechnung/validator

EN 16931 validation rule engine for the E-Rechnung Tool.

## Overview

This package implements a comprehensive validation engine for e-invoices according to the EN 16931 standard subset defined in our MVP requirements.

## Features

- **Pure Functions**: All validation rules are deterministic with no I/O
- **Stable Rule IDs**: Rule codes (e.g., INV-01) are immutable once published
- **Severity Levels**: FAIL (block auto-archive) vs WARN (highlight in reports)
- **Comprehensive Coverage**: Core invoice fields, currency, totals, line items, parties, tax

## Validation Rules

### FAIL Rules (Critical)

| Rule ID | Description | Path |
|---------|-------------|------|
| INV-01 | Missing invoice number | Invoice/ID |
| INV-02 | Missing issue date | Invoice/IssueDate |
| INV-03 | Invalid issue date (future/invalid) | Invoice/IssueDate |
| CUR-01 | Missing currency | Invoice/DocumentCurrencyCode |
| CUR-02 | Invalid currency code | Invoice/DocumentCurrencyCode |
| SUM-01 | Missing totals | Invoice/LegalMonetaryTotal |
| SUM-02 | Totals mismatch (net + tax ≠ gross) | Invoice/LegalMonetaryTotal |
| SUM-03 | Negative total amounts | Invoice/LegalMonetaryTotal |
| LIN-01 | No line items | Invoice/InvoiceLine |
| LIN-02 | Line missing description | InvoiceLine/Item/Name |
| LIN-03 | Line missing quantity | InvoiceLine/InvoicedQuantity |
| LIN-04 | Line missing unit price | InvoiceLine/Price/PriceAmount |
| LIN-05 | Line amount mismatch | InvoiceLine/LineExtensionAmount |
| SELL-01 | Missing seller name | Invoice/AccountingSupplierParty/Party/PartyName |
| SELL-02 | Missing seller address | Invoice/AccountingSupplierParty/Party/PostalAddress |
| SELL-03 | Missing seller VAT ID | Invoice/AccountingSupplierParty/Party/PartyTaxScheme/CompanyID |
| BUY-01 | Missing buyer name | Invoice/AccountingCustomerParty/Party/PartyName |
| BUY-02 | Missing buyer address | Invoice/AccountingCustomerParty/Party/PostalAddress |
| TAX-01 | Missing tax breakdown | Invoice/TaxTotal/TaxSubtotal |
| TAX-04 | Tax calculation mismatch | Invoice/TaxTotal |

### WARN Rules (Best Practices)

| Rule ID | Description | Path |
|---------|-------------|------|
| PAY-01 | Missing payment instructions | Invoice/PaymentMeans |
| PAY-02 | Missing payment due date | Invoice/PaymentMeans/PaymentDueDate |
| REF-01 | Missing purchase order reference | Invoice/OrderReference/ID |
| REF-02 | Missing contract reference | Invoice/ContractDocumentReference/ID |
| CONT-01 | Missing seller contact | Invoice/AccountingSupplierParty/Party/Contact |

## Usage

```typescript
import { En16931ValidationEngine } from '@e-rechnung/validator';
import type { ParsedInvoice } from '@e-rechnung/core';

const validator = new En16931ValidationEngine();

const result = await validator.validate(parsedInvoice);

if (result.status === 'FAIL') {
  console.log('Validation failed:', result.errors);
}

if (result.warnings.length > 0) {
  console.log('Warnings:', result.warnings);
}
```

## Testing

Each rule has comprehensive unit tests:

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Lint
pnpm lint
```
