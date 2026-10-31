import { redirectUri, type OAuthTokens } from "@/lib/oauth/security";

export const PROVIDERS = ["youtube", "tiktok", "instagram", "facebook"] as const;
export type Provider = typeof PROVIDERS[number];
export const PROVIDER_LABELS: Record<Provider, string> = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook" };
export type ConnectedIdentity = { providerAccountId: string; accountName: string; accountHandle?: string | null; scopes: string[]; accessToken: string; refreshToken?: string | null; expiresIn?: number; refreshExpiresIn?: number; providerData?: Record<string, unknown>; metadata?: Record<string, unknown> };
const GOOGLE_SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/youtube.upload"];
const TIKTOK_SCOPES = ["user.info.basic", "video.list", "video.upload", "video.publish"];
const META_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish"];
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";
function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`${name} is not configured.`); return value; }
async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || data.error) {
    const detail = typeof (data.error as Record<string, unknown> | undefined)?.message === "string" ? String((data.error as Record<string, unknown>).message) : `Provider request failed (${response.status}).`;
    throw new Error(detail.slice(0, 240));
  }
  return data;
}
function formBody(values: Record<string, string>) { return new URLSearchParams(values).toString(); }
export function isProvider(value: string): value is Provider { return (PROVIDERS as readonly string[]).includes(value); }
export function providerConfigured(provider: Provider) {
  return missingProviderEnv(provider).length === 0;
}
export function missingProviderEnv(provider: Provider) {
  const names = provider === "youtube" ? ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] : provider === "tiktok" ? ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"] : ["META_APP_ID", "META_APP_SECRET"];
  return [...names, "OAUTH_TOKEN_ENCRYPTION_KEY", "SUPABASE_SERVICE_ROLE_KEY", "OAUTH_REDIRECT_BASE_URL"].filter((name) => !process.env[name] && !(name === "OAUTH_REDIRECT_BASE_URL" && process.env.NEXT_PUBLIC_SITE_URL));
}
export function authorizationUrl(provider: Provider, state: string, challenge?: string) {
  const callback = redirectUri(provider);
  if (provider === "youtube") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: required("GOOGLE_CLIENT_ID"), redirect_uri: callback, response_type: "code", scope: GOOGLE_SCOPES.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state, code_challenge: challenge || "", code_challenge_method: "S256" }).toString();
    return url.toString();
  }
  if (provider === "tiktok") {
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.search = new URLSearchParams({ client_key: required("TIKTOK_CLIENT_KEY"), redirect_uri: callback, response_type: "code", scope: TIKTOK_SCOPES.join(","), state }).toString();
    return url.toString();
  }
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.search = new URLSearchParams({ client_id: required("META_APP_ID"), redirect_uri: callback, response_type: "code", scope: META_SCOPES.join(","), state }).toString();
  return url.toString();
}
type TokenExchange = { accessToken: string; refreshToken: string | null; expiresIn: number; refreshExpiresIn?: number; scopes: string[]; tokenType: string; openId?: string };
async function exchangeCode(provider: Provider, code: string, verifier?: string): Promise<TokenExchange> {
  const callback = redirectUri(provider);
  if (provider === "youtube") {
    const data = await jsonRequest("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formBody({ code, client_id: required("GOOGLE_CLIENT_ID"), client_secret: required("GOOGLE_CLIENT_SECRET"), redirect_uri: callback, grant_type: "authorization_code", ...(verifier ? { code_verifier: verifier } : {}) }) });
    return { accessToken: String(data.access_token || ""), refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null, expiresIn: Number(data.expires_in || 3600), scopes: String(data.scope || "").split(" ").filter(Boolean), tokenType: String(data.token_type || "Bearer") };
  }
  if (provider === "tiktok") {
    const data = await jsonRequest("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" }, body: formBody({ client_key: required("TIKTOK_CLIENT_KEY"), client_secret: required("TIKTOK_CLIENT_SECRET"), code, grant_type: "authorization_code", redirect_uri: callback }) });
    return { accessToken: String(data.access_token || ""), refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null, expiresIn: Number(data.expires_in || 86400), refreshExpiresIn: Number(data.refresh_expires_in || 0), scopes: String(data.scope || "").split(",").filter(Boolean), tokenType: "Bearer", openId: String(data.open_id || "") };
  }
  const data = await jsonRequest("https://graph.facebook.com/" + GRAPH_VERSION + "/oauth/access_token?" + formBody({ client_id: required("META_APP_ID"), client_secret: required("META_APP_SECRET"), redirect_uri: callback, code }));
  const shortToken = String(data.access_token || "");
  const longData = await jsonRequest("https://graph.facebook.com/" + GRAPH_VERSION + "/oauth/access_token?" + formBody({ grant_type: "fb_exchange_token", client_id: required("META_APP_ID"), client_secret: required("META_APP_SECRET"), fb_exchange_token: shortToken }));
  return { accessToken: String(longData.access_token || shortToken), refreshToken: String(longData.access_token || shortToken), expiresIn: Number(longData.expires_in || data.expires_in || 0), scopes: META_SCOPES, tokenType: "Bearer" };
}
export async function exchangeAndIdentify(provider: Provider, code: string, verifier?: string): Promise<ConnectedIdentity[]> {
  const token = await exchangeCode(provider, code, verifier);
  if (!token.accessToken) throw new Error("The provider did not return an access token.");
  if (provider === "youtube") {
    const profile = await jsonRequest("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${token.accessToken}` } });
    const channelResponse = await jsonRequest("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${token.accessToken}` } });
    const channel = Array.isArray(channelResponse.items) ? channelResponse.items[0] as Record<string, unknown> | undefined : undefined;
    const snippet = channel?.snippet as Record<string, unknown> | undefined;
    const id = String(channel?.id || profile.sub || "");
    if (!id) throw new Error("No YouTube channel was found for this Google account.");
    return [{ providerAccountId: id, accountName: String(snippet?.title || profile.name || profile.email || "YouTube channel"), accountHandle: typeof snippet?.customUrl === "string" ? String(snippet.customUrl) : (typeof profile.email === "string" ? String(profile.email) : null), scopes: token.scopes, accessToken: token.accessToken, refreshToken: token.refreshToken, expiresIn: token.expiresIn, providerData: { email: profile.email || null } }];
  }
  if (provider === "tiktok") {
    const user = await jsonRequest("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url", { headers: { Authorization: `Bearer ${token.accessToken}` } });
    const data = user.data as Record<string, unknown> | undefined;
    const identity = data?.user as Record<string, unknown> | undefined;
    const id = String(identity?.open_id || token.openId || "");
    if (!id) throw new Error("TikTok did not return a user identity. Check the approved Login Kit scopes.");
    return [{ providerAccountId: id, accountName: String(identity?.display_name || identity?.username || "TikTok account"), accountHandle: typeof identity?.username === "string" ? `@${identity.username}` : null, scopes: token.scopes, accessToken: token.accessToken, refreshToken: token.refreshToken, expiresIn: token.expiresIn, refreshExpiresIn: token.refreshExpiresIn, providerData: { avatarUrl: identity?.avatar_url || null } }];
  }
  const me = await jsonRequest(`https://graph.facebook.com/${GRAPH_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(token.accessToken)}`);
  const permissions = await jsonRequest(`https://graph.facebook.com/${GRAPH_VERSION}/me/permissions?access_token=${encodeURIComponent(token.accessToken)}`);
  const granted = Array.isArray(permissions.data) ? (permissions.data as Record<string, unknown>[]).filter((item) => item.status === "granted").map((item) => String(item.permission)) : [];
  const pages = await jsonRequest(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${encodeURIComponent(token.accessToken)}`);
  const rows = Array.isArray(pages.data) ? pages.data as Record<string, unknown>[] : [];
  const result: ConnectedIdentity[] = [];
  for (const page of rows) {
    const pageId = String(page.id || ""); const pageToken = String(page.access_token || "");
    if (!pageId || !pageToken) continue;
    const pageName = String(page.name || "Facebook Page");
    const common = { scopes: granted, refreshToken: token.refreshToken, expiresIn: 0, refreshExpiresIn: token.expiresIn, providerData: { pageId, metaUserId: me.id, metaUserToken: token.accessToken } };
    result.push({ providerAccountId: pageId, accountName: pageName, accountHandle: pageName, accessToken: pageToken, ...common });
    const instagram = page.instagram_business_account as Record<string, unknown> | undefined;
    if (instagram?.id) result.push({ providerAccountId: String(instagram.id), accountName: String(instagram.username || pageName + " Instagram"), accountHandle: typeof instagram.username === "string" ? `@${instagram.username}` : null, accessToken: pageToken, ...common, providerData: { ...common.providerData, instagramAccountId: instagram.id } });
  }
  if (!result.length) throw new Error("No Facebook Pages were returned. Create or select a Page and link an Instagram professional account to it before connecting.");
  return result;
}
export async function refreshProviderToken(provider: Provider, current: { accessToken: string; refreshToken?: string | null; providerData?: Record<string, unknown> }): Promise<OAuthTokens & { expiresIn?: number; refreshExpiresIn?: number }> {
  if (!current.refreshToken) throw new Error("This connection has no refresh token. Reconnect the account to restore access.");
  if (provider === "youtube") {
    const data = await jsonRequest("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formBody({ client_id: required("GOOGLE_CLIENT_ID"), client_secret: required("GOOGLE_CLIENT_SECRET"), refresh_token: current.refreshToken, grant_type: "refresh_token" }) });
    return { ...current, accessToken: String(data.access_token || ""), refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : current.refreshToken, obtainedAt: Date.now(), expiresIn: Number(data.expires_in || 3600) };
  }
  if (provider === "tiktok") {
    const data = await jsonRequest("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" }, body: formBody({ client_key: required("TIKTOK_CLIENT_KEY"), client_secret: required("TIKTOK_CLIENT_SECRET"), grant_type: "refresh_token", refresh_token: current.refreshToken }) });
    return { ...current, accessToken: String(data.access_token || ""), refreshToken: String(data.refresh_token || current.refreshToken), obtainedAt: Date.now(), expiresIn: Number(data.expires_in || 86400), refreshExpiresIn: Number(data.refresh_expires_in || 0) };
  }
  throw new Error("Meta Page tokens do not support a standard refresh-token grant. Reconnect this account if Meta revokes its access.");
}
export function tokenExpiry(expiresIn?: number) { return expiresIn && expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null; }

export async function revokeProviderToken(provider: Provider, tokens: { accessToken: string }) {
  try {
    if (provider === "youtube") {
      await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formBody({ token: tokens.accessToken }), signal: AbortSignal.timeout(10000) });
    } else if (provider === "tiktok") {
      await jsonRequest("https://open.tiktokapis.com/v2/oauth/revoke/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formBody({ client_key: required("TIKTOK_CLIENT_KEY"), client_secret: required("TIKTOK_CLIENT_SECRET"), token: tokens.accessToken }) });
    }
  } catch { /* Local deletion remains authoritative; provider revocation is best-effort. */ }
}
