# Initial Project Prompt

This document contains the complete initial requirements and specifications for the PDM E-Invoice Open Core project, preserved verbatim for reference.

---

SYSTEM / ROLE
You are an expert full-stack engineer and product-minded designer. Help me build an open-core TypeScript project for a receive-first e-invoice MVP (Germany EN 16931 — XRechnung/ZUGFeRD). Your job is to:
1) ask clarifying questions first (only where absolutely necessary),
2) propose an implementation plan and repo layout,
3) generate non-code design artifacts (README + /docs) before any code,
4) then, only after I say "BEGIN CODING", scaffold code.

Do NOT write production code until I explicitly say: BEGIN CODING.

========================================
PROJECT NORTH STAR (First Principles)
========================================
- Ship a working MVP fast: receive → classify → validate (subset of EN 16931) → view → archive → export (CSV + original XML).
- Transport-agnostic: support email-in + manual upload now; Peppol/EDI later.
- ICP: micro/small SMEs (Handwerk/local services) first; legal/tax as a distribution channel later.
- Open core; commercial edges stay private (DATEV/Lexoffice, Peppol AP, analytics, billing).
- KPIs to prove value:
  1) ≥95% e-invoices auto-validate,
  2) <5 min median arrival→archive,
  3) supplier conversion from "Other"→e-invoice up 20–40% in 60 days,
  4) zero audit surprises (original XML + full logs + export integrity).

This entire prompt must be checked into /docs as docs/initial-prompt.md verbatim.

========================================
MVP SCOPE (RECEIVE-FIRST)
========================================
CORE FLOWS
- Capture: unique company email-in address; drag-drop upload; accept XML/PDF/ZIP.
- Classify: detect XRechnung/ZUGFeRD (EN 16931 profiles) ⇒ type = "e_invoice", else "other".
- Validate (subset EN 16931): must-have checks; PASS/FAIL + human-readable rule IDs.
- View & Archive: clean invoice view; original XML is source of truth; search/filter.
- Export: CSV (header + lines) + ZIP of original XMLs; monthly "Audit Bundle" with manifest.
- Exceptions ("Fix-it" lane): quick form for "Other" invoices (OCR assist later).
- Analytics (lite): volume, % e-invoice, auto-pass rate, median time to archive, supplier conversion.

OUT OF SCOPE (for MVP)
- Peppol, issuing e-invoices, deep accounting connectors, approvals, payments/reconciliation, vendor portal.

========================================
TECH CHOICES (LOCKED-IN)
========================================
- Language/Runtime: TypeScript (strict), Node 20+.
- Database: Postgres (dev & prod). Use Drizzle ORM or Prisma (your call; prefer Drizzle for lightness).
- Blob storage: S3-compatible (design interfaces now; ship with a Local FS adapter + S3 adapter behind same interface).
- API framework: Fastify (+ pino logging).
- XML parsing: fast-xml-parser (initial); optional XSD checks later.
- Validation: zod for API payloads; custom rule engine in TS for EN 16931 subset.
- Email-in (MVP): IMAP fetcher using imapflow + mailparser (behind adapter interface). Forwarded-copy webhook is a later option.
- Tests: vitest (+ c8 coverage).
- Lint/format: eslint + prettier.
- CLI: commander (einvoice validate <file>, export).
- Packaging: pnpm workspaces monorepo.

========================================
REPO LAYOUT (PLAN)
========================================
e-rechnung-tool/
  README.md                <-- overview + dev guidelines + quick start
  LICENSE                  <-- Apache-2.0
  CONTRIBUTING.md          <-- DCO sign-off, dev setup, PR checklist
  CODE_OF_CONDUCT.md
  SECURITY.md
  docs/
    initial-prompt.md      <-- this prompt verbatim
    mvp-spec.md            <-- user flows, endpoints, data model
    validation-rules.md    <-- rule list + codes (must/warn)
    architecture.md        <-- modules, interfaces, ADRs
    operations.md          <-- logging, metrics, SLOs, backup/export manifest
  packages/
    core/                  <-- domain types, JSON schema, events
    validator/             <-- EN16931 subset rule engine
    adapters/
      parse-xml/           <-- detect XRechnung/ZUGFeRD → domain mapping
      storage-fs/          <-- Local FS blob + metadata adapter
      storage-s3/          <-- S3 adapter (config via env, no secrets in repo)
      mail-imap/           <-- IMAP fetcher (read-only)
    api/                   <-- Fastify service (ingest/validate/export/search)
    cli/                   <-- einvoice CLI (validate, export)
  examples/
    invoices/              <-- sample XML/PDF
    exports/               <-- sample CSV + manifest
  tests/
  package.json
  pnpm-workspace.yaml

