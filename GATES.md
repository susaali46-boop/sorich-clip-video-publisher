# Sorich AI — implementation gates

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
