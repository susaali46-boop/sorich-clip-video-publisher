# Sorich Studio

A creator workspace for private video organization, post drafts and publishing operations.

## Stack
- Next.js App Router on a server-capable host (Vercel recommended).
- Supabase Auth via `@supabase/ssr`; auth cookies are written server-side with HttpOnly, Secure in production and SameSite=Lax options.
- Existing Supabase workspace tables and row-level security.
- Private `sorich-media` Storage bucket with workspace-folder policies and signed upload URLs.

## Setup
1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`.
3. Run `npm install`, then `npm run typecheck`, `npm run lint`, `npm run build`.
4. Deploy to Vercel or another Node.js host. Configure Supabase Auth Site URL and redirect allow-list for the deployed origin and `/auth/callback`.

## Implemented in this branch
- Server-rendered landing, sign-up, sign-in and protected dashboard.
- Supabase SSR cookie session handling and middleware refresh.
- Private workspace bootstrap and workspace-scoped data reads/writes.
- Private video upload using signed URLs (MP4, MOV, WebM; max 100 MB).
- Post draft composer with title, caption, hashtags and optional planned date.
- AI clip generation for authorized YouTube videos through the server-side Reka Clip API, including creative direction presets, clip count, duration, aspect ratio, resolution and caption styling.
- Persistent, workspace-scoped clip jobs with polling, playable results, copyable post details and direct clip links.
- Server-side OAuth account connections for YouTube, TikTok, Facebook Pages and linked Instagram professional accounts; encrypted token vault, state validation, Google PKCE, token refresh/reconnect handling and disconnect controls.
- Security headers, CSP nonce, CI checks.

## Not enabled yet
Automatic publishing workers, analytics ingestion, scheduled publishing, and subscription billing. OAuth code is implemented but remains unavailable until provider credentials, the Supabase service-role key and token-encryption key are configured, provider redirect URIs are registered, the database migration is applied, and each platform has granted the requested scopes. Provider app review may be required. AI clipping requires a server-side `REKA_API_KEY` and provider usage allowance; it remains unavailable until configured and verified. Billing is intentionally not activated.

## Security
Supabase Auth handles password hashing; the app never stores passwords. The service-role key is used only by server-side OAuth credential routes and is never sent to client code or committed. OAuth access and refresh tokens are encrypted with AES-256-GCM before being stored in the service-role-only `oauth_credentials` table. See `SECURITY.md`, `docs/SECURITY-ARCHITECTURE.md`, and `docs/OAUTH-SETUP.md`.