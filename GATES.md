# Sorich Studio release gates

- CHECK: `npm install`; EXPECT: dependencies install successfully.
- CHECK: `npm run typecheck`; EXPECT: TypeScript exits 0.
- CHECK: `npm run lint`; EXPECT: ESLint exits 0.
- CHECK: `npm run build`; EXPECT: production build exits 0.
- CHECK: inspect browser assets and Git history; EXPECT: no service-role keys, OAuth secrets or private credentials.
- CHECK: sign-up, email confirmation, sign-in, sign-out and expired-session tests on HTTPS staging; EXPECT: server-side refreshed cookies are HttpOnly, Secure in production and SameSite=Lax.
- CHECK: two-workspace isolation tests; EXPECT: users cannot read or change another workspace's data.
- CHECK: upload MP4, MOV, WebM, unsupported MIME and >100 MB; EXPECT: only allowed files within limits are accepted and storage remains private.
- CHECK: create and delete drafts across two accounts; EXPECT: RLS blocks cross-workspace access.
- CHECK: inspect unconfigured provider connections; EXPECT: setup-needed state only, no fake publish action.

Provider OAuth, AI generation, automatic publishing, analytics and billing remain disabled until separately implemented and verified. A feature is done only when code is committed and its applicable gates have actually passed in staging.
