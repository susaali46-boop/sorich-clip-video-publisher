# Sorich Studio implementation plan

Status: planning baseline for PR #2. This document is a delivery plan, not evidence that the listed capabilities are implemented or deployed.

## 1. Product decisions and operating assumptions

- **Initial operating mode:** one owner-operated workspace, designed with tenant isolation from the first database migration so additional creators can be supported later.
- **Publishing mode:** support both one-destination-at-a-time publishing and a multi-destination batch where each destination is independently selected, validated, approved, and tracked.
- **Safety default:** importing, generating, scheduling, and publishing are separate permissions and actions. No content is published merely because it was generated or uploaded.
- **Provider truthfulness:** every platform has an explicit capability state (unsupported, setup required, review pending, connected, or publish-ready). Capabilities are verified independently; no promise of identical APIs or universal auto-publishing.
- **Hosting constraint:** GitHub Pages remains a public static frontend only. It must never hold privileged credentials, provider tokens, service-role keys, or trusted authorization logic.
- **Architecture choices still requiring validation:** backend/runtime host, database/auth approach, private media storage, job queue, AI provider, and each platform's developer-app approval requirements. Do not select these silently or put secrets in Git.

## 2. Five-level work breakdown

### Level 1 — Sorich Studio

Deliver a secure, owner-operated multi-platform content workflow, with a tenant-ready foundation.

### Level 2 — Workstreams

1. Security and platform foundation
2. Workspace and media library
3. AI Studio and content research
4. Official social-provider integrations
5. Publishing queue and calendar
6. Analytics and automation
7. Multi-creator readiness and operations

### Level 3–5 — Deliverables, components, and implementation tasks

#### 1. Security and platform foundation
- **Backend boundary**
  - Select and document a supported server runtime and deployment environment.
  - Separate public frontend configuration from server-only secrets.
  - Add development, staging, and production environment separation.
- **Identity and sessions**
  - Implement server-verified sign-in and account recovery.
  - Use opaque server-managed sessions in HttpOnly, Secure, appropriately SameSite cookies.
  - Rotate sessions on authentication/privilege changes; expire and revoke sessions on logout, password reset, and account security events.
  - Add CSRF defenses, Origin/Fetch Metadata validation, rate limits, and generic recovery responses.
  - Never place session credentials or provider tokens in browser local/session storage.
- **Authorization and data isolation**
  - Define workspace membership and owner/admin/editor/publisher/analyst/viewer roles.
  - Enforce authorization in server handlers and database row-level policies; the UI is not an authorization boundary.
  - Test cross-workspace reads and writes using at least two independent test tenants.
- **Security operations**
  - Add secret scanning, dependency checks, security headers, structured audit events, backups, restore drills, and an incident-response runbook.
  - Document data retention, export, deletion, and account disconnect behavior.

#### 2. Workspace and media library
- **Workspace**
  - Create workspace profile, settings, timezone, membership, and role management.
  - Add onboarding and clear empty/error/loading states.
- **Media**
  - Implement private upload and import into object storage.
  - Validate file size, type, media metadata, and content hash server-side.
  - Use short-lived signed URLs; never expose storage credentials.
  - Add folders, tags, search, duplicate detection, and safe deletion/retention.
- **Google Drive**
  - Treat Drive import as a separate official OAuth integration.
  - Request minimum scopes, display selected files, and record import status and source metadata.

#### 3. AI Studio and content research
- **Creation**
  - Add original idea, outline, script, caption, subtitle, title, description, and thumbnail-brief generation.
  - Keep drafts versioned and editable; show which model/service generated each result.
  - Add user review before any generated asset enters a publishing queue.
- **Quality and rights**
  - Validate duration, aspect ratio, language, claims, source attribution, and platform constraints.
  - Research may inform original content; it is not permission to copy private, paid, or copyrighted creator content.
  - Store source references and flag uncertain factual claims for human review.
- **Operations**
  - Add usage limits, timeouts, retries, cost visibility, and safe handling of provider errors.

#### 4. Official social-provider integrations
- **Shared integration layer**
  - Define a provider adapter contract for connect, disconnect, account identity, capabilities, upload, publish, status reconciliation, and analytics.
  - Store OAuth state and PKCE verifier server-side; validate callback state and redirect targets.
  - Encrypt refresh/access tokens at rest and restrict decryption to trusted workers.
  - Support token refresh, revocation, reconnect, and permission-status display.
