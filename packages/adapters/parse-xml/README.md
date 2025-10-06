# @e-rechnung/parse-xml

XML format detection and parsing for e-invoices in the E-Rechnung Tool.

## Overview

This package provides XML parsing capabilities for various e-invoice formats:

- **XRechnung UBL**: German standard using UBL 2.1
- **XRechnung CII**: German standard using CII D16B
- **ZUGFeRD**: German hybrid format (PDF + XML)
- **Factur-X**: French hybrid format (PDF + XML)

## Features

- **Format Detection**: Automatically detect invoice format from XML content
- **Multi-Format Support**: Parse UBL and CII formats
- **Robust Parsing**: Handle missing fields gracefully
- **Type Safety**: Full TypeScript support with domain types

## Usage

```typescript
import { XmlInvoiceParser } from '@e-rechnung/parse-xml';
import type { ParsedInvoice, InvoiceFormat } from '@e-rechnung/core';

const parser = new XmlInvoiceParser();

// Detect format
const format = await parser.detectFormat(xmlBuffer);

// Parse to domain model
const invoice = await parser.parse(xmlBuffer, format);

console.log('Invoice:', invoice.invoiceNumber);
console.log('Seller:', invoice.seller.name);
console.log('Total:', invoice.totals.gross);
```

## Supported Formats

### XRechnung UBL
- **Namespace**: `urn:oasis:names:specification:ubl:schema:xsd:Invoice`
- **Structure**: Standard UBL Invoice with German customization
- **CustomizationID**: Contains "xrechnung" or "XRechnung"

### XRechnung CII
- **Root Element**: `rsm:CrossIndustryInvoice`
- **Structure**: CII D16B format
- **Guideline ID**: Contains "xrechnung" or "XRechnung"

### ZUGFeRD CII
- **Root Element**: `rsm:CrossIndustryInvoice`
- **Structure**: CII D16B format
- **Guideline ID**: Contains "zugferd", "ZUGFeRD", "BASIC", or "EN16931"

### Factur-X CII
- **Root Element**: `rsm:CrossIndustryInvoice`
- **Structure**: CII D16B format
- **Guideline ID**: Contains "factur-x" or "Factur-X"

## Parser Components

### FormatDetector
Automatically detects the invoice format by analyzing XML structure and namespaces.

### InvoiceMapper
Maps parsed XML data to the domain model using format-specific parsers.

### Individual Parsers
- `XRechnungUblParser`: Handles UBL format
- `XRechnungCiiParser`: Handles CII format

## Error Handling

The parser handles missing fields gracefully and provides meaningful error messages:

```typescript
try {
  const invoice = await parser.parse(xmlBuffer, format);
} catch (error) {
  if (error.message.includes('Missing')) {
    console.log('Required field missing:', error.message);
  }
}
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Test
pnpm test

# Lint
pnpm lint
```

## Dependencies

- `fast-xml-parser`: XML parsing library
- `@e-rechnung/core`: Domain types and interfaces
