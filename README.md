# Sorich Studio

Sorich Studio is a multi-platform content operations workspace for creating, preparing, scheduling, publishing, and analyzing short-form video across social platforms.

## Public pages

- Website: https://susaali46-boop.github.io/sorich-clip-video-publisher/
- Creator workspace: https://susaali46-boop.github.io/sorich-clip-video-publisher/app.html
- Terms: https://susaali46-boop.github.io/sorich-clip-video-publisher/terms.html
- Privacy: https://susaali46-boop.github.io/sorich-clip-video-publisher/privacy-policy.html

## Product direction

One workspace for YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and additional destinations where official APIs permit the required capability. A video can be adapted into destination-specific posts, reviewed, approved, scheduled, published, and analyzed from one place.

See [docs/PLATFORM-ROADMAP.md](docs/PLATFORM-ROADMAP.md) for product scope and [docs/SECURITY-ARCHITECTURE.md](docs/SECURITY-ARCHITECTURE.md) for the required security model.

## Current implementation status

The deployed site is a static GitHub Pages frontend with a Supabase browser-auth foundation. It is a prototype, not a complete publishing SaaS. The current frontend does not implement secure provider OAuth, private media transfer, AI generation, a durable scheduler, or confirmed publishing/analytics integrations.

The browser may contain only public Supabase project configuration and a publishable/anon key protected by correct database RLS policies. Never add a Supabase service-role key, OAuth client secret, provider token, encryption key, or signing secret to frontend code or this repository.

## Security and deployment

GitHub Pages is not a trusted backend and cannot by itself provide HttpOnly session cookies or protect server-side secrets. Production requires a separately deployed HTTPS API/worker layer, server-managed sessions, private storage, encrypted provider tokens, strict workspace authorization, RLS, audit logging, and security tests.

Read [SECURITY.md](SECURITY.md) and the security release gates in [GATES.md](GATES.md). Do not connect real publishing accounts or enable unattended publishing before those gates pass.