- **Provider delivery order**
  - Start with YouTube after confirming API project configuration and account eligibility.
  - Add Meta (Instagram/Facebook) after app review, account-type, permission, and publishing requirements are verified.
  - Add TikTok after confirming app review, scopes, creator/account eligibility, and posting restrictions.
  - Evaluate Snapchat, Pinterest, and LinkedIn separately; implement only supported official API workflows.
- **Per-provider release**
  - Build sandbox/test-account coverage where available.
  - Verify upload, publish, asynchronous processing, status polling, error mapping, deletion/withdrawal behavior, and rate-limit handling.
  - Never scrape or automate private endpoints as a substitute for official API permission.

#### 5. Publishing queue and calendar
- **Composer**
  - Select one or multiple destinations per post.
  - Validate each destination independently and show its preview, caption, media requirements, and readiness.
  - Require explicit user approval for each destination before enqueueing.
- **Queue and worker**
  - Add timezone-aware scheduling and durable job records.
  - Use idempotency keys, bounded retries, backoff, timeouts, and reconciliation for uncertain outcomes.
  - Re-check workspace permission, connected account, token validity, media, and provider capability immediately before publishing.
  - Add per-workspace/global pause, cancel, retry, and audit history.
- **Status**
  - Track each destination separately: draft, awaiting approval, scheduled, processing, published, failed, cancelled, or needs attention.
  - A batch is not marked successful if any destination is unresolved or failed.

#### 6. Analytics and automation
- **Analytics**
  - Ingest only metrics made available by the relevant official provider APIs and granted scopes.
  - Store metric source, collection timestamp, freshness, and missing-data reason.
  - Build per-platform and cross-platform views without inventing or silently estimating unavailable metrics.
- **Automation**
  - Add opt-in, bounded workflows with preview, permission checks, audit history, rate limits, and a global pause.
  - Keep trend research and recommendations separate from automatic publishing.
  - Require explicit approval before enabling any workflow that can publish externally.

#### 7. Multi-creator readiness and operations
- **Tenant readiness**
  - Add invitation lifecycle, membership changes, role tests, tenant quotas, export, and account/workspace deletion.
  - Add billing only after product, privacy, support, and legal requirements are defined.
- **Operational readiness**
  - Add monitoring, alerting, backup restoration, incident exercises, support runbooks, and production security review.
  - Do not open public registration until tenant-isolation and security release gates pass.

## 3. Delivery sequence and exit criteria

| Milestone | Scope | Exit criteria |
|---|---|---|
| M0 — Decisions and threat model | Confirm backend/runtime, deployment, data classification, provider order, and threat model | Architecture decision records exist; no secrets are committed; deployment boundaries are documented |
| M1 — Secure vertical slice | Server-side identity/session, one workspace, database policies, private storage, audit events | Session, CSRF, authorization, tenant-isolation, secret-scan, and restore tests pass in staging |
| M2 — Library | Upload/import, metadata, folders, search, duplicate detection, deletion | Malformed/oversized files are rejected; private objects require authorized short-lived access |
| M3 — AI Studio | Original drafts, captions, subtitles, quality review, source attribution | AI outputs remain drafts; quotas and error handling work; review and attribution are testable |
| M4 — First provider | One provider end-to-end, starting with YouTube if eligibility and API approval permit | OAuth, upload, publish, reconciliation, revocation, and failure paths pass with a real test account |
| M5 — Queue and calendar | Multi-destination composer, approvals, scheduling, workers, pause/cancel | Idempotency and duplicate-post tests pass; timezone and retry tests pass; no unapproved post can publish |
| M6 — Additional providers and analytics | Meta/TikTok then other eligible APIs; provider-backed analytics | Each provider has its own signed-off capability matrix and end-to-end evidence |
| M7 — Multi-creator release | Invitations, roles, quotas, exports/deletion, operations and billing readiness | Independent tenant security review and all production gates pass before public launch |

Milestones are dependency-ordered, not calendar estimates. Work may overlap only when its prerequisites and security boundaries are already established.

## 4. Ownership and decision rights

