# @e-rechnung/core

Core domain types, schemas, and interfaces for the E-Rechnung Tool.

## Overview

This package contains:

- **Domain Types**: TypeScript interfaces for invoices, validation, storage, mail, parsing, and events
- **Zod Schemas**: Runtime validation schemas for API requests/responses and domain objects
- **Core Interfaces**: Abstract interfaces for storage providers, mail providers, parsers, and validation engines

## Key Types

### Invoice Types
- `Invoice` - Complete invoice domain model
- `ParsedInvoice` - Parsed invoice data from XML
- `InvoiceFormat` - Supported formats (XRechnung, ZUGFeRD, etc.)
- `InvoiceStatus` - Processing status (PENDING, VALID, FAILED, etc.)

### Validation Types
- `ValidationResult` - Result of validation with errors/warnings
- `ValidationIssue` - Individual validation issue with code and message
- `ValidationEngine` - Interface for validation engines

### Storage Types
- `StorageProvider` - Interface for blob storage (S3, local FS)
- `BlobMetadata` - Metadata for stored files

### Mail Types
- `MailProvider` - Interface for email ingestion (IMAP, webhooks)
- `EmailMessage` - Email message with attachments

### Parser Types
- `InvoiceParser` - Interface for XML format detection and parsing
- `ParsingResult` - Result of parsing with confidence score

### Event Types
- `Event` - Audit events for logging and analytics
- Various event types: `InvoiceReceivedEvent`, `ValidationCompletedEvent`, etc.

## Usage

```typescript
import { Invoice, ValidationResult, StorageProvider } from '@e-rechnung/core';

// Use domain types
const invoice: Invoice = { /* ... */ };

// Use validation schemas
import { InvoiceSchema } from '@e-rechnung/core';
const validatedInvoice = InvoiceSchema.parse(rawData);

// Implement interfaces
class S3StorageProvider implements StorageProvider {
  async put(params) { /* ... */ }
  async get(params) { /* ... */ }
  // ...
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
