# Architecture

This document describes the system architecture, package structure, interfaces, and key architectural decision records (ADRs) for the PDM E-Invoice Open Core platform.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Package Structure](#package-structure)
3. [Core Interfaces](#core-interfaces)
4. [Multi-Tenancy Architecture](#multi-tenancy-architecture)
5. [Authentication & Authorization](#authentication--authorization)
6. [Storage Architecture](#storage-architecture)
7. [Email Ingestion](#email-ingestion)
8. [Architectural Decision Records (ADRs)](#architectural-decision-records)

---

## System Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                         │
│  • REST API (Fastify)                                       │
│  • CLI (Commander)                                          │
│  • (Future: Web UI)                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER                                          │
│  • Use cases (ingest, validate, archive, export)           │
│  • Authentication & authorization                           │
│  • Event emission                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  DOMAIN LAYER                                               │
│  • Core types (Invoice, Supplier, ValidationResult)        │
│  • Validation rules engine (pure functions)                │
│  • Business logic (no I/O)                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE LAYER                                       │
│  • Adapters: Mail (IMAP), Storage (S3/FS), XML Parsing     │
│  • Database (Postgres + Drizzle ORM)                        │
│  • External services (email, blob storage)                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Dependency Inversion**: Domain layer has no dependencies on infrastructure
2. **Interface-Based Design**: All I/O behind interfaces for testability and swappability
3. **Immutability**: Original XML blobs are never modified; all changes create new records
4. **Event Sourcing (Lite)**: Events capture state changes for audit and analytics
5. **Defense in Depth**: Multi-tenancy enforced at app layer AND database layer (RLS)

---

## Package Structure

### Monorepo Layout

```
e-rechnung-tool/
packages/
├── core/                      # Domain types, schemas, events
│   ├── src/
│   │   ├── types/            # TypeScript domain types
│   │   │   ├── invoice.ts
│   │   │   ├── supplier.ts
│   │   │   ├── validation.ts
│   │   │   └── events.ts
│   │   ├── schemas/          # Zod schemas for runtime validation
│   │   │   ├── invoice.schema.ts
│   │   │   └── api.schema.ts
│   │   └── index.ts
│   ├── package.json
│   └── README.md
│
├── validator/                 # EN 16931 validation engine
│   ├── src/
│   │   ├── rules/            # Individual rule implementations
│   │   │   ├── invoice-core.rules.ts
│   │   │   ├── tax.rules.ts
│   │   │   ├── parties.rules.ts
│   │   │   └── totals.rules.ts
│   │   ├── engine.ts         # Rule orchestration
│   │   └── index.ts
│   ├── tests/
│   │   └── rules.test.ts
│   └── package.json
│
├── adapters/
│   ├── parse-xml/            # XML format detection & parsing
│   │   ├── src/
│   │   │   ├── detector.ts   # Detect XRechnung/ZUGFeRD/Unknown
│   │   │   ├── parsers/
│   │   │   │   ├── xrechnung-ubl.parser.ts
│   │   │   │   ├── xrechnung-cii.parser.ts
│   │   │   │   └── zugferd.parser.ts
│   │   │   ├── mapper.ts     # Map to domain model
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── storage-fs/           # Local filesystem storage adapter
│   │   ├── src/
│   │   │   ├── fs-storage.ts # Implements StorageProvider interface
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── storage-s3/           # S3-compatible storage adapter
│   │   ├── src/
│   │   │   ├── s3-storage.ts # Implements StorageProvider interface
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── mail-imap/            # IMAP email fetcher
│       ├── src/
│       │   ├── imap-client.ts # Implements MailProvider interface
│       │   └── index.ts
│       └── package.json
│
├── api/                       # Fastify REST API
│   ├── src/
│   │   ├── server.ts         # Fastify app setup
│   │   ├── plugins/
│   │   │   ├── auth.ts       # JWT/session auth
│   │   │   ├── rls.ts        # RLS session variable setter
│   │   │   └── logging.ts    # Pino logger
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── invoices.routes.ts
│   │   │   ├── exports.routes.ts
│   │   │   └── analytics.routes.ts
│   │   ├── services/
│   │   │   ├── ingest.service.ts
│   │   │   ├── validation.service.ts
│   │   │   └── export.service.ts
│   │   ├── db/
│   │   │   ├── schema.ts     # Drizzle schema definitions
│   │   │   ├── migrations/   # SQL migration files
│   │   │   └── client.ts     # Drizzle client setup
│   │   └── index.ts
│   └── package.json
│
└── cli/                       # Command-line interface
    ├── src/
    │   ├── commands/
    │   │   ├── validate.ts   # einvoice validate <file>
    │   │   ├── export.ts     # einvoice export
    │   │   └── analyze.ts    # einvoice analyze
    │   ├── cli.ts            # Commander setup
    │   └── index.ts
    └── package.json
```

---

## Core Interfaces

### StorageProvider (Blob Storage)

```typescript
// packages/core/src/types/storage.ts

export interface StorageProvider {
  /**
   * Store a blob and return its key
   */
  put(params: {
    tenantId: string;
    path: string;        // e.g., "invoices/uuid/original/file.xml"
    data: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<{ key: string; checksum: string }>;

  /**
   * Retrieve a blob by key
   */
  get(params: {
    tenantId: string;
    key: string;
  }): Promise<{ data: Buffer; contentType: string; metadata?: Record<string, string> }>;

  /**
   * Generate a signed download URL (expires in N seconds)
   */
  getSignedUrl(params: {
    tenantId: string;
    key: string;
    expiresIn: number;  // seconds
  }): Promise<string>;

  /**
   * Delete a blob (for cleanup/testing)
   */
  delete(params: {
    tenantId: string;
    key: string;
  }): Promise<void>;
}
```

### MailProvider (Email Ingestion)

```typescript
// packages/core/src/types/mail.ts

export interface MailProvider {
  /**
   * Fetch unread emails from configured mailbox
   */
  fetchUnread(params: {
    tenantId: string;
    since?: Date;
  }): Promise<EmailMessage[]>;

  /**
   * Mark an email as processed
   */
  markAsRead(params: {
    tenantId: string;
    messageId: string;
  }): Promise<void>;
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  receivedAt: Date;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
}
```

### InvoiceParser (Format Detection & Parsing)

```typescript
// packages/core/src/types/parser.ts

export interface InvoiceParser {
  /**
   * Detect format from XML content
   */
  detectFormat(xml: Buffer): Promise<InvoiceFormat>;

  /**
   * Parse XML to domain model
   */
  parse(xml: Buffer, format: InvoiceFormat): Promise<ParsedInvoice>;
}

export type InvoiceFormat =
  | 'xrechnung_ubl'
  | 'xrechnung_cii'
  | 'zugferd_cii'
  | 'facturx'
  | 'unknown';

export interface ParsedInvoice {
  invoiceNumber: string;
  issueDate: string;
  currency: string;
  seller: PartyInfo;
  buyer: PartyInfo;
  totals: {
    net: number;
    tax: number;
    gross: number;
  };
  lineItems: LineItem[];
  paymentTerms?: PaymentTerms;
}
```

### ValidationEngine

```typescript
// packages/core/src/types/validation.ts

export interface ValidationEngine {
  /**
   * Validate a parsed invoice against EN 16931 rules
   */
  validate(invoice: ParsedInvoice): Promise<ValidationResult>;
}

export interface ValidationResult {
  status: 'PASS' | 'FAIL';
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  code: string;        // e.g., "INV-01"
  message: string;
  path?: string;       // XPath-like path
  value?: unknown;
}
```

---

## Multi-Tenancy Architecture

### Row-Level Security (RLS) Model

**Design Philosophy**: Tenant isolation is enforced at BOTH the application and database layers for defense-in-depth.

#### Database Configuration

```sql
-- Create app user (not superuser)
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';

-- Enable RLS on tenant tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON suppliers
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON events
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Grant minimal permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

#### Application-Layer Enforcement

```typescript
// packages/api/src/plugins/rls.ts

export const rlsPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const tenantId = extractTenantId(request); // from session or API key

    if (!tenantId) {
      throw new Error('Tenant ID not found in request context');
    }

    // Set session variable for RLS
    await fastify.db.execute(
      sql`SET LOCAL app.tenant_id = ${tenantId}`
    );
  });
});

function extractTenantId(request: FastifyRequest): string | null {
  // From user session
  if (request.user?.tenantId) {
    return request.user.tenantId;
  }

  // From API key
  if (request.apiKey?.tenantId) {
    return request.apiKey.tenantId;
  }

  return null;
}
```

#### Background Jobs

```typescript
// Background jobs MUST explicitly set tenant context
async function processEmailForTenant(tenantId: string) {
  await db.execute(sql`SET LOCAL app.tenant_id = ${tenantId}`);

  // Now all queries are tenant-scoped
  const invoices = await db.select().from(schema.invoices);
}
```

---

## Authentication & Authorization

### Hybrid Model: Users + API Keys

#### User Authentication (Web/API)

```typescript
// Session-based for web UI
POST /api/auth/login
  → Validate email/password (bcrypt)
  → Generate session token (HTTP-only cookie)
  → Set user context with tenant_id

// JWT-based for API clients (optional)
POST /api/auth/login
  → Return short-lived JWT (15min) + refresh token (7 days)
```

#### API Key Authentication (Programmatic)

```typescript
// Format: pdm_live_<random_32_chars>
// Stored hashed in DB (like passwords)

Authorization: Bearer pdm_live_abc123def456...

// Lookup:
const apiKey = await db
  .select()
  .from(schema.apiKeys)
  .where(eq(schema.apiKeys.prefix, 'pdm_live_'))
  .where(sql`secret_hash = crypt(${providedSecret}, secret_hash)`)
  .limit(1);

// Set tenant context from key
await db.execute(sql`SET LOCAL app.tenant_id = ${apiKey.tenantId}`);
```

#### Role-Based Access Control (RBAC)

```typescript
enum Role {
  OWNER = 'OWNER',       // Full access
  FINANCE = 'FINANCE',   // Read/export, no admin
  READONLY = 'READONLY'  // Read-only
}

// Enforcement in route handlers
fastify.get('/api/invoices', {
  preHandler: requireRole([Role.OWNER, Role.FINANCE, Role.READONLY]),
}, async (request, reply) => {
  // ...
});

fastify.post('/api/invoices/:id/archive', {
  preHandler: requireRole([Role.OWNER, Role.FINANCE]),
}, async (request, reply) => {
  // ...
});
```

---

## Storage Architecture

### S3-Compatible Blob Storage

#### Bucket Layout

```
s3://e-rechnung-tool-<env>/
  tenants/
    <tenant_id>/
      invoices/
        <invoice_id>/
          original/
            invoice.xml
            invoice.pdf (if hybrid)
          metadata.json
      exports/
        <yyyymm>/
          <export_id>/
            bundle.zip
            bundle.sha256
            report.json
```

#### Metadata File Format

```json
{
  "invoice_id": "uuid",
  "tenant_id": "uuid",
  "original_filename": "rechnung-2024-001.xml",
  "content_type": "application/xml",
  "size_bytes": 12345,
  "checksum": "sha256:abcdef1234567890...",
  "uploaded_by": "user_id or api_key_id",
  "uploaded_at": "2024-10-06T12:00:00Z"
}
```

#### Local FS Adapter (Development)

```
.data/
  tenants/
    <tenant_id>/
      invoices/
        <invoice_id>/
          ...
```

Same structure as S3; swappable via interface.

---

## Email Ingestion

### Email Routing

#### Plus-Addressing (Default)

```
invoices+<tenantSlug>+<6charToken>@einvoice.e-rechnung.example

Example: invoices+acme+abc123@einvoice.e-rechnung.example
```

- **tenantSlug**: Human-readable (e.g., "acme", "berlin-handwerk")
- **6charToken**: Random token (prevents guessing; acts as checksum)

#### IMAP Fetcher (Optional)

```typescript
// Tenant configures IMAP credentials
{
  "host": "imap.customer-domain.com",
  "port": 993,
  "user": "rechnung@customer-domain.com",
  "password": "encrypted_password",
  "tls": true
}

// Fetcher runs every 5 minutes per tenant
await imapClient.fetchUnread({ tenantId });
```

### Security Controls

- **SPF/DKIM/DMARC**: Validate headers; log failures
- **Size limits**: Reject attachments >10MB
- **MIME type allowlist**: XML, PDF, ZIP only
- **Deduplication**: By (supplier, invoice_number, total, date) fingerprint

---

## Architectural Decision Records (ADRs)

### ADR-001: TypeScript + Node.js

**Status**: Accepted  
**Decision**: Use TypeScript (strict mode) and Node.js 20+ for all backend code.

**Rationale**:
- TypeScript provides compile-time safety and excellent tooling
- Node.js has mature ecosystem for XML parsing, API frameworks, and database drivers
- Strong typing reduces runtime errors and improves maintainability
- Strict mode enforces best practices (no implicit `any`, strict null checks)

**Alternatives Considered**:
- Python: Weaker typing, slower startup times
- Go: Steeper learning curve, less suitable for rapid MVP iteration

---

### ADR-002: Postgres with Drizzle ORM

**Status**: Accepted  
**Decision**: Use PostgreSQL 15+ as the primary database with Drizzle ORM.

**Rationale**:
- Postgres offers robust RLS (Row-Level Security) for multi-tenancy
- JSONB support for flexible invoice data storage
- Drizzle is lightweight, SQL-transparent, and type-safe
- Better control over queries compared to heavier ORMs (Prisma, TypeORM)

**Alternatives Considered**:
- Prisma: Heavier, less SQL control, slower for complex queries
- TypeORM: Older, less type-safe
- Raw SQL: Too low-level, error-prone for rapid development

---

### ADR-003: Row-Level Security (RLS) for Multi-Tenancy

**Status**: Accepted  
**Decision**: Use shared tables with `tenant_id` column and Postgres RLS policies.

**Rationale**:
- Defense-in-depth: Database enforces isolation even if app logic fails
- Simpler ops than schema-per-tenant or DB-per-tenant
- Scales to hundreds of tenants easily
- Standard approach for SaaS applications

**Alternatives Considered**:
- Schema-per-tenant: Complex migrations, backup/restore challenges
- DB-per-tenant: Overkill for MVP; connection pool exhaustion risk

---

### ADR-004: S3-Compatible Blob Storage

**Status**: Accepted  
**Decision**: Use S3-compatible API for blob storage (AWS S3, MinIO, etc.) with a filesystem adapter for local development.

**Rationale**:
- Industry-standard interface (boto3, AWS SDK)
- Decouples storage from compute (stateless API servers)
- Easy to swap providers (AWS S3, GCS, Azure Blob via S3-compatible gateways)
- Local FS adapter enables offline development

**Alternatives Considered**:
- Database BLOBs: Poor performance, increases DB size
- Direct filesystem: Doesn't scale horizontally

---

### ADR-005: Fastify for API Framework

**Status**: Accepted  
**Decision**: Use Fastify as the HTTP framework with Pino for logging.

**Rationale**:
- Fastest Node.js framework (benchmarked)
- Built-in schema validation (JSON Schema)
- Excellent TypeScript support
- Plugin architecture fits our modular design
- Pino integration for structured logging

**Alternatives Considered**:
- Express: Slower, less modern, weaker TypeScript support
- NestJS: Over-engineered for MVP; heavy abstractions

---

### ADR-006: Hybrid Authentication (Users + API Keys)

**Status**: Accepted  
**Decision**: Support both user accounts (session/JWT) and API keys (prefix + hashed secret).

**Rationale**:
- Users need web UI access with login/logout
- Machines (IMAP fetcher, integrations) need long-lived credentials
- API keys are safer than sharing user passwords
- Both mechanisms map to `tenant_id` for RLS enforcement

**Alternatives Considered**:
- OAuth 2.0: Overkill for MVP; adds complexity
- API keys only: Poor UX for human users

---

### ADR-007: Email Routing via Plus-Addressing

**Status**: Accepted  
**Decision**: Use plus-addressing (invoices+slug+token@...) as the primary email routing mechanism, with optional IMAP as an alternative.

**Rationale**:
- Simple to implement (catch-all mailbox + regex parsing)
- Works with CC/BCC (supplier can CC their own records)
- Token prevents tenant slug guessing attacks
- IMAP available for customers who prefer not to forward emails

**Alternatives Considered**:
- Subdomain routing (slug.einvoice.pdm.example): DNS complexity, SSL cert management
- Unique inboxes per tenant: Expensive, doesn't scale

---

### ADR-008: Validation as Pure Functions

**Status**: Accepted  
**Decision**: Implement validation rules as pure, deterministic functions with no I/O.

**Rationale**:
- Testability: Easy to unit test with fixtures
- Reliability: Same input always produces same output
- Performance: No network/DB calls in hot path
- Audibility: Rules can be versioned and traced

**Alternatives Considered**:
- Rule engine DSL (Drools, etc.): Overkill; learning curve
- Database-driven rules: Slower; harder to version control

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-06  
**Maintained by**: E-Rechnung Tool Core Team
