# MVP Specification

This document defines the detailed functional requirements, API endpoints, data model, and user flows for the PDM E-Invoice MVP (receive-first).

---

## Table of Contents

1. [User Flows](#user-flows)
2. [API Endpoints](#api-endpoints)
3. [Data Model](#data-model)
4. [Event Schema](#event-schema)
5. [Sequence Diagrams](#sequence-diagrams)
6. [Acceptance Criteria](#acceptance-criteria)

---

## User Flows

### Flow 1: Email-In Invoice Capture

```
Supplier → Email (XML/PDF attached)
  ↓
Mail Server (catch-all: invoices+acme+abc123@einvoice.e-rechnung.example)
  ↓
IMAP Fetcher (background job, polls every 5 min)
  ↓
Parse email: extract attachments, sender, subject
  ↓
Detect tenant from To: address → set app.tenant_id
  ↓
For each attachment (XML/PDF/ZIP):
  - Store original blob → S3 (with SHA-256)
  - Detect format (XRechnung/ZUGFeRD/Other)
  - Parse → domain model (if e-invoice)
  - Run validation rules → PASS/FAIL/WARN
  - Create invoice record in DB
  - Deduplicate by (supplier, invoice_number, total, date)
  - Emit event: invoice_received
  ↓
User sees invoice in dashboard (status: PENDING or VALID)
```

### Flow 2: Manual Upload

```
User → Web UI: Upload XML/PDF/ZIP
  ↓
API: POST /api/invoices/upload (multipart/form-data)
  ↓
Auth: Extract tenant_id from session → set app.tenant_id
  ↓
Validate file: size <10MB, allowed MIME types
  ↓
Store blob → S3 (with SHA-256)
  ↓
Detect format → parse → validate → create invoice
  ↓
Return: { invoice_id, status, validation }
  ↓
User sees invoice details immediately
```

### Flow 3: Invoice Review & Archive

```
User → Dashboard: View invoices (filter: PENDING, VALID, FAILED)
  ↓
Click invoice → Detail view
  ↓
Display:
  - Parsed fields (seller, buyer, totals, lines)
  - Validation status (errors, warnings)
  - Original XML (read-only, syntax-highlighted)
  - Actions: Archive, Flag, Export
  ↓
User clicks "Archive"
  ↓
API: POST /api/invoices/:id/archive
  ↓
Update status: PENDING → ARCHIVED
  ↓
Set archived_at timestamp
  ↓
Emit event: invoice_archived
```

### Flow 4: CSV Export

```
User → Dashboard: Export (date range, filters)
  ↓
API: POST /api/exports (params: from, to, format=csv, include_xml=true)
  ↓
Background job:
  - Query invoices matching criteria
  - Generate CSV (header + line items)
  - Bundle original XMLs → ZIP
  - Create manifest.json (checksums, counts)
  - Store export bundle → S3
  - Emit event: export_created
  ↓
User receives email: "Export ready"
  ↓
Download link (signed S3 URL, expires in 24h)
```

### Flow 5: Manual Fix ("Other" Invoices)

```
User → Invoice detail (type: OTHER)
  ↓
Click "Enter Manually"
  ↓
Form: invoice_number, date, seller, buyer, totals, lines
  ↓
Submit → API: POST /api/invoices/:id/manual-data
  ↓
Store manual data (separate JSON column)
  ↓
Update status: OTHER → MANUAL
  ↓
Allow archive/export alongside e-invoices
```

---

## API Endpoints

### Authentication

#### POST /api/auth/login
**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response** (200):
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "role": "OWNER" },
  "token": "jwt_or_session_cookie",
  "expires_in": 900
}
```

#### POST /api/auth/logout
**Response** (204): No content

#### POST /api/auth/api-keys
**Request**:
```json
{
  "name": "IMAP Fetcher",
  "scopes": ["ingest:email", "read:invoice"]
}
```
**Response** (201):
```json
{
  "id": "uuid",
  "prefix": "pdm_live_",
  "secret": "pdm_live_1234567890abcdef...",  // shown once
  "scopes": ["ingest:email", "read:invoice"],
  "created_at": "2024-10-06T12:00:00Z"
}
```

---

### Invoices

#### POST /api/invoices/upload
**Request**: `multipart/form-data`
- `file`: XML/PDF/ZIP (max 10MB)
- `source`: "manual_upload"

**Response** (201):
```json
{
  "id": "uuid",
  "type": "e_invoice" | "other",
  "format": "xrechnung_ubl" | "zugferd_cii" | "pdf" | "unknown",
  "status": "VALID" | "PENDING" | "FAILED",
  "validation": {
    "status": "PASS" | "FAIL",
    "errors": [{"code": "INV-01", "message": "...", "path": "..."}],
    "warnings": []
  },
  "invoice_number": "INV-2024-001",
  "issue_date": "2024-10-01",
  "total_gross": 119.00,
  "currency": "EUR",
  "received_at": "2024-10-06T12:00:00Z"
}
```

#### GET /api/invoices
**Query Params**:
- `status`: PENDING | VALID | FAILED | ARCHIVED | MANUAL
- `type`: e_invoice | other
- `from_date`, `to_date`: ISO 8601 dates
- `search`: text search (invoice number, supplier name)
- `page`, `limit`: pagination (default: page=1, limit=50)

**Response** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-2024-001",
      "supplier_name": "ACME GmbH",
      "issue_date": "2024-10-01",
      "total_gross": 119.00,
      "currency": "EUR",
      "status": "VALID",
      "type": "e_invoice",
      "received_at": "2024-10-06T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 142
  }
}
```

#### GET /api/invoices/:id
**Response** (200):
```json
{
  "id": "uuid",
  "type": "e_invoice",
  "format": "xrechnung_ubl",
  "status": "VALID",
  "invoice_number": "INV-2024-001",
  "issue_date": "2024-10-01",
  "seller": {
    "name": "ACME GmbH",
    "vat_id": "DE123456789",
    "address": { "country": "DE", "city": "Berlin", "postal_code": "10115" }
  },
  "buyer": {
    "name": "Customer Ltd",
    "vat_id": "DE987654321",
    "address": { "country": "DE", "city": "Munich", "postal_code": "80331" }
  },
  "currency": "EUR",
  "totals": {
    "net": 100.00,
    "tax": 19.00,
    "gross": 119.00
  },
  "line_items": [
    {
      "id": "1",
      "description": "Consulting services",
      "quantity": 10,
      "unit": "HUR",
      "unit_price": 10.00,
      "net_amount": 100.00,
      "tax_rate": 19.00
    }
  ],
  "validation": { "status": "PASS", "errors": [], "warnings": [] },
  "blob_key": "tenants/uuid/invoices/uuid/original/inv-001.xml",
  "checksum": "sha256:abcdef...",
  "received_at": "2024-10-06T12:00:00Z",
  "archived_at": null
}
```

#### POST /api/invoices/:id/archive
**Response** (200):
```json
{
  "id": "uuid",
  "status": "ARCHIVED",
  "archived_at": "2024-10-06T12:05:00Z"
}
```

#### POST /api/invoices/:id/manual-data
**Request**:
```json
{
  "invoice_number": "INV-2024-999",
  "issue_date": "2024-09-30",
  "seller_name": "Old School Supplier",
  "total_gross": 250.00,
  "currency": "EUR",
  "line_items": [...]
}
```
**Response** (200):
```json
{
  "id": "uuid",
  "status": "MANUAL",
  "manual_data": { /* stored payload */ }
}
```

#### GET /api/invoices/:id/download
**Response** (200): Binary XML/PDF file with `Content-Disposition: attachment`

---

### Exports

#### POST /api/exports
**Request**:
```json
{
  "from_date": "2024-01-01",
  "to_date": "2024-12-31",
  "format": "csv",  // or "json"
  "include_xml": true,
  "filters": {
    "status": ["ARCHIVED"],
    "type": ["e_invoice"]
  }
}
```
**Response** (202):
```json
{
  "export_id": "uuid",
  "status": "PENDING",
  "estimated_completion": "2024-10-06T12:10:00Z"
}
```

#### GET /api/exports/:id
**Response** (200):
```json
{
  "id": "uuid",
  "status": "COMPLETED",  // or PENDING, FAILED
  "format": "csv",
  "from_date": "2024-01-01",
  "to_date": "2024-12-31",
  "invoice_count": 142,
  "download_url": "https://s3.../exports/uuid/bundle.zip?signed=...",
  "expires_at": "2024-10-07T12:00:00Z",
  "created_at": "2024-10-06T12:00:00Z",
  "completed_at": "2024-10-06T12:08:00Z"
}
```

#### GET /api/exports
**Response** (200):
```json
{
  "exports": [
    {
      "id": "uuid",
      "status": "COMPLETED",
      "invoice_count": 142,
      "created_at": "2024-10-06T12:00:00Z"
    }
  ]
}
```

---

### Analytics

#### GET /api/analytics/summary
**Query Params**: `from`, `to` (date range)

**Response** (200):
```json
{
  "period": { "from": "2024-01-01", "to": "2024-12-31" },
  "totals": {
    "invoices_received": 500,
    "e_invoices": 450,
    "other_invoices": 50,
    "archived": 480
  },
  "auto_pass_rate": 0.96,  // 96%
  "median_time_to_archive_minutes": 4.2,
  "p90_time_to_archive_minutes": 18.5,
  "supplier_conversion": {
    "suppliers_with_other_invoices": 12,
    "converted_to_e_invoice": 5,
    "conversion_rate": 0.42  // 42%
  }
}
```

---

## Data Model

### Entity Relationship Diagram (Text)

```
tenants
  ├─ id (uuid, pk)
  ├─ slug (text, unique)
  ├─ name (text)
  ├─ email_address (text, unique) -- invoices+slug+token@...
  ├─ email_token (text)
  └─ created_at (timestamptz)

users
  ├─ id (uuid, pk)
  ├─ email (citext, unique)
  ├─ password_hash (text)
  └─ created_at (timestamptz)

user_tenants
  ├─ user_id (uuid, fk → users.id)
  ├─ tenant_id (uuid, fk → tenants.id)
  ├─ role (text: OWNER, FINANCE, READONLY)
  └─ pk(user_id, tenant_id)

api_keys
  ├─ id (uuid, pk)
  ├─ tenant_id (uuid, fk → tenants.id)
  ├─ name (text)
  ├─ prefix (text)
  ├─ secret_hash (text)
  ├─ scopes (text[])
  ├─ created_at (timestamptz)
  ├─ last_used_at (timestamptz, nullable)
  └─ RLS: USING (tenant_id = current_setting('app.tenant_id')::uuid)

suppliers
  ├─ id (uuid, pk)
  ├─ tenant_id (uuid, fk → tenants.id)
  ├─ name (text)
  ├─ vat_id (text, nullable)
  ├─ email (text, nullable)
  ├─ address (jsonb, nullable)
  ├─ created_at (timestamptz)
  └─ RLS: USING (tenant_id = current_setting('app.tenant_id')::uuid)

invoices
  ├─ id (uuid, pk)
  ├─ tenant_id (uuid, fk → tenants.id)
  ├─ supplier_id (uuid, fk → suppliers.id, nullable)
  ├─ type (text: e_invoice, other)
  ├─ format (text: xrechnung_ubl, xrechnung_cii, zugferd_cii, pdf, unknown)
  ├─ status (text: PENDING, VALID, FAILED, ARCHIVED, MANUAL)
  ├─ invoice_number (text)
  ├─ issue_date (date)
  ├─ currency (text)
  ├─ total_net (numeric(12,2))
  ├─ total_tax (numeric(12,2))
  ├─ total_gross (numeric(12,2))
  ├─ seller_data (jsonb) -- structured seller info
  ├─ buyer_data (jsonb) -- structured buyer info
  ├─ line_items (jsonb) -- array of line items
  ├─ payment_terms (jsonb, nullable)
  ├─ validation (jsonb) -- { status, errors, warnings }
  ├─ manual_data (jsonb, nullable) -- for OTHER invoices
  ├─ xml_blob_key (text, nullable)
  ├─ pdf_blob_key (text, nullable)
  ├─ checksum (text) -- sha256:...
  ├─ source (text: email, manual_upload, imap)
  ├─ received_at (timestamptz)
  ├─ archived_at (timestamptz, nullable)
  ├─ created_at (timestamptz)
  └─ RLS: USING (tenant_id = current_setting('app.tenant_id')::uuid)

events
  ├─ id (uuid, pk)
  ├─ tenant_id (uuid, fk → tenants.id)
  ├─ invoice_id (uuid, fk → invoices.id, nullable)
  ├─ type (text: invoice_received, validation_completed, invoice_archived, export_created, manual_edit, etc.)
  ├─ payload (jsonb)
  ├─ user_id (uuid, fk → users.id, nullable)
  ├─ created_at (timestamptz)
  └─ RLS: USING (tenant_id = current_setting('app.tenant_id')::uuid)

exports
  ├─ id (uuid, pk)
  ├─ tenant_id (uuid, fk → tenants.id)
  ├─ status (text: PENDING, COMPLETED, FAILED)
  ├─ format (text: csv, json)
  ├─ from_date (date)
  ├─ to_date (date)
  ├─ filters (jsonb)
  ├─ invoice_count (int)
  ├─ blob_key (text, nullable) -- S3 path to bundle.zip
  ├─ checksum (text, nullable)
  ├─ created_at (timestamptz)
  ├─ completed_at (timestamptz, nullable)
  └─ RLS: USING (tenant_id = current_setting('app.tenant_id')::uuid)
```

### Indexes

```sql
-- Tenant lookups
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_email_address ON tenants(email_address);

-- Invoice queries
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_tenant_date ON invoices(tenant_id, issue_date DESC);
CREATE INDEX idx_invoices_received_at ON invoices(tenant_id, received_at DESC);
CREATE INDEX idx_invoices_supplier ON invoices(supplier_id);

-- Event queries
CREATE INDEX idx_events_tenant_type ON events(tenant_id, type, created_at DESC);
CREATE INDEX idx_events_invoice ON events(invoice_id, created_at DESC);

-- API key lookups
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix);
```

---

## Event Schema

Events are used for audit logging and KPI calculation.

### Event Types

| Type | Payload | Purpose |
|------|---------|---------|
| `invoice_received` | `{ invoice_id, type, format, source }` | Track inbound volume |
| `validation_completed` | `{ invoice_id, status, error_count, warning_count }` | Measure auto-pass rate |
| `invoice_archived` | `{ invoice_id, time_to_archive_seconds }` | Calculate median time |
| `manual_edit` | `{ invoice_id, fields_edited }` | Track manual intervention |
| `export_created` | `{ export_id, invoice_count, format }` | Audit export requests |
| `invoice_viewed` | `{ invoice_id }` | Track engagement |
| `invoice_downloaded` | `{ invoice_id }` | Audit file access |
| `api_key_used` | `{ api_key_id, endpoint }` | Security audit |

### Example Event Record

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "invoice_id": "uuid",
  "type": "invoice_received",
  "payload": {
    "invoice_id": "uuid",
    "type": "e_invoice",
    "format": "xrechnung_ubl",
    "source": "email",
    "sender_email": "supplier@example.com"
  },
  "user_id": null,
  "created_at": "2024-10-06T12:00:00Z"
}
```

---

## Sequence Diagrams

### Email Ingestion Flow

```
Supplier       Mail Server      IMAP Fetcher      Parser      Validator      DB         S3
   |                |                |               |             |           |          |
   |--Email w/ XML->|                |               |             |           |          |
   |                |--Store-------->|               |             |           |          |
   |                |                |--Fetch------->|             |           |          |
   |                |                |               |             |           |          |
   |                |                |--Extract att->|             |           |          |
   |                |                |               |             |           |          |
   |                |                |               |--Detect---->|           |          |
   |                |                |               |  format     |           |          |
   |                |                |               |<-domain model|          |          |
   |                |                |               |             |           |          |
   |                |                |               |--Validate-->|           |          |
   |                |                |               |<-PASS/FAIL--|           |          |
   |                |                |               |             |           |          |
   |                |                |------------Store blob-------|---------->|          |
   |                |                |               |             |           |          |
   |                |                |---------------Create invoice|---------->|          |
   |                |                |               |             |           |          |
   |                |                |---------------Emit event----|---------->|          |
```

### Manual Upload Flow

```
User       API           Parser      Validator      S3         DB
 |          |              |             |           |          |
 |--Upload->|              |             |           |          |
 |  XML     |              |             |           |          |
 |          |--Auth------->|             |           |          |
 |          |  (set tenant)|             |           |          |
 |          |              |             |           |          |
 |          |--Store-------|------------>|           |          |
 |          |              |             |           |          |
 |          |--Parse------>|             |           |          |
 |          |              |--Validate-->|           |          |
 |          |              |<-result-----|           |          |
 |          |              |             |           |          |
 |          |--Create invoice------------|---------->|          |
 |          |              |             |           |          |
 |<-Response|              |             |           |          |
 |  (invoice details)      |             |           |          |
```

---

## Acceptance Criteria

### Email Ingestion
- [ ] Email sent to `invoices+acme+abc123@...` is ingested under ACME tenant
- [ ] Duplicate emails (same invoice number + supplier + total) are deduplicated
- [ ] Invalid attachments (>10MB, risky MIME) are rejected with logged warnings
- [ ] SPF/DKIM failures are logged but do not block ingestion

### Validation
- [ ] All FAIL rules block auto-archive (status = FAILED)
- [ ] WARN rules allow archive but are visible in dashboard
- [ ] Validation is deterministic (same input = same output)
- [ ] XRechnung UBL and CII formats are both supported

### Tenancy
- [ ] User from Tenant A cannot see invoices from Tenant B
- [ ] API key for Tenant A cannot create invoices for Tenant B
- [ ] SQL query without `SET app.tenant_id` returns zero rows (RLS enforced)

### Export
- [ ] CSV export includes header row + line items (one row per line)
- [ ] ZIP bundle contains original XML files with original filenames
- [ ] manifest.json includes SHA-256 checksums matching stored checksums
- [ ] Export download link expires after 24 hours

### Performance
- [ ] Single invoice parse + validate: <10s at p95
- [ ] Dashboard loads 50 invoices: <2s
- [ ] CSV export of 1000 invoices: <60s

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-06  
**Maintained by**: E-Rechnung Tool Core Team
