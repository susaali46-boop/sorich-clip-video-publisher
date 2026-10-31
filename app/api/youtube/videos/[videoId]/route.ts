import { NextRequest, NextResponse } from "next/server";
import { currentWorkspace, loadCredential, saveRefreshedCredential } from "@/lib/oauth/security";
import { refreshProviderToken, tokenExpiry } from "@/lib/oauth/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ videoId: string }> }) {
  try {
    const { videoId } = await context.params;
    const accountId = request.nextUrl.searchParams.get("accountId") || "";
    if (!/^[A-Za-z0-9_-]{6,80}$/.test(videoId) || !accountId) {
      return NextResponse.json({ error: "A valid video and connected channel are required." }, { status: 400 });
    }
    const { db, workspaceId } = await currentWorkspace(false);
    const { data: post } = await db.from("publishing_posts")
      .select("id,provider_post_id,social_account_id")
      .eq("workspace_id", workspaceId)
      .eq("provider_post_id", videoId)
      .eq("social_account_id", accountId)
      .single();
    if (!post) return NextResponse.json({ error: "This video is not associated with your workspace." }, { status: 404 });
    const { data: account } = await db.from("social_accounts")
      .select("id,provider,status")
      .eq("id", accountId).eq("workspace_id", workspaceId).eq("provider", "youtube").single();
    if (!account || account.status !== "connected") return NextResponse.json({ error: "Reconnect the YouTube channel to check status." }, { status: 404 });

    const credential = await loadCredential(accountId, workspaceId);
    let tokens = credential.tokens;
    if (credential.row.token_expires_at && new Date(credential.row.token_expires_at).getTime() < Date.now() + 120_000) {
      const refreshed = await refreshProviderToken("youtube", tokens);
      tokens = refreshed;
      const expiry = tokenExpiry(refreshed.expiresIn);
      await saveRefreshedCredential(credential.admin, { social_account_id: accountId, workspace_id: workspaceId }, refreshed, expiry, tokenExpiry(refreshed.refreshExpiresIn));
      await db.from("social_accounts").update({ token_expires_at: expiry, updated_at: new Date().toISOString() }).eq("id", accountId).eq("workspace_id", workspaceId);
    }
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,status,processingDetails");
    url.searchParams.set("id", videoId);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json().catch(() => ({})) as {
      items?: Array<{
        id: string;
        snippet?: { title?: string };
        status?: { uploadStatus?: string; privacyStatus?: string; selfDeclaredMadeForKids?: boolean };
        processingDetails?: { processingStatus?: string };
      }>;
      error?: { message?: string };
    };
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "YouTube status could not be retrieved." }, { status: response.status });
    const item = data.items?.[0];
    if (!item) return NextResponse.json({ error: "YouTube did not return this video. It may have been removed." }, { status: 404 });
    return NextResponse.json({
      videoId: item.id,
      title: item.snippet?.title || "",
      uploadStatus: item.status?.uploadStatus || "unknown",
      processingStatus: item.processingDetails?.processingStatus || "unknown",
      privacyStatus: item.status?.privacyStatus || "unknown",
      selfDeclaredMadeForKids: item.status?.selfDeclaredMadeForKids ?? null,
      videoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH_REQUIRED" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Sign in to check upload status." : "Could not check the YouTube upload status." }, { status });
  }
}
