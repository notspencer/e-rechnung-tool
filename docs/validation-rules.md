# EN 16931 Validation Rules (MVP Subset)

This document defines the validation rules for the MVP implementation of the PDM E-Invoice platform. These rules represent a pragmatic subset of the full EN 16931 standard, focused on the most critical requirements for German e-invoicing compliance.

---

## Rule Design Principles

1. **Stable IDs**: Rule codes (e.g., `INV-01`) are immutable once published
2. **Pure Functions**: Rules must be deterministic with no I/O or side effects
3. **Clear Severity**: FAIL blocks auto-archive; WARN highlights issues but allows processing
4. **Human-Readable**: Error messages include context and suggest fixes
5. **Testable**: Every rule has unit tests with passing and failing examples

---

## Severity Levels

| Severity | Meaning | Behavior |
|----------|---------|----------|
| **FAIL** | Must-have compliance requirement | Invoice cannot be auto-archived; manual override allowed with logged reason |
| **WARN** | Should-have best practice | Invoice can be archived; issue highlighted in reports and analytics |

---

## Validation Return Schema

```typescript
{
  status: "PASS" | "FAIL",
  errors: [
    {
      code: string,        // e.g., "INV-01"
      message: string,     // Human-readable description
      path?: string,       // XPath-like path to field (e.g., "Invoice/InvoiceNumber")
      value?: any          // Actual value that failed (for debugging)
    }
  ],
  warnings: [
    {
      code: string,
      message: string,
      path?: string,
      value?: any
    }
  ]
}
```

---

## FAIL Rules (Critical)

### Invoice Core Fields

#### INV-01: Missing Invoice Number
**Requirement**: Every invoice must have a unique invoice number  
**Path**: `Invoice/ID` (UBL) or `rsm:ExchangedDocument/ram:ID` (CII)  
**Message**: "Invoice number is required"  
**Example Failure**: `<ID></ID>` or missing element

#### INV-02: Missing Issue Date
**Requirement**: Invoice must have an issue date  
**Path**: `Invoice/IssueDate` (UBL) or `rsm:ExchangedDocument/ram:IssueDateTime` (CII)  
**Message**: "Invoice issue date is required"  
**Format**: ISO 8601 date (YYYY-MM-DD)  
**Example Failure**: Missing date or invalid format

#### INV-03: Invalid Issue Date
**Requirement**: Issue date must be a valid date and not in the future  
**Message**: "Invoice issue date must be valid and not in the future"  
**Example Failure**: Date like "2099-12-31" or malformed "32-13-2024"

---

### Currency

#### CUR-01: Missing Currency
**Requirement**: Invoice must specify a currency code  
**Path**: `Invoice/DocumentCurrencyCode` (UBL) or `ram:InvoiceCurrencyCode` (CII)  
**Message**: "Currency code is required"  
**Valid Values**: ISO 4217 3-letter codes (EUR, USD, GBP, etc.)  
**Example Failure**: Missing or empty currency element

#### CUR-02: Invalid Currency Code
**Requirement**: Currency must be a valid ISO 4217 code  
**Message**: "Currency code must be a valid ISO 4217 code (e.g., EUR, USD)"  
**Example Failure**: "EURO", "€", or non-standard codes

---

### Totals & Amounts

#### SUM-01: Missing Totals
**Requirement**: Invoice must include monetary totals (net, tax, gross)  
**Path**: `Invoice/LegalMonetaryTotal` (UBL) or `ram:SpecifiedTradeSettlementHeaderMonetarySummation` (CII)  
**Message**: "Invoice totals (net, tax, gross) are required"  
**Example Failure**: Missing `TaxExclusiveAmount`, `TaxInclusiveAmount`, or `PayableAmount`

#### SUM-02: Totals Mismatch
**Requirement**: Net + Tax must equal Gross (within rounding tolerance of 0.01)  
**Formula**: `total_net + total_tax = total_gross ± 0.01`  
**Message**: "Invoice totals are inconsistent: Net ({net}) + Tax ({tax}) ≠ Gross ({gross})"  
**Example Failure**: Net=100.00, Tax=19.00, Gross=120.00 (should be 119.00)

#### SUM-03: Negative Total Amounts
**Requirement**: Total amounts should not be negative (except for credit notes)  
**Message**: "Total gross amount cannot be negative for standard invoices"  
**Note**: This is a WARN for credit notes (type 381), FAIL for standard invoices (type 380)

---

### Line Items

#### LIN-01: No Line Items
**Requirement**: Invoice must have at least one line item  
**Path**: `Invoice/InvoiceLine` (UBL) or `ram:IncludedSupplyChainTradeLineItem` (CII)  
**Message**: "Invoice must contain at least one line item"  
**Example Failure**: Empty `<InvoiceLine>` array or missing element

