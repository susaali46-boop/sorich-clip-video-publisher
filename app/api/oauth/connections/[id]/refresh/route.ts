import { NextRequest, NextResponse } from "next/server";
import { currentWorkspace, loadCredential, saveRefreshedCredential } from "@/lib/oauth/security";
import { isProvider, refreshProviderToken, tokenExpiry } from "@/lib/oauth/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { db, workspaceId } = await currentWorkspace(true);
    const { data: account, error } = await db.from("social_accounts").select("id,provider").eq("id", id).eq("workspace_id", workspaceId).single();
    if (error || !account || !isProvider(account.provider)) return NextResponse.json({ error: "Connected account was not found." }, { status: 404 });
    const { admin, tokens } = await loadCredential(id, workspaceId);
    const refreshed = await refreshProviderToken(account.provider, tokens);
    const expiresAt = tokenExpiry(refreshed.expiresIn);
    await saveRefreshedCredential(admin, { social_account_id: id, workspace_id: workspaceId }, refreshed, expiresAt, tokenExpiry(refreshed.refreshExpiresIn));
    const { error: updateError } = await db.from("social_accounts").update({ status: "connected", token_expires_at: expiresAt, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId);
    if (updateError) throw updateError;
    return NextResponse.json({ success: true, expiresAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH_REQUIRED" ? 401 : message === "WORKSPACE_ADMIN_REQUIRED" ? 403 : 400;
    return NextResponse.json({ error: status === 401 ? "Sign in to refresh accounts." : status === 403 ? "Only workspace owners and admins can refresh accounts." : "Could not refresh this connection. Reconnect it if the provider asks you to authorize again." }, { status });
  }
}
