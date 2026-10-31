# Sorich Studio multi-platform product roadmap

## Product direction

Sorich Studio is a multi-creator content operations platform. It is designed for a user's own channels first, with a tenant-isolated foundation that can later support other creators and subscription plans. One workspace can connect multiple accounts across multiple social platforms.

## Platform destinations

- YouTube Shorts
- TikTok
- Instagram Reels
- Facebook Reels
- Snapchat Spotlight (subject to supported partner/API capability)
- Pinterest video (subject to API capability)
- LinkedIn video and other future destinations where official publishing APIs support the required workflow

Each provider must declare capabilities independently: connect, upload, publish, schedule, delete, comments, analytics, and media constraints. A destination is marked unavailable, setup-required, review-pending, connected, or publish-ready. Do not imply that all providers expose identical capabilities.

## Product areas

1. Overview: cross-platform queue, recent activity, health, and performance.
2. Video Library: upload, Drive import, folders, search, tags, duplicate detection, media metadata, private storage.
3. AI Studio: original ideas, scripts, hooks, captions, subtitles, title/description variants, thumbnail concepts, aspect-ratio adaptation, quality checks.
4. Content Research: trend discovery, topic research, competitor/public-content analysis, saved ideas, and source attribution. Research is inspiration, not permission to copy.
5. Publishing: multi-destination composer, per-platform preview, approval, queue, retries, cancellation, and status history.
6. Calendar: combined calendar with per-platform filters and timezone-aware scheduling.
7. Analytics: provider-specific metrics, cross-platform comparison, content cohorts, best-performing topics, and transparent metric availability.
8. Automation: user-configurable workflows with previews, permissions, approvals, limits, and a global pause.
9. Social Accounts: connect/disconnect accounts, capability and permission status, token health, and account ownership.
10. Workspace administration: members, roles, billing-ready plan model, security settings, audit log, exports, deletion, and integrations.

## Core workflow

1. Import or upload an original video into private workspace storage.
2. Inspect media and compute a content hash.
3. Generate original scripts/captions and platform-specific metadata.
4. Validate aspect ratio, duration, file size, captions, and destination requirements.
5. Preview each destination independently.
6. Approve selected destinations and schedule in the workspace timezone.
7. Worker revalidates authorization and provider capability before publishing.
8. Record provider confirmation and update each destination status independently.
9. Sync available analytics and show unavailable metrics honestly.

## Design principles

- One source video can produce multiple destination-specific posts.
- Every destination has its own status, preview, caption, and provider response.
- Never claim successful publishing without provider confirmation.
- Automation is opt-in, bounded, observable, and reversible.
- No scraping or copying of private/unauthorized content.
- Accessibility, responsive design, and clear error states are required.
- Users can export their work and disconnect accounts.

## Delivery phases

### Phase 0 — secure foundation
Threat model, environment separation, server-side auth/session design, tenant schema, RLS, audit events, secure storage, deployment pipeline, and security tests.

### Phase 1 — workspace and library
Workspace roles, private media storage, upload/import jobs, metadata, folders, search, duplicate detection, and deletion.

### Phase 2 — AI Studio
Original content assistance, captions, subtitles, metadata variants, quality checks, and destination previews.

### Phase 3 — official provider integrations
Implement and certify each provider separately. Start with YouTube, then Meta (Instagram/Facebook), then TikTok, followed by other providers. Provider approval and account eligibility are release gates.

### Phase 4 — queue and calendar
Timezone-aware scheduling, approval, idempotency, bounded retries, cancellation, pause controls, and status reconciliation.

### Phase 5 — analytics and research
Available provider metrics, cross-platform comparisons, trend research, and evidence-based recommendations.

### Phase 6 — multi-creator SaaS
Invites, roles, workspace isolation tests, billing, usage limits, customer support tooling, and compliance review.

## Non-goals

- No promise of public auto-publishing until provider approval and end-to-end tests pass.
- No storing OAuth tokens in browser storage or GitHub Pages files.
- No bypassing platform API restrictions, rate limits, audits, or content policies.
- No guarantee that every platform exposes scheduling, comments, or analytics.
