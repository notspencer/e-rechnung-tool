# Auth & Account Decisions (MVP)

This document captures concrete answers for registration, email verification, password policy, and token lifetimes.

## 1) Registration: auto-create tenant or invitation-only?

**Decision**: Auto-create tenant for the first verified user of a new domain; subsequent users join via invite or domain claim.

- **First verified user on a domain with no existing tenant**:
  - Create tenant and assign role OWNER.
  - Initialize `claimed_domains = [domain]`.

- **Same-domain sign-ups later**:
  - If `AUTOJOIN_SAME_DOMAIN=true` and `REQUIRE_OWNER_APPROVAL=false`: auto-join as FINANCE.
  - If `REQUIRE_OWNER_APPROVAL=true`: create a join request; OWNER approves.

- **Different-domain users**:
  - Require explicit invite.

**Rationale**: Enables self-serve pilots while keeping control via domain claim and invites.

## 2) Email verification: required or skip for MVP?

**Decision**: Required (with dev bypass flag).

- Users cannot access tenant data until email is verified.
- Verification link is a one-time token (15–30 minutes TTL).
- Dev flag `ALLOW_UNVERIFIED_IN_DEV=true` permits local testing.

**Rationale**: Prevents typos, protects reset flows, and improves deliverability reputation.

## 3) Password policy: specific rules or basic validation?

**Decision**: Modern, length-first policy with breach checks.

- Minimum length: 12 characters (passphrases encouraged).
- Check against a breached/weak password list (local list or k-anonymity approach).
- Allow all printable characters; trim leading/trailing whitespace.
- Rate-limit auth endpoints (e.g., 5/min/IP; 10/min/account).
- Hash with argon2id (preferred) or strong bcrypt; per-user salt; optional application pepper.
- No forced rotation unless compromise suspected.
- Allow password managers and copy/paste; show strength meter.

**Rationale**: Stronger real-world security than arbitrary complexity rules.

## 4) JWT/session expiry: 15m access + 7d refresh or different?

**Decision**: Web uses session cookies; API uses short-lived access tokens with rotating refresh.

- **Web (browser UI)**:
  - HTTP-only, Secure, SameSite=Lax session cookie.
  - Idle timeout: 7 days (sliding renewal on activity).
  - Absolute cap: 30 days.

- **API (programmatic/mobile/CLI)**:
  - Access token: 15 minutes.
  - Refresh token: 7 days, rotating; revoke on use of an older token.
  - Store refresh token identifiers and families for revocation.

- **API Keys (tenant-scoped)**:
  - Separate from JWTs; hashed at rest; scopes: `ingest:email`, `ingest:upload`, `read:invoice`, `export`.
  - No default expiry; rotation supported.

**Rationale**: Session cookies simplify web UX and revocation; short-lived access + refresh for APIs balances security and practicality.

## Minimal Tables (Auth)

```sql
users(id, email, password_hash, email_verified_at, created_at, last_login_at)
tenants(id, slug, name, claimed_domains jsonb, created_at)
user_tenants(user_id, tenant_id, role, created_at, primary key (user_id, tenant_id))
api_keys(id, tenant_id, name, prefix, secret_hash, scopes jsonb, created_at, last_used_at)
refresh_tokens(id, user_id, tenant_id, family_id, revoked boolean, created_at, expires_at)
```

## RLS Policy Pattern

Enable RLS on every tenant-owned table and use:

```sql
USING (tenant_id = current_setting('app.tenant_id')::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid)
```

Set `app.tenant_id` per request after authentication.

## Security Guardrails

- CSRF token on state-changing requests (for cookie sessions).
- Brute-force throttling with exponential backoff after repeated failures.
- Generic error messages for auth failures.
- Structured audit logs for sign-up, verify, login, invite, reset, token rotate; never log secrets or hashes.

## Environment Defaults (suggested)

```
REQUIRE_EMAIL_VERIFICATION=true
SIGNUP_MODE=invite_only
TENANT_CREATION=self_serve_first_user
AUTOJOIN_SAME_DOMAIN=true
REQUIRE_OWNER_APPROVAL=true
ENABLE_CAPTCHA=true
PASSWORD_MIN_LENGTH=12
SESSION_TTL_DAYS=7
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=7
ALLOW_UNVERIFIED_IN_DEV=false
```
