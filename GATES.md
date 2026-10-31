# Sorich Studio implementation gates

## Plan and ownership

- Product owner: repository owner.
- Frontend: responsive multi-platform workspace and public site.
- Backend: trusted API, OAuth callbacks, scheduler, workers, storage, and provider adapters.
- Security owner: backend/security implementation and verification.
- Release owner: product owner after all gates have evidence.
- Current phase: architecture and security foundation. The deployed GitHub Pages site remains a static prototype.

## Phase 0 — secure foundation (release blocking)

- CHECK: deployment topology is documented and production API is separate from GitHub Pages.
  EXPECT: static hosting contains no privileged secrets and no publishing operation trusts browser state.
- CHECK: auth/session implementation is exercised in a real HTTPS staging environment.
  EXPECT: server-managed opaque sessions, HttpOnly + Secure + SameSite cookies, rotation, expiry, logout revocation, CSRF defenses, and no auth tokens in localStorage/sessionStorage.
- CHECK: two independent test workspaces attempt cross-tenant reads and writes against every tenant-owned table and API.
  EXPECT: all unauthorized cross-tenant operations are denied by server authorization and database RLS.
- CHECK: automated role matrix tests run for owner, admin, editor, publisher, analyst, and viewer.
  EXPECT: least-privilege permissions are enforced server-side and in RLS.
- CHECK: repository and deployment secret scans run.
  EXPECT: no service-role keys, OAuth secrets, provider tokens, encryption keys, or signing secrets in source, build artifacts, logs, or browser bundles.
- CHECK: cookie, CSRF, XSS, SQL injection, SSRF, rate-limit, upload validation, and dependency tests run.
  EXPECT: security tests pass; CSP and security headers are present at the edge.
- CHECK: backup restore and incident-response exercises are completed.
  EXPECT: restore succeeds and token/session revocation procedures are documented and tested.

## Phase 1 — workspace and library

- CHECK: private upload/import flow is tested with oversized, malformed, unsupported, and malicious files.
  EXPECT: private object storage, short-lived signed URLs, validation, quotas, and safe failure states.
- CHECK: workspace membership and role changes are tested.
  EXPECT: access changes take effect immediately and are recorded in audit events.
- CHECK: duplicate detection and deletion flows are tested.
  EXPECT: content hashes prevent accidental duplicate imports; deletion follows documented retention rules.

## Phase 2 — AI Studio and research

- CHECK: AI generation requests are scoped, rate-limited, and logged without sensitive content or secrets.
  EXPECT: original ideas, scripts, captions, subtitles, platform metadata variants, and quality feedback are available with transparent model status.
- CHECK: generated and researched content is reviewed for source attribution and platform policy.
  EXPECT: research informs original work and does not copy private/unauthorized content.

## Phase 3 — provider integrations

- CHECK: OAuth state/PKCE/callback validation, scope minimization, token encryption, refresh, revocation, and disconnect are tested per provider.
  EXPECT: each provider connection is isolated by workspace and tokens are only accessible to trusted workers.
- CHECK: provider app review, audit, account eligibility, and required permissions are confirmed.
  EXPECT: UI shows capability status honestly; no platform is marked publish-ready without approval.
- CHECK: YouTube Shorts, TikTok, Instagram Reels, and Facebook Reels each pass their own end-to-end test.
  EXPECT: destination-specific upload, publish, status reconciliation, error handling, and metrics work only where official APIs permit them.

## Phase 4 — publishing and calendar

- CHECK: retry, timeout, duplicate, cancellation, pause, and provider outage scenarios are simulated.
  EXPECT: idempotent jobs, bounded retries, explicit approval, audit trail, and global/workspace pause prevent accidental repeated posts.
- CHECK: timezone and daylight-saving transitions are tested.
  EXPECT: scheduled times are interpreted and displayed consistently in the workspace timezone.

## Phase 5 — analytics and automation

- CHECK: provider metric availability and freshness are tested.
  EXPECT: analytics identify the source, timestamp, and unavailable metrics; no fabricated or inferred provider values.
- CHECK: automation permission, limits, approval, and pause controls are tested.
  EXPECT: workflows are opt-in, bounded, observable, and reversible.

## Phase 6 — multi-creator SaaS

- CHECK: tenant-isolation, invitations, role changes, account deletion, data export, billing boundaries, and quota enforcement are independently reviewed.
  EXPECT: one creator cannot access another creator's data, credentials, content, or usage.
- CHECK: production security review and incident-response readiness are signed off.
  EXPECT: no public launch until all blocking findings are resolved.

## Existing frontend checks

- CHECK: `index.html` loads from GitHub Pages.
  EXPECT: responsive editorial landing page and accurate capability claims.
- CHECK: `app.html` loads and existing Supabase signup, sign-in, password reset, sign-out, and workspace setup flows are verified.
  EXPECT: no broken auth flow and honest error/empty states.
- CHECK: static frontend source and generated bundles are scanned.
  EXPECT: only public configuration is present; no privileged key or OAuth secret.
- CHECK: desktop and mobile layouts are tested.
  EXPECT: no horizontal overflow and all controls are keyboard accessible.

**Release rule:** passing the frontend checks does not mean the security or publishing release gates have passed.