#### LIN-02: Line Missing Description
**Requirement**: Each line item must have a description  
**Path**: `InvoiceLine/Item/Name` (UBL) or `ram:SpecifiedTradeProduct/ram:Name` (CII)  
**Message**: "Line item {line_id} is missing a description"  
**Example Failure**: Empty or missing `<Name>` element

#### LIN-03: Line Missing Quantity
**Requirement**: Each line must have a quantity  
**Path**: `InvoiceLine/InvoicedQuantity` (UBL) or `ram:BilledQuantity` (CII)  
**Message**: "Line item {line_id} is missing quantity"  
**Example Failure**: Missing or zero quantity without justification

#### LIN-04: Line Missing Unit Price
**Requirement**: Each line must have a unit price  
**Path**: `InvoiceLine/Price/PriceAmount` (UBL) or `ram:GrossPriceProductTradePrice` (CII)  
**Message**: "Line item {line_id} is missing unit price"

#### LIN-05: Line Amount Mismatch
**Requirement**: Line net amount must equal quantity × unit price (within 0.01 tolerance)  
**Formula**: `line_net = quantity × unit_price ± 0.01`  
**Message**: "Line item {line_id}: quantity × price ≠ line total"

---

### Tax

#### TAX-01: Missing Tax Breakdown
**Requirement**: Invoice must include tax breakdown (VAT categories and amounts)  
**Path**: `Invoice/TaxTotal/TaxSubtotal` (UBL) or `ram:ApplicableTradeTax` (CII)  
**Message**: "Tax breakdown is required (categories, rates, amounts)"  
**Example Failure**: Missing `<TaxSubtotal>` elements

#### TAX-02: Invalid Tax Category
**Requirement**: Tax category must be valid per EN 16931  
**Valid Values**: S (Standard), Z (Zero rated), E (Exempt), AE (Reverse charge), K (Intra-community), G (Free export)  
**Message**: "Invalid tax category code: {code}"  
**Example Failure**: Unknown category like "X" or missing category

#### TAX-03: Tax Rate Missing for Standard Rate
**Requirement**: Standard rate (category S) must include a tax percentage  
**Message**: "Tax category 'S' requires a tax rate percentage"  
**Example Failure**: `<TaxCategory>S</TaxCategory>` without `<Percent>19</Percent>`

#### TAX-04: Tax Calculation Mismatch
**Requirement**: Sum of line taxes must match total tax (within 0.05 tolerance for rounding)  
**Formula**: `Σ(line_tax) = total_tax ± 0.05`  
**Message**: "Sum of line item taxes does not match invoice tax total"

---

### Parties (Seller & Buyer)

#### SELL-01: Missing Seller Name
**Requirement**: Invoice must include seller legal name  
**Path**: `Invoice/AccountingSupplierParty/Party/PartyName` (UBL) or `ram:SellerTradeParty/ram:Name` (CII)  
**Message**: "Seller name is required"

#### SELL-02: Missing Seller Address
**Requirement**: Seller must have a postal address (at minimum: country)  
**Path**: `Invoice/AccountingSupplierParty/Party/PostalAddress` (UBL)  
**Message**: "Seller postal address (minimum: country) is required"

#### SELL-03: Missing Seller VAT ID
**Requirement**: Seller must have a tax registration identifier (VAT ID or Tax Number)  
**Path**: `Party/PartyTaxScheme/CompanyID` (UBL) or `ram:SpecifiedTaxRegistration/ram:ID` (CII)  
**Message**: "Seller VAT ID or tax registration number is required"  
**Example**: DE123456789 (German VAT format)

#### BUY-01: Missing Buyer Name
**Requirement**: Invoice must include buyer legal name  
**Path**: `Invoice/AccountingCustomerParty/Party/PartyName` (UBL) or `ram:BuyerTradeParty/ram:Name` (CII)  
**Message**: "Buyer name is required"

#### BUY-02: Missing Buyer Address
**Requirement**: Buyer must have a postal address (at minimum: country)  
**Path**: `Invoice/AccountingCustomerParty/Party/PostalAddress` (UBL)  
**Message**: "Buyer postal address (minimum: country) is required"

---

### Profile Compliance

#### PROF-01: Unsupported Profile
**Requirement**: Invoice must use a supported EN 16931 profile  
**Supported Profiles**:
- XRechnung (UBL or CII variants)
- ZUGFeRD 2.0+ (Profiles: BASIC, EN 16931)
- Factur-X (EN 16931 profile)

