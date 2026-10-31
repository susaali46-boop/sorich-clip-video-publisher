# Sorich Studio

Sorich Studio is a creator operations workspace for organizing video, preparing social posts and managing publishing.

## Public pages
- Website: https://susaali46-boop.github.io/sorich-clip-video-publisher/
- Creator workspace: https://susaali46-boop.github.io/sorich-clip-video-publisher/app.html
- Terms: https://susaali46-boop.github.io/sorich-clip-video-publisher/terms.html
- Privacy: https://susaali46-boop.github.io/sorich-clip-video-publisher/privacy-policy.html

## Current working scope
- Responsive public website and legal-page navigation.
- Supabase email signup, sign-in, password reset and sign-out.
- Private workspace/profile creation and workspace-scoped counts/recent records.
- Honest empty states for media and publishing data.

## Not yet implemented
GitHub Pages is a static host. It does not securely implement Google Drive OAuth/file transfer, TikTok OAuth or video upload, AI generation, or scheduled background jobs. These require a server-side integration layer, provider credentials configured as secrets, database policies/schema, and end-to-end tests. TikTok public direct posting also requires the relevant TikTok app approval/audit.

## Security
Only a Supabase publishable key belongs in the static frontend. Never commit service-role keys, OAuth client secrets, or provider access/refresh tokens.

See [GATES.md](GATES.md) for acceptance criteria and next-phase ownership.
