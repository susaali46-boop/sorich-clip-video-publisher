import { NextResponse } from "next/server";
import { currentWorkspace } from "@/lib/oauth/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db, workspaceId } = await currentWorkspace(false);
    const [assetsResult, accountsResult] = await Promise.all([
      db.from("media_assets")
        .select("id,original_filename,mime_type,size_bytes,status,created_at")
        .eq("workspace_id", workspaceId)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(50),
      db.from("social_accounts")
        .select("id,provider_account_id,account_name,account_handle,scopes,status")
        .eq("workspace_id", workspaceId)
        .eq("provider", "youtube")
        .eq("status", "connected")
        .order("created_at", { ascending: false }),
    ]);
    if (assetsResult.error || accountsResult.error) throw new Error("Could not load publishing options.");
    return NextResponse.json({
      assets: assetsResult.data || [],
      accounts: accountsResult.data || [],
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH_REQUIRED" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Sign in to continue." : "Could not load publishing options." }, { status });
  }
}