========================================
VALIDATION RULES (INITIAL SUBSET)
========================================
Severity levels:
- FAIL (must-have): block auto-pass; manual override allowed with reason (logged).
- WARN (should-have): archive allowed; highlighted in reports.

FAIL (examples):
- INV-01: missing invoice number
- INV-02: missing issue date
- CUR-01: missing currency
- SUM-01: totals missing
- SUM-02: net + tax != gross (rounded 2 decimals)
- LIN-01: no line items
- TAX-01: tax breakdown missing/incoherent with lines
- SELL-01: seller name missing
- BUY-01: buyer name missing
- PROF-01: not EN 16931 compliant (unsupported ZUGFeRD profile)

WARN (examples):
- PAY-01: missing payment instruction (IBAN/BIC or terms)
- PERF-01: performance/delivery date missing when expected
- REF-01: purchase order/contract reference missing when hinted

Return shape:
{
  status: "PASS" | "FAIL",
  errors: [{ code, message, path? }],
  warnings: [{ code, message, path? }]
}

========================================
KPI DEFINITIONS (MVP MEASUREMENT)
========================================
1) Auto-pass rate
   - (# e-invoices VALID without manual edits/overrides) / (total e-invoices)
   - Events: invoice_received, validation_completed, manual_edit, status_changed
   - Target: ≥95%

2) Median time arrival→archive
   - median(archived_at - received_at) for archived items; show P90
   - Target: median < 5 min; P90 < 30 min

3) Supplier conversion ("Other"→e-invoice)
   - Cohort: suppliers who send "Other" in Week 0 with no prior 30-day e-invoice
   - % that send ≥1 e-invoice within 60 days; target +20–40% relative lift vs baseline

4) Audit integrity
   - 100% XML retention (checksums — SHA-256)
   - 100% audit logs for view/download/export/override
   - Export integrity ≥99.95% (complete windows + manifest hash)

========================================
CODING & DESIGN GUIDELINES (BEFORE ANY CODE)
========================================
- TS strict; no `any`. Domain types live in packages/core and are reused everywhere.
- Pure, deterministic validation rules with stable rule IDs; unit-test each rule.
- Clean adapter interfaces (mail, storage, parsing). IO stays out of the rule engine.
- Postgres for metadata (tenants, invoices, suppliers, events); blobs in S3/FS via adapter.
- Pino structured logs (JSON) with correlation IDs; minimal event schema for KPIs.
- Config via env; no secrets committed. Redact PII in logs.
- Performance target: parse+validate a single invoice ≤10s at p95 on modest hardware.

========================================
README CONTENT TO GENERATE (NO CODE YET)
========================================
- What this is (open-core; receive-first MVP; TypeScript + Postgres + S3)
- Who it's for (SMEs; accountants as channel)
- Architecture at a glance (text diagram)
- Getting started: pnpm install, how to run API/CLI (placeholders now)
- Conventions (TS strict, rule IDs, adapter interfaces)
- Contribution (DCO, tests, PR checklist)
- Roadmap (Peppol, issuing, connectors)
- Open-core vs proprietary boundaries

========================================
DOCS TO GENERATE NOW (NO CODE YET)
========================================
- /docs/initial-prompt.md — include this entire prompt verbatim.
- /docs/mvp-spec.md — endpoints (ingest/validate/export/search), data model (ERD text), events, simple sequence diagrams.
- /docs/validation-rules.md — full rule list (must/warn) with examples.
- /docs/architecture.md — packages + interfaces; ADR for TS/Node, Postgres, S3; multi-tenant model.
- /docs/operations.md — logging, metrics, SLOs, backup strategy; export manifest & checksum format.

========================================
CLARIFYING QUESTIONS (MINIMAL — ANSWER BEFORE CODING)
========================================
1) Email-in preference for MVP: IMAP fetcher (read-only) is proposed — confirm OK?
2) S3 details: use an S3-compatible endpoint (e.g., AWS S3 proper) and bucket naming convention — anything predefined?
3) ORM choice: Drizzle vs Prisma — any preference?

========================================
ARCHITECTURAL DECISIONS (FINALIZED)
========================================

A) Multi-tenancy isolation model — Row-level with Postgres RLS (MVP)

Model: Shared tables with tenant_id UUID on every multi-tenant row.

Enforcement: Postgres Row-Level Security (RLS) ON for all tenant tables.

Policy pattern:
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid)

App sets SET app.tenant_id = '<uuid>' per request after auth.

Roles: DB role app_user with only table access + RLS; no raw superuser access from the app.

