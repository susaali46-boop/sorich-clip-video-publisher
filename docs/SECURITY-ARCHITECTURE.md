# Sorich Studio security architecture

## Status and scope

This document is the required security design for the multi-creator, multi-platform Sorich Studio product. The current GitHub Pages app is a static prototype. It is not a trusted backend and must not be treated as a secure publishing service. A browser-only implementation cannot safely protect provider refresh tokens, service-role keys, signing secrets, or scheduled publishing jobs.

**Release rule:** no real social-account connection, token storage, file transfer, or automatic publishing is enabled until the server-side controls and release gates in `GATES.md` pass.

## Trust boundaries

1. **Browser / public website:** untrusted. May contain public configuration only. Never contains provider client secrets, refresh/access tokens, Supabase service-role keys, signing keys, or privileged API credentials.
2. **Application API / server functions:** authenticates every request, authorizes workspace membership and role, validates payloads, applies rate limits, and performs provider actions.
3. **Database:** private by default. Row-level security (RLS) is enabled on every tenant-owned table. Access is denied unless a policy explicitly grants it.
4. **Token vault:** provider tokens are encrypted at rest using managed KMS/envelope encryption. Encryption keys are not stored beside ciphertext. Decryption is limited to the publishing worker and OAuth callback service.
5. **Workers and scheduler:** run with narrowly scoped service identities; claim jobs atomically; use idempotency keys; never trust browser-supplied workspace or account IDs.
6. **External providers:** YouTube, TikTok, Instagram, Facebook, and future providers. Each integration has separate scopes, review requirements, rate limits, and capability flags.

## Session and cookie requirements

- Use server-managed opaque sessions; cookie contains only a high-entropy, unguessable session identifier.
- Set cookies with `HttpOnly; Secure; SameSite=Lax` (use `Strict` where compatible); set a narrow `Path=/`; omit `Domain` unless a reviewed subdomain design requires it.
- Rotate the session identifier after login, MFA completion, privilege changes, and re-authentication.
- Enforce idle and absolute expiration on the server; revoke sessions on logout, password reset, account disablement, and suspected compromise.
- Store only a hash of session identifiers server-side. Never put access tokens or personal data in cookie values.
- Use CSRF tokens on state-changing requests, validate `Origin`/Fetch Metadata, and never rely on SameSite alone.
- Do not use localStorage or sessionStorage for authentication tokens.
- If Supabase Auth is retained, use its supported server-side SSR/session pattern and cookie handling. Do not invent a custom cookie wrapper around the browser SDK. Confirm the exact SDK/runtime pattern before deployment.

## Authentication and account protection

- Require verified email before connecting publishing accounts.
- Use a managed identity provider; enforce strong password policy and breached-password checks where supported.
- Offer MFA (prefer passkeys/WebAuthn or TOTP); require step-up authentication for adding/removing provider accounts, changing billing/roles, exporting data, and enabling unattended publishing.
- Use generic login and password-reset responses to reduce account enumeration.
- Apply rate limits and abuse detection to login, signup, reset, OAuth initiation/callback, upload, and publishing endpoints.
- Provide active-session review and revoke-other-sessions controls.

## Authorization and tenant isolation

- Every user-owned row carries a workspace/tenant identifier.
- RLS policies verify membership using the authenticated identity, not a client-provided workspace ID.
- Roles: owner, admin, editor, publisher, analyst, viewer. Enforce least privilege on the server and in RLS.
- A creator must not read or mutate another workspace's assets, jobs, accounts, posts, analytics, or audit events.
- Provider connections belong to a workspace and are usable only by authorized roles.
- Service-role operations run only in trusted server functions and still validate tenant ownership explicitly.

## OAuth and provider tokens

- Use Authorization Code flow with PKCE where supported; validate state, redirect URI, issuer, audience, nonce where applicable, and callback binding.
- Request minimum scopes and explain why each scope is needed.
- Encrypt refresh tokens and sensitive provider credentials at rest; redact tokens from logs, traces, errors, analytics, and support exports.
- Refresh tokens only in trusted server code; handle rotation and revocation safely.
- Disconnect must revoke provider grants where supported, delete stored credentials, and cancel queued work that depends on the connection.
- Provider capability flags must reflect actual API approval and account eligibility. Never show a platform as publish-ready until a live capability check succeeds.
- Respect provider review/audit requirements, content policies, rate limits, and user consent. Do not scrape private endpoints or bypass platform restrictions.

## Web application defenses

- Content Security Policy with restrictive `default-src`, `script-src`, `connect-src`, `frame-ancestors 'none'`, and no unsafe-inline/eval where practical.
- Set `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy` at the hosting/API edge.
- Prefer external scripts with pinned versions and integrity hashes; avoid injecting untrusted HTML. Render user content with text APIs or a reviewed sanitizer.
- Validate and normalize all inputs server-side; use parameterized database queries; enforce file type, size, duration, and upload limits.
- Protect uploads with signed, short-lived URLs, private object storage, malware scanning where available, and no public bucket by default.
- Prevent SSRF by allowing only approved provider hosts for server-side fetches; block private, loopback, link-local, and metadata IP ranges.
- Apply request size limits, timeouts, safe error messages, dependency scanning, and secret scanning.

## Publishing safety and integrity

- Publishing is a privileged action. Require explicit per-post approval unless the workspace owner enables a documented automation policy.
- Store a content hash and provider idempotency key to prevent duplicate posts on retries.
- Model states explicitly: draft, ready_for_review, approved, queued, publishing, published, failed, cancelled.
- Re-check account ownership, permissions, provider capability, and approval immediately before execution.
- Record provider response IDs and timestamps; only mark published after provider confirmation.
- Retry only transient errors with bounded exponential backoff and jitter. Do not retry policy, permission, validation, or authorization failures automatically.
- Include a global pause switch and per-workspace pause switch.
- Keep an append-only audit trail for account changes, approvals, scheduling, publishing, exports, and security events.

## Privacy, retention, and operations

- Collect only data needed for the feature; define retention and deletion schedules.
- Provide account export and deletion workflows; delete provider tokens on disconnect/account deletion.
- Encrypt backups, restrict access, and test restoration.
- Centralize monitoring for auth anomalies, privilege changes, token refresh failures, publishing failures, and repeated authorization denials.
- Keep logs free of secrets and minimize personal data. Restrict log access and retention.
- Maintain incident response steps: contain, revoke sessions/tokens, preserve relevant audit evidence, notify affected users as required, recover, and document lessons.

## Public repository and deployment

- GitHub Pages is suitable only for static public assets. It cannot host trusted server secrets or enforce secure server-side sessions by itself.
- Keep production API and auth callbacks on a controlled HTTPS backend/custom domain.
- Enable branch protection, required review/checks, Dependabot, secret scanning and push protection.
- Use separate development/staging/production projects and credentials.
- Never put real credentials in commits, issues, screenshots, or frontend environment variables.
- Rotate any credential that is accidentally committed; deleting the visible file is not sufficient.

## Security acceptance evidence

Before production, attach evidence for each security gate in `GATES.md`: automated test output, RLS policy tests, cookie inspection, authorization tests across two workspaces, OAuth callback tests, secret scanning, dependency audit, and publishing idempotency tests.
