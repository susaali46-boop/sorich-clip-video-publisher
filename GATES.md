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
- CHECK: inspect `oauth_credentials` grants, RLS and policies; EXPECT: RLS is enabled, no `anon`/`authenticated` policies exist, and only `service_role` can access encrypted token payloads.
- CHECK: attempt to query `oauth_credentials` from an authenticated browser session; EXPECT: no token rows or ciphertext are readable.
- CHECK: start each provider OAuth flow; EXPECT: a fresh provider-specific state cookie is HttpOnly, SameSite=Lax, Secure in production, scoped to its callback, and expires after 10 minutes.
- CHECK: alter or omit callback state, deny consent, reuse a callback, or omit the authorization code; EXPECT: callback is rejected and state/verifier cookies are cleared.
- CHECK: complete Google OAuth; EXPECT: PKCE S256 is used, YouTube channel identity is resolved server-side, and offline refresh tokens are encrypted at rest.
- CHECK: complete TikTok Login Kit OAuth; EXPECT: server-side code exchange and user identity lookup work only for granted scopes; missing video publish approval is surfaced without pretending publishing is enabled.
- CHECK: complete Meta OAuth; EXPECT: Facebook Pages and linked Instagram professional accounts are discovered; no personal Instagram account is presented as publish-ready.
- CHECK: connect the same provider account twice; EXPECT: the workspace/provider/account tuple is upserted without duplicate rows and an existing refresh token is preserved when the provider omits a new one.
- CHECK: refresh Google and TikTok tokens; EXPECT: refreshed tokens and expiry metadata are re-encrypted and saved; invalid/revoked refresh tokens return a safe reconnect error.
- CHECK: request Meta token refresh; EXPECT: app explains that Meta Page tokens require reconnection when revoked rather than claiming a generic refresh succeeded.
- CHECK: disconnect Google/TikTok/Meta accounts; EXPECT: local encrypted token records are deleted, provider revocation is attempted where supported, and other workspace accounts remain intact.
- CHECK: try connect/refresh/disconnect as a workspace member without owner/admin role; EXPECT: all state-changing OAuth operations are rejected with 403.
- CHECK: inspect all API responses and browser network payloads; EXPECT: no access tokens, refresh tokens, client secrets, service-role keys or encryption keys are returned.
- CHECK: test provider error, timeout, invalid credentials, missing env vars and unavailable token vault; EXPECT: safe actionable errors and no partially connected account with missing encrypted credentials.
- CHECK: submit an invalid/non-YouTube URL and a request without rights confirmation to `POST /api/clips`; EXPECT: both are rejected before any provider request or billable job.
- CHECK: submit valid authorized YouTube videos with each supported creative preset, clip count, duration (15/30/45/60), aspect ratio, resolution (720/1080), caption font, position and six-digit highlight color; EXPECT: the API validates each option against allowlists and sends only supported values to Reka.
- CHECK: submit invalid aspect ratios, durations, font names, positions and malformed colors; EXPECT: safe defaults or a 400 validation response are used and arbitrary values never reach the provider.
- CHECK: submit a valid authorized YouTube video with a configured `REKA_API_KEY`; EXPECT: a workspace-scoped job is created, provider job ID stays server-side, and no more than one active clip job runs per workspace.
- CHECK: poll queued, running, succeeded and failed clipping jobs as two different workspace users; EXPECT: only the owning workspace can read progress/results and terminal results persist after refresh.
- CHECK: inspect generated clip URLs and metadata; EXPECT: only HTTPS video URLs are rendered, titles/captions/hashtags are bounded, clipboard failures are handled accessibly, and generated posts remain drafts until a user chooses what to do.
- CHECK: test the clipping controls at 320px, 390px, tablet and desktop widths; EXPECT: controls remain readable, keyboard accessible and do not overflow horizontally.
- CHECK: inspect the 1080p option and provider billing configuration; EXPECT: users are told that HD processing may incur an additional provider fee before selecting it.
- CHECK: inspect browser assets and network responses; EXPECT: `REKA_API_KEY` is never returned to the client or written to logs.

Automatic publishing, analytics and billing remain disabled until separately implemented and verified. OAuth is implemented but is not production-ready until credentials, app approvals, migration, staging end-to-end tests and all OAuth gates above pass. A feature is done only when code is committed and its applicable gates have actually passed in staging.