**Message**: "Invoice profile '{profile}' is not supported or not EN 16931 compliant"  
**Example Failure**: ZUGFeRD 1.0, BASIC WL (without line items), or proprietary formats

#### PROF-02: Missing Profile Identifier
**Requirement**: Invoice must declare its profile via CustomizationID  
**Path**: `Invoice/CustomizationID` (UBL) or `rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID` (CII)  
**Message**: "Profile identifier (CustomizationID) is missing or invalid"

---

## WARN Rules (Best Practices)

### Payment Terms

#### PAY-01: Missing Payment Instructions
**Requirement**: Invoice should include payment terms (IBAN, BIC, due date, or terms text)  
**Path**: `Invoice/PaymentMeans` (UBL) or `ram:SpecifiedTradePaymentTerms` (CII)  
**Message**: "Payment instructions (bank details or terms) are recommended for faster payment"  
**Impact**: Delays payment processing; increases clarification emails

#### PAY-02: Missing Payment Due Date
**Requirement**: Invoice should specify a payment due date  
**Path**: `Invoice/PaymentMeans/PaymentDueDate` or `ram:DueDateDateTime`  
**Message**: "Payment due date is missing; consider adding it to improve cash flow"

---

### Delivery & Performance

#### PERF-01: Missing Delivery/Performance Date
**Requirement**: For service invoices, a performance period should be specified  
**Path**: `Invoice/InvoicePeriod` (UBL) or `ram:BillingSpecifiedPeriod` (CII)  
**Message**: "Performance/delivery date or period is recommended for service invoices"  
**Impact**: May be required by buyer for booking; lack of date can delay approval

---

### References

#### REF-01: Missing Purchase Order Reference
**Requirement**: If buyer provided a PO number, it should be included  
**Path**: `Invoice/OrderReference/ID` (UBL) or `ram:BuyerOrderReferencedDocument/ram:IssuerAssignedID` (CII)  
**Message**: "Purchase order reference is missing; include it if provided by buyer"  
**Impact**: Delays invoice matching and approval at buyer's end

#### REF-02: Missing Contract Reference
**Requirement**: For invoices under a contract, reference the contract ID  
**Path**: `Invoice/ContractDocumentReference/ID` (UBL)  
**Message**: "Contract reference is recommended for contracted services"

---

### Contact Information

#### CONT-01: Missing Seller Contact
**Requirement**: Seller should provide contact details (email or phone)  
**Path**: `Party/Contact` (UBL) or `ram:DefinedTradeContact` (CII)  
**Message**: "Seller contact information (email/phone) is recommended for inquiries"

---

## Rule Testing Requirements

Every rule must have:

1. **At least 1 passing test**: Valid invoice that does NOT trigger the rule
2. **At least 1 failing test**: Invalid invoice that DOES trigger the rule
3. **Edge case tests**: Boundary conditions (e.g., totals at rounding threshold)
4. **Format variants**: Test both UBL and CII formats where applicable

### Example Test Structure

```typescript
describe('INV-01: Missing Invoice Number', () => {
  it('should PASS when invoice number is present', () => {
    const invoice = { id: 'INV-2024-001', /* ... */ };
    const result = validateInvoiceNumber(invoice);
    expect(result.errors).toHaveLength(0);
  });

  it('should FAIL when invoice number is missing', () => {
    const invoice = { id: '', /* ... */ };
    const result = validateInvoiceNumber(invoice);
    expect(result.errors).toContainEqual({
      code: 'INV-01',
      message: 'Invoice number is required',
      path: 'Invoice/ID'
    });
  });
});
```

---

## Future Extensions

The following rules are candidates for post-MVP:

- **IBAN validation**: Check IBAN format and checksum (currently only checks presence)
- **VAT calculation verification**: Deep dive into multi-rate invoices
- **Allowance/Charge validation**: Discounts and surcharges
- **Attachment validation**: Check for embedded PDF in ZUGFeRD
- **Cross-border rules**: Export-specific requirements (Intra-EU, third countries)
- **XSD schema validation**: Full schema compliance check (performance-intensive)

---

## References

- [EN 16931 Standard](https://ec.europa.eu/digital-building-blocks/wikis/display/DIGITAL/Obtaining+a+copy+of+EN+16931)
- [XRechnung Specification](https://www.xoev.de/xrechnung-16828)
- [ZUGFeRD Specification](https://www.ferd-net.de/standards/zugferd-2.2.1/index.html)
- [PEPPOL BIS Billing 3.0](https://docs.peppol.eu/poacc/billing/3.0/)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-06  
**Maintained by**: E-Rechnung Tool Core Team
