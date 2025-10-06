# E-Rechnung Tool

> **Open-source TypeScript platform for receiving, validating, and archiving e-invoices compliant with Germany's EN 16931 standard (XRechnung/ZUGFeRD).**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-20+-green)](https://nodejs.org/)

---

## What Is This?

An **open-core, receive-first MVP** for small and medium-sized enterprises (SMEs) in Germany who need to:

- **Receive** e-invoices via email or manual upload
- **Classify** them automatically (XRechnung, ZUGFeRD EN 16931, or "Other")
- **Validate** against a pragmatic subset of EN 16931 rules
- **View & Archive** with original XML as the immutable source of truth
- **Export** to CSV + original XML bundles for audits and accounting handoff
- **Track KPIs**: auto-pass rate, median processing time, supplier conversion, audit integrity

Built for **micro/small SMEs** (Handwerk, local services) with **accountants and tax advisors** as a key distribution channel.

### Open Core Model

| **Open Source (this repo)**            | **Commercial (private)**                  |
|----------------------------------------|-------------------------------------------|
| Core validation engine                 | DATEV / Lexoffice connectors              |
| Email-in + manual upload               | Peppol Access Point integration           |
| XRechnung/ZUGFeRD parsing              | Advanced analytics & benchmarking         |
| CSV/XML export                         | Multi-user workflows & approvals          |
| Audit trail & integrity checks         | Billing & usage-based pricing             |
| CLI tools                              | White-label SaaS hosting                  |

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│  INGEST LAYER                                                   │
│  • Email (catch-all + plus-addressing OR IMAP fetch)            │
│  • Manual upload (drag-drop XML/PDF/ZIP)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  CLASSIFY & PARSE                                               │
│  • Detect format: XRechnung (CII/UBL), ZUGFeRD, Other          │
│  • Map to domain model (packages/core)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  VALIDATE (packages/validator)                                  │
│  • Rule engine: EN 16931 subset (FAIL/WARN severity)           │
│  • Pure, deterministic, unit-tested rules with stable IDs       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STORE & INDEX                                                  │
│  • Metadata → Postgres (tenants, invoices, suppliers, events)  │
│  • Blobs → S3-compatible storage (original XML/PDF)             │
│  • SHA-256 checksums for audit integrity                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  VIEW, SEARCH, EXPORT                                           │
│  • Web UI: invoice list, detail view, search/filter             │
│  • Export: CSV (header + lines) + ZIP of originals + manifest  │
│  • Audit bundles: monthly archives with integrity checksums     │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack (Locked-In)

- **Language**: TypeScript (strict mode), Node.js 20+
- **Database**: PostgreSQL with Drizzle ORM
- **Blob Storage**: S3-compatible (Local FS adapter for dev)
- **API**: Fastify + Pino structured logging
- **XML Parsing**: fast-xml-parser
- **Validation**: Zod (API payloads) + custom rule engine (EN 16931)
- **Email**: imapflow + mailparser (behind adapter interface)
- **Testing**: Vitest + c8 coverage
- **Monorepo**: pnpm workspaces

---

## Who Is This For?

### Primary (ICP)
- **Micro/small SMEs**: 1–50 employees, <€10M revenue
- Local services: Handwerk (plumbers, electricians, carpenters), consultants, agencies
- Pain: drowning in PDF invoices, can't afford big ERP, need audit-proof archives

### Secondary (Distribution Channel)
- **Tax advisors & accountants**: manage 20–200 SME clients
- Want: standardized e-invoice ingestion, clean exports for DATEV/Lexoffice

### Anti-ICP (Not Yet)
- Large enterprises with SAP/Oracle
- Teams needing complex approval workflows
- Anyone issuing e-invoices (out of scope for MVP)

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **pnpm 8+**
- **PostgreSQL 15+** (local or Docker)
- **S3-compatible storage** (AWS S3, MinIO, or use Local FS adapter)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/notspencer/e-rechnung-tool.git
cd e-rechnung-tool

# Run the setup script
./scripts/setup-dev.sh

# Start development services (optional)
docker-compose -f scripts/docker-compose.dev.yml up -d

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Manual Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Set up environment
cp .env.example .env
# Edit .env with your Postgres/S3 credentials

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Development Services

For local development, you can use Docker Compose to run supporting services:

```bash
# Start PostgreSQL, MinIO, and Redis
docker-compose -f scripts/docker-compose.dev.yml up -d

# Stop services
docker-compose -f scripts/docker-compose.dev.yml down
```

### CLI Usage

```bash
# Validate an invoice file
pnpm validate examples/invoices/sample-xrechnung-ubl.xml

# Export invoices
pnpm export --from 2024-01-01 --to 2024-12-31

# Analyze invoice data
pnpm analyze --from 2024-01-01 --to 2024-12-31
```

### Quick Validation (CLI)

```bash
# Validate a single invoice
pnpm cli validate examples/invoices/xrechnung-sample.xml

# Export invoices for a date range
pnpm cli export --from 2024-01-01 --to 2024-12-31 --format csv
```

### Run Tests

```bash
# Unit tests
pnpm test

# Coverage report
pnpm test:coverage
```

---

## Repository Layout

