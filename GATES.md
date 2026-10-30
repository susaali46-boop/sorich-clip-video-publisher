# Sorich AI â implementation gates

## Plan and ownership
- Owner: project owner.
- Current phase: public developer-review website and legal information pages.
- This phase does not implement OAuth, video transfer, scheduled jobs, or TikTok publishing; those require an authenticated backend and an active TikTok connection.
- Next phase: secure OAuth/token handling, Drive file selection/transfer, scheduler, TikTok upload/publish status, and operational logs.

## Acceptance criteria
- CHECK: index.html exists at the GitHub Pages root.
  EXPECT: It identifies Sorich AI and accurately describes the planned Drive-to-TikTok workflow without claiming unfinished features are live.
- CHECK: terms.html exists and is linked from the home page.
  EXPECT: Terms cover permitted use, content rights, third-party services, posting responsibility, availability, and account security.
- CHECK: privacy-policy.html exists and is linked from the home page.
  EXPECT: Privacy disclosures cover account authorization, Drive video processing, TikTok publishing, service providers, retention, revocation, and contact route without unsupported security claims.
- CHECK: GitHub Pages configuration is verified.
  EXPECT: Public HTTPS URL is identified and all pages use relative navigation links.
- CHECK: TikTok connection is active before any live TikTok API test.
  EXPECT: No upload or publish action occurs until account authorization and creator posting options are confirmed.
- CHECK: TikTok review/audit status is known before public direct posting is enabled.
  EXPECT: Until approved, use only posting modes TikTok permits.


## Supabase frontend integration milestone
- Owner: project owner; implementation: Sorich AI project.
- CHECK: `app.html` loads Supabase JS with the project URL and publishable key only.
  EXPECT: No service-role/secret key or provider OAuth token appears in static files.
- CHECK: Sign-up, sign-in, password reset and sign-out handlers are present.
  EXPECT: Auth errors are shown to the creator and email confirmation is supported.
- CHECK: First authenticated session creates a profile, workspace and owner membership.
  EXPECT: Workspace data is scoped by the authenticated user's membership and RLS.
- CHECK: Dashboard queries are filtered to the current workspace.
  EXPECT: Only the creator's permitted records are displayed.
- CHECK: Video upload, provider OAuth, generation and publishing controls remain disabled/unavailable until their server-side integrations are implemented and tested.
  EXPECT: No fake publishing success or exposure of privileged credentials.
