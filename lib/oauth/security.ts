import "server-only";
import { createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

export type OAuthTokens = { accessToken: string; refreshToken?: string | null; tokenType?: string; obtainedAt: number; providerData?: Record<string, unknown> };
const KEY_BYTES = 32;
function encryptionKey() {
  const raw = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("OAuth token encryption is not configured.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}
export function encryptTokens(tokens: OAuthTokens) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), data: ciphertext.toString("base64url") });
}
export function decryptTokens(payload: string): OAuthTokens {
  const parsed = JSON.parse(payload) as { v: number; iv: string; tag: string; data: string };
  if (parsed.v !== 1) throw new Error("Unsupported encrypted token format.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(parsed.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(parsed.data, "base64url")), decipher.final()]).toString("utf8");
  const result = JSON.parse(plain) as OAuthTokens;
  if (!result.accessToken || typeof result.accessToken !== "string") throw new Error("Stored OAuth token payload is invalid.");
  return result;
}
export function constantTimeEqual(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}
export function randomState() { return randomBytes(32).toString("base64url"); }
export function pkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
export function safeSiteUrl() {
  const raw = process.env.OAUTH_REDIRECT_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) throw new Error("Set OAUTH_REDIRECT_BASE_URL to your registered OAuth callback domain.");
  const url = new URL(raw);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") throw new Error("OAuth redirect base URL must use HTTPS.");
  if (url.username || url.password || url.search || url.hash) throw new Error("OAuth redirect base URL is invalid.");
  return url.origin;
}
export function redirectUri(provider: string) { return `${safeSiteUrl()}/api/oauth/${provider}/callback`; }
export function serviceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server-side Supabase service role is not configured.");
  // Lazy import keeps service credentials in server-only modules.
  return import("@supabase/supabase-js").then(({ createClient }) => createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }));
}
export async function currentWorkspace(requireAdmin = true) {
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  const { data: membership, error } = await db.from("workspace_members").select("workspace_id,role").eq("user_id", user.id).limit(1).single();
  if (error || !membership) throw new Error("WORKSPACE_REQUIRED");
  if (requireAdmin && !["owner", "admin"].includes(membership.role)) throw new Error("WORKSPACE_ADMIN_REQUIRED");
  return { db, user, workspaceId: membership.workspace_id as string };
}
export async function saveConnectedAccount(args: { db: Awaited<ReturnType<typeof currentWorkspace>>["db"]; workspaceId: string; userId: string; provider: string; providerAccountId: string; accountName: string; accountHandle?: string | null; scopes: string[]; expiresAt?: string | null; refreshExpiresAt?: string | null; payload: OAuthTokens; metadata?: Record<string, unknown> }) {
  const { data: account, error } = await args.db.from("social_accounts").upsert({ workspace_id: args.workspaceId, provider: args.provider, provider_account_id: args.providerAccountId, account_name: args.accountName.slice(0, 160), account_handle: args.accountHandle?.slice(0, 160) || null, scopes: args.scopes, token_expires_at: args.expiresAt || null, status: "connected", connected_by: args.userId, metadata: args.metadata || {}, updated_at: new Date().toISOString() }, { onConflict: "workspace_id,provider,provider_account_id" }).select("id").single();
  if (error || !account) throw new Error("Could not save the connected social account.");
  const admin = await serviceDb();
  const { data: existing } = await admin.from("oauth_credentials").select("encrypted_payload,refresh_expires_at").eq("social_account_id", account.id).eq("workspace_id", args.workspaceId).maybeSingle();
  let payload = args.payload;
  if (existing?.encrypted_payload && !payload.refreshToken) {
    const previous = decryptTokens(existing.encrypted_payload);
    payload = { ...payload, refreshToken: previous.refreshToken || null, providerData: { ...previous.providerData, ...payload.providerData } };
  }
  const { data: credential, error: credentialError } = await admin.from("oauth_credentials").upsert({ social_account_id: account.id, workspace_id: args.workspaceId, provider: args.provider, encrypted_payload: encryptTokens(payload), token_expires_at: args.expiresAt || null, refresh_expires_at: args.refreshExpiresAt || existing?.refresh_expires_at || null, updated_at: new Date().toISOString() }, { onConflict: "social_account_id" }).select("id").single();
  if (credentialError || !credential) {
    await args.db.from("social_accounts").delete().eq("id", account.id).eq("workspace_id", args.workspaceId);
    throw new Error("Could not securely store provider credentials. Check the OAuth database migration.");
  }
  await args.db.from("social_accounts").update({ token_secret_ref: credential.id }).eq("id", account.id).eq("workspace_id", args.workspaceId);
  return account.id as string;
}
export async function loadCredential(accountId: string, workspaceId: string) {
  const admin = await serviceDb();
  const { data, error } = await admin.from("oauth_credentials").select("id,social_account_id,provider,encrypted_payload,token_expires_at,refresh_expires_at").eq("social_account_id", accountId).eq("workspace_id", workspaceId).single();
  if (error || !data) throw new Error("Stored provider credentials were not found.");
  return { admin, row: data, tokens: decryptTokens(data.encrypted_payload) };
}
export async function saveRefreshedCredential(admin: Awaited<ReturnType<typeof serviceDb>>, row: { social_account_id: string; workspace_id: string }, payload: OAuthTokens, expiresAt: string | null, refreshExpiresAt: string | null = null) {
  const { error } = await admin.from("oauth_credentials").update({ encrypted_payload: encryptTokens(payload), token_expires_at: expiresAt, refresh_expires_at: refreshExpiresAt, updated_at: new Date().toISOString() }).eq("social_account_id", row.social_account_id).eq("workspace_id", row.workspace_id);
  if (error) throw new Error("Could not save refreshed provider credentials.");
}
