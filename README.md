# Sorich AI

Sorich AI is a creator publishing workspace in development, planned around a Google Drive â AI-assisted post preparation â TikTok scheduling workflow.

## Public URLs
- Website: https://susaali46-boop.github.io/sorich-clip-video-publisher/
- Terms: https://susaali46-boop.github.io/sorich-clip-video-publisher/terms.html
- Privacy: https://susaali46-boop.github.io/sorich-clip-video-publisher/privacy-policy.html

## TikTok developer configuration
- App name: Sorich ai
- Category: Photo & Video
- Description: Organize videos from Google Drive, prepare captions, and schedule posts to your TikTok account.
- Web/Desktop URL: https://susaali46-boop.github.io/sorich-clip-video-publisher/
- Terms URL: https://susaali46-boop.github.io/sorich-clip-video-publisher/terms.html
- Privacy URL: https://susaali46-boop.github.io/sorich-clip-video-publisher/privacy-policy.html
- Login Kit redirect URI supplied for this project: https://backend.composio.dev/api/v1/auth-apps/add

## Planned architecture
- GitHub Pages: public landing page and legal pages only; never put OAuth tokens or API secrets in static files.
- Authenticated backend: OAuth callback handling, secure token storage, provider API calls, schedule persistence, job execution, and audit logs.
- Google Drive: user-selected video lookup and transfer.
- TikTok Content Posting API: upload as draft where permitted; direct posting only when TikTok permits it for the app and account.
- Scheduler: server-side jobs with idempotency, backoff, and publish-status polling.

## Current limitations
The authenticated dashboard, secure backend, Drive-to-TikTok transfer, and scheduled publishing are not implemented by GitHub Pages alone. TikTok direct posting may require app review/audit; unaudited apps are restricted. Do not promise public direct publishing until approval and an end-to-end test succeed.

See GATES.md for acceptance criteria and ownership.


## Supabase-connected creator dashboard
- Creator sign-up/sign-in is available at `app.html` using the Supabase publishable key only (safe for browser clients).
- The app creates a profile and a private workspace after first successful sign-in, then loads workspace-scoped counts and recent records.
- Row-level security is enforced by the Supabase policies; never expose a Supabase secret/service-role key in this static site.
- Supabase Auth email confirmation redirects to the current GitHub Pages app URL. Configure the Supabase Auth Site URL and Redirect URLs to include `https://susaali46-boop.github.io/sorich-clip-video-publisher/` before testing sign-up.
- Video upload, social OAuth, AI generation, billing, and scheduled publishing are not implemented in this frontend milestone.
