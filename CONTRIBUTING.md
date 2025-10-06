# Contributing to E-Rechnung Tool

Thank you for your interest in contributing! We welcome bug reports, feature requests, documentation improvements, and code contributions.

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Developer Certificate of Origin (DCO)

All contributions must be signed off using the [Developer Certificate of Origin (DCO)](https://developercertificate.org/). This certifies that you have the right to submit the code and that you agree to license it under the project's Apache 2.0 license.

### How to Sign Off

Add `-s` or `--signoff` to your `git commit` command:

```bash
git commit -s -m "Add validation rule for missing IBAN"
```

This adds a `Signed-off-by` line to your commit message:

```
Signed-off-by: Your Name <your.email@example.com>
```

**All commits in a PR must be signed off.** PRs with unsigned commits will not be merged.

---

## Development Setup

### Prerequisites

- **Node.js 20+**
- **pnpm 8+**
- **PostgreSQL 15+** (or Docker)
- **Git**

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/e-rechnung-tool.git
cd e-rechnung-tool

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env with your local Postgres/S3 credentials

# Run database migrations
pnpm db:migrate

# Run tests to verify setup
pnpm test
```

### Running Locally

```bash
# Start API in development mode (with watch/reload)
pnpm dev

# Run CLI commands
pnpm cli validate examples/invoices/xrechnung-sample.xml

# Run linter
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

---

## Contribution Workflow

1. **Create an issue** (unless it's a trivial fix like a typo)
   - Describe the bug, feature request, or improvement
   - Wait for maintainer feedback before starting large changes

2. **Fork and branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

3. **Make changes**
   - Follow coding conventions (see below)
   - Add tests for new functionality
   - Update documentation as needed

4. **Test thoroughly**
   ```bash
   pnpm test
   pnpm lint
   ```

5. **Commit with sign-off**
   ```bash
   git commit -s -m "Add support for ZUGFeRD 2.2"
   ```

6. **Push and open a PR**
   ```bash
   git push origin feature/my-new-feature
   ```
   - Reference the related issue in the PR description
   - Fill out the PR template

7. **Respond to review feedback**
   - Make requested changes
   - Sign off on new commits
   - Keep the PR up to date with `main`

---

## Coding Conventions

### TypeScript

- **Strict mode enabled**: No `any`, prefer explicit types
- **Functional style**: Prefer pure functions, immutable data
- **No side effects in domain logic**: Keep I/O in adapters
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for types and classes
  - `SCREAMING_SNAKE_CASE` for constants
- **File naming**:
  - `kebab-case.ts` for implementation files
  - `PascalCase.ts` for files exporting a single class/type

### Validation Rules

- **Stable rule IDs**: Never change existing IDs (e.g., `INV-01`)
- **Pure functions**: No I/O, no randomness, deterministic
- **Unit tests required**: Every rule must have ≥1 passing and ≥1 failing test case
- **Error messages**: Human-readable, include context (e.g., field path)

### Database

- **Migrations only**: Never modify schema directly
- **RLS policies required**: All tenant tables must have row-level security
- **Naming**:
  - Tables: `snake_case` plural (e.g., `invoices`, `user_tenants`)
  - Columns: `snake_case`
  - Foreign keys: `{table}_id` (e.g., `tenant_id`, `supplier_id`)

### Tests

- **Vitest** for unit and integration tests
- **Arrange-Act-Assert** pattern
- **Test file naming**: `feature.test.ts` next to `feature.ts`
- **Coverage target**: ≥80% for new code
- **No flaky tests**: Tests must be deterministic

### Logging

- **Pino structured logs** (JSON)
- **Correlation IDs**: Use `requestId` for tracing
- **No PII in logs**: Redact email addresses, invoice details, etc.
- **Log levels**:
  - `error`: Unrecoverable errors
  - `warn`: Recoverable issues (e.g., validation warnings)
  - `info`: Key events (e.g., invoice received, archived)
  - `debug`: Detailed trace (disabled in production)

---

## Pull Request Checklist

Before submitting your PR, ensure:

- [ ] **Code compiles** (`pnpm build`)
- [ ] **All tests pass** (`pnpm test`)
- [ ] **Linter passes** (`pnpm lint`)
- [ ] **All commits signed off** (`git log --show-signature`)
- [ ] **New features have tests** (unit + integration where applicable)
- [ ] **Documentation updated** (README, /docs, code comments)
- [ ] **No commented-out code** (remove debug/dead code)
- [ ] **No secrets committed** (check `.env`, config files)
- [ ] **PR description** references related issue (e.g., "Closes #42")

---

## Types of Contributions

### Bug Reports

- **Search existing issues** first to avoid duplicates
- **Include**:
  - Clear description of the bug
  - Steps to reproduce
  - Expected vs. actual behavior
  - Environment (OS, Node version, Postgres version)
  - Relevant logs (redact PII)

### Feature Requests

- **Describe the use case**: Who needs this and why?
- **Propose a solution**: How would it work?
- **Consider scope**: Does it fit the MVP? Or is it a post-MVP feature?

### Documentation Improvements

- Typo fixes, clarifications, examples are always welcome
- Large doc restructuring should be discussed in an issue first

### Code Contributions

- **Start small**: Tackle "good first issue" labels
- **Discuss large changes**: Open an issue/discussion before implementing
- **Follow conventions**: See "Coding Conventions" above

---

## Review Process

1. **Automated checks** (CI): Lint, tests, build must pass
2. **Maintainer review**: At least one maintainer approval required
3. **Community feedback**: Other contributors may comment
4. **Merge**: Maintainer will squash or rebase-merge

**Response time**: We aim to respond to PRs within 3–5 business days.

---

## Release Process

- **Semantic versioning**: `MAJOR.MINOR.PATCH`
- **Changelog**: Maintained in `CHANGELOG.md`
- **Release cadence**: Monthly for minor versions, ad-hoc for patches
- **Breaking changes**: Announced in advance, documented

---

## Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/notspencer/e-rechnung-tool/discussions)
- **Bugs?** Open a [GitHub Issue](https://github.com/notspencer/e-rechnung-tool/issues)
- **Security issues?** See [SECURITY.md](SECURITY.md)

---

Thank you for contributing to E-Rechnung Tool!

