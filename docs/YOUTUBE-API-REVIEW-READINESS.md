# Sorich Studio — YouTube API review readiness

Last reviewed: 2026-10-31

## Current implementation verified in the repository

- Private video-library upload to Supabase Storage (up to 100 MB in the UI).
- Workspace content drafts (title, caption, hashtags, planned date).
- A provider-account connection framework with a YouTube OAuth authorization-code flow, state validation, PKCE, token encryption, channel identification, refresh, and disconnect/revocation logic.
- The YouTube OAuth flow requests openid, email, profile, youtube.readonly, and youtube.upload.
- The YouTube channel lookup calls channels.list with mine=true.

## Not implemented / not verified

- There is no production YouTube video upload endpoint using videos.insert.
- The current private-library upload is not a YouTube upload.
- There is no implemented videos.list upload-status screen.
- There is no user-facing YouTube search feature that justifies search.list.
- No real consent-screen, scopes, revocation, or YouTube-upload screenshots have been captured from an end-to-end production test.
- The automated long-video clipping / Reka feature has been removed from the current application while the user prepares the YouTube API review. It can be reintroduced later from version control if requested.

## Vercel environment configuration observed (names/targets only)

- GOOGLE_CLIENT_ID: Production, Preview, Development.
- GOOGLE_CLIENT_SECRET: Preview only; not configured for Production.
- OAUTH_REDIRECT_BASE_URL: Preview only.
- OAUTH_TOKEN_ENCRYPTION_KEY: Production and Preview.
- SUPABASE_SERVICE_ROLE_KEY: Production and Preview.
- NEXT_PUBLIC_SITE_URL: Preview and Development; not configured for Production.

Do not expose secret values in logs, screenshots, support requests, or this document.

## Required before claiming a production YouTube integration

1. Configure the Google OAuth client ID and client secret for the intended Vercel environment.
2. Set the canonical production site URL and OAuth redirect base URL to the production domain.
3. Register the exact callback URL with the Google OAuth client: https://YOUR-PRODUCTION-DOMAIN/api/oauth/youtube/callback.
4. Confirm the consent screen's app name, support email, developer contact, authorized domains, privacy policy, terms, and requested scopes.
5. Implement and test videos.insert using the connected user's authorization, with an explicit final review and upload action.
6. Implement and test upload status retrieval (videos.list) and a clear connected-channel display.
7. Capture genuine screenshots of the consent flow, granted scopes, connected account, disconnect/revocation, upload form, final approval, and successful upload.
8. Submit only quota amounts and API methods that match implemented features and defensible expected usage.

## Quota-method alignment

- channels.list: currently used by the YouTube connection flow.
- videos.insert: planned; not yet implemented in production.
- videos.list: planned; not yet implemented for upload-status checks.
- videos.update: not currently implemented.
- thumbnails.set: not currently implemented.
- search.list: no user-facing search feature currently exists; do not claim usage until implemented.

This file is an engineering checklist, not a guarantee of Google approval or legal advice.
