# Operations

This document covers operational aspects of the PDM E-Invoice platform: logging, monitoring, metrics, SLOs, backup strategies, and export integrity mechanisms.

---

## Table of Contents

1. [Logging](#logging)
2. [Metrics & Monitoring](#metrics--monitoring)
3. [Service Level Objectives (SLOs)](#service-level-objectives-slos)
4. [Backup & Disaster Recovery](#backup--disaster-recovery)
5. [Export Integrity](#export-integrity)
6. [Incident Response](#incident-response)
7. [Deployment & Scaling](#deployment--scaling)

---

## Logging

### Structured Logging with Pino

All logs are emitted as JSON (structured) for machine readability and integration with log aggregation tools (ELK, Datadog, CloudWatch, etc.).

#### Log Format

```json
{
  "level": 30,
  "time": 1696598400000,
  "pid": 12345,
  "hostname": "api-01",
  "requestId": "req-abc123",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid",
  "msg": "Invoice validated successfully",
  "invoice_id": "inv-uuid",
  "validation_status": "PASS",
  "duration_ms": 245
}
```

#### Log Levels

| Level | Value | Usage |
|-------|-------|-------|
| `fatal` | 60 | Unrecoverable errors (process crash) |
| `error` | 50 | Recoverable errors (failed API requests, validation exceptions) |
| `warn` | 40 | Warnings (validation warnings, deprecated API usage) |
| `info` | 30 | Key events (invoice received, archived, exported) |
| `debug` | 20 | Detailed trace (parsing steps, rule evaluation) |
| `trace` | 10 | Extremely verbose (raw XML, full request bodies) |

**Production**: `info` level (30)  
**Development**: `debug` level (20)  
**Troubleshooting**: `trace` level (10) - enable temporarily

#### Correlation IDs

Every API request gets a unique `requestId` (UUID) that propagates through all logs and downstream calls. This enables full request tracing.

```typescript
fastify.addHook('onRequest', (request, reply, done) => {
  request.id = request.headers['x-request-id'] || uuidv4();
  request.log = logger.child({ requestId: request.id });
  done();
});
```

#### PII Redaction

**Critical**: Personal Identifiable Information (PII) must be redacted in logs.

**Redact**:
- Email addresses → `user@***`
- Invoice line item descriptions → First 20 chars only
- Payment details (IBAN, BIC) → Last 4 digits only
- VAT IDs → Last 3 digits only

**Safe to Log**:
- Invoice IDs (UUIDs)
- Invoice numbers (if not sensitive)
- Totals (amounts, currencies)
- Validation codes and statuses

```typescript
// Pino redaction
const logger = pino({
  redact: {
    paths: [
      'email',
      'buyer.email',
      'seller.email',
      'payment.iban',
      'req.headers.authorization'
    ],
    censor: '[REDACTED]'
  }
});
```

---

## Metrics & Monitoring

### Key Metrics

#### Application Metrics

| Metric | Type | Description | Target |
|--------|------|-------------|--------|
| `invoice_received_total` | Counter | Total invoices received (by type, source) | N/A |
| `validation_duration_seconds` | Histogram | Time to validate an invoice (p50, p95, p99) | p95 <10s |
| `api_request_duration_seconds` | Histogram | API endpoint response times | p95 <1s |
| `email_fetch_duration_seconds` | Histogram | IMAP fetch latency | p95 <30s |
| `export_generation_duration_seconds` | Histogram | Export bundle creation time | p95 <60s |
| `active_tenants` | Gauge | Number of tenants with activity in last 7 days | N/A |
| `blob_storage_size_bytes` | Gauge | Total S3 storage used (per tenant) | Monitor growth |

#### Business Metrics (KPIs)

| Metric | Calculation | Target |
|--------|-------------|--------|
| Auto-pass rate | `(VALID invoices) / (total e-invoices)` | ≥95% |
| Median time to archive | `median(archived_at - received_at)` | <5 min |
| P90 time to archive | `p90(archived_at - received_at)` | <30 min |
| Supplier conversion rate | `(suppliers with e-invoice) / (suppliers with "other")` | +20-40% in 60 days |
| Export integrity | `(successful exports with matching checksums) / (total exports)` | ≥99.95% |

### Monitoring Stack

**Recommended**:
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and alerting
- **Pino-compatible log shipper**: Fluent Bit, Logstash, or CloudWatch agent

**Alternative** (Cloud):
- **Datadog**: All-in-one (metrics + logs + traces)
- **New Relic**: APM + monitoring

### Sample Prometheus Metrics Endpoint

```typescript
// packages/api/src/plugins/metrics.ts
import promClient from 'prom-client';

export const invoiceReceivedCounter = new promClient.Counter({
  name: 'invoice_received_total',
  help: 'Total invoices received',
  labelNames: ['tenant_id', 'type', 'source']
});

export const validationDurationHistogram = new promClient.Histogram({
  name: 'validation_duration_seconds',
  help: 'Time to validate an invoice',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

// Expose /metrics endpoint
fastify.get('/metrics', async (request, reply) => {
  reply.type('text/plain');
  return promClient.register.metrics();
});
```

### Alerting Rules

#### Critical Alerts (Page On-Call)

- **API Error Rate >5%** for 5 minutes
- **Database Connection Pool Exhausted** (0 available connections)
- **RLS Policy Bypass Detected** (query without `app.tenant_id`)
- **Export Integrity Failure** (checksum mismatch)
- **Disk/Storage >90% Full**

#### Warning Alerts (Slack/Email)

- **Auto-Pass Rate <95%** for 1 hour
- **P95 Validation Time >10s** for 15 minutes
- **Email Fetch Failing** (IMAP errors) for 3 consecutive attempts
- **High Memory Usage >80%** for 10 minutes

---

## Service Level Objectives (SLOs)

### Availability

**Target**: 99.5% uptime (monthly)
- **Allowed downtime**: ~3.6 hours/month
- **Measurement**: API health check endpoint (`GET /health`)

### Latency

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `POST /api/invoices/upload` | <500ms | <2s | <5s |
| `GET /api/invoices` | <200ms | <500ms | <1s |
| `GET /api/invoices/:id` | <300ms | <800ms | <2s |
| `POST /api/exports` | <100ms | <200ms | <500ms (async job) |

### Data Integrity

- **Invoice XML Retention**: 100% (10 years)
- **Checksum Verification**: 100% match on retrieval
- **Export Integrity**: ≥99.95% (complete manifests with valid checksums)

### Processing Time

- **Email-to-Archive (Median)**: <5 minutes
- **Email-to-Archive (P90)**: <30 minutes
- **Export Generation (1000 invoices)**: <60 seconds

---

## Backup & Disaster Recovery

### Database Backups

#### Strategy

- **Full backup**: Daily at 02:00 UTC
- **Incremental backup**: Every 6 hours
- **WAL (Write-Ahead Log) archiving**: Continuous (for point-in-time recovery)
- **Retention**: 30 days for full backups; 7 days for incremental

#### Testing

- **Monthly restore test**: Restore latest backup to staging environment
- **Quarterly DR drill**: Full failover simulation

#### Recovery Objectives

- **RPO (Recovery Point Objective)**: <1 hour (via WAL)
- **RTO (Recovery Time Objective)**: <4 hours (full restoration)

### Blob Storage Backups

#### S3 Configuration

- **Versioning**: Enabled (retain previous versions of blobs)
- **Lifecycle policy**:
  - Transition to Glacier after 90 days (for cost savings)
  - Expire after 10 years (GoBD compliance period)
- **Cross-region replication**: Enabled for production

#### Blob Integrity

- **Checksum verification**: SHA-256 on upload and periodic audits
- **Quarterly audit**: Compare stored checksums with physical blobs

---

## Export Integrity

### Export Bundle Structure

```
exports/<yyyymm>/<export_id>/
  ├── bundle.zip
  ├── bundle.sha256
  ├── report.json
  └── manifest.json
```

### manifest.json Format

```json
{
  "export_id": "uuid",
  "tenant_id": "uuid",
  "created_at": "2024-10-06T12:00:00Z",
  "completed_at": "2024-10-06T12:08:00Z",
  "from_date": "2024-01-01",
  "to_date": "2024-12-31",
  "invoice_count": 142,
  "total_size_bytes": 5242880,
  "format": "csv",
  "bundle_checksum": "sha256:abc123...",
  "files": [
    {
      "path": "invoices.csv",
      "size_bytes": 102400,
      "checksum": "sha256:def456...",
      "row_count": 142
    },
    {
      "path": "xml/INV-2024-001.xml",
      "size_bytes": 8192,
      "checksum": "sha256:ghi789...",
      "invoice_id": "uuid"
    }
  ]
}
```

### Integrity Checks

1. **On Export Creation**:
   - Calculate SHA-256 of each XML file
   - Verify against stored checksum in database
   - If mismatch → FAIL export, alert immediately

2. **On Export Download**:
   - Verify `bundle.sha256` matches `bundle.zip` checksum
   - Client can verify locally: `sha256sum -c bundle.sha256`

3. **Periodic Audit**:
   - Monthly: Re-verify 10% random sample of archived invoices
   - If checksum mismatch → alert, investigate corruption

### CSV Export Format

#### Header Row

```csv
invoice_id,invoice_number,issue_date,seller_name,seller_vat_id,buyer_name,buyer_vat_id,currency,total_net,total_tax,total_gross,status,received_at,archived_at
```

#### Line Item Rows (Optional)

```csv
invoice_id,line_id,description,quantity,unit,unit_price,net_amount,tax_rate,tax_amount
```

**Note**: Clients can choose "header-only" or "header + lines" export.

---

## Incident Response

### Incident Severity Levels

| Severity | Description | Response Time |
|----------|-------------|---------------|
| **P0** | Complete service outage | <15 minutes |
| **P1** | Critical feature down (e.g., ingest broken) | <1 hour |
| **P2** | Degraded performance or partial outage | <4 hours |
| **P3** | Minor issue, workaround available | <24 hours |

### Incident Playbooks

#### P0: Database Down

1. Check DB health: `pg_isready -h <host>`
2. Review connection pool: `SELECT count(*) FROM pg_stat_activity`
3. If pool exhausted: Restart API servers (to reset connections)
4. If DB unresponsive: Failover to read replica (read-only mode)
5. Page database admin for recovery

#### P1: Email Ingestion Failing

1. Check IMAP credentials: Test manual connection
2. Review logs: Search for `imap_error`
3. If authentication issue: Rotate credentials, update config
4. If mailbox full: Archive old emails
5. Notify affected tenants if >1 hour downtime

#### P2: High Validation Latency

1. Check validation duration metrics (p95, p99)
2. Identify slow rules: Review trace logs
3. If specific invoice: Isolate and analyze XML structure
4. If widespread: Scale up workers or optimize rule engine
5. Communicate ETA to users

---

## Deployment & Scaling

### Deployment Strategy

**Recommended**: Blue-green deployment with health checks

1. Deploy new version to "green" environment
2. Run smoke tests (health check, sample API calls)
3. Route 10% traffic to green (canary)
4. Monitor error rates and latency for 15 minutes
5. If healthy: Route 100% traffic to green
6. Keep blue online for 1 hour (fast rollback if needed)

### Horizontal Scaling

#### API Servers

- **Stateless**: Scale horizontally behind load balancer
- **Auto-scaling trigger**: CPU >70% for 5 minutes
- **Min instances**: 2 (high availability)
- **Max instances**: 10 (or based on load)

#### Background Jobs (Email Fetcher)

- **Cron-based**: Run every 5 minutes per tenant
- **Job queue**: Use Redis or Postgres-based queue (e.g., BullMQ)
- **Concurrency**: Process 10 tenants in parallel
- **Scaling**: Add workers if queue depth >100

#### Database

- **Vertical scaling**: Start with 4 vCPUs, 16GB RAM
- **Read replicas**: Add 1-2 replicas for read-heavy queries (analytics)
- **Connection pooling**: Use PgBouncer (transaction mode)
- **Index maintenance**: Run `REINDEX` weekly during low-traffic window

### Performance Tuning

#### Database Indexes

```sql
-- Already covered in mvp-spec.md, recap:
CREATE INDEX CONCURRENTLY idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX CONCURRENTLY idx_invoices_received_at ON invoices(tenant_id, received_at DESC);
CREATE INDEX CONCURRENTLY idx_events_tenant_type ON events(tenant_id, type, created_at DESC);
```

#### Query Optimization

- Use `EXPLAIN ANALYZE` for slow queries
- Avoid N+1 queries: Use `JOIN` or batch fetches
- Paginate large result sets (limit + offset or cursor-based)

#### Caching

- **CDN**: Static assets (future web UI)
- **Redis**: Session tokens, API key lookups (optional)
- **Application cache**: Tenant metadata (low churn, safe to cache)

---

## Health Checks

### Endpoints

#### GET /health
**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2024-10-06T12:00:00Z",
  "uptime_seconds": 86400
}
```

#### GET /health/db
**Response** (200):
```json
{
  "status": "healthy",
  "latency_ms": 5,
  "pool_available": 8,
  "pool_total": 10
}
```

#### GET /health/storage
**Response** (200):
```json
{
  "status": "healthy",
  "latency_ms": 120,
  "provider": "s3"
}
```

### Load Balancer Configuration

- **Health check path**: `/health`
- **Interval**: 10 seconds
- **Timeout**: 5 seconds
- **Unhealthy threshold**: 3 consecutive failures
- **Healthy threshold**: 2 consecutive successes

---

## Security Operations

### Audit Logging

All security-sensitive events are logged to the `events` table:

- User login/logout
- API key created/revoked
- Invoice downloaded
- Export created
- Manual override of validation
- RLS policy violation attempts

### Anomaly Detection

Monitor for:
- **Unusual API key usage**: 10x normal request rate
- **Failed login attempts**: >5 in 5 minutes from same IP
- **Large exports**: >10K invoices (flag for review)
- **Cross-tenant access attempts**: Logged as `rls_violation`

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-06  
**Maintained by**: E-Rechnung Tool Core Team
