import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentWorkspace, pkcePair, randomState } from "@/lib/oauth/security";
import { authorizationUrl, isProvider, missingProviderEnv, providerConfigured } from "@/lib/oauth/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await context.params;
  if (!isProvider(raw)) return NextResponse.json({ error: "Unsupported social platform." }, { status: 404 });
  try {
    await currentWorkspace(true);
    if (!providerConfigured(raw)) return NextResponse.redirect(new URL(`/dashboard?connection=missing_config&provider=${raw}&missing=${encodeURIComponent(missingProviderEnv(raw).join(","))}`, request.url));
    const state = randomState();
    const pkce = raw === "youtube" ? pkcePair() : null;
    const url = authorizationUrl(raw, state, pkce?.challenge);
    const store = await cookies();
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: `/api/oauth/${raw}/callback`, maxAge: 600 };
    store.set(`sorich_oauth_state_${raw}`, state, options);
    if (pkce) store.set(`sorich_oauth_verifier_${raw}`, pkce.verifier, options);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error && error.message === "AUTH_REQUIRED" ? "login_required" : error instanceof Error && error.message === "WORKSPACE_ADMIN_REQUIRED" ? "admin_required" : "oauth_start_failed";
    return NextResponse.redirect(new URL(`/dashboard?connection=${message}&provider=${raw}`, request.url));
  }
}
