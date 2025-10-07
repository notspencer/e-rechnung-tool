# Auth Rollout Strategy (Invite-only → Domain Claim → Self-Serve)

This document describes how we roll out access in phases without changing schema. All behavior is controlled by flags and a single decision function at registration time.

## Phases

### Phase 0 — Invite-only (now)

- Only existing OWNERs can invite new users.
- Public sign-up is disabled.
- Email verification required.

### Phase 1 — Domain Claim

- Public sign-up allowed.
- If a tenant has claimed_domains matching the registrant's email domain, the user flows into:
  - Auto-join if enabled, or
  - "Request to join" queue pending OWNER approval.
- New domains (no existing tenant) can remain invite-only or go to waitlist.

### Phase 2 — Self-Serve

- First verified user of a new domain can create a tenant and becomes OWNER.
- All protections stay on (email verification, CAPTCHA, rate limits).

## Feature Flags (environment)

```
SIGNUP_MODE=invite_only | domain_claim | self_serve
TENANT_CREATION=owners_only | self_serve_first_user
AUTOJOIN_SAME_DOMAIN=true|false
REQUIRE_OWNER_APPROVAL=true|false
REQUIRE_EMAIL_VERIFICATION=true
ENABLE_CAPTCHA=true|false
WAITLIST_ENABLED=true|false
PASSWORD_MIN_LENGTH=12
SESSION_TTL_DAYS=7
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=7
ALLOW_UNVERIFIED_IN_DEV=false
```

## Decision Function (pseudocode)

```javascript
function decideSignupFlow(email):
  domain = extractDomain(email)
  mode = env.SIGNUP_MODE

  if env.REQUIRE_EMAIL_VERIFICATION:
    requireEmailVerification()

  if mode == 'invite_only':
    requireInvite()
    return

  tenant = findTenantByClaimedDomain(domain)

  if tenant:
    if env.AUTOJOIN_SAME_DOMAIN:
      if env.REQUIRE_OWNER_APPROVAL:
        createJoinRequest(tenant)
        notifyOwnerForApproval()
      else:
        addUserToTenant(tenant, role='FINANCE')
    else:
      requireInviteForTenant(tenant)
    return

  # No tenant claims this domain
  if mode == 'domain_claim':
    if env.WAITLIST_ENABLED:
      addToWaitlist(email, domain)
    else:
      requireInvite()
    return

  if mode == 'self_serve' and env.TENANT_CREATION == 'self_serve_first_user':
    tenant = createTenantFromEmailDomain(domain)
    addUserToTenant(tenant, role='OWNER')
    return

  # Default fallback
  requireInvite()
```

## Multi-Tenancy and RLS

- Shared tables with tenant_id (UUID) on all tenant-owned rows.
- Postgres Row-Level Security enabled with policies:
  - `USING (tenant_id = current_setting('app.tenant_id')::uuid)`
  - `WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid)`
- App must set `SET app.tenant_id = '<uuid>'` per request after auth.
- Background jobs must set the same session variable.

## Email Routing

- Default: plus-address capture `invoices+<tenantSlug>+<token>@einvoice.example`.
- Optional IMAP adapter (read-only) per tenant.
- Deduplicate by (supplier_id, invoice_number, total_gross, issue_date).

## Abuse & Safety Controls

- Email verification mandatory.
- CAPTCHA for public sign-up.
- Rate limits (per IP and per account).
- Disposable email domains denylist toggle.
- Auto-archive tenants with 0 verified users after N days.

## Migration Path Summary

1. Start invite-only.
2. Enable domain claim with OWNER approval.
3. Flip on self-serve tenant creation for first verified user of a new domain.
4. No schema changes required; only config and copy changes.
