# @e-rechnung/api

Fastify API server for the E-Rechnung Tool.

## Overview

This package provides the REST API for the E-Rechnung Tool, including:

- **Authentication**: JWT tokens and API keys
- **Row-Level Security**: Postgres RLS for multi-tenancy
- **Invoice Management**: Upload, validate, archive, export
- **Analytics**: KPI tracking and reporting
- **Structured Logging**: Pino with PII redaction

## Features

- **Fastify Framework**: High-performance HTTP server
- **Drizzle ORM**: Type-safe database access
- **Postgres RLS**: Database-level tenant isolation
- **JWT Authentication**: User sessions and API keys
- **Pino Logging**: Structured JSON logs with correlation IDs
- **Error Handling**: Graceful error responses
- **Health Checks**: Kubernetes-ready health endpoints

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/api-keys` - Create API key

### Invoices
- `POST /api/invoices/upload` - Upload invoice file
- `GET /api/invoices` - List invoices (with filters)
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices/:id/archive` - Archive invoice
- `POST /api/invoices/:id/manual-data` - Add manual data
- `GET /api/invoices/:id/download` - Download original file

### Exports
- `POST /api/exports` - Create export
- `GET /api/exports` - List exports
- `GET /api/exports/:id` - Get export status

### Analytics
- `GET /api/analytics/summary` - Get KPI summary

### Health
- `GET /health` - Health check

## Database Schema

The API uses Drizzle ORM with the following tables:

- `tenants` - Tenant information
- `users` - User accounts
- `user_tenants` - User-tenant relationships
- `api_keys` - API key management
- `suppliers` - Supplier information
- `invoices` - Invoice records
- `events` - Audit events
- `exports` - Export records

## Authentication

### JWT Tokens
- Short-lived access tokens (15 minutes)
- Refresh tokens (7 days)
- User context includes tenant ID and role

### API Keys
- Format: `pdm_live_<random_32_chars>`
- Scoped permissions (ingest, read, export)
- Hashed storage with bcrypt

## Row-Level Security

All tenant data is protected by Postgres RLS:

```sql
-- Set tenant context
SET LOCAL app.tenant_id = '<tenant-uuid>';

-- All queries are automatically filtered by tenant
SELECT * FROM invoices; -- Only returns tenant's invoices
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/einvoice
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Authentication
JWT_SECRET=your_jwt_secret_min_32_chars
BCRYPT_ROUNDS=12

# Server
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
NODE_ENV=production
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Database migrations
pnpm db:generate
pnpm db:migrate

# Database studio
pnpm db:studio
```

## Production Deployment

```bash
# Build
pnpm build

# Start
pnpm start
```

## Health Checks

The API provides health check endpoints for monitoring:

- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity
- `GET /health/storage` - Storage provider status

## Logging

All logs are structured JSON with:

- Request correlation IDs
- Tenant context
- User information
- PII redaction
- Error tracking

## Error Handling

- Graceful error responses
- Structured error logging
- Development vs production error details
- Proper HTTP status codes
