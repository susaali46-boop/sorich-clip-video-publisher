import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { constantTimeEqual, currentWorkspace, saveConnectedAccount } from "@/lib/oauth/security";
import { exchangeAndIdentify, isProvider, tokenExpiry } from "@/lib/oauth/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function finish(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!isProvider(provider)) return finish(request, { connection: "unsupported_provider" });
  const store = await cookies();
  const stateName = `sorich_oauth_state_${provider}`;
  const verifierName = `sorich_oauth_verifier_${provider}`;
  const expectedState = store.get(stateName)?.value || "";
  const returnedState = request.nextUrl.searchParams.get("state") || "";
  const code = request.nextUrl.searchParams.get("code") || "";
  const providerError = request.nextUrl.searchParams.get("error");
  const verifier = store.get(verifierName)?.value;
  const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: `/api/oauth/${provider}/callback`, maxAge: 0 };
  store.set(stateName, "", cookieOptions); store.set(verifierName, "", cookieOptions);
  if (!expectedState || !returnedState || !constantTimeEqual(expectedState, returnedState)) return finish(request, { connection: "state_mismatch", provider });
  if (providerError || !code) return finish(request, { connection: "authorization_denied", provider });
  try {
    const workspace = await currentWorkspace(true);
    const identities = await exchangeAndIdentify(provider, code, verifier);
    let saved = 0;
    for (const identity of identities) {
      await saveConnectedAccount({ db: workspace.db, workspaceId: workspace.workspaceId, userId: workspace.user.id, provider, providerAccountId: identity.providerAccountId, accountName: identity.accountName, accountHandle: identity.accountHandle, scopes: identity.scopes, expiresAt: tokenExpiry(identity.expiresIn), refreshExpiresAt: tokenExpiry(identity.refreshExpiresIn), payload: { accessToken: identity.accessToken, refreshToken: identity.refreshToken, tokenType: "Bearer", obtainedAt: Date.now(), providerData: identity.providerData }, metadata: identity.metadata });
      saved++;
    }
    return finish(request, { connection: "connected", provider, count: String(saved) });
  } catch (error) {
    const code = error instanceof Error && error.message === "AUTH_REQUIRED" ? "login_required" : error instanceof Error && error.message === "WORKSPACE_ADMIN_REQUIRED" ? "admin_required" : "callback_failed";
    return finish(request, { connection: code, provider });
  }
}
