# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

As this is a pre-1.0 MVP project, we currently support only the latest release.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to **security@e-rechnung.example**.

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of vulnerability (e.g., SQL injection, XSS, RLS bypass, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Responsible Disclosure

We follow a coordinated disclosure process:

1. **Reporter submits vulnerability** via security@pdm.example
2. **We acknowledge receipt** within 48 hours
3. **We investigate and validate** the issue (typically 1-5 days)
4. **We develop and test a fix** (timeline depends on severity)
5. **We coordinate a release date** with the reporter
6. **We publish the fix** and credit the reporter (if desired)
7. **Reporter may publish details** 90 days after the fix is released, or sooner with mutual agreement

## Security Best Practices for Deployment

When deploying this software, please ensure:

### Database Security
- **Enable Row-Level Security (RLS)** on all tenant tables
- Use a dedicated database user with minimal privileges (no superuser)
- Set `app.tenant_id` session variable on every request
- Never expose raw Postgres connection strings in logs or error messages

### Authentication
- Use strong, unique secrets for JWT signing (min 32 bytes entropy)
- Rotate API keys regularly (recommend 90 days)
- Store password hashes using bcrypt or argon2 (never plain text)
- Use HTTPS for all API endpoints (no exceptions)

### Storage
- Restrict S3 bucket policies to least-privilege IAM roles
- Enable S3 bucket versioning and lifecycle policies
- Never commit AWS credentials or API keys to version control
- Use environment variables or secret management systems (e.g., AWS Secrets Manager)

### Email Processing
- Validate and sanitize all email attachments before processing
- Enforce file size limits (recommend 10MB per attachment)
- Scan attachments for malware using ClamAV or similar
- Reject emails with suspicious MIME types or multiple nested archives

### Logging
- Redact PII in structured logs (email addresses, invoice details, etc.)
- Use correlation IDs for tracing, never log raw session tokens
- Store logs securely with appropriate retention policies

### Network
- Use firewall rules to restrict database access to application servers only
- Enable VPC/private networking for production deployments
- Use TLS 1.3 for all external connections

## Known Security Considerations

### Multi-Tenancy Isolation
This system uses **row-level security (RLS)** for tenant isolation. Bypassing RLS checks (e.g., by using a superuser connection or disabling RLS) would allow cross-tenant data access. Always:
- Use the `app_user` database role (not superuser)
- Set `app.tenant_id` before any tenant data queries
- Test RLS policies in development

### Email-Based Ingestion
Email as a transport mechanism has inherent security risks:
- **Spoofing**: Verify SPF/DKIM/DMARC headers
- **Phishing**: Validate sender addresses against known suppliers
- **Malware**: Scan all attachments before processing

### XML External Entity (XXE) Attacks
We use `fast-xml-parser` which is not vulnerable to XXE by default. However:
- Never enable external entity resolution
- Validate XML structure before parsing
- Enforce size limits on XML files

## Security Scanning

We use the following tools for security analysis:

- **npm audit**: Automated dependency vulnerability scanning
- **Snyk**: Continuous dependency monitoring
- **ESLint security plugins**: Static analysis for common patterns

## Bounty Program

We do not currently offer a bug bounty program. However, we deeply appreciate responsible disclosure and will publicly credit researchers (with their permission) in our release notes and CHANGELOG.

## Contact

For security concerns, contact: **security@e-rechnung.example**

For general questions, use GitHub Discussions or Issues.