- **Product owner / repository owner:** approves scope, provider priorities, user-facing behavior, release decisions, and any paid-service commitments.
- **Backend/security implementation owner:** owns threat model, server runtime, authentication/session design, authorization, database policies, token vault, queue security, and security test evidence.
- **Frontend owner:** owns accessible responsive UI, forms, previews, status states, and correct integration with server APIs; must not implement security by hiding controls.
- **Provider integration owner:** owns official API research, OAuth review, provider capability matrix, adapter implementation, and end-to-end provider tests.
- **QA/release owner:** owns automated regression, staging verification, release checklist, rollback readiness, and evidence that gates passed.
- **Current assignment:** these are role definitions, not claims that additional people or teams have been assigned. Until named owners are approved, the repository owner coordinates decisions and each workstream remains unassigned.

## 5. Required engineering workflow

1. Before each milestone, write a short design note with scope, trust boundaries, data touched, failure modes, rollback, and measurable acceptance criteria.
2. Add runnable gates before implementation where possible. Use the format:
   - CHECK: the command, test, or observable behavior to run.
   - EXPECT: the exact passing result or invariant.
3. Review scripts, migrations, permissions, and deployment changes before execution. Never run an unreviewed destructive migration against production.
4. Implement one vertical slice at a time. Keep unrelated UI and backend changes out of the same commit.
5. Run unit, integration, security, and relevant end-to-end tests; record actual command output and environment.
6. Review the diff for secrets, unsafe defaults, missing authorization, misleading capability claims, and accessibility regressions.
7. Deploy to staging first. Promote only after the milestone's release gates have evidence and rollback is understood.

## 6. Initial runnable / observable gates

These gates become executable as the corresponding backend and test harness exist. Until then, they are acceptance requirements, not tests already passed.

- CHECK: run the repository secret scanner against tracked files and built frontend assets.
  EXPECT: no privileged keys, OAuth secrets, signing keys, or provider tokens are present.
- CHECK: run authenticated session tests over HTTPS staging.
  EXPECT: session cookies are HttpOnly, Secure, and have the approved SameSite policy; session rotation, expiry, and revocation work.
- CHECK: run CSRF and cross-origin request tests for every state-changing route.
  EXPECT: untrusted origins and invalid CSRF tokens are rejected.
- CHECK: run role-matrix tests for every workspace API operation.
  EXPECT: each role can perform only its documented actions; server-side checks reject forbidden operations.
- CHECK: run two-tenant isolation tests against database policies and API routes.
  EXPECT: tenant A cannot read, update, delete, or infer tenant B's protected records or media.
- CHECK: run upload validation tests with oversized, malformed, spoofed-type, and unsupported files.
  EXPECT: invalid files are rejected before processing and no private object becomes public.
- CHECK: run publishing-worker tests with duplicate delivery, timeout, expired token, rate limit, cancellation, and provider outage cases.
  EXPECT: no duplicate external post is created; uncertain outcomes are reconciled; retries are bounded; pause/cancel is respected.
- CHECK: run provider-specific end-to-end tests using authorized test accounts.
  EXPECT: only verified provider capabilities are enabled; published status requires provider confirmation.
- CHECK: run backup restore and incident-response exercises before production release.
  EXPECT: restore is verified and credentials/sessions can be revoked using the documented procedure.

## 7. Risks and controls

| Risk | Control / release response |
|---|---|
| GitHub Pages is mistaken for a secure backend | Keep privileged operations server-side; block release if any secret or trusted authorization path is in static assets |
| Provider API access is limited or denied | Show setup/review/unsupported states; do not promise or simulate unavailable publishing |
| OAuth token theft or leakage | Encrypt at rest, limit worker access, rotate/revoke, redact logs, scan artifacts |
| Cross-tenant data exposure | Database row-level policies plus server authorization and adversarial two-tenant tests |
| Duplicate or accidental publishing | Explicit approval, idempotency, per-destination state, global pause, audit log |
| AI output contains errors or rights issues | Human review, source attribution, originality checks, platform-policy checks |
| External APIs change | Versioned adapters, capability checks, provider contract tests, graceful degraded state |
| Costs or rate limits grow unexpectedly | Per-workspace quotas, bounded jobs, usage visibility, provider rate-limit handling |

## 8. Definition of done

A milestone is complete only when its code is merged, its documented CHECK gates have actually run in the intended environment, the EXPECT results are recorded, security and accessibility review is complete for the changed surface, and rollback or recovery is documented. A plan, mockup, placeholder, or passing static-page check is not evidence of a production feature.

**Current state:** M0 planning is documented in this pull request. No backend, secure cookie session, OAuth token vault, provider publishing, job worker, analytics ingestion, or production security verification is claimed by this plan.
