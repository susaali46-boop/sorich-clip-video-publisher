import { NextResponse } from "next/server";
import { currentWorkspace } from "@/lib/oauth/security";
import { PROVIDERS, PROVIDER_LABELS, providerConfigured, missingProviderEnv } from "@/lib/oauth/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { db, workspaceId } = await currentWorkspace(false);
    const { data, error } = await db.from("social_accounts").select("id,provider,provider_account_id,account_name,account_handle,scopes,status,token_expires_at,created_at,updated_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw error;
    const providers = PROVIDERS.map((provider) => ({ id: provider, name: PROVIDER_LABELS[provider], configured: providerConfigured(provider), missing: missingProviderEnv(provider) }));
    return NextResponse.json({ providers, accounts: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof Error && error.message === "AUTH_REQUIRED" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Sign in to manage connected accounts." : "Could not load connected accounts." }, { status });
  }
}
