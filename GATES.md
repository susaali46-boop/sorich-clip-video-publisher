# Sorich Studio implementation gates

## Plan and ownership
- Owner: project owner.
- Implementation: Sorich AI project.
- Phase: public website and authenticated creator workspace visual/UX rebuild.
- Backend integration phase remains separate: secure Google Drive OAuth and transfer, TikTok OAuth/upload/publish, AI generation, and durable scheduling.

## Acceptance criteria
- CHECK: index.html loads from the GitHub Pages root.
  EXPECT: responsive editorial landing page, no broken relative links, clear accurate feature claims.
- CHECK: app.html loads and imports Supabase JS v2.
  EXPECT: existing email signup, sign-in, password reset, sign-out and workspace creation flows remain intact.
- CHECK: authenticated dashboard queries existing workspace-scoped tables.
  EXPECT: counts and recent asset/post records display from Supabase; empty/error states remain honest.
- CHECK: navigation links to overview, library, calendar, connections, terms and privacy.
  EXPECT: no dead links; unavailable integrations are labelled as setup-required, not falsely shown as connected.
- CHECK: static frontend source is reviewed for privileged keys.
  EXPECT: only the existing Supabase publishable key is present; no service-role key, OAuth secret or access token is committed.
- CHECK: mobile viewport at 375px and desktop viewport at 1440px.
  EXPECT: no horizontal overflow; sidebar and dashboard collapse cleanly.
- CHECK: Google Drive and TikTok publishing controls.
  EXPECT: no upload, scheduling or public-post success is claimed until secure server-side integration and provider approval are implemented and tested.

## Ownership and next phase
- Frontend: public site and Supabase-authenticated workspace.
- Backend: server-side OAuth callbacks, encrypted token storage, Drive transfer, TikTok API calls, scheduler/queue, idempotency and audit logs.
- Provider configuration: Google OAuth scopes and TikTok Content Posting API review/audit are project-owner responsibilities.
