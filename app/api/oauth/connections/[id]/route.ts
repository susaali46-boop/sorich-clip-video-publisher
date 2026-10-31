import { NextRequest, NextResponse } from "next/server";
import { currentWorkspace, loadCredential, serviceDb } from "@/lib/oauth/security";
import { isProvider, revokeProviderToken } from "@/lib/oauth/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { db, workspaceId } = await currentWorkspace(true);
    const { data: account, error: lookupError } = await db.from("social_accounts").select("id,provider").eq("id", id).eq("workspace_id", workspaceId).single();
    if (lookupError || !account) return NextResponse.json({ error: "Connected account was not found." }, { status: 404 });
    const admin = await serviceDb();
    try {
      if (isProvider(account.provider)) {
        const stored = await loadCredential(id, workspaceId);
        await revokeProviderToken(account.provider, { accessToken: stored.tokens.accessToken });
      }
    } catch { /* Continue removing local secrets even if the provider has already revoked access. */ }
    const { error: credentialError } = await admin.from("oauth_credentials").delete().eq("social_account_id", id).eq("workspace_id", workspaceId);
    if (credentialError) return NextResponse.json({ error: "Could not remove encrypted credentials. Please retry." }, { status: 500 });
    const { error } = await db.from("social_accounts").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) return NextResponse.json({ error: "Credentials were removed, but the account record could not be deleted. Contact support." }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH_REQUIRED" ? 401 : message === "WORKSPACE_ADMIN_REQUIRED" ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Sign in to disconnect accounts." : status === 403 ? "Only workspace owners and admins can disconnect accounts." : "Could not disconnect this account." }, { status });
  }
}
