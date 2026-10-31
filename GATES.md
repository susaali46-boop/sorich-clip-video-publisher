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
- CHECK: submit an invalid/non-YouTube URL and a request without rights confirmation to `POST /api/clips`; EXPECT: both are rejected before any provider request or billable job.
- CHECK: submit valid authorized YouTube videos with each supported creative preset, clip count, duration (15/30/45/60), aspect ratio, resolution (720/1080), caption font, position and six-digit highlight color; EXPECT: the API validates each option against allowlists and sends only supported values to Reka.
- CHECK: submit invalid aspect ratios, durations, font names, positions and malformed colors; EXPECT: safe defaults or a 400 validation response are used and arbitrary values never reach the provider.
- CHECK: submit a valid authorized YouTube video with a configured `REKA_API_KEY`; EXPECT: a workspace-scoped job is created, provider job ID stays server-side, and no more than one active clip job runs per workspace.
- CHECK: poll queued, running, succeeded and failed clipping jobs as two different workspace users; EXPECT: only the owning workspace can read progress/results and terminal results persist after refresh.
- CHECK: inspect generated clip URLs and metadata; EXPECT: only HTTPS video URLs are rendered, titles/captions/hashtags are bounded, clipboard failures are handled accessibly, and generated posts remain drafts until a user chooses what to do.
- CHECK: test the clipping controls at 320px, 390px, tablet and desktop widths; EXPECT: controls remain readable, keyboard accessible and do not overflow horizontally.
- CHECK: inspect the 1080p option and provider billing configuration; EXPECT: users are told that HD processing may incur an additional provider fee before selecting it.
- CHECK: inspect browser assets and network responses; EXPECT: `REKA_API_KEY` is never returned to the client or written to logs.

Provider OAuth, automatic publishing, analytics and billing remain disabled until separately implemented and verified. A feature is done only when code is committed and its applicable gates have actually passed in staging.