Migrations: Create RLS policies in migrations; block ALTER TABLE … DISABLE ROW LEVEL SECURITY.

Background jobs: Each job must set app.tenant_id before touching data. Add a guard that raises if it's unset.

Why: Simple, fast to build, scales to hundreds of tenants, and gives defense-in-depth (DB enforces tenancy, not just the app).

B) Authentication & Authorization — Hybrid: users + API keys

Users (for web + API):
  Email/password (bcrypt/argon2) with session tokens (HTTP-only secure cookie) or short-lived JWT (15m) + refresh (7d). Keep it simple: session cookie for the web, JWT for API if needed.
  User ↔ Tenant mapping: today one user belongs to one tenant; table user_tenants leaves room for multi-tenant users later.
  Roles: OWNER, FINANCE, READONLY (stored in user_tenants.role).

API keys (programmatic):
  Per-tenant keys; prefix (e.g., pdm_live_...) + random secret; store hashed in DB (like passwords). Show once on create.
  Scopes: ingest:email, ingest:upload, read:invoice, export.
  Keys carry tenant_id implicitly; on request, set app.tenant_id from the key, not from payload.

Authorization checks:
  App layer: route guards by role/scope.
  DB layer: RLS enforces tenant boundaries regardless of role bugs.

Why: Users get UX; machines get keys. Keeps the door open for partners and IMAP/forwarding workflows.

C) Email routing — Catch-all + plus-addressing, with optional IMAP

Default (fastest to ship):
  Give each tenant a unique capture address:
    invoices+<tenantSlug>+<6charToken>@einvoice.e-rechnung.example
  <6charToken> acts as a checksum to prevent accidental routing to the wrong tenant if someone guesses a slug.
  Accept To/CC/BCC; capture the first matching PDM address.
  Customers can:
    Tell suppliers to CC that address, or
    Add a server-side forward rule on rechnung@their-domain → the PDM address (recommended).

Optional (configurable) IMAP fetcher (still MVP-safe):
  Read-only connection to the customer's rechnung@ mailbox using imapflow + mailparser.
  Tenant mapping is via the stored IMAP connection; no address parsing needed.
  Good for teams that don't want forwarding rules; ship as a separate adapter.

Security & hygiene:
  Enforce SPF/DKIM/DMARC checks before trusting sender metadata (log failures, still ingest attachments).
  Deduplicate by (supplier_id, invoice_number, total_gross, issue_date) fingerprint.
  Size limits and a denylist for risky attachment types.

Why: Plus-addressing is trivial to roll out, resilient (works with CC/BCC), and IMAP remains available without blocking MVP.

S3 & storage (aligned to your stack):
  Bucket layout: single bucket per environment; prefix per tenant.
    s3://e-rechnung-tool-<env>/tenants/<tenant_id>/invoices/<invoice_id>/<original|rendered>/<filename>
  Manifests: write a manifest.json next to stored blobs with SHA-256 checksums, sizes, created_by, and timestamps.
  Exports: produce exports/<yyyymm>/bundle.zip + bundle.sha256 + report.json.
  Local dev: FS adapter mirrors the same key structure under ./.data/.

Minimal schema sketch (Postgres):
  tenants(id uuid pk, slug text unique, name text, created_at timestamptz)
  users(id uuid pk, email citext unique, password_hash text, created_at timestamptz)
  user_tenants(user_id uuid fk, tenant_id uuid fk, role text, pk(user_id, tenant_id))
  api_keys(id uuid pk, tenant_id uuid fk, name text, prefix text, secret_hash text, created_at, last_used_at)
  suppliers(id uuid pk, tenant_id uuid fk, name text, vat_id text, email text, created_at) RLS ON
  invoices(id uuid pk, tenant_id uuid fk, supplier_id uuid fk, type text, status text, issue_date date, currency text, total_net numeric, total_tax numeric, total_gross numeric, xml_blob_key text, pdf_blob_key text, validation jsonb, received_at timestamptz, archived_at timestamptz) RLS ON
  events(id uuid pk, tenant_id uuid fk, invoice_id uuid fk null, type text, payload jsonb, created_at timestamptz) RLS ON

All RLS tables include identical USING/WITH CHECK policies on tenant_id.

Acceptance checks (non-code, for specs):
  Tenancy: Any SQL issued without SET app.tenant_id should fail policy checks in dev (add a test harness note in docs).
  Auth: API key auth sets app.tenant_id deterministically; user session sets it via user→tenant mapping.
  Email: A message CC'd to invoices+acme+abc123@… is ingested and stored under the ACME tenant; the same XML sent twice is deduped.
  Storage: Every archived e-invoice has an XML blob with a recorded SHA-256 that matches the physical object.
