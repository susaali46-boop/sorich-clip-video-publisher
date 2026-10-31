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
- Provider connection status display.
- Security headers, CSP nonce, CI checks.

## Not enabled yet
Social provider OAuth/publishing workers, AI generation, analytics ingestion, scheduled publishing, and subscription billing. These must not be presented as working until provider credentials, approvals, implementation and tests exist. Billing is intentionally not activated; the app is structured to add plans later.

## Security
Supabase Auth handles password hashing; the app never stores passwords. No service-role key is used in client code or committed. See `SECURITY.md` and `docs/SECURITY-ARCHITECTURE.md`.