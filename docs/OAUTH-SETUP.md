# Sorich Studio social OAuth setup

This implementation supports server-side account authorization for YouTube, TikTok, Instagram professional accounts linked to a Facebook Page, and Facebook Pages. It does not publish content automatically. Provider scopes can require app review, business verification, or platform approval before real accounts can grant them.

## Security model

- Authorization codes are exchanged only by Next.js server routes.
- State is random, short-lived, provider-specific, stored in an HttpOnly SameSite=Lax cookie and compared before a callback is accepted.
- Google uses PKCE (S256). TikTok's current web Login Kit flow uses state and a confidential server-side client secret.
- Access/refresh tokens and Meta Page tokens are encrypted with AES-256-GCM in the application before they are stored.
- Encrypted token payloads live in `public.oauth_credentials`, which has RLS enabled and no policies for `anon` or `authenticated`; only the server's Supabase service role can access it.
- Workspace account metadata remains in `social_accounts` under the existing workspace RLS policies. Only workspace owners/admins can connect, refresh or disconnect.
- No provider secret or token is sent to the browser. The connection API returns account labels, scopes, status and expiry only.
- Disconnect deletes the encrypted credential record and the social account metadata. Provider-side revocation is attempted where supported; deleting the local credential is the security boundary.

## Environment variables

Set these in Vercel Project → Settings → Environment Variables. Use sensitive/encrypted values and keep secrets server-only (never prefix them with `NEXT_PUBLIC_`). Configure Preview first, test it, then Production separately.

| Variable | Purpose |
| --- | --- |
| `OAUTH_REDIRECT_BASE_URL` | Canonical HTTPS origin registered with all providers, e.g. your stable Sorich Studio deployment origin. |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Base64-encoded 32-byte random key for AES-256-GCM. Generate with `openssl rand -base64 32`. Keep it backed up securely; losing it makes stored tokens unreadable. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service-role key, required for the restricted token vault. Never expose it to browser code. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth web client credentials. |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok Login Kit credentials. |
| `META_APP_ID` / `META_APP_SECRET` | Meta app credentials shared by Facebook Login and Instagram Graph API. |
| `META_GRAPH_VERSION` | Optional Graph API version; defaults to `v22.0`. Set to a currently supported version for your Meta app. |

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` already exist in the project. `OAUTH_REDIRECT_BASE_URL` should exactly match the origin whose callback URLs you register. Each provider requires exact callback URI matches:

- `${OAUTH_REDIRECT_BASE_URL}/api/oauth/youtube/callback`
- `${OAUTH_REDIRECT_BASE_URL}/api/oauth/tiktok/callback`
- `${OAUTH_REDIRECT_BASE_URL}/api/oauth/instagram/callback`
- `${OAUTH_REDIRECT_BASE_URL}/api/oauth/facebook/callback`

For Meta, Instagram uses the same Meta app and callback route as Facebook; both account types are discovered from authorized Pages. An Instagram account must be a professional account linked to a Facebook Page.

## Provider setup checklist

### YouTube / Google

1. Create a Google Cloud project and configure the OAuth consent screen.
2. Enable YouTube Data API v3.
3. Create an OAuth client of type Web application.
4. Add the exact YouTube callback URI above as an authorized redirect URI.
5. Add the client ID and secret to Vercel.
6. Request YouTube read-only and upload scopes. Google may require verification for these scopes and may show an unverified-app warning while in testing.

### TikTok

1. Create a TikTok for Developers app and add Login Kit.
2. Register the exact TikTok callback URI in the Login Kit redirect URI settings.
3. Request `user.info.basic`, `video.list`, `video.upload`, and `video.publish` only as needed.
4. Submit the required products/scopes for review. TikTok may withhold video publishing permissions until approval.
5. Add the client key and secret to Vercel.

### Facebook and Instagram

1. Create a Meta app and add Facebook Login plus the Instagram Graph API product/use case.
2. Register the exact Facebook callback URI in the Facebook Login Valid OAuth Redirect URIs list.
3. Configure the required Page and Instagram permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, and `instagram_content_publish`.
4. Link the Instagram professional account to a Facebook Page and ensure the authorizing person has the required Page tasks/permissions.
5. Complete Meta app review and business verification where required before production users can grant advanced permissions.
6. Add the Meta app ID and secret to Vercel.

## Database migration

Apply `supabase/migrations/20261031143000_oauth_credentials.sql` to the connected Supabase project before testing callbacks. The migration is safe to re-run. The OAuth routes fail closed if the token vault or service-role configuration is missing.

## Testing and release gates

1. Add all server secrets to Vercel Preview; do not paste them into chat or commit them.
2. Apply the migration.
3. Register the exact preview callback URLs with each provider.
4. Redeploy the Preview environment after adding variables.
5. Test one account per provider, deny/cancel flows, mismatched state, expired/revoked tokens, refresh, disconnect and re-connect.
6. Verify `oauth_credentials` has no anon/authenticated policies and the browser Network panel never receives token values.
7. Verify each platform's granted scopes in the saved account metadata. A connected account does not mean the platform has approved video publishing.
8. Do not enable scheduled publishing until platform app reviews, token refresh, media requirements, upload processing and end-to-end publishing tests pass.

## Current limitations

- This is the authorization and credential-management foundation; automatic post publishing, analytics and scheduling workers are not included in this change.
- Google refresh, TikTok refresh, and Meta long-lived Page-token renewal are implemented as explicit refresh actions. Expired/revoked tokens may still require the user to reconnect.
- Provider-side token revocation is best-effort; local encrypted credentials are deleted on disconnect.
- OAuth provider credentials and app approvals are external requirements and cannot be generated by Sorich Studio.
