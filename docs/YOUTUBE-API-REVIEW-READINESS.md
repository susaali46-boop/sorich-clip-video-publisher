# YouTube API integration — operational notes

## User-facing upload workflow
- Upload a video file to the private Sorich Studio library first.
- Select an authorized YouTube channel, choose the library file, review title, description, tags, visibility and the made-for-kids declaration.
- Confirm content rights and acceptance of the YouTube and Sorich Studio terms.
- The server creates a resumable YouTube upload session and transfers the stored file. OAuth tokens stay server-side.
- The server stores the YouTube video ID and upload result in the workspace publishing_posts record.
- The user can request the current upload/processing status with videos.list.

## API methods actually used
- channels.list: channel identity lookup after OAuth.
- videos.insert: upload using resumable upload protocol.
- videos.list: retrieve upload and processing status for videos uploaded through this workspace.
- OAuth token endpoint and Google userinfo are identity/authentication endpoints, not YouTube Data API methods.

## Limits and safety
- The app's private media library currently limits source files to 100 MB.
- Only connected YouTube accounts with the youtube.upload scope can publish.
- Publishing requires an explicit user action, a rights confirmation, YouTube/Sorich terms acceptance, visibility selection, and made-for-kids declaration.
- Public, unlisted, and private visibility are supported. Uploads are never scheduled or auto-published by this workflow.
- Category is currently set to People & Blogs (22); update the selector and server validation if other categories are needed.
- Uploads are performed in a single server request after starting a resumable session. This is not yet a chunk-resume UI for interrupted uploads. Large transfers may time out depending on hosting limits.
- Shorts classification is determined by YouTube's current eligibility rules; this app does not guarantee Shorts classification.

## Deployment configuration still required
- Production GOOGLE_CLIENT_SECRET must be added securely in Vercel. Do not put it in GitHub or browser code.
- Production OAUTH_REDIRECT_BASE_URL and NEXT_PUBLIC_SITE_URL must point to the canonical production origin.
- Register the exact production callback URL with Google: https://YOUR-PRODUCTION-DOMAIN/api/oauth/youtube/callback
- Confirm the OAuth consent screen, authorized domains, support/developer contact, privacy policy and requested scopes.
- The adult account owner responsible for the Google Cloud project must manage Google consent, quota submissions and any reviewer access. Never share account passwords with reviewers; use the official OAuth test flow and least-privilege access.

## Audit evidence
Google requires an actual end-to-end demonstration for video upload use cases, not only screenshots of static controls. Capture a real authorized connection, user review, upload action, successful YouTube video page, and status check after deployment. Do not fabricate or stage success evidence.