```
e-rechnung-tool/
├── README.md                    ← You are here
├── LICENSE                      ← Apache 2.0
├── CONTRIBUTING.md              ← DCO sign-off, PR checklist
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── docs/
│   ├── initial-prompt.md        ← Full project requirements (verbatim)
│   ├── mvp-spec.md              ← User flows, endpoints, data model
│   ├── validation-rules.md      ← EN 16931 subset rule catalog
│   ├── architecture.md          ← Packages, interfaces, ADRs
│   └── operations.md            ← Logging, metrics, SLOs, backups
├── packages/
│   ├── core/                    ← Domain types, schemas, events
│   ├── validator/               ← EN 16931 rule engine
│   ├── adapters/
│   │   ├── parse-xml/           ← XRechnung/ZUGFeRD detection & mapping
│   │   ├── storage-fs/          ← Local filesystem blob storage
│   │   ├── storage-s3/          ← S3 blob storage
│   │   └── mail-imap/           ← IMAP email fetcher
│   ├── api/                     ← Fastify service (REST + webhooks)
│   └── cli/                     ← Command-line tools
├── examples/
│   ├── invoices/                ← Sample XML/PDF files
│   └── exports/                 ← Sample CSV + manifest outputs
├── tests/                       ← Integration tests
├── package.json
└── pnpm-workspace.yaml
```

---

## Key Design Principles

### 1. **Domain-Driven, Adapter-Based**
- Pure domain logic in `packages/core` and `packages/validator`
- All I/O (email, storage, parsing) behind clean interfaces
- No vendor lock-in: swap S3 for GCS, IMAP for webhooks, etc.

### 2. **Multi-Tenancy with Defense-in-Depth**
- **Row-level isolation**: Every tenant row has `tenant_id UUID`
- **Postgres RLS**: Enforced at the database layer via `app.tenant_id` session variable
- **App-layer checks**: Role-based access control (OWNER, FINANCE, READONLY)
- **API key isolation**: Keys carry implicit `tenant_id`; no payload tampering

### 3. **Validation as Code**
- Rule IDs are **stable** and **documented** (see `docs/validation-rules.md`)
- Rules are **pure functions**: deterministic, no I/O, 100% unit-tested
- Severity: **FAIL** (block auto-archive) vs **WARN** (highlight in reports)
- Human-readable error messages with XPath-like paths for debugging

### 4. **Audit Integrity by Design**
- **Original XML is sacred**: stored immutably with SHA-256 checksum
- **Event log**: every view, download, export, manual override is recorded
- **Export manifests**: bundle integrity via manifest.json + checksums
- **Retention**: configurable, default 10 years (GoBD compliance)

### 5. **Performance Targets**
- Parse + validate single invoice: **≤10s at p95**
- Median arrival → archive: **<5 minutes**
- Export 10K invoices: **<60 seconds**

---

## KPIs (How We Measure Success)

1. **Auto-Pass Rate**: ≥95% of e-invoices validate without manual edits
2. **Median Time to Archive**: <5 minutes (p90 <30 minutes)
3. **Supplier Conversion**: "Other" → e-invoice adoption +20–40% within 60 days
4. **Audit Integrity**: 100% XML retention with matching checksums, 99.95%+ export integrity

See `docs/operations.md` for detailed event schemas and measurement methodology.

---

## Roadmap

### ✅ MVP (Receive-First)
- Email-in + manual upload
- Classify & validate (EN 16931 subset)
- Archive with audit trail
- CSV/XML export
- Lite analytics dashboard

### 🔜 Post-MVP
- **Peppol Access Point** integration (receive via Peppol network)
- **Issuing e-invoices** (XRechnung/ZUGFeRD generation)
- **Deep accounting connectors** (DATEV, Lexoffice, Stripe Tax)
- **Approval workflows** (multi-user, delegation)
- **OCR assist** for "Other" invoices
- **Vendor portal** (supplier self-service)

---

## Contributing

We welcome contributions! Please read:

- **[CONTRIBUTING.md](CONTRIBUTING.md)** for DCO sign-off, dev setup, and PR checklist
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** for community guidelines
- **[SECURITY.md](SECURITY.md)** for responsible disclosure

### Development Conventions

- **TypeScript strict mode**: No `any`, prefer explicit types
- **Tests required**: Vitest for units, integration tests for flows
- **Commit sign-off**: DCO required (use `git commit -s`)
- **Lint/format**: Run `pnpm lint:fix` before committing
- **PR checklist**: See CONTRIBUTING.md

---

## License

This project is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for details.

**Commercial features** (DATEV connectors, Peppol AP, advanced analytics) are proprietary and not included in this repository.

---

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/notspencer/e-rechnung-tool/issues)
- **Discussions**: [GitHub Discussions](https://github.com/notspencer/e-rechnung-tool/discussions)
- **Email**: support@e-rechnung.example (for commercial inquiries)

## Project Status

✅ **MVP Implementation Complete**

The E-Rechnung Tool MVP is now fully implemented with:

- **Core Types & Validation**: Complete EN 16931 validation engine with 20+ rules
- **XML Parsing**: Support for XRechnung UBL/CII, ZUGFeRD, and Factur-X formats
- **Storage Adapters**: Local filesystem and S3-compatible storage
- **API Server**: Fastify-based REST API with authentication and RLS
- **CLI Tools**: Command-line interface for validation, export, and analysis
- **Database Schema**: Postgres schema with Drizzle ORM and row-level security
- **Test Suite**: Comprehensive tests for all packages
- **Documentation**: Complete architecture and API documentation

### Next Steps

1. **Deploy to production** with your preferred hosting provider
2. **Configure email routing** for automatic invoice ingestion
3. **Set up monitoring** and alerting for the validation pipeline
4. **Train users** on the web interface and CLI tools
5. **Monitor KPIs** and iterate based on real-world usage

---

**Built with ❤️ for SMEs navigating the e-invoice transition.**

